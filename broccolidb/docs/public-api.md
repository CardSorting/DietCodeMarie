# Public API (v30 frozen)

The npm package `@noorm/broccolidb` exports **only** symbols listed in [`core/public-api.ts`](../core/public-api.ts). Everything else is internal.

Guardrail: `tests/public-api-snapshot.test.ts` enforces the allowlist.

## AgentContext lifecycle

```typescript
const ctx = new AgentContext(workspace, db?, userId?);
await ctx.start();
await ctx.stop();
await ctx.flush();
const health = await ctx.health({ deep?: boolean });
```

| Method | Description |
|--------|-------------|
| `start()` | Start registry (db, storage, orchestration, …) |
| `stop()` | Shut down; context cannot be restarted |
| `flush()` | Flush durable writes (db, intent traces) |
| `health()` | Lifecycle + per-capability health |

| Getter | Purpose |
|--------|---------|
| `ctx.query` | Knowledge search, structural impact |
| `ctx.graph` | Graph traversal; **Spider** at `ctx.graph.spider` |
| `ctx.runtime` | Sessions, plans, execution, verification, state views |
| `ctx.audit` | Invariant checks and 4-pillar forensic probes (`runZenithDiagnosticProbe`) |
| `ctx.storage` | Blob storage (CAS) |
| `ctx.compaction` | Durable context projections, cursors, exact-source hydration, and Brotli telemetry |
| `ctx.snapshots` | Context snapshots |
| `ctx.recovery` | Recovery operations & Two-Phase Mark-Sweep GC |
| `ctx.telemetry` | Telemetry events |
| `ctx.coordination` | Mutex and agent coordination |
| `ctx.reasoning` | Reasoning chains & Epistemic PageRank (`calculateEpistemicPageRank`) |
| `ctx.tasks` | Task board, DAG dependency scheduling (`getExecutableTasks`, `resolveTaskCascade`) |
| `ctx.scratchpad` | Agent scratchpad |
| `ctx.mailbox` | Inter-agent mailbox |

### Zenith Resilience & Epistemic Infrastructure

#### Epistemic PageRank (`ctx.reasoning.calculateEpistemicPageRank`)
Calculates graph-propagated knowledge confidence across knowledge items by evaluating support edge weights, hub centrality, and contradiction decay penalties:
```typescript
const ranks = await ctx.reasoning.calculateEpistemicPageRank(10, 0.85);
// Returns: Record<string, number> mapping node ID to confidence score [0.0, 1.0]
```

#### 4-Pillar Forensic Probe (`ctx.audit.runZenithDiagnosticProbe`)
Executes unified structural health audits across Disk Invariants, CAS Storage Integrity, DB Pool & WAL Health, and Epistemic Graph Connectivity:
```typescript
const probe = await ctx.audit.runZenithDiagnosticProbe(serviceContext);
// Returns: { ok: boolean, timestamp: number, violations: string[], pillarReports: ... }
```

#### Multi-Agent Task DAG Scheduler (`ctx.tasks`)
Schedules tasks declaring `dependsOnTaskIds?: string[]` and resolves completion/failure cascades:
```typescript
const readyTasks = await ctx.tasks.getExecutableTasks();
const cascadeResult = await ctx.tasks.resolveTaskCascade('parent-task-id', 'completed');
```

#### Token Bucket Rate Governor (`TokenRateGovernor`)
Manages AI completion token consumption rates per minute and applies smooth backpressure:
```typescript
import { TokenRateGovernor } from '@noorm/broccolidb';
const governor = new TokenRateGovernor(100000, 100000 / 60000);
await governor.acquireOrWait(4000);
```

### Context compaction

`ctx.compaction` separates exact source bytes from the smaller projection sent
to a model. The exact source is compressed when beneficial, stored in CAS, and
referenced by stable message/block IDs in SQLite.

```typescript
const committed = await ctx.compaction.commit({
  scopeId: 'task:01...',
  scopeKind: 'task',
  workspaceId: 'workspace-id',
  recoverySource: 'broccolidb://context/task%3A01...',
  records: [{
    messageId,
    blockId,
    ref: `${messageId}:${blockId}`,
    sourceLocator: 'broccolidb://context/task%3A01...',
    sourceText,
    sourceSha256,
    projectionText,
    projectionSha256,
    tier: 'emergency',
    tierRank: 6,
    originalCharacters: sourceText.length,
    originalLines,
  }],
  cursor: { messageOffset, blockOffset, activeStart },
  run: {
    trigger: 'turn_boundary',
    tier: 'emergency',
    scannedMessages,
    scannedBlocks,
    compactedBlocks: 1,
    originalCharacters: sourceText.length,
    projectedCharacters: projectionText.length,
    startedAt,
    completedAt,
  },
});
```

