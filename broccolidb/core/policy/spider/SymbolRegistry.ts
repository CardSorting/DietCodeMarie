// [LAYER: CORE]
import * as v8 from "v8"
import * as zlib from "zlib"

export interface SymbolProvider {
    symbolName: string;
    filePath: string;
    type: 'CLASS' | 'FUNCTION' | 'INTERFACE' | 'TYPE' | 'CONST';
    footprint: string;
}

/**
 * SymbolRegistry: A deterministic index of all exported symbols in the project.
 * Replaces 'Ghost Mapping' with strict, traceable accounting.
 */
export class SymbolRegistry {
  private providers: Map<string, Set<string>> = new Map(); // symbolName -> [filePaths]
  private exportsByFile: Map<string, SymbolProvider[]> = new Map(); // filePath -> [SymbolProviders]
  private footprintToProvider: Map<string, SymbolProvider> = new Map(); // footprint -> SymbolProvider (O(1) lookup)
  private transitions: Map<string, { from: string, to: string, timestamp: number }> = new Map(); // symbolName -> moveData

  public register(provider: SymbolProvider) {
    let existing = this.providers.get(provider.symbolName);
    if (!existing) {
      existing = new Set();
      this.providers.set(provider.symbolName, existing);
    }
    existing.add(provider.filePath);

    let fileExports = this.exportsByFile.get(provider.filePath);
    if (!fileExports) {
      fileExports = [];
      this.exportsByFile.set(provider.filePath, fileExports);
    }
    if (!fileExports.some(p => p.symbolName === provider.symbolName)) {
      fileExports.push(provider);
    }
    this.footprintToProvider.set(provider.footprint, provider);
  }

  public unregisterFile(filePath: string) {
    const exports = this.exportsByFile.get(filePath);
    if (exports) {
        for (const exp of exports) {
            const providers = this.providers.get(exp.symbolName);
            if (providers) {
                providers.delete(filePath);
                if (providers.size === 0) this.providers.delete(exp.symbolName);
            }
            this.footprintToProvider.delete(exp.footprint);
        }
    }
    this.exportsByFile.delete(filePath);
  }

  public findProviders(symbolName: string): string[] {
      return Array.from(this.providers.get(symbolName) || []);
  }

  public findProviderByFootprint(footprint: string): SymbolProvider | null {
      return this.footprintToProvider.get(footprint) || null;
  }

  private sweepExpiredTransitions(now = Date.now()) {
      for (const [symbol, trans] of this.transitions.entries()) {
          if (now - trans.timestamp > 5000) {
              this.transitions.delete(symbol);
          }
      }
  }

  public recordTransition(symbolName: string, from: string, to: string) {
      const now = Date.now();
      this.sweepExpiredTransitions(now);
      this.transitions.set(symbolName, { from, to, timestamp: now });
  }

  public getTransition(symbolName: string) {
      const trans = this.transitions.get(symbolName);
      if (!trans) return undefined;
      if (Date.now() - trans.timestamp > 5000) {
          this.transitions.delete(symbolName);
          return undefined;
      }
      return trans;
  }

  public getConflicts(): Map<string, string[]> {
      const conflicts = new Map<string, string[]>();
      for (const [symbol, providers] of this.providers.entries()) {
          if (providers.size > 1) {
              conflicts.set(symbol, Array.from(providers));
          }
      }
      return conflicts;
  }

  public getExports(filePath: string): SymbolProvider[] {
      return this.exportsByFile.get(filePath) || [];
  }

  public clear() {
      this.footprintToProvider.clear();
      this.providers.clear();
      this.exportsByFile.clear();
      this.transitions.clear();
  }

  public dispose() {
      this.clear();
  }

  public serialize(): string {
    const exports = Array.from(this.exportsByFile.entries());
    const binary = zlib.deflateSync(v8.serialize(exports));
    return binary.toString("base64");
  }

  public deserialize(data: string) {
    try {
      this.clear();
      let exports: [string, SymbolProvider[]][] = [];
      try {
        const binary = zlib.inflateSync(Buffer.from(data, "base64"));
        exports = v8.deserialize(binary);
      } catch {
        // Fallback for uncompressed legacy JSON payload
        exports = JSON.parse(data);
      }
      for (const [filePath, providers] of exports) {
          this.exportsByFile.set(filePath, providers);
          for (const p of providers) {
              const existing = this.providers.get(p.symbolName) || new Set();
              existing.add(filePath);
              this.providers.set(p.symbolName, existing);
              this.footprintToProvider.set(p.footprint, p);
          }
      }
    } catch {
      // Ignore corrupted payload gracefully
    }
  }
}

