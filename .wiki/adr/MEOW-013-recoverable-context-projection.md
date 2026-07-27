# MEOW-013: Recoverable Turn-Boundary Context Projection

Status: Accepted
Date: 2026-07-26

## Context

Long-running coding tasks accumulate large file reads, repository searches, command logs, web/MCP results, and subagent evidence. Waiting until the provider hard limit forces an expensive decision at the least reliable moment.

The existing semantic summarization path could recover space, but it consumed a model/tool turn, introduced a new model-authored interpretation of prior evidence, could become visible to the agent, and did not provide a precise route back to omitted source bytes. Directly overwriting stored conversation history would save space but destroy the audit and recovery authority.

An additional scaling concern was the compactor itself: an unbounded history scan or `split("\n")` over one pathological tool result could create work and allocation spikes while attempting to relieve context pressure.

## Decision

LUMI treats context compaction as a deterministic request projection over an immutable durable source.

1. The full API conversation history or governed subagent transcript remains authoritative.
2. Passive projection runs only after a turn settles and before the next provider request.
3. One shared token-profile function selects monotonic compaction tiers.
4. Each tier has fixed message, inspected-block, transformed-block, recent-message, minimum-line, and projected-line limits.
5. Supported old tool results are replaced only in the outbound projection and carry source coordinates, full-source SHA-256, and original size metadata.
6. Higher tiers may refine an earlier projection only when the replacement materially reduces size.
7. Pathological individual payloads use deterministic full-span source windows capped at 2,000,000 JavaScript characters for line analysis; full-source digest and line count remain exact.
8. If deterministic projection is insufficient, the next request excludes complete historical pairs through the existing deleted-range projection.
9. Silent rollover preserves retained text byte-for-byte and records only internal metadata.
10. Semantic summarization remains the fallback when no safe complete-pair rollover can advance.
11. Once any provider stream chunk has been emitted, that stream is not compacted or retried.

## Invariants

- Durable source evidence is never overwritten to save prompt tokens.
- “Recoverable” refers to exact source availability and verification, not semantic completeness of the compact prompt.
- Parent and subagent tier selection cannot diverge into separate threshold tables.
- Recent messages and unknown result formats remain raw.
- No active stream callback can initiate compaction.
- Work is bounded even when every line looks important or one message contains many blocks.
- Subagent references name the governed subagent transcript, not the parent task history.
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

Deferred. Parser-backed outlines may improve language precision, but they add grammar coverage, initialization, failure, and maintenance costs. The current implementation documents its pattern-based behavior honestly and retains exact source recovery.

## Consequences

### Positive

- Most context pressure is handled without an extra model/tool turn.
- Active streams remain isolated from compaction.
- Exact evidence remains available for audit and recovery.
- Work scales incrementally across large histories.
- Parent and subagent behavior share one safety profile.
- Projections are deterministic and unit-testable.
- Emergency rollover is invisible to the model.

### Tradeoffs

- The prompt projection intentionally omits detail and may require rereading the durable source.
- Full-source hashing and line counting remain linear for a pathological block.
- Pattern-based code outlines can miss declarations in unsupported syntax.
- Recovery coordinates depend on retaining the referenced source artifact unchanged.
- Recovery pointers are verifiable coordinates; automatic live-prompt rehydration is not part of this decision.
- Prompt-cache effects are provider-specific and not optimized by this ADR.
- Subagent in-memory cursor state is scoped to the manager instance; emergency rollover remains necessary for histories beyond one bounded scan horizon.

## Implementation

- `src/core/context/context-management/ContextCompactionTypes.ts`
- `src/core/context/context-management/context-window-utils.ts`
- `src/core/context/ContextPruner.ts`
- `src/core/context/context-management/ContextManager.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`

The operational design, limits, failure semantics, and validation commands are documented in [Recoverable Context Compaction](../recoverable-context-compaction.md).

## Verification

- `ContextPruner.test.ts` and `ContextManager.test.ts`: 43 passing.
- Complete `SubagentRunner.test.ts`: 17 passing.
- TypeScript, handler-import, task-lifecycle boundary, targeted Biome, and `git diff --check`: passed.
- Node-native `better-sqlite3` was rebuilt for the subagent suite and restored to the Electron ABI afterward.
