# Common Pitfalls

- Do not describe a compact prompt projection as “zero loss.” Exact source bytes
  are recoverable from BroccoliDB CAS and durable transcript history; the
  projection intentionally omits detail and may not parse.
- Do not publish a marker after a buffered enqueue or ordinary `flush()` call.
  Compaction requires the strict caller-ordered `writeDurableBatch()` barrier
  plus post-commit CAS verification.
- Do not advance only an in-memory cursor on scan-only passes. Persist it by
  scope or restored agents will re-hash the same history.
- Do not compact or roll history while an API/tool stream is active. Context work belongs at the completed-turn/request boundary.
- Do not mutate durable source text to save prompt tokens. Adding stable internal IDs is allowed; rewriting evidence is not.
- Do not duplicate token-threshold logic in task, manager, and subagent code. Use `getCompactionTierFromTokens()`.
- Do not compact every tool-shaped payload. Recent, short, unknown, mutating, and completion outputs are safety exclusions.
- Do not scan an entire large history or retain every “important” error line. Enforce per-pass scan/block/candidate/output caps even for error-dense logs, then continue from the circular cursor next turn.
- Do not call `split("\n")` on an unbounded or newline-dense payload, and do not run declaration regexes against an unbounded minified line.
- Do not use message/block array indices as recovery identity. Persist UUIDs and reject legacy positional updates when their digest no longer matches.
- Do not trust marker-looking tool text. Escape forged reserved XML signatures before trusted ledger markers are applied.
- Do not point subagent projections at `api_conversation_history.json` or the
  excerpt-only JSONL transcript. Use the isolated `broccolidb://context/...`
  scope; use `<transcript>.context/` only in an explicit no-central-store
  fallback.
- Do not recursively compact a subagent projection and label its digest as source truth. Reuse it or advance complete-pair rollover unless exact source has been explicitly reread.
- Do not assume `p-mutex` is cross-process. `context_history.json` has one
  parent-process owner and is not central authority; SQLite/WAL and CAS own
  cross-process compaction durability.
