import type { ServiceContext, MemoryMessage, ToolDef } from './types.js';
import { TokenService } from './TokenService.js';
import { SovereignPolicy } from './SovereignPolicy.js';
import {
  StreamingToolExecutor,
  type ToolExecutorOptions,
  type ToolResult,
} from './StreamingToolExecutor.js';
import { createHash } from 'node:crypto';

export interface QueryState {
  messages: MemoryMessage[];
  turnCount: number;
  toolRounds: number;
  tokensUsed: number;
  status: 'active' | 'completed' | 'failed' | 'compacting';
  lastToolResults?: ToolResult[];
}

export interface QueryLoopOptions {
  tools?: ToolDef[];
  toolExecutorOptions?: ToolExecutorOptions;
  model?: string;
  maxTokens?: number;
  maxToolRounds?: number;
  systemPrompt?: string;
}

/**
 * QueryLoop orchestrates the autonomous execution of an agentic turn.
 * Ported and hardened from src/query.ts.
 */
export class QueryLoop {
  private state: QueryState;

  constructor(
    private ctx: ServiceContext,
    initialMessages: MemoryMessage[],
    private options: QueryLoopOptions = {}
  ) {
    this.state = {
      messages: initialMessages,
      turnCount: 0,
      toolRounds: 0,
      tokensUsed: TokenService.countTokensWithEstimation(initialMessages),
      status: 'active',
    };
  }

  /**
   * Runs the autonomous query loop until completion or max turns reached.
   */
  async* run(maxTurns: number = 20): AsyncGenerator<string, QueryState> {
    while (this.state.turnCount < maxTurns && this.state.status === 'active') {
      this.state.turnCount++;
      
      // 1. High-Throughput Compaction Barrier Check
      const CONTEXT_WINDOW_LIMIT = 200000;
      const COMPACT_THRESHOLD_PERCENT = 0.8;
      if (this.state.tokensUsed >= CONTEXT_WINDOW_LIMIT * COMPACT_THRESHOLD_PERCENT) {
        if (this.ctx.compact && typeof (this.ctx.compact as any).commit === 'function') {
          await this.ctx.mailbox?.postStatus?.(this.ctx.userId, 'compacting');
          const lastMsg = this.state.messages[this.state.messages.length - 1];
          if (lastMsg) {
            const sourceSha = createHash('sha256').update(lastMsg.content).digest('hex');
            const now = Date.now();
            try {
              await (this.ctx.compact as any).commit({
                scopeId: `query_loop_${this.ctx.userId}`,
                scopeKind: 'subagent',
                workspaceId: this.ctx.workspace?.workspaceId || 'workspace',
                recoverySource: `broccolidb://context/query_loop_${this.ctx.userId}`,
                records: [
                  {
                    messageId: `msg_${this.state.turnCount}`,
                    blockId: `blk_${this.state.turnCount}`,
                    ref: `msg_${this.state.turnCount}:blk_${this.state.turnCount}`,
                    sourceLocator: `broccolidb://context/query_loop_${this.ctx.userId}`,
                    sourceText: lastMsg.content,
                    sourceSha256: sourceSha,
                    projectionText: lastMsg.content,
                    projectionSha256: sourceSha,
                    tier: 'micro',
                    tierRank: 1,
                    originalCharacters: lastMsg.content.length,
                    originalLines: lastMsg.content.split('\n').length,
                  },
                ],
                cursor: { messageOffset: this.state.turnCount, blockOffset: 0, activeStart: 0 },
                run: {
                  trigger: 'query_loop_boundary',
                  tier: 'micro',
                  scannedMessages: this.state.messages.length,
                  scannedBlocks: 1,
                  compactedBlocks: 1,
                  originalCharacters: lastMsg.content.length,
                  projectedCharacters: lastMsg.content.length,
                  startedAt: now,
                  completedAt: now,
                },
              });
              yield `[QueryLoop] ⚡ High-throughput context projection committed at turn ${this.state.turnCount}.`;
            } catch (err) {
              // High-throughput barrier fallback
            }
          }
        }
      }

      const currentMessage = this.state.messages[this.state.messages.length - 1];
      if (!currentMessage) {
        this.state.status = 'failed';
        throw new Error('[QueryLoop] No messages available for completion.');
      }

      // 2. AI Completion
      yield `[QueryLoop] 🧠 Calling AI (Turn ${this.state.turnCount})...`;
      
      const response = await this.ctx.aiService?.completeOneOff(
        currentMessage.content,
        {
          model: (this.options.model || 'sonnet') as any,
          maxTokens: this.options.maxTokens ?? 4000,
          system: this.options.systemPrompt || SovereignPolicy.SPIDER_THEORY.CORE_DIRECTIVE
        }
      );

      if (!response) {
        this.state.status = 'failed';
        throw new Error('[QueryLoop] 💥 AI Service returned null response.');
      }

      const assistantMessage: MemoryMessage = {
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
      };
      
      this.state.messages.push(assistantMessage);
      this.state.tokensUsed += TokenService.roughTokenCountEstimation(response.text);

      yield `[Assistant] ${response.text.slice(0, 100)}...`;

      // 3. Tool Execution Handling
      const tools = this.getAvailableTools();
      const toolCalls = StreamingToolExecutor.parseToolCallsFromText(response.text, tools);
      if (toolCalls.length > 0) {
        if (tools.length === 0) {
          this.state.status = 'failed';
          yield `[QueryLoop] Tool calls were emitted, but no tools are configured.`;
          break;
        }

        const maxToolRounds = this.options.maxToolRounds ?? 4;
        if (this.state.toolRounds >= maxToolRounds) {
          this.state.status = 'failed';
          yield `[QueryLoop] Maximum tool round limit (${maxToolRounds}) reached.`;
          break;
        }

        this.state.toolRounds++;
        yield `[QueryLoop] Executing ${toolCalls.length} tool call(s) in round ${this.state.toolRounds}.`;

        const executor = new StreamingToolExecutor(tools, this.ctx, this.options.toolExecutorOptions);
        const toolResults: ToolResult[] = [];
        for await (const result of executor.executeBatch(toolCalls)) {
          toolResults.push(result);
          const status = result.isError ? 'error' : 'ok';
          yield `[Tool:${result.metadata?.toolName || result.toolUseId}] ${status}`;
        }

        this.state.lastToolResults = toolResults;
        const toolResultMessage: MemoryMessage = {
          role: 'system',
          content: StreamingToolExecutor.formatToolResultsForPrompt(toolResults),
          timestamp: Date.now(),
        };
        this.state.messages.push(toolResultMessage);
        this.state.tokensUsed += TokenService.roughTokenCountEstimation(toolResultMessage.content);
        continue;
      }
      
      if (response.text.includes('<spawnWorker>') || response.text.includes('spawnWorker(')) {
          yield `[QueryLoop] 🐝 Worker spawn detected in output. Proceeding to task coordination.`;
          // Task coordination logic would live here, calling CoordinatorService.
      } else {
          this.state.status = 'completed';
      }
    }

    if (this.state.turnCount >= maxTurns) {
      this.state.status = 'failed';
      yield `[QueryLoop] ⚠️  Maximum turn limit (${maxTurns}) reached.`;
    }

    return this.state;
  }

  public getState(): QueryState {
    return this.state;
  }

  private getAvailableTools(): ToolDef[] {
    return this.options.tools ?? this.ctx.toolUseContext?.options.tools ?? [];
  }
}
