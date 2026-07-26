// [LAYER: CORE]
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { TypeMirrorDiagnostic, TypeMirrorResult } from './report-types.js';

const GLOBAL_CONFIG_CACHE = new Map<string, { config: ts.ParsedCommandLine | null; error?: string }>();

// Strictly Monomorphic Class Layout (Guarantees V8 Hidden Class Shape Stability)
export class TypeMirrorDiagnosticEntry implements TypeMirrorDiagnostic {
  public readonly filePath: string;
  public readonly message: string;
  public readonly code: number;
  public readonly category: string;
  public readonly sourceRange?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };

  constructor(
    filePath: string,
    message: string,
    code: number,
    category: string,
    sourceRange?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }
  ) {
    this.filePath = filePath;
    this.message = message;
    this.code = code;
    this.category = category;
    this.sourceRange = sourceRange;
  }
}

export class TypeMirrorEngine {
  private cachedTsconfigPath: string | null | undefined = undefined;

  constructor(private readonly cwd: string) {}

  private getParsedConfig(): { tsconfigPath: string | null; parsed: ts.ParsedCommandLine | null; error?: string } {
    if (this.cachedTsconfigPath === undefined) {
      this.cachedTsconfigPath = ts.findConfigFile(this.cwd, ts.sys.fileExists, 'tsconfig.json') ?? null;
      if (this.cachedTsconfigPath) {
        let cached = GLOBAL_CONFIG_CACHE.get(this.cachedTsconfigPath);
        if (!cached) {
          const configFile = ts.readConfigFile(this.cachedTsconfigPath, ts.sys.readFile);
          if (configFile.error) {
            cached = { config: null, error: `Failed to parse tsconfig: ${configFile.error.messageText}` };
          } else {
            const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(this.cachedTsconfigPath));
            cached = { config: parsed };
          }
          GLOBAL_CONFIG_CACHE.set(this.cachedTsconfigPath, cached);
        }
        return { tsconfigPath: this.cachedTsconfigPath, parsed: cached.config, error: cached.error };
      }
    }
    const cached = this.cachedTsconfigPath ? GLOBAL_CONFIG_CACHE.get(this.cachedTsconfigPath) : null;
    return { tsconfigPath: this.cachedTsconfigPath, parsed: cached?.config ?? null, error: cached?.error };
  }

  runTypeMirror(scopeFiles?: Set<string>): TypeMirrorResult {
    const { tsconfigPath, parsed, error } = this.getParsedConfig();
    if (!tsconfigPath) {
      return {
        compilerAvailable: false,
        diagnosticsComplete: false,
        degradedReason: 'No tsconfig.json found; type truth cannot be verified.',
        diagnosticCount: 0,
        diagnostics: [],
      };
    }

    if (!parsed || error) {
      return {
        compilerAvailable: false,
        diagnosticsComplete: false,
        degradedReason: error ?? 'Failed to parse tsconfig',
        tsconfigPath,
        diagnosticCount: 0,
        diagnostics: [],
      };
    }

    let rootNames = parsed.fileNames;
    if (scopeFiles && scopeFiles.size > 0) {
      const filtered: string[] = [];
      for (let i = 0; i < parsed.fileNames.length; i++) {
        const file = parsed.fileNames[i];
        const rel = path.relative(this.cwd, file).replace(/\\/g, '/');
        if (scopeFiles.has(rel)) filtered.push(file);
      }
      rootNames = filtered;
    }

    if (rootNames.length === 0) {
      return {
        compilerAvailable: true,
        diagnosticsComplete: false,
        degradedReason: 'No in-scope TypeScript files matched tsconfig program roots.',
        tsconfigPath,
        commandUsed: 'typescript.createProgram',
        diagnosticCount: 0,
        diagnostics: [],
      };
    }

    const program = ts.createProgram({
      rootNames,
      options: parsed.options,
      host: ts.createCompilerHost(parsed.options, true),
    });

    const syntactic = program.getSyntacticDiagnostics();
    const semantic = program.getSemanticDiagnostics();
    const totalCount = syntactic.length + semantic.length;
    const diagnostics: TypeMirrorDiagnostic[] = new Array(totalCount);

    const convertDiagnostic = (diag: ts.Diagnostic): TypeMirrorDiagnostic => {
      const file = diag.file;
      const relPath = file
        ? path.relative(this.cwd, file.fileName).replace(/\\/g, '/')
        : 'unknown';
      const start = diag.start ?? 0;
      const lineChar = file ? file.getLineAndCharacterOfPosition(start) : { line: 0, character: 0 };
      const end = start + (diag.length ?? 1);
      const endLineChar = file ? file.getLineAndCharacterOfPosition(end) : lineChar;

      return new TypeMirrorDiagnosticEntry(
        relPath,
        ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
        diag.code,
        ts.DiagnosticCategory[diag.category] ?? 'Unknown',
        file
          ? {
              startLine: lineChar.line + 1,
              startColumn: lineChar.character + 1,
              endLine: endLineChar.line + 1,
              endColumn: endLineChar.character + 1,
            }
          : undefined
      );
    };

    let idx = 0;
    for (let i = 0; i < syntactic.length; i++) diagnostics[idx++] = convertDiagnostic(syntactic[i]);
    for (let i = 0; i < semantic.length; i++) diagnostics[idx++] = convertDiagnostic(semantic[i]);

    return {
      compilerAvailable: true,
      diagnosticsComplete: true,
      commandUsed: 'typescript.createProgram',
      tsconfigPath,
      diagnosticCount: diagnostics.length,
      diagnostics,
    };
  }

  isCompilerPresent(): boolean {
    return fs.existsSync(path.join(this.cwd, 'tsconfig.json'));
  }
}
