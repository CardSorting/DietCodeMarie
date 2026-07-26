import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ArenaAllocator } from '../core/policy/spider/ArenaAllocator.js';
import { LockFreeRingBuffer } from '../core/policy/spider/IPCBuffer.js';
import { FastIPC } from '../core/policy/spider/FastIPC.js';
import { TaskScheduler, WorkStealingDeque } from '../core/policy/spider/TaskScheduler.js';
import { ZenIOEngine } from '../core/policy/spider/ZenIOEngine.js';
import { FindingEntry, processNodesFast, processNodeInlined, NodeStateFlags } from '../core/policy/spider/AgentDigest.js';
import { SpiderWorkerPool } from '../core/policy/spider/SpiderWorkerPool.js';

describe('Pass 6, 7 & 8: V8 Mechanical Sympathy, Zero-GC Arena & Non-Blocking Reactive Architecture', () => {

  test('1. ArenaAllocator — 16MB slab checkout, raw byte streaming & O(1) reset', () => {
    const arena = new ArenaAllocator(16 * 1024 * 1024);
    assert.equal(arena.getOffset(), 0);

    const ptr1 = arena.allocateNode(101, NodeStateFlags.IsInternal);
    assert.equal(ptr1, 0);

    const ptr2 = arena.allocateNode(102, NodeStateFlags.HasFindings);
    assert.equal(ptr2, 2);

    assert.equal(arena.getOffset(), 4);
    const view = arena.getUint32View();
    assert.equal(view[0], 101);
    assert.equal(view[1], NodeStateFlags.IsInternal);
    assert.equal(view[2], 102);
    assert.equal(view[3], NodeStateFlags.HasFindings);

    const byteOffset = arena.allocateRawBytes(100);
    assert.equal(byteOffset, 16); // 4 words * 4 bytes = 16

    arena.reset();
    assert.equal(arena.getOffset(), 0);
  });

  test('2. LockFreeRingBuffer & FastIPC — Atomic operations over SharedArrayBuffer', () => {
    const sab = LockFreeRingBuffer.createBuffer(16);
    const ring = new LockFreeRingBuffer(sab);

    assert.equal(ring.push(42), true);
    assert.equal(ring.push(99), true);
    assert.equal(ring.getLength(), 2);

    assert.equal(ring.pop(), 42);
    assert.equal(ring.pop(), 99);
    assert.equal(ring.pop(), null);

    const fastSab = FastIPC.createSharedBuffer(32);
    const fastIpc = new FastIPC(fastSab);
    const batch = new Uint32Array([10, 20, 30, 40]);

    assert.equal(fastIpc.pushBatch(batch), true);
    const popped = fastIpc.popBatch(4);
    assert.deepEqual(Array.from(popped), [10, 20, 30, 40]);
  });

  test('3. TaskScheduler & WorkStealingDeque — Lock-free work stealing', () => {
    const deque = new WorkStealingDeque(16);
    deque.push(1);
    deque.push(2);
    deque.push(3);

    // LIFO pop from top
    assert.equal(deque.pop(), 3);

    // FIFO steal from bottom
    assert.equal(deque.steal(), 1);
    assert.equal(deque.pop(), 2);
    assert.equal(deque.pop(), null);

    const scheduler = new TaskScheduler(2, 16);
    scheduler.submitTask(0, 100);
    scheduler.submitTask(0, 200);

    // Worker 1 steals from Worker 0 when local queue is empty
    assert.equal(scheduler.getNextTask(1), 100);
    assert.equal(scheduler.getNextTask(0), 200);
    assert.equal(scheduler.getNextTask(0), null);
  });

  test('4. ZenIOEngine — Zero-copy kernel disk streaming directly into Arena', () => {
    const zen = new ZenIOEngine();
    const arena = new ArenaAllocator(1 * 1024 * 1024);
    const tmpFile = path.join(process.cwd(), '.broccolidb', 'test_zen_io.tmp');

    fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
    fs.writeFileSync(tmpFile, 'HELLO_BROCCOLIDB_ZEN_IO_ENGINE', 'utf8');

    const byteOffset = zen.streamFileToArena(tmpFile, arena);
    const slice = new Uint8Array(arena.getBuffer(), byteOffset, 30);
    const readText = Buffer.from(slice).toString('utf8');

    assert.equal(readText, 'HELLO_BROCCOLIDB_ZEN_IO_ENGINE');

    zen.close();
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  test('5. V8 TurboFan Monomorphism & processNodesFast bitwise execution', () => {
    const entry1 = new FindingEntry(1, 'ERROR', 'src/a.ts');
    const entry2 = new FindingEntry(2, 'WARN', null);

    assert.equal(entry1.id, 1);
    assert.equal(entry1.type, 'ERROR');
    assert.equal(entry1.file, 'src/a.ts');
    assert.equal(entry2.file, null);

    const nodeIds = new Uint32Array([10, 20, 30]);
    const nodeFlags = new Uint8Array([NodeStateFlags.IsInternal, NodeStateFlags.None, NodeStateFlags.IsInternal]);

    processNodesFast(nodeIds, nodeFlags, 3);

    assert.equal(nodeIds[0], 10 ^ 0x5a5a5a5a);
    assert.equal(nodeIds[1], 20);
    assert.equal(nodeIds[2], 30 ^ 0x5a5a5a5a);
  });

  test('6. SpiderWorkerPool — High-throughput parallel worker execution', () => {
    const pool = new SpiderWorkerPool(2);
    const nodeIds = new Uint32Array([100, 200]);
    const nodeFlags = new Uint8Array([NodeStateFlags.IsInternal, NodeStateFlags.HasFindings]);

    pool.processNodesParallel(nodeIds, nodeFlags);

    assert.equal(nodeIds[0], 100 ^ 0x5a5a5a5a);
    assert.equal(nodeIds[1], 200);

    const ring = pool.getRingBuffer();
    assert.equal(ring.getLength(), 2);
    assert.equal(ring.pop(), 100 ^ 0x5a5a5a5a);
    assert.equal(ring.pop(), 200);

    pool.terminate();
  });
});
