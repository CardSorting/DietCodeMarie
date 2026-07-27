// [LAYER: TESTS]
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { AgentContext } from '../core/agent-context.js';
import { Workspace } from '../core/workspace.js';
import { BufferedDbPool } from '../infrastructure/db/BufferedDbPool.js';
import { setDbPath } from '../infrastructure/db/Config.js';
import type { ContextCompactionCommitInput } from '../core/agent-context/capability-types.js';

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

test('ContextCompactionService - Hierarchical Projections, Telemetry, Mark-Sweep GC & Integrity Verification', async (t) => {
  const testDir = join(tmpdir(), `broccolidb-test-advanced-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  const dbPath = join(testDir, 'test.db');
  setDbPath(dbPath);
  const pool = new BufferedDbPool();
  const workspace = new Workspace(pool, 'test-user', 'test-workspace');
  workspace.setPhysicalPath(testDir);
  const context = new AgentContext(workspace, pool, 'test-user');

  await context.start();

  t.after(async () => {
    await context.stop();
    await rm(testDir, { recursive: true, force: true });
  });

  await t.test('commits hierarchical projections with parentProjectionId and telemetry stats', async () => {
    const parentText = 'Parent Context: High-level architectural digest of the system graph.';
    const parentSha = sha256(parentText);
    const projText1 = 'Summary: Architecture digest tier 1';
    const projSha1 = sha256(projText1);

    const input1: ContextCompactionCommitInput = {
      scopeId: 'scope-tree-1',
      scopeKind: 'task',
      workspaceId: 'test-workspace',
      recoverySource: 'test-recovery',
      records: [
        {
          messageId: 'msg-1',
          blockId: 'blk-1',
          ref: 'ref-1',
          sourceLocator: 'loc-1',
          sourceText: parentText,
          sourceSha256: parentSha,
          projectionText: projText1,
          projectionSha256: projSha1,
          tier: 'summary',
          tierRank: 10,
          originalCharacters: parentText.length,
          originalLines: 1,
        },
      ],
      cursor: { messageOffset: 1, blockOffset: 1, activeStart: 0 },
      run: {
        trigger: 'manual',
        tier: 'summary',
        scannedMessages: 1,
        scannedBlocks: 1,
        compactedBlocks: 1,
        originalCharacters: parentText.length,
        projectedCharacters: projText1.length,
        startedAt: Date.now() - 100,
        completedAt: Date.now(),
      },
    };

    const res1 = await context.compaction.commit(input1);
    assert.equal(res1.committed, true);
    assert.equal(res1.projectionIds.length, 1);
    assert.ok(res1.telemetry);
    assert.equal(res1.telemetry.originalBytes, Buffer.byteLength(parentText));
    assert.ok(res1.telemetry.compressionRatio > 0);

    const parentProjId = res1.projectionIds[0];

    // Child projection linking back to parentProjId
    const childText = 'Child Context: Detail block child of tier 1 digest.';
    const childSha = sha256(childText);
    const projText2 = 'Child Summary';
    const projSha2 = sha256(projText2);

    const input2: ContextCompactionCommitInput = {
      scopeId: 'scope-tree-1',
      scopeKind: 'task',
      workspaceId: 'test-workspace',
      recoverySource: 'test-recovery',
      records: [
        {
          messageId: 'msg-2',
          blockId: 'blk-2',
          ref: 'ref-2',
          sourceLocator: 'loc-2',
          sourceText: childText,
          sourceSha256: childSha,
          projectionText: projText2,
          projectionSha256: projSha2,
          tier: 'digest',
          tierRank: 20,
          originalCharacters: childText.length,
          originalLines: 1,
          parentProjectionId: parentProjId,
        },
      ],
      cursor: { messageOffset: 2, blockOffset: 2, activeStart: 0 },
      run: {
        trigger: 'manual',
        tier: 'digest',
        scannedMessages: 2,
        scannedBlocks: 2,
        compactedBlocks: 2,
        originalCharacters: childText.length,
        projectedCharacters: projText2.length,
        startedAt: Date.now() - 50,
        completedAt: Date.now(),
      },
    };

    const res2 = await context.compaction.commit(input2);
    assert.equal(res2.committed, true);

    // Load projections and verify parent link
    const loaded = await context.compaction.load({ scopeId: 'scope-tree-1' });
    assert.equal(loaded.projections.length, 2);
    const childRec = loaded.projections.find((p) => p.messageId === 'msg-2');
    assert.ok(childRec);
    assert.equal(childRec.parentProjectionId, parentProjId);
  });

  await t.test('runs integrity verification on context compaction storage', async () => {
    const report = await (context as any)._contextCompactionService.verifyIntegrity('scope-tree-1');
    assert.ok(report.checked >= 2);
    assert.equal(report.corrupted, 0);
    assert.equal(report.healthy, report.checked);
  });

  await t.test('executes Two-Phase Mark-Sweep GC in CleanupService via recovery capability', async () => {
    const gcRes = await (context as any)._cleanupService.performGarbageCollection();
    assert.ok(typeof gcRes.prunedBlobs === 'number');
  });
});
