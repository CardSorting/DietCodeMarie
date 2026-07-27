// [LAYER: CORE]
// @classification INTERNAL
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import {
  brotliCompress,
  brotliDecompress,
  constants as zlibConstants,
} from 'node:zlib';
import type {
  BufferedDbPool,
  WriteOp,
} from '../../infrastructure/db/BufferedDbPool.js';
import type { Schema } from '../../infrastructure/db/Config.js';
import type { StorageService } from '../../infrastructure/storage/StorageService.js';
import { AgentGitError, RecoveryError, StorageIntegrityError } from '../errors.js';
import type {
  ContextCompactionCommitInput,
  ContextCompactionCommitResult,
  ContextCompactionCursor,
  ContextCompactionHydrateInput,
  ContextCompactionHydrateResult,
  ContextCompactionLoadInput,
  ContextCompactionLoadResult,
  ContextCompactionProjectionInput,
  ContextCompactionProjectionRecord,
} from './capability-types.js';

const compressBrotli = promisify(brotliCompress);
const decompressBrotli = promisify(brotliDecompress);

const MAX_RECORDS_PER_COMMIT = 64;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_PROJECTION_BYTES = 2 * 1024 * 1024;
const MAX_SCOPE_PROJECTIONS = 4096;
const COMPRESSION_CONCURRENCY = 2;
const BROTLI_MINIMUM_BYTES = 4096;
const BROTLI_MINIMUM_SAVINGS_RATIO = 0.9;

type SourceRow = Schema['context_compaction_sources'];
type PreparedSource = {
  sourceSha256: string;
  blobHash: string;
  codec: SourceRow['codec'];
  originalCharacters: number;
  originalBytes: number;
  originalLines: number;
  storedBytes: number;
  createdAt: number;
  lastAccessedAt: number;
  payload?: Buffer;
  newlyStored: boolean;
};

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function deterministicId(namespace: string, ...parts: string[]): string {
  return `${namespace}_${sha256(parts.join('\0')).slice(0, 40)}`;
}

function requireBoundedString(value: string, field: string, maximum: number): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new AgentGitError(`${field} must be a non-empty string`, 'INVALID_ARGUMENT');
  }
  if (trimmed.length > maximum) {
    throw new AgentGitError(`${field} exceeds ${maximum} characters`, 'INVALID_ARGUMENT');
  }
  return trimmed;
}

function requireNonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AgentGitError(`${field} must be a non-negative safe integer`, 'INVALID_ARGUMENT');
  }
  return value;
}

function requireTimestamp(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new AgentGitError(`${field} must be a positive timestamp`, 'INVALID_ARGUMENT');
  }
  return value;
}