`commit()` resolves only after the CAS source and all metadata cross a strict
SQLite transaction barrier. Use `load({ scopeId })` to restore current
projections and the scan cursor. Use `hydrate(...)` to recover exact source;
hydration verifies the CAS digest, byte length, character length, and line count.

## Runtime (`ctx.runtime`)

### Sessions

```typescript
const session = await ctx.runtime.beginSession({
  taskId: 'my-task',
  budget: { maxDirectives: 10 },
});
```

### Repair pipeline

| Method | Description |
|--------|-------------|
| `recordAudit(sessionId, audit)` | Link Spider report to session graph |
| `recordGate(sessionId, exitCode, reportId?)` | Record gate outcome |
| `planRepairs({ audit, sessionId, policy? })` | Build `MutationPlan` |
| `preview(plan, policy)` | Human-readable preview + policy decision |
| `execute({ plan, policy? })` | Apply repairs (sole file mutation path) |
| `verify({ sessionId, executionId? })` | Run verification pipeline |

### Operator views

| Method | Description |
|--------|-------------|
| `state(sessionId)` | Session summary from RuntimeStateGraph |
| `timeline(sessionId)` | Ordered event timeline |
| `explain(sessionId, nodeId?)` | Causal explanation |
| `nextActions(sessionId)` | Suggested next steps |
| `blockers(sessionId?)` | Open blockers |
| `openLoops(sessionId)` | Unresolved loops |
| `causalView(sessionId)` | Causal chains |
| `diffView(sessionId)` | Graph diff |
| `export(sessionId, { format })` | `json`, `markdown`, or `sarif` |

### Durable memory

| Method | Description |
|--------|-------------|
| `await snapshot(sessionId)` | Persist RuntimeStateGraph (integrity-checked) |
| `story(sessionId)` | Human narrative |
| `await replay(sessionId, { mode?, snapshotId? })` | Forensic replay (readonly) |
| `getMemoryHealth()` | Graph integrity, snapshot count |
| `getRuntimeHealth()` | Active sessions, budgets, policy state |
| `setMode(mode)` | `development` \| `ci` \| `production` \| `readonly` \| `recovery` \| `forensic` |

Persisted snapshots reload automatically when a new `AgentContext` starts against the same database.

## Spider (`ctx.graph.spider`)

Access Spider **only** through this capability facet.

| Method | Description |
|--------|-------------|
| `audit(options?)` | Full structural audit (read-only) |
| `gate(options?)` | CI-style pass/fail gate |
| `check(request)` | Unified phase check (`pre-edit`, `ci`, …) |
| `formatCheckDigest(result)` | Compact CI digest |
| `gateBundle(options?)` | Gate + agent bundle |
| `planRepairs` / `execute` | **Not here** — use `ctx.runtime` |

## Exported types

Capability types, intent types, runtime session types, `MutationPlan`, `VerificationResult`, `RuntimeSnapshot`, `RuntimeStory`, `ReplayMode`, and policy error classes are exported from `public-api.ts`.

## Exported errors

| Class | Code (typical) |
|-------|----------------|
| `GuidedError` / `LifecycleStateError` | `LIFECYCLE_STATE_ERROR` |
| `PolicyBlockedError` | policy-specific |
| `RuntimeBudgetExceededError` | `BUDGET_EXCEEDED` |
| `RuntimePolicyViolationError` | mode violation |
| `InvariantViolationError` | `INVARIANT_VIOLATION` |
| `AgentGitError` | base class with `code` |

See [errors.md](errors.md).

## Bootstrap helpers

Exported for scripts and CLI:

- `Workspace` — workspace + repository access
- `Connection` — database connection wrapper

## Classifications

| Label | Meaning |
|-------|---------|
| **STABLE** | In `public-api.ts`; semver applies |
| **INTERNAL** | Under `core/**` not re-exported |
| **DEPRECATED** | See [MIGRATION.md](../MIGRATION.md) |
| **FORBIDDEN** | Bypassing capabilities or lifecycle |

Full policy: [API_STABILITY.md](../API_STABILITY.md).
