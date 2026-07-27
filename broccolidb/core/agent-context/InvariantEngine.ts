// [LAYER: CORE]
// @classification MODERN
import * as fs from 'node:fs';
import * as path from 'node:path';

export class InvariantEngine {
  constructor(private workspacePath: string) {}

  public async auditInvariants(): Promise<string[]> {
    const violations: string[] = [];
    const broccolidbRoot = fs.existsSync(path.resolve(this.workspacePath, 'broccolidb'))
      ? path.resolve(this.workspacePath, 'broccolidb')
      : this.workspacePath;

    // 1. Check for banned files on disk
    const bannedFiles = [
      'telemetry_queue.db',
      'telemetry_queue.db-wal',
      'telemetry_queue.db-shm',
      path.relative(this.workspacePath, path.join(broccolidbRoot, 'infrastructure/queue/SqliteQueue.ts')),
      path.relative(this.workspacePath, path.join(broccolidbRoot, 'core/agent-context/PasteStore.ts'))
    ];

    for (const f of bannedFiles) {
      const full = path.resolve(this.workspacePath, f);
      if (fs.existsSync(full)) {
        violations.push(`Banned file exists on disk: ${f}`);
      }
    }

    const scanForBannedDbFiles = async (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const items = await fs.promises.readdir(dir);
      for (const item of items) {
        if (item === 'node_modules' || item === 'dist' || item === '.git') continue;
        const full = path.join(dir, item);
        const stat = await fs.promises.stat(full);
        if (stat.isDirectory()) {
          await scanForBannedDbFiles(full);
        } else if (item.startsWith('telemetry_queue.db')) {
          violations.push(`Banned telemetry queue database exists on disk: ${path.relative(this.workspacePath, full)}`);
        }
      }
    };
    await scanForBannedDbFiles(this.workspacePath);

    // 2. Scan source files for banned symbols and direct SQLite instantiations
    const filesToScan: string[] = [];
    const scanDir = async (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const list = await fs.promises.readdir(dir);
      for (const item of list) {
        const full = path.join(dir, item);
        const stat = await fs.promises.stat(full);
        if (stat.isDirectory()) {
          if (item !== 'node_modules' && item !== 'tests' && item !== 'dist' && item !== 'out' && item !== 'webview-ui') {
            await scanDir(full);
          }
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
          filesToScan.push(full);
        }
      }
    };

    await scanDir(path.resolve(broccolidbRoot, 'core'));
    await scanDir(path.resolve(broccolidbRoot, 'infrastructure'));
    await scanDir(path.resolve(broccolidbRoot, 'cli'));

    const capabilityDir = path.resolve(broccolidbRoot, 'core/agent-context/capabilities');
    if (fs.existsSync(capabilityDir)) {
      const capabilityForbidden = [
        { regex: /Promise\s*<\s*any\s*>/g, label: 'Promise<any>' },
        { regex: /\bwriteFileSync\b/g, label: 'direct filesystem write' },
        { regex: /\bwriteFile\s*\(/g, label: 'direct filesystem write' },
        { regex: /\bnew Database\s*\(/g, label: 'direct Database construction' },
        { regex: /\bnew StorageService\s*\(/g, label: 'direct StorageService construction' },
        { regex: /\bshutdown\s*\(/g, label: 'shutdown()' },
        { regex: /\bpasteStore\b/g, label: 'pasteStore' },
        { regex: /\bget db\s*\(/g, label: 'db getter' },
        { regex: /\bdispose\s*\(/g, label: 'dispose()' },
        { regex: /trace_queue/g, label: 'trace_queue' },
        { regex: /intent_queue/g, label: 'intent_queue' },
      ];

      if (!fs.readFileSync(path.resolve(broccolidbRoot, 'core/agent-context/CapabilityBase.ts'), 'utf8').includes('IntentTracer')) {
        violations.push('CapabilityBase must route execution through IntentTracer');
      }

      for (const file of fs.readdirSync(capabilityDir)) {
        if (!file.endsWith('.ts')) continue;
        const full = path.join(capabilityDir, file);
        const content = fs.readFileSync(full, 'utf8');
        const relative = path.relative(this.workspacePath, full);

        if (!content.includes('extends CapabilityBase')) {
          violations.push(`Capability must extend CapabilityBase: ${relative}`);
        }
        if (!content.includes('readonly dependencies')) {
          violations.push(`Capability must declare dependencies: ${relative}`);
        }

        for (const pattern of capabilityForbidden) {
          pattern.regex.lastIndex = 0;
          if (pattern.regex.test(content)) {
            violations.push(`Capability contract violation (${pattern.label}) in ${relative}`);
          }
        }

        const publicAnyReturn = content.match(/^\s+(?:async\s+)?\w+\([^)]*\):\s*any\b/gm);
        if (publicAnyReturn && publicAnyReturn.length > 0) {
          violations.push(`Capability public method returns any in ${relative}`);
        }
      }
    }

    const bannedPatterns = [
      { regex: /SqliteQueue/g, name: 'SqliteQueue' },
      { regex: /AsyncTelemetryQueue/g, name: 'AsyncTelemetryQueue' },
      { regex: /telemetryQueue/g, name: 'telemetryQueue' },
      { regex: /telemetry_queue\.db/g, name: 'telemetry_queue.db' },
      { regex: /trace_queue/g, name: 'trace_queue' },
      { regex: /intent_queue/g, name: 'intent_queue' },
    ];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf8');
      const relative = path.relative(this.workspacePath, file);
      const isInvariantEngine = relative.includes('InvariantEngine.ts') || relative.includes('InvariantEngine.js');

      // Check banned patterns
      for (const pattern of bannedPatterns) {
        if (pattern.regex.test(content)) {
          // Special exception: allow banned patterns in this InvariantEngine itself!
          if (isInvariantEngine || relative.includes('errors.ts')) continue;
          violations.push(`Forbidden symbol '${pattern.name}' referenced in file: ${relative}`);
        }
      }

      // Check for direct better-sqlite3 instantiations
      if (content.includes('new Database(') || content.includes("require('better-sqlite3')") || content.includes('import Database from \'better-sqlite3\'')) {
        const isConfig = relative.includes('infrastructure/db/Config.ts') || relative.includes('infrastructure/db/Config.js');
        if (!isConfig && !isInvariantEngine) {
          violations.push(`Bypassing BufferedDbPool: Direct 'better-sqlite3' connection initialized in ${relative}`);
        }
      }

      if (content.includes('setInterval(')) {
        const ownsLifecycle =
          content.includes('@classification OWNED') ||
          (content.includes('@classification MODERN') &&
            (content.includes('start(): Promise<void>') || content.includes('async start(')) &&
            (content.includes('stop(): Promise<void>') || content.includes('async stop(')));
        if (!ownsLifecycle && !isInvariantEngine) {
          violations.push(`Background interval without owned lifecycle in ${relative}`);
        }
      }

      // Check for raw imports of PasteStore
      if (content.includes('PasteStore') && !relative.includes('agent-context.ts') && !relative.includes('types.ts') && !isInvariantEngine) {
        violations.push(`Defunct PasteStore referenced in: ${relative}`);
      }

      if (content.includes('pasteStore') && !isInvariantEngine) {
        violations.push(`Legacy pasteStore API referenced in: ${relative}`);
      }

      if (
        relative.includes('core/agent-context/') &&
        content.includes('shutdown(') &&
        !relative.includes('agent-context.ts') &&
        !isInvariantEngine
      ) {
        violations.push(`Legacy shutdown() in agent-context service: ${relative}`);
      }

      if (
        relative.includes('core/agent-context/') &&
        content.includes('new StorageService(') &&
        !relative.includes('agent-context.ts') &&
        !isInvariantEngine
      ) {
        violations.push(`Shadow StorageService lifecycle in agent-context: ${relative}`);
      }
    }

    return violations;
  }

  /**
   * Universal Zenith Diagnostic Probe: Runs 4-pillar forensic health audit across
   * disk invariants, CAS storage integrity, database connection pool, and graph topology.
   */
  public async runZenithDiagnosticProbe(ctx?: any): Promise<{
    ok: boolean;
    timestamp: number;
    violations: string[];
    pillarReports: {
      diskInvariants: { passed: boolean; violations: string[] };
      casStorageIntegrity: { checked: number; healthy: number; corrupted: number };
      dbPoolHealth: { lockContentionCount: number; failedWriteCount: number; totalLockWaitMs: number };
      epistemicGraph: { totalNodes: number; avgConnectivity: number };
    };
  }> {
    const violations = await this.auditInvariants();
    let casStats = { checked: 0, healthy: 0, corrupted: 0 };
    let dbMetrics = { lockContentionCount: 0, failedWriteCount: 0, totalLockWaitMs: 0 };
    let graphStats = { totalNodes: 0, avgConnectivity: 0 };

    if (ctx) {
      if (ctx.compactionService?.verifyIntegrity) {
        try {
          casStats = await ctx.compactionService.verifyIntegrity();
        } catch {
          // Best effort
        }
      }
      if (ctx.db?.getMetrics) {
        try {
          const m = ctx.db.getMetrics();
          dbMetrics = {
            lockContentionCount: m.lockContentionCount || 0,
            failedWriteCount: m.failedWriteCount || 0,
            totalLockWaitMs: m.totalLockWaitMs || 0,
          };
        } catch {
          // Best effort
        }
      }
      if (ctx.reasoning?.getGraphMetrics) {
        try {
          const g = await ctx.reasoning.getGraphMetrics();
          graphStats = { totalNodes: g.totalNodes || 0, avgConnectivity: g.avgConnectivity || 0 };
        } catch {
          // Best effort
        }
      }
    }

    const ok = violations.length === 0 && casStats.corrupted === 0;

    return {
      ok,
      timestamp: Date.now(),
      violations,
      pillarReports: {
        diskInvariants: { passed: violations.length === 0, violations },
        casStorageIntegrity: casStats,
        dbPoolHealth: dbMetrics,
        epistemicGraph: graphStats,
      },
    };
  }
}
