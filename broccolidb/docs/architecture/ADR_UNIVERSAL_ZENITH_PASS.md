# ADR 009: Universal Zenith Hardening, Resilience Engineering & Epistemic Graph Infrastructure

- **Status**: Approved & Shipped
- **Date**: 2026-07-27
- **Author**: Antigravity Core Team

---

## 1. Context & Motivation (The Why)

As agentic AI workflows scale to multi-worker swarms operating on massive repositories, classical database patterns and naive context window management break down:
1. **Context Window Saturation**: Summarizing large execution logs without structured parent-child projection lineage leads to context fragmentation and information loss.
2. **Cascading Tool Failures**: A failing tool (e.g., timed-out compiler or network command) repeatedly invoked across parallel subagents stalls entire execution pipelines.
3. **Database Lock Contention**: Heavy parallel write buffers against SQLite WAL databases cause `SQLITE_BUSY` lock contention spikes if retried with fixed delay intervals.
4. **Epistemic Drift**: Knowledge graph confidence scores remain static over time, failing to discount stale evidence or account for graph-level contradictions.
5. **Lack of Forensic Visibility**: Operators lack unified 4-pillar diagnostics covering disk invariants, CAS storage corruption, connection pool health, and graph connectivity.

---

## 2. Decision Summary (The What)

We engineered and deployed a 3-pass comprehensive hardening substrate across BroccoliDB:

| Subsystem | Feature | Primary Goal |
| :--- | :--- | :--- |
| **Context Compaction** | Hierarchical DAG Projections | Parent-child projection lineage (`parentProjectionId`) for nested context summaries. |
| **Context Compaction** | Adaptive Brotli & Telemetry | Dynamic size-based quality tuning (4–6) and worker concurrency scaling with real-time stats. |
| **Storage Substrate** | 2-Phase Mark-Sweep GC | Purges unreferenced CAS blobs older than 5 minutes while protecting active grace leases. |
| **Storage Substrate** | CAS Integrity Verification | Cryptographic verification of CAS content blobs against expected SHA-256 hashes. |
| **Tool Execution** | Sliding-Window Circuit Breaker | Trips to `open` after 3 failures in 60s, preventing cascading subagent timeout loops. |
| **Tool Execution** | Transient Speculative Read Cache | 500ms TTL cache for idempotent read commands (`view_file`, `list_dir`, `grep_search`). |
| **Database Pool** | Adaptive Jittered Backoff | Lock retry backoff using `baseDelay * (0.8 + 0.4 * Math.random())` and lock wait metrics. |
| **Reasoning Engine** | Epistemic PageRank (EP-Rank) | Graph-propagated confidence scoring with support edge weighting and contradiction decay. |
| **Forensic Substrate** | 4-Pillar Diagnostic Probe | Unified structural audit across Disk Invariants, CAS Integrity, DB Pool, and Graph Topology. |
| **Task Orchestration** | Task DAG Dependency Scheduler | Task dependency declarations (`dependsOnTaskIds`) and automatic cascade failure resolution. |
| **Rate Governance** | Token Bucket Rate Governor | Thread-safe token-per-minute governor providing smooth backpressure during multi-agent swarms. |

---

## 3. Technical Implementation (The How)

### 3.1. Hierarchical DAG Context Projections & Storage Integrity
- **Schema & DDL**: Added `parentProjectionId TEXT` and composite indexes (`idx_context_compaction_projection_parent`) in [`Config.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/infrastructure/db/Config.ts).
- **Service Integration**: Extended [`ContextCompactionService.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/ContextCompactionService.ts) with `commitProjection(input)` accepting `parentProjectionId` and `verifyIntegrity(scopeId)` verifying CAS disk blobs via `crypto.createHash('sha256')`.

### 3.2. Circuit Breakers & Speculative Read Caching
- **Implementation**: Added `ToolCircuitBreaker` (3 failures $\rightarrow$ 30s open reset) and `TransientReadCache` (500ms TTL) in [`StreamingToolExecutor.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/StreamingToolExecutor.ts).
- **Execution Hook**: `StreamingToolExecutor.execute()` checks circuit breaker state and read cache before invoking tools, updating state on completion.

### 3.3. Adaptive Lock Backoff & Metrics
- **Implementation**: Updated SQLite flush retry handling in [`BufferedDbPool.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/infrastructure/db/BufferedDbPool.ts) to calculate `delay = Math.round(baseDelay * (0.8 + 0.4 * Math.random()))`, tracking `totalLockWaitMs` and `avgLockWaitMs` in `getMetrics()`.

### 3.4. Epistemic PageRank (EP-Rank)
- **Implementation**: Added `calculateEpistemicPageRank(iterations, dampingFactor)` in [`ReasoningService.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/ReasoningService.ts). Iteratively updates graph confidence:
  $$\text{Rank}(v) = (1 - d) \cdot \text{base}(v) + d \sum_{u \in \text{supports}(v)} \frac{\text{Rank}(u)}{\text{out}(u)} - \sum_{w \in \text{contradicts}(v)} 0.2 \cdot \text{Rank}(w)$$

### 3.5. 4-Pillar Diagnostic Probe & Task DAG Scheduler
- **Diagnostic Probe**: Added `runZenithDiagnosticProbe(ctx)` in [`InvariantEngine.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/InvariantEngine.ts) returning unified health status across Disk Invariants, CAS Integrity, DB Pool, and Epistemic Graph.
- **Task DAG Scheduler**: Extended [`TaskService.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/TaskService.ts) with `getExecutableTasks()` and `resolveTaskCascade(taskId, status)` for automated DAG execution.

---

## 4. Verification & Validation

All capabilities were verified across four dedicated test suites and guardrails:
1. `tests/context-compaction-advanced.test.ts` (100% pass)
2. `tests/resilience-epistemic-advanced.test.ts` (100% pass)
3. `tests/universal-zenith-pass.test.ts` (100% pass)
4. `npm run test:guardrails && npm run build` (Clean 49 API export groups, 0 type errors)
