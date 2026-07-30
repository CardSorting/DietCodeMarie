# Changelog

All notable changes to **LUMI** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [11.5.0] - 2026-07-30

### Fixed

- **Completed Task Reopening & Re-edit Architecture (`taskCompletionEvidence.ts`)** — Resolved issue where completed tasks remained permanently locked when users edited messages, restored pre-completion checkpoints, or provided follow-up feedback. Refactored `getTerminalCompletionEvidence` to evaluate sequential `reopensCompletedTask` markers across message history and override durable completion status when history is restored or edited prior to completion.
- **Skill Subsystem & Frontmatter Encoding Hardening** — Resolved skill loading failures on extension startup for bundled skills (`auto-rolling-roadmap`, `golden-cartridge-protocol`) and global user skills (`dogfood`). Fixed UTF-8 BOM (`\uFEFF`) frontmatter parsing failures, unclosed file handle resource leaks in `getBundledSkillMetadata`, strict case/whitespace matching in `getSkillContent` and `UseSkillToolHandler`, and path normalization issues in `skillRuntime.ts`.
- **Observable Skill Discovery Diagnostics API (`discoverSkillsWithDiagnostics`)** — Added structured diagnostic reason codes (`MISSING_SKILL_MD`, `MISSING_NAME`, `MISSING_DESCRIPTION`, `NAME_MISMATCH`, `READ_ERROR`, `PERMISSION_DENIED`) for robust error reporting during skill folder scanning.
- **Subagent Swarm & Slash Command Skill Resolution Parity** — Standardized case and whitespace resilience in slash command matching (`/skillName`) and subagent skill configuration inheritance (`SubagentRunner.ts`).

## [11.4.0] - 2026-07-29

### Added

- **Hardware Automatic Prompt Caching Engine (`ApcStableIngestionEngine`)** — Dedicated hardware Automatic Prompt Caching (APC) token optimization engine for Cerebras and Gemma models guaranteeing 100% prefix invariance across multi-turn agent sessions.
- **Monolithic Focus Chain Domain Engine V2 (`FocusChainAuthority.ts`)** — Centralized focus chain state management, atomic disk persistence, and completion gate instructions into a single monolithic domain authority with an explicit `FocusChainStatus` state machine (`IDLE`, `ACTIVE`, `COMPLETED`, `STALE`).
- **Immutable Focus Chain Snapshot API (`FocusChainSnapshot`)** — Added `authority.getSnapshot()` providing cached, atomic metrics (`totalItems`, `completedItems`, `percentComplete`, `status`, `isComplete`, `userHasModified`) across completion gate pipelines and telemetry services.
- **GFM & Markdown Label Sanitization Engine (`sanitizeChecklistLabel`)** — Enhanced checklist item parsing to support all standard GFM markers (`-`, `*`, `+`, `1.`, `1)`) and indented sub-items. Strips Markdown links (`[text](url)`), code backticks (`` `code` ``), bold/italics, and HTML comments from labels before fuzzy comparison to eliminate false-positive completion gate rejections.

### Fixed

- **Hardware APC Engine & Main Token Buffer Parity Synchronization** — Ported all APC engine optimization discoveries to the central `TokenIngestionBufferEngine` (`token-buffer-engine.ts`), introducing line-boundary aligned tool output compaction, assistant reasoning tag sanitization (`<think>`, `<thinking>`, `<reasoning>`), CSI/OSC terminal escape sequence stripping, single-text-block array unwrapping, and API-compliant `user` turn boundary snapping (100% verified across 34 automated benchmark & pipeline tests).
- **Focus Chain State Leakage** — Purged task progress checklist state upon completion attempt finalization (`markCompletionAttemptFinished`), preventing state leakage and infinite retry loops on task completion.
- **Delegated Handler State Sync** — Refactored `AttemptCompletionHandler.ts` to delegate Focus Chain synchronization directly to `config.callbacks.updateFCListFromToolResponse(taskProgress)` for single-source-of-truth consistency.

## [11.0.0] - 2026-07-26

### Added