- Do not guess or auto-assign downstream file boundaries (e.g. `src/App.tsx`) when MoD target resolution encounters ungrounded targets like `"General"`. Force upstream design investigation (`ProblemClassifier.ts`, `DesignerInResidence.ts`) to ground target decisions in physical inspected workspace files.
- Do not switch production coordination to memory when SQLite fails. `local_test` is a startup mode, not a recovery mode.
- Do not infer lock ownership from PID, mtime, owner ID alone, or the existence/absence of a projection file. Compare the complete owner/epoch/token/mode identity against SQLite.
- Do not convert `leaseEpoch` or `fencingToken` to JavaScript `number`; use the decimal string or `bigint`.
- Do not unlink malformed or clock-skewed lock/fence records automatically. Preserve them and fail closed.
- Do not call administrative cleanup from normal orchestration. `AdministrativeLockCleaner` is an explicit, logged override path only.
- Do not classify every dependency cycle or exhausted pool as deadlock. Check timers, lease expiry, outside owners, and capacity escapes from a consistent snapshot.
- Do not apply deadlock recovery after scheduler or lane state changes; discard the stale diagnosis and recompute.
- Do not mark task state terminal before the `task_completions` CAS commits.
- Do not assign task lifecycle state, generation, cancellation, or terminal flags outside `TaskLifecycleFunnel`. Submit a typed intent for the exact generation.
- Do not treat cancellation request as cancellation settlement. The request fences execution; settlement occurs only after task-owned resources are joined.
- Do not resume a terminal generation or reinterpret an old callback against a replacement generation.
- Do not let storage restoration, controller retry, UI status repair, or subagent envelopes create lifecycle state. They are adapters/projections of the committed event.
- Do not complete or replace a parent generation while an attached child remains active.
- Do not use an ad hoc JSON hash as a completion decision ID; use the schema-versioned canonical digest.
- Do not create a completion decision in a handler, finalizer, resume adapter, prompt projection, or webview component. All authority belongs to `CompletionFunnel.ts`; downstream code consumes its event.
- Do not call a tool handler, `UniversalGuard`, execution hook, mutation fence, or roadmap preflight as a second execution gate. All authorization and dispatch belong to `ExecutionFunnel.ts`.
- Do not inspect approval settings, auto-approve, prompt for operation consent, record a decision, or issue/reinterpret a permit in a handler. Handlers declare only a pure `ApprovalIntent`.
- Do not restore a missing-intent default or treat stale/malformed decisions as approval. Approval is fail-closed and generation scoped.
- Do not issue a permit before `approval.decision`, or accept a permit whose `permitDecisionId`, generation, or invocation differs from the recorded decision.
- Do not let a composite handler call another handler directly. Use the funnel's delegated dispatch and ensure the child intent is covered by the frozen parent intent.
- Do not discover and execute an undeclared command after approval; exact executable commands belong in normalized intent arguments before policy evaluation.
- Do not infer tool success, failure, denial, or cancellation from presentation text. Consume the whole terminal `ExecutionFunnelEvent` for that invocation.
- Do not add a compatibility executor beside the funnel. Reliability is subordinate to the active permit and lives in the same monolith.
- Do not merge a pending event with fields from an older completed event. Select one whole event, while allowing separately verified durable terminal evidence to supersede stale presentation history.
- Do not let generic resume markers demote a terminal completion. Reopening requires explicit user feedback or a new user request.
- Do not route circuit-breaker recovery through `run_finalization`. Change the workspace for a central-funnel probe or report the unresolved blocker; finalization is documentation maintenance only.
- Do not add another pre-tool gate for workspace-local queries; the funnel's query classification already combines required parameters, `.dietcodeignore`, task/lane authority, and cancellation.
- Do not cache completed reads across a file mutation. Reset `IoRequestCoalescer` for the task.
- Do not acquire a backend bulkhead slot before coalescing. Identical waiters would consume the whole class budget while one backend runs.
- Do not wrap the complete handler in a reusable cache: validation and external approval must execute per invocation. Cache only contained, generation-bound backend payloads after approval.
- Do not infer canonical workspace containment from a lexical prefix. Resolve symlinks/nearest existing ancestors and key evidence by workspace identity plus filesystem/policy generation.
- Do not retain a successful search/list/read result after a generation changes during execution; retry or discard it before projection.
- Do not assume only sibling invocations need cancellation. Direct I/O must use the task-owned signal and be joined by task abort.
- Do not turn a failed repository search into “Found 0 results”; a resolved false negative becomes reusable cache evidence.
- Do not rely on watcher delivery after `apply_patch`, shell, or MCP mutation of `.dietcodeignore`; refresh affected or opaque policy state before rotating the result generation.
- Do not use unbounded directory expansion or buffer full ripgrep stdout. Enforce traversal, byte, line, and result limits during production.
- Do not wrap the owned shell process in another timeout/retry race. A timed-out promise does not terminate its process and can create duplicate live commands.
- Do not treat roadmap or audit diagnostic failure as negative engineering evidence.
- Do not put evidence persistence on the response path when task-local evidence already exists.
- Do not auto-bootstrap or rewrite `ROADMAP.md` merely because a task started.
- Do not interpret `CommandExecutor.execute()` tuple item zero as success; it is `userRejected`.
- Do not run a supposedly focused Mocha command without `--no-config`.
- Do not use `Promise.all(executeTool)` directly. Tool results, partial tool cards, and the approval response slot are shared mutable state unless invocation capture is active.
- Do not let a checkpoint-blocked mutation consume one of the four execution slots; use scheduler readiness plus `signalReady()` so reads can fill the pool.
- Do not treat every shell command as a query. Only bounded test/lint/typecheck forms without shell operators use the verification-read scope.
- Do not assume presentation has been fully decoupled. Workspace-local query cards are captured and projected by sibling sequence; non-query and interactive presentation still uses shared state.
- Do not assume `hasActiveBackgroundCommand()` means detached-only work; it is the task cancellation probe for the current foreground terminal process as well.
- Focused tests that import `Task` must require `./src/test/requires.cjs`, or Node will fail to resolve the VS Code test shim.
- Do not check `activeLaneExecutions` to limit concurrent subagent execution lanes; track executing lanes via `running.size` because `runSubagent` yields during setup, causing the entire pending queue to spill.
- Do not reuse completed subagents on swarm resume without checking that the source governed receipt is sealed and has valid checksum integrity; doing so leads to unsafe work reuse.
- Do not block swarm initialization or lane admission on parent context prefetching; fetch it asynchronously and pass the promise to the runner.
- Do not let a subagent run in a loop calling the same tool with identical parameters; ensure repetition detection and self-correction nudges are active.
- Do not execute a completion validation command under the original handler permit or inside the handler transaction. Doing so re-introduces nested permit leaks; always split the transaction, letting `ExecutionFunnel` release the permit and commit the terminal event before consumption.
- Do not let `consume()` and `reconcileForTask()` race to run the same validation command. Use atomic CAS to transition the saga to `evidence_dispatching`, and check both terminal db events and in-memory active states before resubmitting.
- Do not use raw database connections or synchronous getters in domain code. Use narrow repository functions (like `loadTerminalExecutionEvent`).
