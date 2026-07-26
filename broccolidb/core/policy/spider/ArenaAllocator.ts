// [LAYER: CORE]
/**
 * Zero-GC Slab Allocator & Arena Buffer Pooling for V8 Mechanical Sympathy.
 *
 * Allocates graph nodes, flag metadata, and raw byte buffers from a contiguous
 * pre-allocated ArrayBuffer slab. Provides O(1) memory resets without triggering
 * V8 garbage collection sweeps.
 */
export class ArenaAllocator {
  private buffer: ArrayBuffer;
  private uint32View: Uint32Array;
  private uint8View: Uint8Array;
  private offset = 0; // Word offset (in 32-bit uint32 units)

  constructor(sizeInBytes: number = 16 * 1024 * 1024) {
    this.buffer = new ArrayBuffer(sizeInBytes);
    this.uint32View = new Uint32Array(this.buffer);
    this.uint8View = new Uint8Array(this.buffer);
  }

  /**
   * Allocates a 2-word (8-byte) node entry [id, flags].
   * Returns word pointer offset.
   */
  public allocateNode(id: number, flags: number): number {
    const ptr = this.offset;
    if (ptr + 2 > this.uint32View.length) {
      throw new Error(`ArenaAllocator slab exhausted (capacity: ${this.uint32View.length * 4} bytes)`);
    }
    this.uint32View[ptr] = id;
    this.uint32View[ptr + 1] = flags;
    this.offset += 2;
    return ptr;
  }

  /**
   * Allocates a raw byte slice from the arena slab.
   * Returns byte offset into the underlying ArrayBuffer.
   */
  public allocateRawBytes(byteLength: number): number {
    const byteOffset = this.offset * 4;
    const wordsNeeded = Math.ceil(byteLength / 4);
    if (this.offset + wordsNeeded > this.uint32View.length) {
      throw new Error(`ArenaAllocator slab exhausted for raw bytes allocation`);
    }
    this.offset += wordsNeeded;
    return byteOffset;
  }

  /**
   * Returns word offset pointer.
   */
  public getOffset(): number {
    return this.offset;
  }

  /**
   * Returns typed Uint32 view of the slab memory.
   */
  public getUint32View(): Uint32Array {
    return this.uint32View;
  }

  /**
   * Returns typed Uint8 view of the slab memory.
   */
  public getUint8View(): Uint8Array {
    return this.uint8View;
  }

  /**
   * Returns underlying ArrayBuffer slab.
   */
  public getBuffer(): ArrayBuffer {
    return this.buffer;
  }

  /**
   * O(1) memory reset — clears allocation offset without garbage collection overhead.
   */
  public reset(): void {
    this.offset = 0;
  }
}