- **Provider-Centric Settings Navigation** — Replaced classic API Keys tab with dedicated, specialized tabs for supported providers (**OpenRouter**, **ChatGPT / OpenAI**, **NousResearch**, **Cloudflare**, **Cerebras**, **ClinePass**, **Grok / xAI**, **Qwen Token Plan**, **Z AI**).
- **Embedded Credentials & API Keys** — Embedded API key input, OAuth login, and account token setup directly within each dedicated provider view.
- **Ultra-Compressed Paginated Model List** — Compact 24px single-row model items with 4 models per page and micro pagination controls (`‹ Prev`, `Page X of Y`, `Next ›`) engineered specifically for narrow sidebar extensions.
- **Streamlined Recency Filtering** — Simplified filter pills and badge chips to focus strictly on model recency (`NEW` badge chip).

### Changed

- Bumped extension version to **11.0.0**.
- Refactored model selection handlers to use field-masked partial configuration updates over gRPC `ModelsServiceClient`.

### Changed

- Bumped extension version to 10.5.0.

## [6.0.0] - 2026-07-26

### Added

- **Zero-GC Contiguous Slab Allocator (`ArenaAllocator.ts`)** — 16MB pre-allocated `ArrayBuffer` slab with $O(1)$ pointer reset, bypassing V8 garbage collection sweeps for short-lived AST nodes and findings.
- **Lock-Free Spin-Yield SharedArrayBuffer Atomics IPC (`IPCBuffer.ts`, `FastIPC.ts`)** — Transmits AST and worker task state directly over `SharedArrayBuffer` in 64-bit word chunks without JSON serialization overhead.
- **Reactive Work-Stealing Task Scheduler (`TaskScheduler.ts`)** — Dual-ended `WorkStealingDeque` (LIFO pop for local worker, FIFO steal for victim thread) eliminating thread starvation.
- **Zero-Copy Kernel Direct Read I/O Engine (`ZenIOEngine.ts`)** — Direct system call file descriptor reading into typed ArrayBuffer slabs, avoiding intermediate Node Buffer allocations.
- **V8 TurboFan Monomorphic Bitwise Execution (`AgentDigest.ts`, `SymbolRegistry.ts`, `TypeMirrorEngine.ts`)** — Monomorphic class shape stability for `FindingEntry`, `SymbolProviderEntry`, and `TypeMirrorDiagnosticEntry` with 0 V8 deoptimizations.
- **$O(1)$ Single-Pass Forensic & Metrics Algorithms (`ForensicEngine.ts`, `MetricsEngine.ts`, `DiskParityEngine.ts`, `PathResolver.ts`)** — Lazy snapshot node indexing map for $O(1)$ hotspot heat calculation, single-pass Welford online mean/variance algorithm, and fast $O(1)$ string slicing.
- **DCE-Hardened Empirical Benchmark Suite (`pass8_zenith_benchmark.ts`)** — Volatile global checksum sink (`GLOBAL_BENCH_SINK`), 5-sample median timing, JIT warmup iterations, and live DCE verification output (`DCE Sink Verified: ✅ VERIFIED LIVE`).
- **Core Application Hardening (`/src`)** — Fast-path regex pre-filtering (`SensitiveDataMasker.ts`), single-pass JSON serialization (`SubagentTranscriptRecorder.ts`), and monomorphic object key ordering (`AuditLogService.ts`, `BufferedDbPool.ts`).

### Changed

- Updated `@noorm/broccolidb` performance baseline from 22.0s to sub-4.8s total pipeline execution time (78%+ wall-clock speedup).
- Certified 100% test suite compliance (75/75 test suites passed).

### Added

- **Confidence-preserving subagent convergence** — Findings now retain independent execution validity, confidence, confidence reason, evidence, assumptions, and decision criticality instead of collapsing into a lane-wide pass/fail score.
- **Bounded critical-claim verification** — Consequential uncertainty can launch one read-only, claim-specific evidence probe, capped at one probe per claim and two probes per swarm.
- **Structured uncertainty results** — Parent synthesis receives accepted, tentative, and rejected findings, classified contradictions, explicit assumptions, safe-to-proceed guidance, and evidence needed to resolve remaining uncertainty.
- **Durable confidence governance** — Governed receipts and resume plans preserve ambiguity profiles, probe history, semantic evidence deltas, confidence plateaus, source authority, and original confidence values.

### Changed

- Low-confidence, unknown, advisory, and analytically contradictory findings now converge with bounded uncertainty when governance remains valid.
- Swarm-wide confidence retries are replaced by targeted probes; successful lanes are not restarted merely to obtain a stronger self-reported score.
- README and governed execution documentation now explain the behavioral convergence model, safety invariants, user-visible flow, and layered runtime architecture before implementation details.

