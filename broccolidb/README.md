# BroccoliDB

**A stable operational substrate for agent-driven code work.**

BroccoliDB gives agents a typed, lifecycle-governed environment: capabilities
validate intent, the runtime governs execution, Spider proves structure, durable
snapshots preserve continuity, and context compaction commits exact source to
CAS before publishing smaller model-request projections.

> v30 freeze: no new architecture layers. The public API is frozen, documented, and tested. A complete system is boring to operate.

## Install

```bash
npm install @noorm/broccolidb
npx broccolidb init
```

## Quick start

```typescript
import { AgentContext, Workspace, Connection } from '@noorm/broccolidb';

const conn = new Connection({ dbPath: './broccolidb.db' });
const pool = conn.getPool();
await pool.start();

const workspace = new Workspace(pool, 'user-id', 'workspace-id');
workspace.setPhysicalPath(process.cwd());
await workspace.init();

const ctx = new AgentContext(workspace, pool, 'user-id');
await ctx.start();

try {
  const health = await ctx.health();
  const session = await ctx.runtime.beginSession({ taskId: 'my-task' });
  const audit = await ctx.graph.spider.audit({ scope: 'all' });
  ctx.runtime.recordAudit(session.sessionId, audit);
} finally {
  await ctx.stop();
}
```

**Required:** `await ctx.start()` before any capability. `await ctx.stop()` in `finally`. See [docs/getting-started.md](docs/getting-started.md).

## CLI

```bash
npx broccolidb health --format json
npx broccolidb spider gate
npx broccolidb spider compact
npx broccolidb runtime story <sessionId>
```

Full reference: [docs/cli.md](docs/cli.md).

## Durable Context Projections & Universal Hardening

`ctx.compaction` provides a strict publication barrier for long-running agent context. It deduplicates exact source in sharded CAS, stores immutable projection DAGs (`parentProjectionId`), runs 2-phase mark-sweep garbage collection, and cryptographically verifies blob hashes against disk.

Additionally, BroccoliDB includes enterprise-grade resilience infrastructure:
- **Tool Execution Circuit Breaker**: Auto-trips on repeated tool failures, preventing subagent timeout loops.
- **Transient Speculative Read Cache**: 500ms TTL cache deduplicating read commands (`view_file`, `list_dir`, `grep_search`).
- **Adaptive Jittered Lock Backoff**: Eliminates database lock contention via randomized backoff jitter.
- **Epistemic PageRank Engine**: Calculates graph-propagated confidence scores with support weighting and contradiction decay.
- **4-Pillar Forensic Diagnostic Probe**: Unified health audit across Disk Invariants, CAS Integrity, DB Pool, and Graph Topology.
- **Multi-Agent Task DAG Scheduler**: Dependency-based task scheduling (`dependsOnTaskIds`) with failure cascade resolution.
- **Token Bucket Rate Governor**: Global rate governor managing token-per-minute limits and swarm backpressure.

See [the public API](docs/public-api.md#context-compaction), [current architecture](docs/architecture/current.md), [ADR 009: Universal Zenith Hardening](docs/architecture/ADR_UNIVERSAL_ZENITH_PASS.md), and [Master Architectural Decision Index](../.wiki/adr/MASTER_ADR_INDEX.md).

## Architectural Decision Governance

BroccoliDB operates under a strict, automated MADR 3.0 governance model. Every non-trivial system change is captured in a formal Architecture Decision Record (ADR) detailing operational context (**The Why**), architectural contracts (**The What**), and concrete code surfaces (**The How**). 

The workspace automatically scaffolds new decision records, audits link integrity across disk surfaces, renders visual Mermaid dependency graphs, and compiles all decisions into the central [Master Architectural Decision Index](../.wiki/adr/MASTER_ADR_INDEX.md).

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/getting-started.md](docs/getting-started.md) | Lifecycle, capabilities, first calls |
| [docs/public-api.md](docs/public-api.md) | Frozen stable API |
| [docs/errors.md](docs/errors.md) | Typed errors with fixes |
| [docs/cli.md](docs/cli.md) | CLI commands and output formats |
| [docs/examples.md](docs/examples.md) | Golden-path scripts |
| [docs/architecture/current.md](docs/architecture/current.md) | How the system fits together |
| [docs/architecture/ADR_UNIVERSAL_ZENITH_PASS.md](docs/architecture/ADR_UNIVERSAL_ZENITH_PASS.md) | Universal Zenith Pass architectural decision |
| [docs/papers/whitepaper.md](docs/papers/whitepaper.md) | Technical whitepaper |
| [docs/papers/companion-brief.md](docs/papers/companion-brief.md) | Executive companion brief |
| [docs/papers/philosophy.md](docs/papers/philosophy.md) | Philosophy & doctrine |
| [API_STABILITY.md](API_STABILITY.md) | Stable vs internal APIs |
| [MIGRATION.md](MIGRATION.md) | Upgrading to v30 |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## Examples

```bash
cd broccolidb
npx tsx examples/basic-context.ts
npx tsx examples/spider-gate.ts
npm run test:examples
```

## Development

```bash
npm install
npm run build
npm run test:guardrails   # public API, docs links, CLI smoke
npm run test:smoke        # runtime recovery across restart
npm run test:examples     # golden-path scripts
```

Run the full test suite:

```bash
npm test
```

## Package layout

| Path | Role |
|------|------|
| `core/public-api.ts` | Frozen npm exports |
| `core/agent-context.ts` | `AgentContext` and capabilities |
| `core/agent-context/ContextCompactionService.ts` | Exact-source CAS and strict projection ledger |
| `core/orchestration/` | Runtime, state graph, durable store |
| `core/policy/spider/` | Spider engine (internal; access via `ctx.graph.spider`) |
| `cli/` | `broccolidb` command-line tool |
| `examples/` | Runnable golden paths |
| `tests/` | Unit, integration, and guardrail tests |

## Doctrine

Agents express intent. Capabilities validate intent. Runtime governs execution. Spider proves structure. StateGraph preserves truth. Snapshots preserve continuity. Replay reconstructs causality.

## License

MIT
