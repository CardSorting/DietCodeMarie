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
import { InvariantEngine } from '../core/agent-context/InvariantEngine.js';
import { TokenRateGovernor } from '../core/agent-context/TokenService.js';
import type { TaskItem } from '../core/agent-context/types.js';

test('Universal Zenith Pass - 4-Pillar Diagnostic Probes, Task DAG Scheduling & Token Governor', async (t) => {
  const testDir = join(tmpdir(), `broccolidb-zenith-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  const dbPath = join(testDir, 'zenith.db');
  setDbPath(dbPath);
  const pool = new BufferedDbPool();
  const workspace = new Workspace(pool, 'zenith-user', 'zenith-workspace');
  workspace.setPhysicalPath(testDir);
  const context = new AgentContext(workspace, pool, 'zenith-user');

  await context.start();

  t.after(async () => {
    await context.stop();
    await rm(testDir, { recursive: true, force: true });
  });

  await t.test('runZenithDiagnosticProbe executes 4-pillar forensic audit', async () => {
    const invEngine = new InvariantEngine(testDir);
    const probe = await invEngine.runZenithDiagnosticProbe((context as any)._serviceContext);

    assert.equal(probe.ok, true);
    assert.ok(probe.pillarReports.diskInvariants);
    assert.ok(probe.pillarReports.casStorageIntegrity);
    assert.ok(probe.pillarReports.dbPoolHealth);
    assert.ok(probe.pillarReports.epistemicGraph);
  });

  await t.test('TaskService manages DAG dependencies and cascade resolution', async () => {
    const taskService = (context as any)._taskService;

    // Register upstream task 1
    await pool.push({
      type: 'insert',
      table: 'tasks',
      values: {
        id: 'task-parent-1',
        userId: 'zenith-user',
        agentId: 'worker-1',
        status: 'active',
        description: 'Upstream research task',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Register downstream task 2 depending on task 1
    await pool.push({
      type: 'insert',
      table: 'tasks',
      values: {
        id: 'task-child-2',
        userId: 'zenith-user',
        agentId: 'worker-2',
        status: 'pending',
        description: 'Downstream implementation task',
        dependsOnTaskIds: JSON.stringify(['task-parent-1']),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    // Initially child-2 is blocked because parent-1 is not completed
    const execBefore = await taskService.getExecutableTasks();
    const isChildExecBefore = execBefore.some((t: TaskItem) => t.taskId === 'task-child-2');
    assert.equal(isChildExecBefore, false);

    // Resolve parent-1 completion cascade
    const resolved = await taskService.resolveTaskCascade('task-parent-1', 'completed');
    assert.ok(resolved.includes('task-parent-1'));
    assert.ok(resolved.includes('task-child-2'));

    // Now child-2 should be active / executable
    const childTask = await taskService.getTask('task-child-2');
    assert.equal(childTask.status, 'active');
  });

  await t.test('TokenRateGovernor manages token bucket consumption and refill', async () => {
    const governor = new TokenRateGovernor(1000, 100);
    assert.ok(governor.getAvailableTokens() <= 1000);

    const res1 = await governor.acquire(500);
    assert.equal(res1.acquired, true);
    assert.equal(res1.waitMs, 0);

    const res2 = await governor.acquire(1000);
    assert.equal(res2.acquired, false);
    assert.ok(res2.waitMs > 0);
  });
});