### Fixed

- Prevented vague or exploratory tasks from entering recursive merge loops when repeated attempts produce no semantically new evidence.
- Preserved fail-closed behavior for invalid receipts, checksum or provenance failures, mutation-authority violations, lock conflicts, and operations unsafe under every surviving interpretation.

## [3.1.0] - 2026-07-09

### Added

- **ChatGPT Subscription Models catalog update** — Added the full suite of GPT-5.6 models (`gpt-5.6-sol`, `gpt-5.6-sol-pro`, `gpt-5.6-terra`, `gpt-5.6-terra-pro`, `gpt-5.6-luna`, `gpt-5.6-luna-pro`), `gpt-5.4-mini`, and `gpt-5.3-codex-spark` to the OpenAI Codex provider catalog.
- **Calibrated Context Window sizes** — Aligned context window limit parameters (`372_000` tokens for GPT-5.6 series, `272_000` tokens for GPT-5.5/5.4/5.3 series) to match the official `codex-main` configurations.
- **Double platform-targeted packaging VSIX builds** — Created separate target-specific packages (`lumi-vscode` and `lumi`) to distribute native compiled binaries cleanly on all marketplaces.

## [3.0.0] - 2026-07-09

### Added

- **Completion lifecycle decision engine** (`CompletionLifecycleDecisionEngine`) — a single deterministic authority that owns all completion/finalization eligibility decisions. Receives an immutable snapshot, returns one canonical decision with a binding action contract (`nextAllowedAction`, `forbiddenActions`, `canonicalInstruction`) and a full structured decision trace.
- **Completion action guard** (`CompletionActionGuard`) — enforcement layer at the tool boundary. Validates requested tools against the decision's action contract. Rejected actions never mutate counters, create audit state, or trigger retry loops. The agent receives a command, not prose to interpret.
- **Gate registry** (`gateRegistry.ts`) — active/retired gate tracking. Unknown or retired gates are non-participating (not blocking). Mirrors service registry patterns (Consul, etcd).
- **Circuit breaker half-open probe state** (Hystrix/Envoy pattern) — when the circuit breaker trips and engineering is NOT verified, the agent can make workspace changes to earn one probe attempt. Exactly one probe per checkpoint, tracked via `lastProbeCheckpointHash` on `TaskState`.
- **Workspace-unchanged detection** (`workspace_progress` preflight stage) — blocks retries when the workspace hasn't changed since the last gate block, even if the result text was reworded. Soft block — does not consume circuit-breaker budget.
- **Two-tier duplicate detection** — within cooldown: always suppress; after cooldown: suppress if workspace unchanged. Prevents the infinite retry loop that burned through the block budget.
- Documentation: [Completion lifecycle decision engine](docs/completion-lifecycle-decision-engine.md)
- Per-agent roadmap projection with coordinator-only workspace commits
- Governed swarm operator console fields (accepted/rejected patches, rebase, commit status)
- GitHub community templates (issues, PR, discussions, support)
- CI automation: OpenSSF Scorecard, actionlint, PR size labels, welcome bot, lock-threads
- Composite action `.github/actions/setup-node-monorepo` for cached monorepo installs
- Labels as code (`.github/labels.yml`), Dependabot auto-merge, merge-conflict labeling
- Security advisory issue template, maintainer [RELEASING.md](.github/RELEASING.md) runbook
- Husky `commit-msg` hook for Conventional Commits

### Fixed

- Publish platform-targeted VSIX packages and verify the bundled `better-sqlite3` binary OS/architecture, preventing Linux native modules from being installed on Windows.
- Use a native `protoc` compiler on Apple Silicon packaging hosts instead of requiring Rosetta.
- Keep completion audits authoritative but non-blocking when optional stream-context lookup or durable audit persistence is temporarily unavailable.
- **Audit cache validity** changed from OR logic to strict AND: cache key + graph revision + TTL + gate active must ALL match. A stale audit can no longer be reused when only one dimension holds, eliminating false-positive "passed" audit receipts.
- **Infinite retry loop** eliminated: duplicate submissions after cooldown are now blocked when the workspace hasn't changed, preventing the agent from burning through the block budget until the circuit breaker trips.
- **Circuit breaker deadlock** eliminated: when the circuit breaker trips and engineering is NOT verified, the agent can now make workspace changes to earn a half-open probe attempt, instead of being permanently stuck.
- **`gateLifecycleInvariants.ts`** now imports `MAX_COMPLETION_GATE_BLOCK_COUNT` directly from `gatePolicy.ts` instead of using a fragile local constant that could drift.

