# MEOW-013: Recoverable Turn-Boundary Context Projection

Status: Accepted
Date: 2026-07-26

## Context

Long-running coding tasks accumulate large file reads, repository searches, command logs, web/MCP results, and subagent evidence. Waiting until the provider hard limit forces an expensive decision at the least reliable moment.

The existing semantic summarization path could recover space, but it consumed a model/tool turn, introduced a new model-authored interpretation of prior evidence, could become visible to the agent, and did not provide a precise route back to omitted source bytes. Directly overwriting stored conversation history would save space but destroy the audit and recovery authority.

An additional scaling concern was the compactor itself: an unbounded history scan or `split("\n")` over one pathological tool result could create work and allocation spikes while attempting to relieve context pressure.

## Decision

LUMI treats context compaction as a deterministic request projection over an immutable durable source.

1. The full API conversation remains transcript authority; compacted exact
   source is additionally committed to BroccoliDB CAS as centralized recovery
   authority.
2. Passive projection runs only after a turn settles and before the next provider request.
3. One shared token-profile function selects monotonic compaction tiers.
4. Each tier has fixed message, inspected-block, transformed-block, recent-message, minimum-line, and projected-line limits.
5. Supported old tool results are replaced only in the outbound projection and carry immutable persisted message/block UUIDs, full-source SHA-256, and original size metadata.
6. Higher tiers may refine an earlier projection only when the replacement materially reduces size.
7. Pathological payload analysis caps source materialization at 2,000,000 JavaScript characters, materialized lines at 20,000, and each declaration/evidence pattern input at 4,096 characters; full-source digest and line count remain exact.
8. Structural projections explicitly declare non-authoritative syntax fidelity and may not parse.
9. Reserved projection markers use system-owned XML syntax; raw user/tool text escapes forged signatures before trusted ledger markers are reapplied. Only a trusted marker activates a system-level interpretation policy that labels projections incomplete, potentially invalid syntax, and non-callable.
10. If deterministic projection is insufficient, the next request excludes complete historical pairs through the existing deleted-range projection.
11. Silent rollover preserves retained text byte-for-byte and records only internal metadata.
12. A subagent uses one manager for its complete governed run and a distinct
    BroccoliDB scope sharing the parent store. An immutable transcript recovery
    artifact remains the fallback only when no central store exists.
13. Semantic summarization remains the fallback when no safe complete-pair rollover can advance.
14. Once any provider stream chunk has been emitted, that stream is not compacted or retried.
15. `context_history.json` has one process owner and is a compatibility/cache
    sidecar. Cross-process central writes use SQLite/WAL and sharded CAS.
16. A planned marker is not publishable until exact CAS bytes plus source,
    projection, cursor, and run rows commit through a strict caller-ordered
    SQLite transaction and CAS presence is rechecked.
17. Scan-only passes commit their two-level cursor, preventing restart-time
    reinspection of the same bounded region.

## Invariants

- Durable source evidence is never overwritten to save prompt tokens.
- “Recoverable” refers to exact source availability and verification, not semantic completeness of the compact prompt.
- Parent and subagent tier selection cannot diverge into separate threshold tables.
- Recent messages and unknown result formats remain raw.
- No active stream callback can initiate compaction.
- Work is bounded even when every line looks important or one message contains many blocks.
- Recovery identity never depends on mutable array coordinates.
- Raw source cannot acquire internal-marker authority by imitating reserved XML syntax.
- Prompt marker syntax is defense in depth only; runtime authority comes from the internal ledger and immutable source identity.
- Parent and subagent references name their distinct `broccolidb://context/...`
  scope, not array coordinates or a bounded transcript excerpt.
- No manager emits a recovery reference until its exact CAS source and SQLite
  metadata cross the strict durability barrier.
- A repeated subagent pass never treats an existing projection as new recoverable source evidence.
- Only the parent extension-host process persists `context_history.json`.
- BroccoliDB garbage collection treats compaction source blobs as live roots.
- Recovery rejects digest, byte, character, or line-count mismatches and
  quarantines corrupt CAS content.
- Rollover removes complete pairs from the request view and preserves conversation-role validity.

## Considered Alternatives

