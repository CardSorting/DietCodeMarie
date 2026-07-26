// [LAYER: CORE]
import { isMainThread, parentPort, workerData, Worker } from 'node:worker_threads';
import { ArenaAllocator } from './ArenaAllocator.js';
import { LockFreeRingBuffer } from './IPCBuffer.js';
import { FastIPC } from './FastIPC.js';
import { TaskScheduler, WorkStealingDeque } from './TaskScheduler.js';
import { processNodesFast, FindingEntry } from './AgentDigest.js';

export interface WorkerJob {
  taskId: number;
  nodeId: number;
  flags: number;
}

export class SpiderWorkerPool {
  private numWorkers: number;
  private workers: Worker[] = [];
  private taskScheduler: TaskScheduler;
  private arena: ArenaAllocator;
  private sab: SharedArrayBuffer;
  private ipc: LockFreeRingBuffer;

  constructor(numWorkers: number = Math.max(1, (process.env.UV_THREADPOOL_SIZE ? parseInt(process.env.UV_THREADPOOL_SIZE, 10) : 4))) {
    this.numWorkers = numWorkers;
    this.taskScheduler = new TaskScheduler(numWorkers);
    this.arena = new ArenaAllocator(16 * 1024 * 1024); // 16MB slab
    this.sab = LockFreeRingBuffer.createBuffer(4096);
    this.ipc = new LockFreeRingBuffer(this.sab);
  }

  public getArena(): ArenaAllocator {
    return this.arena;
  }

  public getTaskScheduler(): TaskScheduler {
    return this.taskScheduler;
  }

  public getRingBuffer(): LockFreeRingBuffer {
    return this.ipc;
  }

  /**
   * Executes node flag processing in parallel or inline fast pass.
   */
  public processNodesParallel(nodeIds: Uint32Array, nodeFlags: Uint8Array): void {
    const len = nodeIds.length;
    if (len === 0) return;

    // Allocate in Arena slab for zero-GC memory efficiency
    const ptr = this.arena.allocateNode(nodeIds[0], nodeFlags[0] ?? 0);

    // Process nodes fast with TurboFan monomorphic inline execution
    processNodesFast(nodeIds, nodeFlags, len);

    // Push completion signal to LockFreeRingBuffer
    for (let i = 0; i < len; i++) {
      this.ipc.push(nodeIds[i]);
    }
  }

  public reset(): void {
    this.arena.reset();
  }

  public terminate(): void {
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers = [];
  }
}
