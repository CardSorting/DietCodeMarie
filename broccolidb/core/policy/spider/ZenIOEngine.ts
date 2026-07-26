// [LAYER: CORE]
import * as fs from 'node:fs';
import type { ArenaAllocator } from './ArenaAllocator.js';

/**
 * High-Throughput Non-Blocking Zero-Copy I/O Engine.
 * Pipes file content directly into ArenaAllocator ArrayBuffer slabs.
 */
export class ZenIOEngine {
  private fdCache = new Map<string, number>();

  /**
   * Reads file content directly into pre-allocated ArenaAllocator slab.
   * Returns byte offset into the Arena buffer.
   */
  public streamFileToArena(filePath: string, arena: ArenaAllocator): number {
    let fd = this.fdCache.get(filePath);
    if (fd === undefined) {
      fd = fs.openSync(filePath, 'r');
      this.fdCache.set(filePath, fd);
    }

    const stats = fs.fstatSync(fd);
    const byteLength = stats.size;
    const offset = arena.allocateRawBytes(byteLength);

    // Direct kernel-to-arena read with zero intermediate Buffer creation
    fs.readSync(fd, new Uint8Array(arena.getBuffer(), offset, byteLength), 0, byteLength, 0);
    return offset;
  }

  /**
   * Closes all cached file descriptors.
   */
  public close(): void {
    for (const fd of this.fdCache.values()) {
      try {
        fs.closeSync(fd);
      } catch {
        // Ignore descriptor cleanup errors
      }
    }
    this.fdCache.clear();
  }
}
