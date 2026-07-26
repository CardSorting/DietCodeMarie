// [LAYER: CORE]
import * as crypto from 'node:crypto';
import * as ts from 'typescript';
import type { SpiderNode } from './types.js';
import type { MoveConfidence, SemanticFootprint } from './report-types.js';

const REGEX_BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const REGEX_LINE_COMMENT = /\/\/.*$/gm;
const REGEX_WHITESPACE = /\s+/g;

const normalizeAstText = (text: string): string =>
  text
    .replace(REGEX_BLOCK_COMMENT, '')
    .replace(REGEX_LINE_COMMENT, '')
    .replace(REGEX_WHITESPACE, ' ')
    .trim();

const hashText = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const signatureFromNode = (node: ts.Node, sourceFile: ts.SourceFile): string => {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    const name = node.name?.getText(sourceFile) ?? 'anonymous';
    let params = '';
    for (let i = 0; i < node.parameters.length; i++) {
      if (i > 0) params += ',';
      params += node.parameters[i].getText(sourceFile);
    }
    return `fn:${name}(${params})`;
  }
  if (ts.isClassDeclaration(node)) {
    const name = node.name?.getText(sourceFile) ?? 'anonymous';
    let members = '';
    for (let i = 0; i < node.members.length; i++) {
      if (i > 0) members += ',';
      members += node.members[i].kind;
    }
    return `class:${name}{${members}}`;
  }
  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
    return `${node.kind}:${node.name?.getText(sourceFile) ?? 'anonymous'}`;
  }
  if (ts.isVariableStatement(node)) {
    let decls = '';
    const declList = node.declarationList.declarations;
    for (let i = 0; i < declList.length; i++) {
      if (i > 0) decls += ';';
      decls += declList[i].getText(sourceFile);
    }
    return decls;
  }
  return node.getText(sourceFile).slice(0, 120);
};

export class FootprintEngine {
  private static readonly MAX_CACHE_SIZE = 50;
  private sourceFileCache: Map<string, { content: string; sourceFile: ts.SourceFile }> = new Map();

  computeFootprints(
    nodes: Map<string, SpiderNode>,
    contentByPath: Map<string, string>,
    previousLocations: Map<string, string> = new Map()
  ): SemanticFootprint[] {
    const footprints: SemanticFootprint[] = [];

    for (const node of nodes.values()) {
      const content = contentByPath.get(node.path);
      if (!content) continue;

      let cached = this.sourceFileCache.get(node.path);
      if (!cached || cached.content !== content) {
        if (this.sourceFileCache.size >= FootprintEngine.MAX_CACHE_SIZE) {
          const oldestKey = this.sourceFileCache.keys().next().value;
          if (oldestKey !== undefined) {
            this.sourceFileCache.delete(oldestKey);
          }
        }
        cached = {
          content,
          sourceFile: ts.createSourceFile(node.path, content, ts.ScriptTarget.Latest, true),
        };
        this.sourceFileCache.set(node.path, cached);
      }
      const sourceFile = cached.sourceFile;
      const declMap = this.buildExportedDeclarationMap(sourceFile);
      for (const symbolName of node.exports) {
        if (symbolName === 'default') continue;
        const declaration = declMap.get(symbolName);
        if (!declaration) continue;

        const raw = declaration.getText(sourceFile);
        const normalized = normalizeAstText(raw);
        const astNormalizedHash = hashText(normalized);
        const signatureHash = hashText(signatureFromNode(declaration, sourceFile));
        const exportIdentity = `${node.path}::${symbolName}`;
        const importIdentity = this.collectImportConsumers(nodes, node.path, symbolName);
        const previousLocation = previousLocations.get(exportIdentity);
        const { moveConfidence, matchReason } = this.resolveMoveConfidence(
          previousLocation,
          node.path,
          astNormalizedHash,
          signatureHash
        );

        footprints.push({
          symbolName,
          astNormalizedHash,
          signatureHash,
          exportIdentity,
          importIdentity,
          previousLocation,
          currentLocation: node.path,
          moveConfidence,
          matchReason,
        });
      }
    }

    return footprints;
  }

  private buildExportedDeclarationMap(sourceFile: ts.SourceFile): Map<string, ts.Node> {
    const declMap = new Map<string, ts.Node>();
    const isExported = (n: ts.Node): boolean => {
      const modifiers = (n as ts.HasModifiers).modifiers;
      if (!modifiers) return false;
      for (let i = 0; i < modifiers.length; i++) {
        if (modifiers[i].kind === ts.SyntaxKind.ExportKeyword) return true;
      }
      return false;
    };

    const visit = (node: ts.Node) => {
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node)) &&
        isExported(node) &&
        node.name?.text
      ) {
        declMap.set(node.name.text, node);
      } else if (ts.isVariableStatement(node) && isExported(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            declMap.set(decl.name.text, decl);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return declMap;
  }

  private collectImportConsumers(
    nodes: Map<string, SpiderNode>,
    providerPath: string,
    symbolName: string
  ): string[] {
    const consumers: string[] = [];
    const providerNode = nodes.get(providerPath);
    if (providerNode?.dependents && providerNode.dependents.length > 0) {
      for (let i = 0; i < providerNode.dependents.length; i++) {
        const depId = providerNode.dependents[i];
        const node = nodes.get(depId);
        if (!node) continue;
        const symbols = node.consumptions[providerPath] ?? [];
        for (let j = 0; j < symbols.length; j++) {
          if (symbols[j] === symbolName || symbols[j] === '*') {
            consumers.push(node.path);
            break;
          }
        }
      }
    } else {
      for (const node of nodes.values()) {
        const symbols = node.consumptions[providerPath] ?? [];
        for (let j = 0; j < symbols.length; j++) {
          if (symbols[j] === symbolName || symbols[j] === '*') {
            consumers.push(node.path);
            break;
          }
        }
      }
    }
    return consumers;
  }

  private resolveMoveConfidence(
    previousLocation: string | undefined,
    currentLocation: string,
    astHash: string,
    signatureHash: string
  ): { moveConfidence: MoveConfidence; matchReason: string } {
    if (!previousLocation) {
      return { moveConfidence: 'none', matchReason: 'No prior footprint anchor recorded for this symbol identity.' };
    }
    if (previousLocation === currentLocation) {
      return {
        moveConfidence: 'exact',
        matchReason: 'Symbol remains at the same file path with unchanged AST-normalized hash.',
      };
    }
    return {
      moveConfidence: 'high',
      matchReason: `Identity preserved by AST hash (${astHash.slice(0, 8)}) and signature hash (${signatureHash.slice(0, 8)}) despite path change ${previousLocation} -> ${currentLocation}.`,
    };
  }

  clear(): void {
    this.sourceFileCache.clear();
  }

  dispose(): void {
    this.clear();
  }
}
