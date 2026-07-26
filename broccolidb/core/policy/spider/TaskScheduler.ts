// [LAYER: CORE]
/**
 * Lock-Free Deque Work-Stealing Task Scheduler.
 *
 * Each worker thread operates a local work-stealing deque.
 * Local thread pops tasks from top (LIFO - cache warm).
 * Victim threads steal tasks from bottom (FIFO - large tasks).
 */
export class WorkStealingDeque {
  private buffer: Uint32Array;
  private head = 0;
  private tail = 0;

  constructor(capacity = 1024) {
    this.buffer = new Uint32Array(capacity);
  }

  public push(taskId: number): void {
    this.buffer[this.tail & (this.buffer.length - 1)] = taskId;
    this.tail++;
  }

  /** Local thread pops from top (LIFO) */
  public pop(): number | null {
    if (this.head >= this.tail) return null;
    this.tail--;
    return this.buffer[this.tail & (this.buffer.length - 1)];
  }

  /** Victim thread steals from bottom (FIFO) */
  public steal(): number | null {
    if (this.head >= this.tail) return null;
    const task = this.buffer[this.head & (this.buffer.length - 1)];
    this.head++;
    return task;
  }

  public isEmpty(): boolean {
    return this.head >= this.tail;
  }

  public size(): number {
    return Math.max(0, this.tail - this.head);
  }
}

export class TaskScheduler {
  private deques: WorkStealingDeque[];
  private numWorkers: number;

  constructor(numWorkers: number, capacityPerWorker = 1024) {
    this.numWorkers = numWorkers;
    this.deques = Array.from({ length: numWorkers }, () => new WorkStealingDeque(capacityPerWorker));
  }

  public submitTask(workerId: number, taskId: number): void {
    const target = workerId % this.numWorkers;
    this.deques[target].push(taskId);
  }

  public getNextTask(workerId: number): number | null {
    const local = this.deques[workerId];
    const task = local.pop();
    if (task !== null) return task;

    // Work stealing: try to steal from other workers starting at (workerId + 1)
    for (let i = 1; i < this.numWorkers; i++) {
      const victimId = (workerId + i) % this.numWorkers;
      const stolen = this.deques[victimId].steal();
      if (stolen !== null) return stolen;
    }

    return null;
  }

  public getDeque(workerId: number): WorkStealingDeque {
    return this.deques[workerId];
  }
}
