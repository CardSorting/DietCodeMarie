// [LAYER: CORE]
// @classification CAPABILITY
import { CapabilityBase } from '../CapabilityBase.js';
import type { ContextCompactionService } from '../ContextCompactionService.js';
import type { IntentTracer } from '../IntentTracer.js';
import type {
  ContextCompactionCommitInput,
  ContextCompactionCommitResult,
  ContextCompactionHydrateInput,
  ContextCompactionHydrateResult,
  ContextCompactionLoadInput,
  ContextCompactionLoadResult,
} from '../capability-types.js';

export class CompactionCapability extends CapabilityBase {
  readonly name = 'compaction' as const;
  readonly dependencies = ['BufferedDbPool', 'StorageService'] as const;

  constructor(
    private readonly compaction: ContextCompactionService,
    assertStarted: (operation: string) => void,
    isStarted: () => boolean,
    intentTracer: IntentTracer
  ) {
    super(assertStarted, isStarted, intentTracer);
  }

  async commit(input: ContextCompactionCommitInput): Promise<ContextCompactionCommitResult> {
    return this.execute('commit', () => this.compaction.commit(input), {
      input,
      inputSummary: {
        scopeId: input.scopeId,
        scopeKind: input.scopeKind,
        recordCount: input.records.length,
        sourceCharacters: input.records.reduce(
          (total, record) => total + record.sourceText.length,
          0
        ),
      },
      expectedEffects: [
        'StorageService.writeBlob',
        'BufferedDbPool.writeDurableBatch',
      ],
      durability: 'durable',
      summarizeResult: (result) => ({
        projectionCount: result.projectionIds.length,
        deduplicatedSources: result.deduplicatedSources,
        storedBytes: result.storedBytes,
      }),
    });
  }

  async load(input: ContextCompactionLoadInput): Promise<ContextCompactionLoadResult> {
    return this.execute('load', () => this.compaction.load(input), {
      input,
      inputSummary: { scopeId: input.scopeId, limit: input.limit },
      expectedEffects: ['BufferedDbPool.selectWhere'],
      durability: 'ephemeral',
      summarizeResult: (result) => ({
        projectionCount: result.projections.length,
        hasCursor: result.cursor !== null,
      }),
    });
  }

  async hydrate(input: ContextCompactionHydrateInput): Promise<ContextCompactionHydrateResult> {
    return this.execute('hydrate', () => this.compaction.hydrate(input), {
      input,
      inputSummary: {
        scopeId: input.scopeId,
        messageId: input.messageId,
        blockId: input.blockId,
        sourceSha256: input.sourceSha256,
      },
      expectedEffects: ['BufferedDbPool.selectWhere', 'StorageService.readBlob'],
      durability: 'ephemeral',
      summarizeResult: (result) => ({
        sourceSha256: result.sourceSha256,
        characters: result.text.length,
      }),
    });
  }
}
