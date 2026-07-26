// [LAYER: CORE]
/**
 * Lock-Free Atomics Ring Buffer over SharedArrayBuffer for zero-serialization IPC.
 */
export class LockFreeRingBuffer {
  private state: Int32Array; // [head (0), tail (1), capacity (2)]
  private data: Uint32Array;

  constructor(sab: SharedArrayBuffer) {
    // SharedArrayBuffer layout: first 12 bytes = state header, remainder = uint32 payload
    this.state = new Int32Array(sab, 0, 3);
    this.data = new Uint32Array(sab, 12);
  }

  public static createBuffer(capacity: number = 1024): SharedArrayBuffer {
    const sab = new SharedArrayBuffer(12 + capacity * 4);
    const state = new Int32Array(sab, 0, 3);
    state[0] = 0; // head
    state[1] = 0; // tail
    state[2] = capacity;
    return sab;
  }

  public push(value: number): boolean {
    const tail = Atomics.load(this.state, 1);
    const head = Atomics.load(this.state, 0);
    const capacity = this.state[2];

    if ((tail + 1) % capacity === head) {
      return false; // Buffer full
    }

    this.data[tail] = value;
    Atomics.store(this.state, 1, (tail + 1) % capacity);
    Atomics.notify(this.state, 1); // Signal main thread with zero serialization
    return true;
  }

  public pop(): number | null {
    const head = Atomics.load(this.state, 0);
    const tail = Atomics.load(this.state, 1);
    const capacity = this.state[2];

    if (head === tail) {
      return null; // Buffer empty
    }

    const value = this.data[head];
    Atomics.store(this.state, 0, (head + 1) % capacity);
    return value;
  }

  public getLength(): number {
    const head = Atomics.load(this.state, 0);
    const tail = Atomics.load(this.state, 1);
    const capacity = this.state[2];
    if (tail >= head) return tail - head;
    return capacity - head + tail;
  }
}
