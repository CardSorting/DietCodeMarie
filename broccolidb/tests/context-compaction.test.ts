import assert from 'node:assert';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AgentContext } from '../core/agent-context.js';
import { StorageIntegrityError } from '../core/errors.js';
import { Workspace } from '../core/workspace.js';
import { BufferedDbPool } from '../infrastructure/db/BufferedDbPool.js';
import { setDbPath } from '../infrastructure/db/Config.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function runContextCompactionTests(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broccolidb-context-compaction-'));
  setDbPath(path.join(root, 'compaction.db'));
  const pool = new BufferedDbPool();
  const workspace = new Workspace(pool, 'compaction-user', 'compaction-workspace');
  workspace.setPhysicalPath(root);
  const context = new AgentContext(workspace, pool, 'compaction-user');

  try {
    await context.start();
    const sourceText = Array.from(
      { length: 4_000 },
      (_, index) => `const repeatedValue${index % 20} = "highly compressible context";`
    ).join('\n');
    const firstProjection = '<system_context_projection schema="2"/> first';
    const secondProjection = '<system_context_projection schema="2"/> refined';
    const startedAt = Date.now();
    const baseInput = {
      scopeId: 'task:durability',
      scopeKind: 'task' as const,
      workspaceId: 'compaction-workspace',
      recoverySource: 'broccolidb://context/task%3Adurability',
      cursor: { messageOffset: 3, blockOffset: 1, activeStart: 2 },
      run: {
        trigger: 'test',
        tier: 'micro',
        scannedMessages: 4,
        scannedBlocks: 2,
        compactedBlocks: 1,
        originalCharacters: sourceText.length,
        projectedCharacters: firstProjection.length,
        startedAt,
        completedAt: startedAt,
      },
    };

    const first = await context.compaction.commit({
      ...baseInput,
      records: [
        {
          messageId: 'ctx_msg_durable',
          blockId: 'ctx_blk_durable',
          ref: 'ctx_msg_durable:ctx_blk_durable',
          sourceLocator: baseInput.recoverySource,
          sourceText,
          sourceSha256: sha256(sourceText),
          projectionText: firstProjection,
          projectionSha256: sha256(firstProjection),
          tier: 'micro',
          tierRank: 1,
          originalCharacters: sourceText.length,
          originalLines: 4_000,
        },
      ],
    });
    assert.strictEqual(first.committed, true);
    assert.strictEqual(first.projectionIds.length, 1);
    assert.ok(first.storedBytes > 0);
    assert.ok(first.storedBytes < Buffer.byteLength(sourceText));

    const sourceRows = await pool.selectWhere('context_compaction_sources', {
      column: 'sourceSha256',
      value: sha256(sourceText),
    });
    assert.strictEqual(sourceRows.length, 1);
    assert.strictEqual(sourceRows[0].codec, 'brotli');
    assert.ok(sourceRows[0].storedBytes < sourceRows[0].originalBytes);

    const second = await context.compaction.commit({
      ...baseInput,
      records: [
        {
          messageId: 'ctx_msg_durable',
          blockId: 'ctx_blk_durable',
          ref: 'ctx_msg_durable:ctx_blk_durable',
          sourceLocator: baseInput.recoverySource,
          sourceText,
          sourceSha256: sha256(sourceText),
          projectionText: secondProjection,
          projectionSha256: sha256(secondProjection),
          tier: 'emergency',
          tierRank: 6,
          originalCharacters: sourceText.length,
          originalLines: 4_000,
        },
      ],
      run: {
        ...baseInput.run,
        tier: 'emergency',
        projectedCharacters: secondProjection.length,
        startedAt: startedAt + 1,
        completedAt: startedAt + 1,
      },
    });
    assert.strictEqual(second.projectionIds[0], first.projectionIds[0]);
    assert.strictEqual(second.deduplicatedSources, 1);
    assert.strictEqual(second.storedBytes, 0);

    const loaded = await context.compaction.load({ scopeId: baseInput.scopeId });
    assert.strictEqual(loaded.projections.length, 1);
    assert.strictEqual(loaded.projections[0].projectionText, secondProjection);
    assert.strictEqual(loaded.projections[0].tierRank, 6);
    assert.deepStrictEqual(loaded.cursor, baseInput.cursor);

    const hydrated = await context.compaction.hydrate({
      scopeId: baseInput.scopeId,
      messageId: 'ctx_msg_durable',
      blockId: 'ctx_blk_durable',
      sourceSha256: sha256(sourceText),
    });
    assert.strictEqual(hydrated.text, sourceText);

    const gc = await context.recovery.performGarbageCollection();
    assert.strictEqual(gc.prunedBlobs, 0);
    const hydratedAfterGc = await context.compaction.hydrate({
      scopeId: baseInput.scopeId,
      messageId: 'ctx_msg_durable',
      blockId: 'ctx_blk_durable',
      sourceSha256: sha256(sourceText),
    });
    assert.strictEqual(hydratedAfterGc.text, sourceText);

    const blobPath = path.join(
      root,
      '.broccolidb',
      'storage',
      'blobs',
      sourceRows[0].blobHash.slice(0, 2),
      sourceRows[0].blobHash
    );
    fs.writeFileSync(blobPath, 'corrupt');
    await assert.rejects(
      () =>
        context.compaction.hydrate({
          scopeId: baseInput.scopeId,
          messageId: 'ctx_msg_durable',
          blockId: 'ctx_blk_durable',
          sourceSha256: sha256(sourceText),
        }),
      StorageIntegrityError
    );
  } finally {
    await context.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  }
}

runContextCompactionTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('context-compaction.test failed:', error);
    process.exit(1);
  });