### Always use model-generated summaries

Rejected as the default. It adds latency and cost, consumes another turn, and creates an opaque semantic rewrite. Retained only as a terminal fallback.

### Mutate or replace durable conversation history

Rejected. It removes audit evidence, weakens checkpoint restoration, and makes “recovery” impossible to verify.

### Rely exclusively on provider-managed context editing

Rejected as the architectural authority. LUMI supports multiple providers with different capabilities and must preserve consistent local durability and subagent behavior. Provider-side features may complement but cannot define the local contract.

### Drop oldest messages automatically at the provider boundary

Rejected as the first response. Unqualified prefix truncation can remove objectives, tool-use/result pairing, mutation evidence, or the causal path to current work. Complete-pair rollover is retained as the explicit emergency projection.

### Run one aggressive unbounded compaction pass

Rejected. It creates latency and allocation cliffs on the same request path it is meant to protect. Progressive fixed budgets provide predictable incremental work.

### Add parser dependencies for true AST compaction

Deferred. Parser-backed outlines may improve language precision, but they add grammar coverage, initialization, failure, and maintenance costs. The current implementation documents its potentially invalid pattern-based output honestly, bounds every pattern input, avoids unbounded wildcard forms in risky patterns, and retains exact source recovery.

## Consequences

### Positive

- Most context pressure is handled without an extra model/tool turn.
- Active streams remain isolated from compaction.
- Exact evidence remains available for audit and recovery.
- Exact source deduplicates by SHA-256 and uses bounded Brotli compression when beneficial.
- Work scales incrementally across large histories.
- Scan-only cursors survive task restoration.
- Parent and subagent behavior share one safety profile.
- Projections are deterministic and unit-testable.
- Emergency rollover is invisible to the model.

### Tradeoffs

- The prompt projection intentionally omits detail and may require rereading the durable source.
- Full-source hashing and line counting remain linear for a pathological block.
- Pattern-based code outlines can miss declarations and can be syntactically invalid in unsupported strings, macros, or grammar.
- JavaScript regex remains backtracking; safety depends on the enforced per-line input cap and bounded pattern forms.
- Recovery requires retaining the referenced identity-keyed source artifact unchanged.
- Programmatic exact rehydration is available through
  `ContextManager.hydrateRecoverableReference()` / `ctx.compaction.hydrate()`;
  it is intentionally not a model-callable tool and never mutates an active
  prompt automatically.
- Prompt-cache effects are provider-specific and not optimized by this ADR.
- Cursor restoration is scope-bound. A new subagent execution intentionally
  receives a new scope; the same scope restores its cursor.
- The JSON sidecar remains single-process. Central SQLite/CAS writes are
  cross-process safe under SQLite/WAL and content addressing.

## Implementation

- `src/core/context/context-management/ContextCompactionTypes.ts`
- `src/core/context/context-management/context-window-utils.ts`
- `src/core/context/ContextPruner.ts`
- `src/core/context/context-management/ContextManager.ts`
- `src/core/context/context-management/ContextCompactionStore.ts`
- `src/core/context/context-management/BroccoliContextCompactionStore.ts`
- `src/shared/messages/context-identifiers.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/tools/subagent/SubagentTranscriptRecorder.ts`
- `broccolidb/core/agent-context/ContextCompactionService.ts`
- `broccolidb/core/agent-context/capabilities/CompactionCapability.ts`
- `broccolidb/infrastructure/db/BufferedDbPool.ts`
- `broccolidb/infrastructure/db/Config.ts`
- `broccolidb/core/agent-context/CleanupService.ts`

The operational design, limits, failure semantics, and validation commands are documented in [Recoverable Context Compaction](../recoverable-context-compaction.md).

## Verification

- Context/pruner/identity-state focused run: 67 passing.
- Real LUMI-to-BroccoliDB bridge: 1 passing.
- Complete `SubagentRunner.test.ts`: 20 passing.
- BroccoliDB compaction and capability-contract entrypoints: passed.
- TypeScript, handler-import, task-lifecycle boundary, targeted Biome, and `git diff --check`: passed.
- Node-native `better-sqlite3` was rebuilt for the subagent suite and restored to the Electron ABI afterward.
