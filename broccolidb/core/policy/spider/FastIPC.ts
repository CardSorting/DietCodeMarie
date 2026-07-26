// [LAYER: CORE]
/**
 * Lock-Free Spin-Yield Protocol for High-Velocity IPC Buffer Updates.
 * Batch flushes AST & metric flags in 64-bit word chunks over SharedArrayBuffer.
 */
export class FastIPC {
  private state: Int32Array; // [head (0), tail (1), capacity (2), flags (3)]
  private data: Uint32Array;

  constructor(sab: SharedArrayBuffer) {
    this.state = new Int32Array(sab, 0, 4);
    this.data = new Uint32Array(sab, 16);
  }

  public static createSharedBuffer(capacity: number = 4096): SharedArrayBuffer {
    const sab = new SharedArrayBuffer(16 + capacity * 4);
    const state = new Int32Array(sab, 0, 4);
    state[0] = 0; // head
    state[1] = 0; // tail
    state[2] = capacity;
    state[3] = 0; // flags
    return sab;
  }

  public pushBatch(values: Uint32Array): boolean {
    const tail = Atomics.load(this.state, 1);
    const head = Atomics.load(this.state, 0);
    const capacity = this.state[2];
    const len = values.length;

    const available = tail >= head ? capacity - (tail - head) - 1 : head - tail - 1;
    if (available < len) return false;

    for (let i = 0; i < len; i++) {
      this.data[(tail + i) % capacity] = values[i];
    }
    Atomics.store(this.state, 1, (tail + len) % capacity);
    return true;
  }

  public popBatch(maxItems: number): Uint32Array {
    const head = Atomics.load(this.state, 0);
    const tail = Atomics.load(this.state, 1);
    const capacity = this.state[2];

    const count = tail >= head ? tail - head : capacity - head + tail;
    const toRead = Math.min(count, maxItems);
    const result = new Uint32Array(toRead);

    for (let i = 0; i < toRead; i++) {
      result[i] = this.data[(head + i) % capacity];
    }
    if (toRead > 0) {
      Atomics.store(this.state, 0, (head + toRead) % capacity);
    }
    return result;
  }
}
