# MEOW-014: Universal Zenith Resilience Engineering & Epistemic Graph Infrastructure

Status: ACCEPTED
Date: 2026-07-27
- **Author**: ACC / MEOW Core Architecture Group
- **Implementing Surfaces**:
  - [`broccolidb/core/agent-context/StreamingToolExecutor.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/StreamingToolExecutor.ts)
  - [`broccolidb/infrastructure/db/BufferedDbPool.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/infrastructure/db/BufferedDbPool.ts)
  - [`broccolidb/core/agent-context/ReasoningService.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/ReasoningService.ts)
  - [`broccolidb/core/agent-context/InvariantEngine.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/InvariantEngine.ts)
  - [`broccolidb/core/agent-context/TaskService.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/TaskService.ts)
  - [`broccolidb/core/agent-context/TokenService.ts`](file:///Users/bozoegg/Downloads/codemarie-new/broccolidb/core/agent-context/TokenService.ts)

---

## 1. Context & Motivation (The Why)

When operating high-concurrency multi-worker agent swarms across complex codebases (`src`), agent execution runs into severe systemic limits:
1. **Cascading Tool Failures**: Failing or timing-out tool operations (compilers, git commands, search utilities) executed repeatedly across parallel worker threads stall entire agent streams.
2. **Database Lock Contention**: SQLite write buffers operating under high-concurrency mutation loads experience `SQLITE_BUSY` lock contention spikes when retried with fixed intervals.
3. **Static Epistemic Confidence**: Knowledge graph confidence scores remain static, failing to discount stale evidence or penalize graph-level contradictions over time.
4. **Lack of Integrated Forensic Visibility**: Operators require unified, automated health auditing across disk invariants, CAS storage integrity, connection pool WAL status, and graph connectivity.
5. **Task Scheduling Bottlenecks**: Complex multi-task workflows lack explicit task dependency graph resolution (`dependsOnTaskIds`), risking execution out of order or orphan task runs after upstream failure.

---

## 2. Decision & Architecture (The What)

We established seven unified architectural mechanisms across BroccoliDB:

1. **Tool Execution Circuit Breaker & Transient Speculative Read Cache**:
   - `ToolCircuitBreaker` monitors sliding-window failure rates per tool name. Trips to `open` state upon 3 failures within 60s, enforcing a 30s reset timeout (`half-open`) to prevent subagent execution loops.
   - `TransientReadCache` deduplicates idempotent read commands (`view_file`, `list_dir`, `grep_search`) using a 500ms TTL signature cache.

2. **Adaptive Jittered Lock Backoff**:
   - Replaces fixed retry delays in `BufferedDbPool` with randomized exponential backoff (`baseDelay * (0.8 + 0.4 * Math.random())`) and records `totalLockWaitMs` and `avgLockWaitMs` metrics.

3. **Epistemic PageRank Engine (EP-Rank)**:
   - Computes graph-propagated confidence scores using iterative support edge weighting and contradiction decay penalties:
     $$\text{Rank}(v) = (1 - d) \cdot \text{base}(v) + d \sum_{u \in \text{supports}(v)} \frac{\text{Rank}(u)}{\text{out}(u)} - \sum_{w \in \text{contradicts}(v)} 0.2 \cdot \text{Rank}(w)$$

4. **Universal 4-Pillar Forensic Diagnostic Probe**:
   - `runZenithDiagnosticProbe(ctx)` executes unified health audits across Disk Invariants, CAS Storage Integrity, DB Pool Health, and Epistemic Graph Connectivity.

5. **Multi-Agent Task DAG Dependency Scheduler**:
   - `TaskService` resolves `dependsOnTaskIds?: string[]`, executing tasks only when prerequisites complete and cascading failure cancellations downstream upon upstream task errors.

6. **Token Bucket Rate Governor**:
   - `TokenRateGovernor` manages model completion token limits per minute and applies smooth backpressure.

---

## 3. Technical Implementation (The How)

### 3.1. Tool Circuit Breaker & Read Cache Insertion
In `StreamingToolExecutor.ts`:
```typescript
if (this.circuitBreaker.isOpen(name)) {
  return this.makeResult(name, toolUseId, 'Circuit breaker open', true, startedAt, false, false, ['circuit_breaker_open']);
}

if (tool.isSearchOrReadCommand) {
  const cached = this.readCache.get(name, normalizedInput);
  if (cached) return { ...cached, toolUseId, metadata: ... };
}
```

### 3.2. Adaptive Lock Jittering
In `BufferedDbPool.ts`:
```typescript
if (isRetryable && retryCount < 3) {
  this.lockContentionCount++;
  const baseDelay = Math.pow(2, retryCount) * 100;
  const delay = Math.round(baseDelay * (0.8 + 0.4 * Math.random()));
  this.totalLockWaitMs += delay;
  await new Promise(r => setTimeout(r, delay));
  return this.runFlushCycle(retryCount + 1);
}
```

### 3.3. Epistemic PageRank Formula
In `ReasoningService.ts`:
```typescript
const ranks = await reasoningService.calculateEpistemicPageRank(10, 0.85);
```

### 3.4. DDL & Migration
In `Config.ts`:
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  ...
  dependsOnTaskIds TEXT,
  ...
);
ALTER TABLE tasks ADD COLUMN dependsOnTaskIds TEXT;
```

---

## 4. Consequences & Verification

- **Verification Commands**:
  - `npx tsx tests/universal-zenith-pass.test.ts` (100% pass)
  - `npx tsx tests/resilience-epistemic-advanced.test.ts` (100% pass)
  - `npx tsx tests/context-compaction-advanced.test.ts` (100% pass)
  - `npm run test:guardrails && npm run build` (Clean API snapshot, 0 type errors)
