#!/usr/bin/env npx tsx
/** Golden path: Zenith resilience engineering, 4-pillar forensic probes, and Epistemic PageRank. */
import { seedMinimalProject, withExampleContext, runExampleMain } from './_bootstrap.js';
import { InvariantEngine } from '../core/agent-context/InvariantEngine.js';
import { TokenRateGovernor } from '../core/agent-context/TokenService.js';

async function main() {
  await withExampleContext(async (ctx, root) => {
    seedMinimalProject(root);

    // 1. Run 4-Pillar Forensic Diagnostic Probe
    const invEngine = new InvariantEngine(root);
    const probe = await invEngine.runZenithDiagnosticProbe((ctx as any)._serviceContext);
    console.log('Zenith Probe Status:', probe.ok ? 'HEALTHY' : 'VIOLATION_DETECTED');
    console.log('Pillar Audits:', Object.keys(probe.pillarReports).join(', '));

    // 2. Compute Epistemic PageRank Confidence
    const ranks = await ctx.reasoning.calculateEpistemicPageRank(5);
    console.log('Epistemic PageRank Nodes:', Object.keys(ranks).length);

    // 3. Token Rate Governor Backpressure Check
    const governor = new TokenRateGovernor(100000, 100000 / 60000);
    const available = governor.getAvailableTokens();
    console.log('Available Rate Governor Tokens:', available);
  });
}

runExampleMain(main);
