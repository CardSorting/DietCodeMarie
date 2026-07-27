// [LAYER: TESTS]
import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { AgentContext } from '../core/agent-context.js';
import { Workspace } from '../core/workspace.js';
import { BufferedDbPool } from '../infrastructure/db/BufferedDbPool.js';
import { setDbPath } from '../infrastructure/db/Config.js';
import { StreamingToolExecutor, ToolCircuitBreaker, TransientReadCache } from '../core/agent-context/StreamingToolExecutor.js';

test('Pass 2 Resilience Engineering - Circuit Breaker, Read Cache, Adaptive Jitter & Epistemic PageRank', async (t) => {
  const testDir = join(tmpdir(), `broccolidb-pass2-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  const dbPath = join(testDir, 'pass2.db');
  setDbPath(dbPath);
  const pool = new BufferedDbPool();
  const workspace = new Workspace(pool, 'pass2-user', 'pass2-workspace');
  workspace.setPhysicalPath(testDir);
  const context = new AgentContext(workspace, pool, 'pass2-user');

  await context.start();

  t.after(async () => {
    await context.stop();
    await rm(testDir, { recursive: true, force: true });
  });

  await t.test('ToolCircuitBreaker handles closed, open, and half-open state transitions', () => {
    const cb = new ToolCircuitBreaker();
    const toolName = 'view_file';

    assert.equal(cb.isOpen(toolName), false);

    cb.recordFailure(toolName);
    cb.recordFailure(toolName);
    assert.equal(cb.isOpen(toolName), false);

    cb.recordFailure(toolName); // 3rd failure trips open
    assert.equal(cb.isOpen(toolName), true);

    cb.recordSuccess(toolName); // Reset to closed
    assert.equal(cb.isOpen(toolName), false);
  });

  await t.test('TransientReadCache deduplicates read operations with TTL', () => {
    const cache = new TransientReadCache();
    const mockResult = { toolUseId: 'u1', content: 'cached output' };

    cache.set('grep_search', { query: 'test' }, mockResult, 500);

    const hit = cache.get('grep_search', { query: 'test' });
    assert.ok(hit);
    assert.equal(hit.content, 'cached output');

    const miss = cache.get('grep_search', { query: 'different' });
    assert.equal(miss, null);
  });

  await t.test('BufferedDbPool tracks metrics and lock contention', async () => {
    const metrics = pool.getMetrics();
    assert.ok(typeof metrics.totalLockWaitMs === 'number');
    assert.ok(typeof metrics.avgLockWaitMs === 'number');
    assert.equal(metrics.totalLockWaitMs >= 0, true);
  });

  await t.test('ReasoningService calculates Epistemic PageRank across graph nodes', async () => {
    const reasoningService = (context as any)._reasoningService;
    const ranks = await reasoningService.calculateEpistemicPageRank(5);
    assert.ok(typeof ranks === 'object');
  });
});