### Changed

- Repository renamed to [CardSorting/LUMI](https://github.com/CardSorting/LUMI)
- E2E workflow skips docs-only pull requests (path filter)
- Removed legacy JetBrains and nightly publish automation

## [2.7.0] - 2026-06-27

### Added

- Bundled default roadmap skill (`auto-rolling-roadmap`) — no per-workspace copy
- Skill discovery cache (15s TTL) with explicit invalidation on create/delete/toggle
- Progressive disclosure: execution digest on `use_skill`, full reference via `full_reference`
- Stable bundled skill toggle key (`bundled://auto-rolling-roadmap`)
- Skill pipeline acceptance tests and Open VSX path resolution tests
- Telemetry: `loadMode`, `fullSkillLoadReason`, `skillsDiscoveryCacheHit`

### Changed

- Roadmap skill excluded from SKILLS prompt when ROADMAP_STEERING is active
- Removed `workspace_skill_installed` completion gate (advisory only)
- Subagents respect skill toggles and exclude bundled roadmap from prompt catalog
- Doctor/validate/cockpit defaults to guide/continue-task — no mid-task ritual loops
- Skills UI refresh poll interval: 30s (invalidation on mutations)
- Bundled skill metadata reads 2KB frontmatter head only on discovery

## [2.1.6] - 2026-06-27

### Added

- Receipt authority refactor: coordinator-owned halt decisions, advisory receipts, governance diagnostics (ADR-015)
- Three-tier blocker policy (hard / soft / advisory) and explicit lane state machine
- Parent I/O bulkhead and `IoRequestCoalescer` for parallel safe reads with deduplication
- `CoordinatorExecutionAuthority`, `loadSealReceiptContext`, soft-block retry budgets
- Documentation: [governed execution authority](docs/governed-execution-authority.md)

### Changed

- Subagent parent gate signals are advisory warnings, not lane-blocking `criticalSignals`
- Non-blocking running status emission; parallel seal drain and audit preflight
- Advisory lane timeout degrades to `degraded_complete` instead of failing the swarm
- Lane mutation tools defer post-guard; batched governed receipt reads at seal

## [2.1.4] - 2026-06-27

### Added

- Parent-thread I/O execution authority (`executionAuthority.ts`) — hot/warm/cold tool path for reads and searches
- Documentation: [parent-thread execution authority](docs/parent-thread-execution-authority.md), ADR-014, gate failure catalog

### Changed

- Shift-right parent gates: I/O tools skip full UniversalGuard; deferred post-guard and advisory audits
- Subagent lane completion: sync quality preflight only; hardening audit deferred to seal barrier
- Completion gate cache-aside (5 min TTL), progressive critical-only threshold, soft cooldown/duplicate preflight

## [2.1.3] - 2026-06-26

### Changed

- Hardened `.vscodeignore` for Open VSX pre-publish scanners (exclude shell scripts, dev tooling, SQLite test binaries)
- `lumi-doctor` now verifies Open VSX packaging rules on every VSIX build

## [2.1.2] - 2026-06-26

### Changed

- Version republish after 2.1.1 was already published to marketplaces

## [2.1.1] - 2026-06-26

### Fixed

- actionlint CI workflow: run via official download script (`rhysd/actionlint` is not a GitHub Action)
- CodeQL analysis configuration for JS/TS monorepo

### Changed

- Dependency security updates across monorepo (npm audit fixes)

## [2.1.0] - 2026-06-23

Current extension release (`package.json`). See [changelogv3.md](changelogv3.md) for detailed substrate and provider history from prior product iterations.

### Highlights

- Calm VS Code companion UX (`CardSorting.lumi-vscode` / `CardSorting.lumi`)
- Plan/Act modes with approval-gated tools
- Governed subagent swarms with merge gate and durable receipts
- BroccoliDB-backed cognitive memory integration

---

Older detailed entries: [changelogv3.md](changelogv3.md)
