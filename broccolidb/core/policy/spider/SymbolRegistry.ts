// [LAYER: CORE]
import * as v8 from "v8"
import * as zlib from "zlib"

export interface SymbolProvider {
    symbolName: string;
    filePath: string;
    type: 'CLASS' | 'FUNCTION' | 'INTERFACE' | 'TYPE' | 'CONST';
    footprint: string;
}

// Strictly Monomorphic Class Layout (Guarantees V8 Hidden Class Shape Stability)
export class SymbolProviderEntry implements SymbolProvider {
    public readonly symbolName: string;
    public readonly filePath: string;
    public readonly type: 'CLASS' | 'FUNCTION' | 'INTERFACE' | 'TYPE' | 'CONST';
    public readonly footprint: string;

    constructor(
        symbolName: string,
        filePath: string,
        type: 'CLASS' | 'FUNCTION' | 'INTERFACE' | 'TYPE' | 'CONST',
        footprint: string
    ) {
        this.symbolName = symbolName;
        this.filePath = filePath;
        this.type = type;
        this.footprint = footprint;
    }
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
  private providerArrayCache: Map<Set<string>, string[]> = new Map();

  private static readonly EMPTY_ARRAY: string[] = [];

  public register(provider: SymbolProvider) {
    let existing = this.providers.get(provider.symbolName);
    if (!existing) {
      existing = new Set();
      this.providers.set(provider.symbolName, existing);
    }
    existing.add(provider.filePath);
    this.providerArrayCache.delete(existing);

    let fileExports = this.exportsByFile.get(provider.filePath);
    if (!fileExports) {
      fileExports = [];
      this.exportsByFile.set(provider.filePath, fileExports);
    }
    let exists = false;
    for (let i = 0; i < fileExports.length; i++) {
      if (fileExports[i].symbolName === provider.symbolName) {
        exists = true;
        break;
      }
    }
    if (!exists) {
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
                this.providerArrayCache.delete(providers);
                if (providers.size === 0) this.providers.delete(exp.symbolName);
            }
            this.footprintToProvider.delete(exp.footprint);
        }
        exports.length = 0;
    }
    this.exportsByFile.delete(filePath);
  }

  public findProviders(symbolName: string): string[] {
      const providers = this.providers.get(symbolName);
      if (!providers) return SymbolRegistry.EMPTY_ARRAY;
      let arr = this.providerArrayCache.get(providers);
      if (!arr) {
          arr = Array.from(providers);
          this.providerArrayCache.set(providers, arr);
      }
      return arr;
  }

  public findProviderByFootprint(footprint: string): SymbolProvider | null {
      return this.footprintToProvider.get(footprint) || null;
  }

  private sweepExpiredTransitions(now = Date.now()) {
      if (this.transitions.size === 0) return;
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
      for (const set of this.providers.values()) {
          set.clear();
      }
      this.providers.clear();

      for (const arr of this.exportsByFile.values()) {
          arr.length = 0;
      }
      this.exportsByFile.clear();

      this.footprintToProvider.clear();
      this.transitions.clear();
      this.providerArrayCache.clear();
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