function lineCount(value: string): number {
  return value.length === 0 ? 0 : value.split('\n').length;
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++;
        results[index] = await mapper(values[index]);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

/**
 * Durable exact-source ledger for request-time context projections.
 *
 * CAS writes happen before the SQLite metadata transaction. A failed metadata
 * commit can therefore leave an unreferenced blob, but can never publish a
 * projection whose source is absent. Cleanup reclaims any such orphan later.
 */
export class ContextCompactionService {
  constructor(
    private readonly db: BufferedDbPool,
    private readonly storage: StorageService
  ) {}

  async commit(input: ContextCompactionCommitInput): Promise<ContextCompactionCommitResult> {
    this.assertPersistent();
    const validated = this.validateCommit(input);
    const uniqueRecords = this.uniqueSources(validated.records);
    const existingRows = await this.loadSourceRows(uniqueRecords.map((record) => record.sourceSha256));
    const existingByHash = new Map(existingRows.map((row) => [row.sourceSha256, row]));
    let deduplicatedSources = 0;

    const preparedSources = await mapWithConcurrency(
      uniqueRecords,
      COMPRESSION_CONCURRENCY,
      async (record): Promise<PreparedSource> => {
        const existing = existingByHash.get(record.sourceSha256);
        if (existing && (await this.storage.exists(existing.blobHash))) {
          deduplicatedSources++;
          return { ...existing, lastAccessedAt: Date.now(), newlyStored: false };
        }
        return this.prepareSource(record);
      }
    );

    const now = Date.now();
    const sourceRows = new Map(preparedSources.map((source) => [source.sourceSha256, source]));
    const projectionIds = validated.records.map((record) =>
      deterministicId('ctx_prj', validated.scopeId, record.messageId, record.blockId)
    );
    const operations: WriteOp[] = [
      ...preparedSources.map(
        (source): WriteOp => ({
          type: 'upsert',
          table: 'context_compaction_sources',
          conflictTarget: 'sourceSha256',
          values: {
            sourceSha256: source.sourceSha256,
            blobHash: source.blobHash,
            codec: source.codec,
            originalCharacters: source.originalCharacters,
            originalBytes: source.originalBytes,
            originalLines: source.originalLines,
            storedBytes: source.storedBytes,
            createdAt: source.createdAt,
            lastAccessedAt: source.lastAccessedAt,
          },
          layer: 'infrastructure',
        })
      ),
      ...validated.records.map(
        (record, index): WriteOp => ({
          type: 'upsert',
          table: 'context_compaction_projections',
          conflictTarget: 'projectionId',
          values: {
            projectionId: projectionIds[index],
            scopeId: validated.scopeId,
            scopeKind: validated.scopeKind,
            workspaceId: validated.workspaceId,
            messageId: record.messageId,
            blockId: record.blockId,
            ref: record.ref,
            sourceLocator: record.sourceLocator,
            sourceSha256: record.sourceSha256,
            projectionText: record.projectionText,
            projectionSha256: record.projectionSha256,
            tier: record.tier,
            tierRank: record.tierRank,
            originalCharacters: record.originalCharacters,
            originalLines: record.originalLines,
            createdAt: now,
          },
          layer: 'infrastructure',
        })
      ),
      {
        type: 'upsert',
        table: 'context_compaction_cursors',
        conflictTarget: 'cursorId',
        values: {
          cursorId: deterministicId('ctx_cur', validated.scopeId),
          scopeId: validated.scopeId,
          messageOffset: validated.cursor.messageOffset,
          blockOffset: validated.cursor.blockOffset,
          activeStart: validated.cursor.activeStart,
          createdAt: now,
        },
        layer: 'infrastructure',
      },
      {
        type: 'upsert',
        table: 'context_compaction_runs',
        conflictTarget: 'runId',
        values: {
          runId: deterministicId(
            'ctx_run',
            validated.scopeId,
            String(validated.run.startedAt),
            String(validated.run.completedAt),
            validated.run.tier,
            String(validated.cursor.messageOffset),
            String(validated.cursor.blockOffset),
            projectionIds.join(',')
          ),
          scopeId: validated.scopeId,
          trigger: validated.run.trigger,
          tier: validated.run.tier,
          scannedMessages: validated.run.scannedMessages,
          scannedBlocks: validated.run.scannedBlocks,
          compactedBlocks: validated.run.compactedBlocks,
          originalCharacters: validated.run.originalCharacters,
          projectedCharacters: validated.run.projectedCharacters,
          startedAt: validated.run.startedAt,
          completedAt: validated.run.completedAt,
        },
        layer: 'infrastructure',
      },
    ];

    for (const record of validated.records) {
      if (!sourceRows.has(record.sourceSha256)) {
        throw new StorageIntegrityError(
          `Missing prepared source metadata for ${record.sourceSha256}`
        );
      }
    }

    await this.db.writeDurableBatch(operations);

    // Close the CAS-before-metadata garbage-collection race. A concurrent GC
    // can only remove an unreferenced new blob before the SQLite commit; once
    // metadata is durable, rewriting the same content-address restores it.
    await Promise.all(
      preparedSources.map(async (source) => {
        if (await this.storage.exists(source.blobHash)) return;
        if (!source.payload) {
          throw new StorageIntegrityError(
            `Context source disappeared before durability verification: ${source.sourceSha256}`
          );
        }
        const restoredHash = await this.storage.writeBlob(source.payload);
        if (restoredHash !== source.blobHash) {
          throw new StorageIntegrityError(
            `Context source CAS hash changed during durability verification: ${source.sourceSha256}`
          );
        }
      })
    );

    return {
      committed: true,
      recoverySource: validated.recoverySource,
      projectionIds,
      deduplicatedSources,
      storedBytes: preparedSources
        .filter((source) => source.newlyStored)
        .reduce((total, source) => total + source.storedBytes, 0),
    };
  }

  async load(input: ContextCompactionLoadInput): Promise<ContextCompactionLoadResult> {
    this.assertPersistent();
    const scopeId = requireBoundedString(input.scopeId, 'scopeId', 512);
    const requestedLimit = input.limit ?? MAX_SCOPE_PROJECTIONS;
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      throw new AgentGitError('limit must be a positive safe integer', 'INVALID_ARGUMENT');
    }
    const limit = Math.min(requestedLimit, MAX_SCOPE_PROJECTIONS);
    const [rows, cursors] = await Promise.all([
      this.db.selectWhere(
        'context_compaction_projections',
        { column: 'scopeId', value: scopeId },
        undefined,
        { orderBy: { column: 'createdAt', direction: 'desc' }, limit }
      ),
      this.db.selectWhere(
        'context_compaction_cursors',
        { column: 'scopeId', value: scopeId },
        undefined,
        { orderBy: { column: 'createdAt', direction: 'desc' }, limit: 1 }
      ),
    ]);

    const projections: ContextCompactionProjectionRecord[] = rows.map((row) => ({
      projectionId: row.projectionId,
      scopeId: row.scopeId,
      messageId: row.messageId,
      blockId: row.blockId,
      ref: row.ref,
      sourceLocator: row.sourceLocator,
      sourceSha256: row.sourceSha256,
      projectionText: row.projectionText,
      projectionSha256: row.projectionSha256,
      tier: row.tier,
      tierRank: row.tierRank,
      originalCharacters: row.originalCharacters,
      originalLines: row.originalLines,
      createdAt: row.createdAt,
    }));
    const cursor = cursors[0]
      ? {
          messageOffset: cursors[0].messageOffset,
          blockOffset: cursors[0].blockOffset,
          activeStart: cursors[0].activeStart,
        }
      : null;
    return { projections, cursor };
  }

  async hydrate(input: ContextCompactionHydrateInput): Promise<ContextCompactionHydrateResult> {
    this.assertPersistent();
    const scopeId = requireBoundedString(input.scopeId, 'scopeId', 512);
    const messageId = requireBoundedString(input.messageId, 'messageId', 256);
    const blockId = requireBoundedString(input.blockId, 'blockId', 256);
    const sourceSha256 = this.requireHash(input.sourceSha256, 'sourceSha256');
    const projections = await this.db.selectWhere(
      'context_compaction_projections',
      [
        { column: 'scopeId', value: scopeId },
        { column: 'messageId', value: messageId },
        { column: 'blockId', value: blockId },
        { column: 'sourceSha256', value: sourceSha256 },
      ],
      undefined,
      { orderBy: { column: 'createdAt', direction: 'desc' }, limit: 1 }
    );
    if (projections.length === 0) {
      throw new RecoveryError(
        `No context projection matches ${scopeId}/${messageId}/${blockId}/${sourceSha256}`
      );
    }

    const sources = await this.db.selectWhere(
      'context_compaction_sources',
      { column: 'sourceSha256', value: sourceSha256 },
      undefined,
      { limit: 1 }
    );
    const source = sources[0];
    if (!source) {
      throw new RecoveryError(`Context source metadata is missing for ${sourceSha256}`);
    }
    const stored = await this.storage.readBlob(source.blobHash);
    if (!stored) {
      throw new RecoveryError(`Context source blob is missing for ${sourceSha256}`);
    }
    const raw =
      source.codec === 'brotli'
        ? await decompressBrotli(stored)
        : stored;
    if (raw.byteLength !== source.originalBytes || sha256(raw) !== sourceSha256) {
      throw new StorageIntegrityError(
        `Hydrated context source failed integrity verification for ${sourceSha256}`
      );
    }
    const text = raw.toString('utf8');
    if (text.length !== source.originalCharacters || lineCount(text) !== source.originalLines) {
      throw new StorageIntegrityError(
        `Hydrated context source metadata mismatch for ${sourceSha256}`
      );
    }
    return { sourceSha256, text };
  }

  private assertPersistent(): void {
    if (!this.db.isPersistent()) {
      throw new StorageIntegrityError(
        'Context compaction requires a persistent BroccoliDB database'
      );
    }
  }

  private validateCommit(input: ContextCompactionCommitInput): ContextCompactionCommitInput {
    const scopeId = requireBoundedString(input.scopeId, 'scopeId', 512);
    const workspaceId = requireBoundedString(input.workspaceId, 'workspaceId', 256);
    const recoverySource = requireBoundedString(input.recoverySource, 'recoverySource', 1024);
    if (input.scopeKind !== 'task' && input.scopeKind !== 'subagent') {
      throw new AgentGitError('scopeKind must be task or subagent', 'INVALID_ARGUMENT');
    }
    if (!Array.isArray(input.records)) {
      throw new AgentGitError('records must be an array', 'INVALID_ARGUMENT');
    }
    if (input.records.length > MAX_RECORDS_PER_COMMIT) {
      throw new AgentGitError(
        `records exceeds the ${MAX_RECORDS_PER_COMMIT} record commit limit`,
        'INVALID_ARGUMENT'
      );
    }
    const records = input.records.map((record, index) =>
      this.validateProjection(record, `records[${index}]`)
    );
    const cursor: ContextCompactionCursor = {
      messageOffset: requireNonNegativeInteger(input.cursor.messageOffset, 'cursor.messageOffset'),
      blockOffset: requireNonNegativeInteger(input.cursor.blockOffset, 'cursor.blockOffset'),
      activeStart: requireNonNegativeInteger(input.cursor.activeStart, 'cursor.activeStart'),
    };
    const run = {
      trigger: requireBoundedString(input.run.trigger, 'run.trigger', 128),
      tier: requireBoundedString(input.run.tier, 'run.tier', 64),
      scannedMessages: requireNonNegativeInteger(
        input.run.scannedMessages,
        'run.scannedMessages'
      ),
      scannedBlocks: requireNonNegativeInteger(input.run.scannedBlocks, 'run.scannedBlocks'),
      compactedBlocks: requireNonNegativeInteger(
        input.run.compactedBlocks,
        'run.compactedBlocks'
      ),
      originalCharacters: requireNonNegativeInteger(
        input.run.originalCharacters,
        'run.originalCharacters'
      ),
      projectedCharacters: requireNonNegativeInteger(
        input.run.projectedCharacters,
        'run.projectedCharacters'
      ),
      startedAt: requireTimestamp(input.run.startedAt, 'run.startedAt'),
      completedAt: requireTimestamp(input.run.completedAt, 'run.completedAt'),
    };
    if (run.completedAt < run.startedAt) {
      throw new AgentGitError(
        'run.completedAt must not precede run.startedAt',
        'INVALID_ARGUMENT'
      );
    }
    return {
      ...input,
      scopeId,
      workspaceId,
      recoverySource,
      records,
      cursor,
      run,
    };
  }

  private validateProjection(
    record: ContextCompactionProjectionInput,
    field: string
  ): ContextCompactionProjectionInput {
    const messageId = requireBoundedString(record.messageId, `${field}.messageId`, 256);
    const blockId = requireBoundedString(record.blockId, `${field}.blockId`, 256);
    const ref = requireBoundedString(record.ref, `${field}.ref`, 1024);
    const sourceLocator = requireBoundedString(
      record.sourceLocator,
      `${field}.sourceLocator`,
      1024
    );
    const tier = requireBoundedString(record.tier, `${field}.tier`, 64);
    const sourceSha256 = this.requireHash(record.sourceSha256, `${field}.sourceSha256`);
    const projectionSha256 = this.requireHash(
      record.projectionSha256,
      `${field}.projectionSha256`
    );
    const sourceBytes = Buffer.byteLength(record.sourceText, 'utf8');
    const projectionBytes = Buffer.byteLength(record.projectionText, 'utf8');
    if (sourceBytes > MAX_SOURCE_BYTES) {
      throw new AgentGitError(
        `${field}.sourceText exceeds ${MAX_SOURCE_BYTES} bytes`,
        'INVALID_ARGUMENT'
      );
    }
    if (projectionBytes > MAX_PROJECTION_BYTES) {
      throw new AgentGitError(
        `${field}.projectionText exceeds ${MAX_PROJECTION_BYTES} bytes`,
        'INVALID_ARGUMENT'
      );
    }
    if (sha256(record.sourceText) !== sourceSha256) {
      throw new StorageIntegrityError(`${field}.sourceSha256 does not match sourceText`);
    }
    if (sha256(record.projectionText) !== projectionSha256) {
      throw new StorageIntegrityError(
        `${field}.projectionSha256 does not match projectionText`
      );
    }
    if (record.originalCharacters !== record.sourceText.length) {
      throw new AgentGitError(
        `${field}.originalCharacters does not match sourceText`,
        'INVALID_ARGUMENT'
      );
    }
    if (record.originalLines !== lineCount(record.sourceText)) {
      throw new AgentGitError(
        `${field}.originalLines does not match sourceText`,
        'INVALID_ARGUMENT'
      );
    }
    return {
      ...record,
      messageId,
      blockId,
      ref,
      sourceLocator,
      sourceSha256,
      projectionSha256,
      tier,
      tierRank: requireNonNegativeInteger(record.tierRank, `${field}.tierRank`),
      originalCharacters: requireNonNegativeInteger(
        record.originalCharacters,
        `${field}.originalCharacters`
      ),
      originalLines: requireNonNegativeInteger(record.originalLines, `${field}.originalLines`),
    };
  }

  private requireHash(value: string, field: string): string {
    const hash = requireBoundedString(value, field, 64).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      throw new AgentGitError(`${field} must be a valid SHA-256 hash`, 'INVALID_ARGUMENT');
    }
    return hash;
  }

  private uniqueSources(
    records: readonly ContextCompactionProjectionInput[]
  ): ContextCompactionProjectionInput[] {
    const unique = new Map<string, ContextCompactionProjectionInput>();
    for (const record of records) {
      unique.set(record.sourceSha256, record);
    }
    return [...unique.values()];
  }

  private async loadSourceRows(sourceHashes: string[]): Promise<SourceRow[]> {
    if (sourceHashes.length === 0) return [];
    return this.db.selectWhere('context_compaction_sources', {
      column: 'sourceSha256',
      value: sourceHashes,
      operator: 'IN',
    });
  }

  private async prepareSource(
    record: ContextCompactionProjectionInput
  ): Promise<PreparedSource> {
    const original = Buffer.from(record.sourceText, 'utf8');
    let payload = original;
    let codec: PreparedSource['codec'] = 'identity';
    if (original.byteLength >= BROTLI_MINIMUM_BYTES) {
      const compressed = await compressBrotli(original, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: original.byteLength,
        },
      });
      if (compressed.byteLength < original.byteLength * BROTLI_MINIMUM_SAVINGS_RATIO) {
        payload = compressed;
        codec = 'brotli';
      }
    }
    const blobHash = await this.storage.writeBlob(payload);
    const now = Date.now();
    return {
      sourceSha256: record.sourceSha256,
      blobHash,
      codec,
      originalCharacters: record.originalCharacters,
      originalBytes: original.byteLength,
      originalLines: record.originalLines,
      storedBytes: payload.byteLength,
      createdAt: now,
      lastAccessedAt: now,
      payload,
      newlyStored: true,
    };
  }
}
