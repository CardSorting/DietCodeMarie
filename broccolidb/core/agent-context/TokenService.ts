// [LAYER: CORE]
import type { MemoryMessage } from './types.js';

/**
 * TokenService provides accurate-enough token counting for context window management.
 * Ported from src/utils/tokens.ts and src/services/tokenEstimation.ts.
 */
export class TokenService {
  /**
   * Estimates token count for a single message.
   */
  public static roughTokenCountEstimation(content: string, bytesPerToken: number = 4): number {
    return Math.round(content.length / bytesPerToken);
  }

  /**
   * Estimates token count for a list of messages.
   */
  public static estimateMessages(messages: MemoryMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      // Heuristic: 4 chars per token for text
      total += this.roughTokenCountEstimation(msg.content);
      // Overhead for roles/metadata
      total += 20;
    }
    return total;
  }

  /**
   * Adaptive token counting that handles "thinking" blocks and tool usage.
   * In a real app, this would use the Anthropic /count_tokens API.
   * For BroccoliDB, we use the character-ratio fallback.
   */
  public static countTokensWithEstimation(messages: MemoryMessage[]): number {
    // If messages have usage metadata from a real API response, use that as anchor.
    // Otherwise, fallback to full estimation.
    return this.estimateMessages(messages);
  }
}

/**
 * TokenRateGovernor provides thread-safe Token Bucket rate governance
 * for managing AI model token consumption and multi-agent swarm backpressure.
 */
export class TokenRateGovernor {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number = 100000,
    private readonly fillRatePerMs: number = 100000 / 60000
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.fillRatePerMs);
    this.lastRefill = now;
  }

  public async acquire(requiredTokens: number): Promise<{ acquired: boolean; waitMs: number }> {
    this.refill();
    if (this.tokens >= requiredTokens) {
      this.tokens -= requiredTokens;
      return { acquired: true, waitMs: 0 };
    }
    const missing = requiredTokens - this.tokens;
    const waitMs = Math.ceil(missing / this.fillRatePerMs);
    return { acquired: false, waitMs };
  }

  public async acquireOrWait(requiredTokens: number): Promise<void> {
    const res = await this.acquire(requiredTokens);
    if (!res.acquired && res.waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(res.waitMs, 5000)));
      this.refill();
      this.tokens = Math.max(0, this.tokens - requiredTokens);
    }
  }

  public getAvailableTokens(): number {
    this.refill();
    return Math.round(this.tokens);
  }
}
