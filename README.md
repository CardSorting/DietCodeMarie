# LUMI

<p align="center">
  <img src="assets/icons/icon.png" alt="LUMI" width="96" />
</p>

<p align="center">
  <strong>A calm coding companion — human-in-the-loop agentic pair programming inside VS Code.</strong>
</p>

<p align="center">
  <em>Forked from <a href="https://github.com/cline/cline">Cline</a> · evolved independently by <a href="https://github.com/CardSorting">CardSorting</a></em>
</p>

<p align="center">
  <a href="docs/README.md">Documentation</a> ·
  <a href="#origins--acknowledgments">Cline lineage</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="docs/OPENSSF_SCORECARD.md">OpenSSF Scorecard</a> ·
  <a href="https://github.com/CardSorting/LUMI/issues">Issues</a> ·
  <a href="https://github.com/CardSorting/LUMI/discussions">Discussions</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/CardSorting/LUMI" alt="License" /></a>
  <a href="https://github.com/CardSorting/LUMI/actions/workflows/codeql.yml"><img src="https://github.com/CardSorting/LUMI/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/CardSorting/LUMI"><img src="https://api.securityscorecards.dev/projects/github.com/CardSorting/LUMI/badge" alt="OpenSSF Scorecard" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/version-11.0.0-green" alt="Version" /></a>
  <img src="https://img.shields.io/badge/VS%20Code-%5E1.84.0-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code" />
  <img src="https://img.shields.io/badge/extension-CardSorting.lumi--vscode-purple" alt="VS Marketplace ID" />
  <img src="https://img.shields.io/badge/Open%20VSX-CardSorting.lumi-blue" alt="Open VSX ID" />
  <img src="https://img.shields.io/badge/tools-64-orange" alt="Tools" />
  <img src="https://img.shields.io/badge/providers-9-blue" alt="Providers" />
</p>

<p align="center">
  <img src="assets/docs/demo.gif" alt="LUMI demo — chat, approval, and file edits in VS Code" width="720" />
</p>

> **Human-in-the-loop by default:** diff before write, checkpoint after tool use, completion gates before “done.”

```bash
# VS Code Marketplace (CardSorting.lumi-vscode)
code --install-extension CardSorting.lumi-vscode
# Open VSX / Cursor (CardSorting.lumi)
code --install-extension CardSorting.lumi
```

---

## Table of contents

- [About](#about)
- [Origins & acknowledgments](#origins--acknowledgments)
- [Product evolution (full history)](docs/EVOLUTION.md)
- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Governed subagent execution](#governed-subagent-execution)
- [Recoverable context compaction](#recoverable-context-compaction)
- [Workspace Knowledge System](#workspace-knowledge-system)
- [LUMI Designer-in-Residence & MoD v3.0](#lumi-designer-in-residence--mod-v30)
- [Plan & Act modes](#plan--act-modes)
- [Built-in slash commands](#built-in-slash-commands)
- [Lifecycle hooks](#lifecycle-hooks)
- [Key VS Code settings](#key-vs-code-settings)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Getting help](#getting-help)
- [Security](#security)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## About

**LUMI** is a VS Code extension that reads your workspace, plans changes, runs terminal commands, connects MCP servers, and edits files — with **explicit approval at every mutating step**.

| | |
|---|---|
| **Publisher** | CardSorting |
| **VS Marketplace** | `CardSorting.lumi-vscode` |
| **Open VSX** | `CardSorting.lumi` |
| **License** | [Apache-2.0](LICENSE) |
| **Repository** | [github.com/CardSorting/LUMI](https://github.com/CardSorting/LUMI) |
| **Homepage** | [dietcode.io](https://dietcode.io) |
| **Changelog** | [changelogv3.md](changelogv3.md) |

Task history and cognitive memory use **BroccoliDB** (`@noorm/broccolidb`) locally. Multi-lane **governed swarms** (`use_subagents`) use SQLite-backed production leases, durable receipts, typed deadlock analysis, and a merge gate so parallel agents can share read work without weakening mutation safety.

Design philosophy: [docs/papers/philosophy.md](docs/papers/philosophy.md) (agent) · [docs/papers/knowledge-philosophy.md](docs/papers/knowledge-philosophy.md) (knowledge) · Stack map: [docs/AGENT_STACK.md](docs/AGENT_STACK.md)

### By the numbers

| Metric | Value |
|--------|-------|
| Typed tools | **64** (`src/shared/tools.ts`) |
| Read-only tools | **12** (`READ_ONLY_TOOLS`) |
| Wired providers | **9** (`providers.json`) |
| Slash commands | **10** |
| Hook kinds | **8** |
| Agent modes | **plan** · **act** |
| Governed receipt schema | **v3** |

Workspace-verified metrics: [docs/papers/companion-brief.md](docs/papers/companion-brief.md) · Knowledge brief: [docs/papers/knowledge-brief.md](docs/papers/knowledge-brief.md) · Substrate report: [broccolidb/docs/PASS12_ARCHITECTURAL_REPORT.md](broccolidb/docs/PASS12_ARCHITECTURAL_REPORT.md)

---

## 🚀 Substrate Performance & Mechanical Sympathy (Passes 1–12)

LUMI's cognitive memory substrate, **BroccoliDB** (`@noorm/broccolidb`), features a 12-pass V8 mechanical sympathy engine designed for high-throughput zero-GC execution.

<p align="center">
  <img src="assets/docs/zenith_benchmark_infographic.png" alt="BroccoliDB Passes 1-12 Benchmark Dashboard Infographic" width="800" />
</p>

### Key Performance Breakthroughs

- ⚡ **78% Wall-Clock Time Reduction**: Substrate pipeline execution decreased from **22.0s baseline** down to **4.8s total execution time** (Pass 1 through 12).
- 🧠 **Zero-GC Slab Memory Management (`ArenaAllocator.ts`)**: 16MB contiguous `ArrayBuffer` slab allocation achieves **103,966,315 ops/sec** with $O(1)$ resets, bypassing V8 heap garbage collection sweeps (**1618.9x less heap bloat**).
- ⚡ **Lock-Free SharedArrayBuffer Atomics IPC (`IPCBuffer.ts`, `FastIPC.ts`)**: Direct multi-threaded state streaming at **15,388,463 ops/sec** with zero JSON serialization overhead.
- ⚡ **V8 TurboFan Monomorphic Inline Bitwise Execution (`AgentDigest.ts`)**: Native Smi bitwise masking at **877,465,844 ops/sec** with **0 V8 deoptimizations** (`--trace-deopt` verified).
- 🛡️ **DCE-Hardened Verified Suite (`pass8_zenith_benchmark.ts`)**: Includes volatile `GLOBAL_BENCH_SINK` accumulators, 5-sample median timing, JIT warmups, and live DCE verification output (`DCE Sink Verified: ✅ VERIFIED LIVE`).

Full architectural treatment: [broccolidb/docs/PASS12_ARCHITECTURAL_REPORT.md](broccolidb/docs/PASS12_ARCHITECTURAL_REPORT.md)

---

## Origins & acknowledgments

**LUMI** is spiritually and technically descended from **[Cline](https://github.com/cline/cline)** — the open-source VS Code agent that pioneered human-in-the-loop pair programming (diff-before-write, plan/act, MCP, checkpoints). This repository **forked the Cline VS Code extension codebase** and has since evolved independently under **[CardSorting](https://github.com/CardSorting)**.

[Cline](https://cline.bot) today ships several products — VS Code extension, [CLI](https://github.com/cline/cline/tree/main/cli), [TypeScript SDK](https://github.com/cline/cline/tree/main/sdk), and [Kanban](https://github.com/cline/kanban). **LUMI is not those other repos**; it is a governance-focused fork of the **editor extension agent** lineage only.

### Evolution

| Stage | Name | Notes |
|-------|------|-------|
| Upstream | **Cline** | Original agent loop, typed tools, and VS Code integration |
| Intermediate | **DietCode** | CardSorting fork; sovereign substrate, Spider, roadmap gates; legacy IDs remain |
| Substrate | **BroccoliDB** | Cognitive memory and structural truth recentered into `@noorm/broccolidb` |
| Governed lanes | **Receipts v3** | Multi-agent merge gate, per-lane roadmap projection, durable operator receipts |
| Current | **LUMI** | User-facing brand; extension IDs `CardSorting.lumi` / `CardSorting.lumi-vscode` |

**Full timeline, phase narratives, naming migration tables, and changelog map:** [docs/EVOLUTION.md](docs/EVOLUTION.md).

### Inherited from Cline · built by LUMI

| From Cline (kept) | LUMI additions |
|-------------------|----------------|
| Diff-before-write approvals · [Cline: working with files](https://docs.cline.bot/core-workflows/working-with-files) | **Governed subagents** — parallel lanes, mutation locks, merge gates, durable receipts |
| [Plan / Act modes](https://docs.cline.bot/core-workflows/plan-and-act) | **BroccoliDB** — local cognitive memory and workspace substrate (`dietcode.db`) |
| [MCP](https://docs.cline.bot/features/mcp) tool extension | **Roadmap & completion gates** — `ROADMAP.md` steering and `attempt_completion` audit pipeline |
| Terminal execution with explicit user consent | **Joy-Zoning & stability policy** — architectural enforcement in the tool path |
| `@` context mentions, browser tooling, checkpoints | **Product surface** — LUMI branding, [dietcode.io](https://dietcode.io), CardSorting extension IDs |

### Coming from Cline?

If you used Cline’s VS Code extension, approvals, modes, and MCP should feel familiar. Main differences:

| Cline | LUMI |
|-------|------|
| `.clinerules/` project rules | [`.dietcoderules/`](docs/customization/dietcode-rules.mdx) |
| `.clineignore` | [`.dietcodeignore`](docs/customization/dietcodeignore.mdx) |
| Cline extension IDs (e.g. `saoudrizwan.claude-dev`) | `CardSorting.lumi` / `CardSorting.lumi-vscode` |
| CLI, SDK, Kanban (separate Cline products) | **Not bundled here** — use [upstream Cline](https://github.com/cline/cline) |

Legacy identifiers (`cline`, `clineMessages`, Cline doc redirects in `docs/docs.json`) still appear in paths and types where refactors are ongoing; the user-facing product name is **LUMI**. See [legacy inventory](docs/EVOLUTION.md#legacy-inventory--refactor-status) for a full grep-backed list.

### Links & license

| | |
|---|---|
| **Upstream repo** | [github.com/cline/cline](https://github.com/cline/cline) |
| **Cline docs** | [docs.cline.bot](https://docs.cline.bot) |
| **Cline community** | [cline.bot](https://cline.bot) · [Discord](https://discord.gg/cline) |
| **Upstream license** | [Apache-2.0](https://github.com/cline/cline/blob/main/LICENSE) |
| **This fork’s attribution** | [NOTICE](NOTICE) · [License](#license) |

Thank you to the Cline maintainers and contributors for the foundation this project builds on. For LUMI’s design goals vs generic autonomous agents, see [How LUMI differs](docs/README.md#how-lumi-differs). For the full fork timeline and migration reference, see [Product evolution](docs/EVOLUTION.md).

---

## Features

- **Approval gates** — diff before write; you control when mutating tools run
- **Plan before Act** — `plan_mode_respond` for exploration; `act_mode_respond` for implementation
- **64 typed tools** — dedicated handlers instead of ad-hoc shell access
- **Checkpoints** — shadow Git rollback after each tool use
- **Completion gates** — `attempt_completion` must pass `completionGatePipeline` before “done”
- **Roadmap steering** — `ROADMAP.md` integration with validation gates
- **MCP** — connect external tools and prompts
- **Governed subagents** — parallel lanes with execution modes, merge gate, and durable receipts
- **Recoverable context compaction** — progressively reduces old tool evidence
  between completed turns; BroccoliDB durably stores exact source, stable
  projections, and cursors before the next request can use them
- **Restart-safe completion & storage hardening** — terminal outcomes commit through an ownership- and state-checked SQLite transaction; multi-table retention sweeps, auto-vacuum page reclaiming, native statement handle disposal, and backoff WAL truncation prevent disk erosion and memory leaks
- **Local-first** — settings and secrets under `~/.dietcode/data/`; workspace DB at `./dietcode.db`
- **Nine providers** — OpenRouter, ChatGPT Subscription, NousResearch, Cloudflare Workers AI, Cerebras, ClinePass, Grok/X Subscription, Qwen Token Plan, and Z AI (GLM)

**@ mentions** — attach files, folders, problems, terminal output, git diffs, and URLs in chat. Guide: [working-with-files](docs/core-workflows/working-with-files.mdx)

**Project files:** `.dietcoderules/`, `.dietcoderules/hooks/`, `.dietcodeignore`, `.dietcodeworkflows/`, `ROADMAP.md`. See [hooks](docs/customization/hooks.mdx) and [dietcodeignore](docs/customization/dietcodeignore.mdx).

**Enterprise:** [docs/ENTERPRISE_DEPLOYMENT.md](docs/ENTERPRISE_DEPLOYMENT.md)

---

## Installation

### Prerequisites

- VS Code **1.84+** (or Cursor with extension support)
- **Git** on `PATH` (for checkpoints)
- API credentials for one provider (OpenRouter, ChatGPT Subscription, NousResearch, Cloudflare, Cerebras, ClinePass, Grok/X Subscription, Qwen Token Plan, or Z AI)

### Install

| Method | Action |
|--------|--------|
| **Marketplace** | Extensions → search **LUMI** → install **CardSorting.lumi-vscode** (VS Code) or **CardSorting.lumi** (Open VSX) |
| **CLI** | `code --install-extension CardSorting.lumi-vscode` |
| **VSIX** | `npm run package:vsix` → `code --install-extension dist/*.vsix` |
| **From source** | See [Development](#development) → press **F5** |

Provider setup: [docs/getting-started/quick-start.mdx](docs/getting-started/quick-start.mdx)

> Disable other DietCode forks to avoid activity bar collisions.

---

## Quick start

### Onboarding Walkthrough

```mermaid
flowchart LR
  A[1. Install Extension] --> B[2. Set API Provider]
  B --> C[3. Prompt in Plan/Act Mode]
  C --> D[4. Review Diffs & Approve]
  D --> E[5. Auto-Compacted & Governed Swarms]
```

1. **Open LUMI**: Click the LUMI icon in the VS Code Activity Bar.
2. **Configure Provider**: Go to **LUMI Settings → API Configuration** and set up your preferred model provider (OpenRouter, ChatGPT Subscription, Anthropic, Cloudflare, etc.).
3. **Plan Before Acting**: Start with **Plan Mode** (`plan_mode_respond`) to explore codebases, analyze architecture, and formulate plans safely before making changes.
4. **Human-in-the-Loop Approval**: Switch to **Act Mode** (`act_mode_respond`) to execute file edits and terminal commands. Review exact diffs and tool parameters before approving.
5. **Zero-Config Context Scaling**: As sessions accumulate tool output, **BroccoliDB Context Compaction** silently compacts prompt projections into sharded CAS blobs without interrupting execution or losing exact historical source bytes.
6. **One-Click Checkpoints**: Keep checkpoints enabled to rollback to any state after tool execution.

Tutorial: [your-first-project](docs/getting-started/your-first-project.mdx) · Plan/Act guide: [plan-and-act](docs/core-workflows/plan-and-act.mdx)

---

## Documentation

| Doc | Description |
|-----|-------------|
| **[Agent playbook](AGENT_PLAYBOOK.md)** | Current-state operating brief for future agents |
| [Workspace wiki](WIKI.md) | Stable architecture, workflows, setup, testing, deployment notes |
| **[Knowledge ledger](.wiki/index.md)** | Sovereign knowledge ledger index and navigation |
| [Troubleshooting](TROUBLESHOOTING.md) | Reproduced failures, fixes, non-causes, validation guidance |
| [Decisions](DECISIONS.md) | Root continuity and operating ADRs |
| [Handoff](HANDOFF.md) | Current working-tree state and next-agent transfer notes |
| **[docs/README.md](docs/README.md)** | Documentation hub — reading paths by audience |
| [Product evolution](docs/EVOLUTION.md) | Cline → DietCode → LUMI timeline, migration playbook |
| [Companion brief](docs/papers/companion-brief.md) | Product summary with live metrics |
| [Philosophy](docs/papers/philosophy.md) | Design values and philosophy of LUMI calm agency |
| [Whitepaper](docs/papers/whitepaper.md) | Technical whitepaper on LUMI and governed execution |
| [Workspace knowledge brief](docs/papers/knowledge-brief.md) | Executive brief of the Workspace Knowledge System |
| [Workspace knowledge philosophy](docs/papers/knowledge-philosophy.md) | Advisory memory design principles |
| [Workspace knowledge thesis](docs/papers/knowledge-thesis.md) | Sovereign advisory invariant thesis |
| [Workspace knowledge whitepaper](docs/papers/knowledge-whitepaper.md) | Architecture blueprint and NDJSON engine |
| [MEOW brief](.wiki/meow-executive-brief.md) | Executive brief for the Model-Efficient Order-aware Workflow |
| [MEOW philosophy](.wiki/meow-philosophy.md) | Normative reasoning and calm concurrency principles |
| [MEOW whitepaper](.wiki/meow-whitepaper.md) | Canonical technical architecture for execution lane swarms |
| [MEOW migration](.wiki/meow-migration.md) | Measured throughput evidence and naming evolution |
| [MoD brief](.wiki/mod-executive-brief.md) | Executive brief for LUMI Designer-in-Residence & MoD v3.0 architecture |
| [MoD philosophy](.wiki/mod-philosophy.md) | Embedded senior design judgment, 5-Whys reasoning, and Familiarity Heuristic |
| [MoD whitepaper](.wiki/mod-whitepaper.md) | Mathematical formulation, 8-state UI contracts, token codemods, and speculative task waves |
| [Governed subagent execution](docs/governed-subagent-execution.md) | Swarm architecture and lifecycle |
| [Recoverable context compaction](.wiki/recoverable-context-compaction.md) | Why and how bounded prompt projection, source recovery, silent rollover, and stream safety work |
| [MEOW-013 context projection ADR](.wiki/adr/MEOW-013-recoverable-context-projection.md) | Decision record, invariants, alternatives, and tradeoffs |
| [Governed execution authority](docs/governed-execution-authority.md) | SQLite lease authority, projection reconciliation, and deadlock safety |
| [SQLite storage & memory architecture](docs/architecture/sqlite-storage-and-memory-lifecycle.md) | Multi-table retention, auto-vacuum PRAGMA sequence, statement handle disposal, and WAL checkpoint guardrails |
| [Storage & cache management](docs/features/storage-and-cache-management.md) | Multi-tiered storage engine, shadow Git vacuuming (`git gc --prune=now`), dynamic exclusions, and clearCache command |
| [Governed execution runbook](docs/governed-execution-runbook.md) | Operator playbook |
| [Task lifecycle authority](docs/task-lifecycle-authority.md) | Transactional generation, cancellation, resume, and terminal state |
| [Completion funnel](docs/completion-lifecycle-decision-engine.md) | Semantic completion and durable lifecycle handoff |
| [Memory & reasoning](docs/MEMORY_AND_REASONING.md) | BroccoliDB cognitive layer |
| [Spider forensic engine](docs/architecture/spider-v20-forensic-engine.md) | BroccoliDB analysis substrate |
| [Security best practices](docs/SECURITY_BEST_PRACTICES.md) | Trust boundaries and hardening |
| [Roadmap steering](docs/features/roadmap-steering.mdx) | `ROADMAP.md` and completion gates |
| [Hooks](docs/customization/hooks.mdx) | Lifecycle hook scripts |
| [Maintainer guide](docs/MAINTAINER.md) | Doc guardrails when code changes |
| [BroccoliDB](broccolidb/README.md) | Context store package |
| [BroccoliDB docs](broccolidb/docs/README.md) | Substrate documentation hub |

---

## Governed subagent execution

Multi-lane swarms via `use_subagents` separate **whether work executed correctly** from **how certain each finding is**. Vague research can now finish with bounded uncertainty instead of retrying until the swarm invents confidence or falls into a merge loop.

```text
Before: vague task → uncertainty → retry → interpretation drift → merge loop
Now:    vague task → tentative finding → bounded probe if critical → confidence plateau → converge with uncertainty
```

> **North-star invariant:** Private roadmap state is cheap. Workspace roadmap truth is expensive. Only the coordinator may spend it.

```mermaid
flowchart TD
  T[Precise, vague, or exploratory task] --> L[Independent lanes execute with governed authority]
  L --> V{Execution structurally valid?}

  V -->|Isolated invalid lane| R[Repair only the invalid lane]
  R --> L
  V -->|Hard integrity, authority, lock, or provenance failure| H[Hard block]
  V -->|Valid| F[Preserve each finding's confidence, evidence, assumptions, and provenance]

  F --> X[Classify ambiguity and contradictions]
  X --> D{What does the parent need?}
  D -->|Strong supported conclusion| C[Converge]
  D -->|Advisory or non-critical uncertainty| U[Bound the uncertainty]
  D -->|One decision-critical evidence gap| P[Run one targeted read-only probe]

  P --> E{Meaningful semantic evidence delta?}
  E -->|Yes| F
  E -->|No or budget exhausted| CP[Confidence plateau]
  CP --> U

  U --> S{Safe under a surviving interpretation?}
  S -->|Yes| CU[Converge with uncertainty]
  S -->|No safe mutation or action| H

  C --> SE[Seal receipt and synthesize parent result]
  CU --> SE
```

Low or unknown confidence never invalidates a valid lane. Advisory findings remain tentative, contradictory interpretations retain their assumptions, and repeated reads of the same evidence do not count as progress. Receipt, checksum, mutation-authority, lock, and provenance failures still fail closed.

### Production execution safety

| Boundary | Guarantee |
|----------|-----------|
| **Lease & storage authority** | SQLite is the sole production authority; multi-table retention sweeps, auto-vacuum page reclaiming, native statement handle `.dispose()` lifecycle, and backoff WAL checkpoints prevent disk erosion and memory leaks |
| **Fencing identity** | Lease epochs and fencing tokens remain arbitrary-precision decimal strings and are released only by the exact owner/epoch/token tuple |
| **Filesystem projections** | Governed lock and Broccoli fence files are verified projections; malformed records are preserved for reconciliation rather than deleted automatically |
| **Deadlock recovery** | Typed wait-for edges are analyzed from an immutable scheduler snapshot; timers, expiring leases, outside owners, and capacity escapes prevent false deadlock recovery |
| **Terminal completion** | One durable `task_completions` row is committed only while the lease generation and evaluated task state remain current |

Operational details: [authority model](docs/governed-execution-authority.md) · [schema](docs/governed-execution-schema.md) · [runbook](docs/governed-execution-runbook.md)

| Mode | Lock | Use |
|------|------|-----|
| `read_only` | skipped | Code review, inspection |
| `audit_only` | skipped | Receipt / evidence audit |
| `mutation` | **required** | File edits, durable state changes |

Declare in lane prompts: `[execution_mode:read_only] [read_set:src/api.ts]`

| Doc | Audience |
|-----|----------|
| [Quick reference](docs/governed-roadmap-projection-quickref.md) | Patch tags, one page |
| [Architecture](docs/governed-subagent-execution.md) | Full lifecycle |
| [Runbook](docs/governed-execution-runbook.md) | Violations, retry flow |
| [Convergence and receipt guide](docs/governed-execution-schema.md) | Behavioral model, decision flow, invariants, and receipt v3 fields |

---

## Recoverable context compaction

Long coding sessions accumulate file reads, searches, test logs, web/MCP output, and subagent evidence much faster than ordinary chat. LUMI manages that pressure by compacting the **next request projection**, not by overwriting the durable conversation or interrupting work already in flight.

```text
completed turn
  → classify token pressure
  → compact a bounded amount of old tool evidence
  → attach immutable message/block IDs + SHA-256
  → write exact source to BroccoliDB CAS
  → atomically commit projection + cursor + run metadata to SQLite
  → send the next request
```

| Strategy | Applied behavior |
|----------|------------------|
| **Turn-boundary execution** | Passive compaction runs only after the previous provider/tool turn settles and before the next request. |
| **Progressive pressure tiers** | `normal → micro → structural outline → recovery ledger → emergency`; one shared threshold authority is used by parent tasks and subagents. |
| **Evidence-aware projection** | File reads retain structural declarations in explicitly non-authoritative, potentially non-parsing outlines; command and test output prioritizes failures, stack frames, summaries, and head/tail evidence. |
| **Hard work budgets** | Every pass limits scanned messages, inspected blocks, transformed blocks, candidate evidence, projected lines, materialized lines, source characters, and per-pattern input. |
| **Stable recovery identity** | Persisted message/block UUIDs survive pair rollover and reordering; legacy index pointers are applied only when their source digest still matches. |
| **Trusted marker boundary** | Raw tool/user text cannot impersonate internal projection metadata: forged reserved XML markers are escaped, then trusted markers are reapplied from internal state. Only a trusted marker conditionally adds a system policy telling the model that projected text may be incomplete or syntactically invalid and is never a callable rehydration tool. |
| **Central exact recovery** | Full source is Brotli-compressed when beneficial, deduplicated by SHA-256 in BroccoliDB CAS, and byte/character/line verified during hydration. |
| **Publication barrier** | A marker enters the next request only after a strict, caller-ordered SQLite transaction commits source metadata, the stable-ID projection, the two-level cursor, and bounded run telemetry. Standard high-throughput BroccoliDB writes preserve buffered queueing and dead-letter handling, while compaction alone uses a strict execution boundary that propagates failures directly to the caller. |
| **Strict CAS re-verification** | After the metadata commit completes, the engine re-verifies sharded CAS blob presence before returning success. If any commit or verification step fails, the caller receives an error and keeps the uncompressed block so no unbacked marker is admitted into a model request. |
| **Persistent traversal cursor** | Scan-only and transforming passes persist message/block offsets, avoiding repeated O(N) reinspection after restoration. |
| **Scoped parent/subagent state** | Parent and child managers share one central store but use non-colliding task/subagent scopes. Isolated subagent harnesses retain the immutable transcript-artifact fallback. |
| **Sidecar compatibility** | Same-process managers merge `context_history.json` under a path-keyed mutex, but it is only a parent-owned compatibility/cache projection; SQLite/WAL and CAS own central durability. |
| **GC and lifecycle safety** | Compaction CAS blobs are live garbage-collection roots, new blobs are rechecked after metadata commit, and the shared BroccoliDB `AgentContext` shuts down with the extension. |
| **Invisible rollover** | If deterministic projection is insufficient, complete old message pairs leave the prompt view without a model-visible compaction alert; durable history remains intact. |
| **Stream safety** | After any provider chunk is emitted, that stream is never compacted or retried in place. |

“Recoverable” means the exact source remains available and digest-verifiable. The smaller prompt projection intentionally omits detail and is not described as semantically lossless.

### Developer Onboarding & Comparison Guide

| Paradigm | Traditional Context Pruning | LUMI Recoverable Compaction |
|----------|-----------------------------|-----------------------------|
| **Historical Source Integrity** | Irrecoverable truncation or string slicing | **Zero-loss exact source** Brotli-compressed in sharded BroccoliDB CAS |
| **Commit Security Barrier** | In-memory string replacement without verification | **Strict SQLite transaction** before marker publication; rolls back to raw block on failure |
| **Model Prompt Safety** | Model sees raw truncated text or broken syntax | **Trusted XML boundary** with explicit system policy preventing tool hallucination |
| **Multi-Agent Scalability** | Uncoordinated or global context bloat | **Scoped parent/subagent stores** sharing central WAL-backed SQLite authority |

#### Verifying Context Compaction Locally

```bash
# Check local BroccoliDB substrate health and active CAS blobs
npx broccolidb health --format json

# Run the dedicated context compaction verification suite
TS_NODE_PROJECT=./tsconfig.unit-test.json npx mocha --no-config \
  -r ts-node/register -r tsconfig-paths/register -r source-map-support/register -r ./src/test/requires.cjs \
  src/core/context/__tests__/ContextPruner.test.ts \
  src/core/context/context-management/__tests__/ContextManager.test.ts
```

Implementation details, limits, failure behavior, and validation commands: **[Recoverable Context Compaction](.wiki/recoverable-context-compaction.md)** · Decision rationale: **[MEOW-013](.wiki/adr/MEOW-013-recoverable-context-projection.md)**

---

## Workspace Knowledge System

LUMI maintains an advisory, non-blocking **Workspace Knowledge System** (Observability Seatbelt) that builds a durable project memory after each completed task to orient future agent execution.

```mermaid
flowchart TD
  TF[Task Finalization] --> |learnFromFinalization| WKE[WorkspaceIntelligenceEngine]
  WKE --> |writeModel| WIS[WorkspaceIntelligenceStore]
  WIS --> |Append Event| DL[diagnostics.jsonl]
  WIS --> |Write Projections| WIJ[workspace-intelligence.json]
  WIS --> |Write Projections| WIM[workspace-intelligence.md]
  WIJ --> |Read Facts| WIR[WorkspaceIntelligenceReader]
  DL --> |Read Health| WIR
  WIR --> |Advisory Context| NT[Next Task Initialization]
```

- **Durable Facts & Provenance:** Captures stable/volatile subsystems, recent architectural decisions (ADRs), stale docs, risk areas, and handoff facts. Every fact links to a provenance trail (*why we believe it*) and a lifecycle state (*whether it is still valid*).
- **Observability Seatbelt:** System errors (e.g. read-only filesystem or full disk) log to diagnostics but degrade gracefully, ensuring knowledge updates never block task completion or tool executions.
- **Append-Only Event Log (`diagnostics.jsonl`):** Diagnostics are written to an append-only JSON Lines event log.
- **Read-Only Health API:** Downstream tools check status via `getKnowledgeHealth()`, which parses diagnostic lines, returns status (`healthy | degraded`), and compiles actionable recovery hints.
- **Human-Readable Dashboard:** Exposes active system health alerts and collapsible diagnostics lists directly at the top of [workspace-intelligence.md](file:///.wiki/intelligence/workspace-intelligence.md).

---

## Master of Design (MoD) Architecture

LUMI includes **Master of Design (MoD)**, a prompt-steered execution mode that injects senior product design engineering instincts directly into the standard coding task loop. Rather than bypassing the core agent pipeline with isolated orchestrators, MoD Mode mirrors the unified coding agent path with 100% tool parity (`read_file`, `replace_in_file`, `execute_command`, `browser_action`, subagents, MCP tools), automatically steering every code edit, architecture decision, and subagent task with senior design engineering principles.

### Key Capabilities
- **6 Senior Design Engineering Steering Pillars**: Injects Design Token Sensing, Complete 7-State UI Matrix, WCAG 2.1 AA Accessibility, Visual Aesthetics, Responsive Layout Ergonomics, and 5-Whys Cognitive Analysis directly into system prompts.
- **Dynamic Prompt Position & Weighting**: Injected right after `AGENT_ROLE_SECTION` for maximum model attention weighting across all prompt variants.
- **Subagent Swarm Propagation**: Child subagent tasks created via `use_subagents` automatically inherit `modEnabled: true` context in `SubagentRunner.ts`.
- **Slash Command Integration**: Threads `modEnabled` steering into slash commands such as `/deep-planning`.
- **World-Class UX Ergonomics Bar**: Segmented control pill (`ModModeSwitcher.tsx`) in the chat composer bar with zero-jargon copy, keyboard navigation (`ArrowLeft` / `ArrowRight`), popover mode guides, and visual feedback inspired by Vercel v0 and Cursor.

| Document | Target Audience / Purpose |
|----------|--------------------------|
| **[MoD Architecture Document](docs/mixture-of-designers.md)** | Technical specification, 6 steering pillars, subagent inheritance, and UX switcher ergonomics |
| **[ADR-016](DECISIONS.md#adr-016-unified-mod-prompt-steering-toggle-architecture)** | Architectural decision record for unified MoD prompt steering toggle |

---

## Plan & Act modes

LUMI runs in **`plan`** or **`act`** mode. Each mode can use a different provider and model.

| Mode | Response tool | Behavior |
|------|---------------|----------|
| **Plan** | `plan_mode_respond` | Strategy, exploration, read-only tools |
| **Act** | `act_mode_respond` | Implementation — mutating tools with approval |

Typical flow: gather context in Plan → approve direction → Act executes writes → `attempt_completion` through completion gates.

Guide: [docs/core-workflows/plan-and-act.mdx](docs/core-workflows/plan-and-act.mdx)

---

## Built-in slash commands

Typed at the start of a message (`/command`):

| Command | Purpose |
|---------|---------|
| `/newtask` | Fresh task context |
| `/compact` | Condense conversation history |
| `/deep-planning` | Extended planning pass |
| `/roadmap` | Roadmap steering actions |
| `/explain-changes` | Summarize what changed |

**10** commands total — source: `SUPPORTED_DEFAULT_COMMANDS` in `src/core/slash-commands/index.ts`. Custom workflows: `.dietcodeworkflows/`

---

## Lifecycle hooks

**8** hook kinds in `VALID_HOOK_TYPES`. Scripts live under **`.dietcoderules/hooks/`** (workspace or global).

| Hook | Fires when |
|------|------------|
| `PreToolUse` | Before a tool executes (can cancel) |
| `PostToolUse` | After a tool executes |
| `TaskStart` | Task begins |
| `TaskComplete` | Task completes |

Guide: [docs/customization/hooks.mdx](docs/customization/hooks.mdx)

---

## Key VS Code settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `lumi.roadmap.enabled` | `true` | Master switch for ROADMAP.md steering |
| `lumi.roadmap.autoBootstrap` | `true` | Create `ROADMAP.md` from workspace evidence |
| `lumi.roadmap.failClosedCompletionGates` | `true` | Block completion when gate evaluation fails |

Details: [docs/features/roadmap-steering.mdx](docs/features/roadmap-steering.mdx)

---

## Architecture

LUMI is split into a **session and control plane**, an **execution plane**, and two distinct durability boundaries. The ordinary tool path and governed swarm path share the same approval and VS Code host boundaries, but swarms add lane authority, receipts, merge validation, and confidence-aware parent synthesis.

```mermaid
flowchart TB
  USER[Developer] <--> UI[React webview: chat, approvals, status]

  subgraph session ["Session and control plane"]
    UI <--> CTRL[Session controller]
    CTRL --> TASK[Agent task loop]
    TASK --> CONTEXT[Recoverable turn-boundary context projection]
    CONTEXT --> MODEL[Provider adapters and language models]
    MODEL --> TASK
    TASK --> TOOLS[Typed tool execution coordinator]
    TOOLS -. approval request and result .-> UI
    TASK --> COMPLETE[Completion and roadmap gates]
  end

  subgraph execution ["Execution plane"]
    TOOLS --> DIRECT[Direct tools, MCP, and lifecycle hooks]
    TOOLS --> SWARM[Governed subagent harness]
    SWARM --> LANES[Parallel lanes with declared execution intent]
    LANES --> EVIDENCE[Execution envelopes, evidence, and lane receipts]
    EVIDENCE -->|Validate| GOVERNANCE[Execution Governance]
    GOVERNANCE -->|Converge| CONVERGE[Confidence-aware convergence]
    CONVERGE -->|Synthesize| PARENT[Parent synthesis: accepted, tentative, and rejected findings]
    PARENT --> TASK
  end

  subgraph host ["VS Code host boundary"]
    DIRECT --> BRIDGE[Protobuf host bridge]
    LANES --> BRIDGE
    BRIDGE --> VSCODE[Files, terminals, diagnostics, checkpoints]
  end

  subgraph durability ["Durability boundaries"]
    TASK <--> BDB[BroccoliDB: cognitive memory, graph, snapshots, runtime state]
    CONTEXT <--> HISTORY[Durable conversation history and projection ledger]
    SWARM <--> LEASES[SQLite lease generations and authoritative ownership]
    EVIDENCE --> RECEIPTS[Task-local transcripts and governed receipts]
    GOVERNANCE --> RECEIPTS
    CONVERGE --> RECEIPTS
    COMPLETE --> TERMINAL[Durable task completion CAS]
  end

  COMPLETE --> UI
```

| Layer | Owns | Boundary |
|-------|------|----------|
| **Webview** | Conversation UI, approval decisions, diff and swarm status presentation | Presents decisions; it does not execute workspace mutations directly |
| **Session control** | Conversation state, model turns, task lifecycle, completion routing | Coordinates work; physical I/O stays behind typed tools and the host bridge |
| **Context projection** | Progressive tool-evidence compaction, recovery references, complete-pair rollover | Runs only between turns; durable history remains authoritative and partial streams are never rewritten |
| **Tool execution** | Typed dispatch, lifecycle hooks, MCP calls, approval enforcement | Direct tools and subagent swarms enter through the same governed tool boundary |
| **Governed lanes** | Lane scheduling, declared execution intent, mutation claims, evidence collection | Produces execution records; it does not decide merge eligibility or manufacture consensus |
| **Execution governance** | Receipt integrity, authority, locks, mutation legality, replay legality, and merge eligibility | Fail-closed execution firewall; confidence cannot override a governance failure |
| **Coordination authority** | SQLite lease generations, fencing tokens, exact-tuple release, and projection reconciliation | Production never adopts memory or filesystem state as fallback authority |
| **Convergence and synthesis** | Finding confidence, ambiguity, contradictions, bounded probes, uncertainty, and the parent result | Consumes governance-approved execution; low confidence changes synthesis, not execution validity |
| **Terminal completion** | Canonical completion identity and the `task_completions` CAS transaction | In-memory state changes only after the durable lease/state commit succeeds |
| **VS Code host** | Filesystem, terminals, diagnostics, tabs, and checkpoints | Physical IDE operations are isolated behind the Protobuf host bridge |
| **Task artifacts** | Append-only transcripts, execution envelopes, immutable attempt receipts, replay checksums | Authoritative swarm execution history lives under the task directory, not in cognitive memory |
| **BroccoliDB** | Cognitive memory, runtime graph, snapshots, structural analysis, and fencing substrate | Advisory knowledge and substrate state; not the governed swarm receipt store |

Execution Governance is the fail-closed firewall between lane output and convergence. Confidence-aware convergence sees only governance-approved execution; it can add a bounded read-only verification probe or return an uncertainty package, but it cannot bypass receipt integrity, mutation authority, locks, replay checks, or completion gates.

**Stack:** TypeScript extension host · React webview · provider adapters · typed tools and MCP · Protobuf host bridge · BroccoliDB SQLite · governed receipt schema v3 · Biome · Mocha / Playwright tests · Mintlify docs.

Canonical stack map: [docs/AGENT_STACK.md](docs/AGENT_STACK.md) · Governed lifecycle: [docs/governed-subagent-execution.md](docs/governed-subagent-execution.md) · Confidence and receipt model: [docs/governed-execution-schema.md](docs/governed-execution-schema.md)

---

## Development

```bash
git clone https://github.com/CardSorting/LUMI.git
cd LUMI
npm run install:all    # root + webview-ui
npm run protos         # required before first build
npm run dev            # watch extension + typecheck
npm run dev:webview    # separate terminal — webview HMR
```

Press **F5** in VS Code → Extension Development Host. Package: `npm run package` → `dist/*.vsix`.

| Script | Purpose |
|--------|---------|
| `npm run check-types` | TypeScript — extension + webview |
| `npm run lint` | Biome + proto lint |
| `npm test` | Unit + integration tests |
| `npm run ci:check-all` | Types, lint, format, roadmap audit, doc guardrails |
| `npm run docs:check-all` | All doc guardrails + Mintlify links |

Governed execution tests: `npm run test:unit -- --grep "governed execution"`

### Quality gates

`npm run ci:check-all` runs types, lint, format, roadmap audit, and doc guardrails in parallel. Doc checks include `docs:check-root-readme`, `docs:check-readme-metrics`, and **`npm run docs:check-all`**.

When you change tools, providers, or governed execution, update docs per [docs/MAINTAINER.md](docs/MAINTAINER.md).

Full guide: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Extension missing from sidebar | Install **CardSorting.lumi-vscode** or **CardSorting.lumi**; `Developer: Reload Window` |
| Checkpoints fail | Install Git; ensure `git` is on `PATH` |
| Slow on large repos | Add [`.dietcodeignore`](docs/customization/dietcodeignore.mdx) |
| Provider auth errors | Re-open LUMI Settings → re-enter API key |
| Completion blocked | Run `/roadmap validate`; check `lumi.roadmap.*` settings |
| Subagent merge blocked | See [governed runbook](docs/governed-execution-runbook.md) |
| `DATABASE_AUTHORITY_UNAVAILABLE` | Restore the persistent SQLite database, then retry; do not delete projection files or switch to local authority |
| Reset extension state | Close VS Code; remove `~/.dietcode/data/`; reload window |

---

## Getting help

| Channel | Link |
|---------|------|
| **Documentation** | [docs/README.md](docs/README.md) |
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) |
| **Discussions** | [GitHub Discussions](https://github.com/CardSorting/LUMI/discussions) |
| **Bug reports** | [GitHub Issues](https://github.com/CardSorting/LUMI/issues/new?template=bug_report.yml) |
| **Security (private)** | [SECURITY.md](SECURITY.md) |

Include VS Code version, LUMI **11.0.0**, provider used, and steps to reproduce.

---

## Security

| Boundary | Enforcement |
|----------|-------------|
| Mutating tools | Approval UI + diff before write |
| Secrets | `~/.dietcode/data/secrets.json` (mode `0600`) |
| Settings & state | `~/.dietcode/data/` |
| Workspace memory | `./dietcode.db` (BroccoliDB SQLite) |
| Governed receipts | `{taskDir}/subagent_executions/` |
| Hooks | `.dietcoderules/hooks/` — `PreToolUse` can cancel tool calls |

Details: [docs/SECURITY_BEST_PRACTICES.md](docs/SECURITY_BEST_PRACTICES.md) · Report vulnerabilities via [SECURITY.md](SECURITY.md)

---

## FAQ

**Is LUMI fully autonomous?** No — it assumes a human approver for mutating work.

**Which extension ID do I use?** `CardSorting.lumi-vscode` on VS Marketplace; `CardSorting.lumi` on Open VSX / Cursor.

**Where is my data stored?** Settings and secrets in `~/.dietcode/data/`; workspace cognitive memory in `./dietcode.db`.

**How does LUMI keep long tasks inside model context limits?** It applies [recoverable context compaction](#recoverable-context-compaction) between completed turns, preserving durable source history while reducing the next request projection.

**Can read-only subagent lanes share files?** Yes — lock collisions are write-scoped only.

**What happens if the coordination database is unavailable?** Production retries at a safe boundary or fails closed. It never treats in-memory or filesystem projections as a replacement lock authority.

**How do I contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md) — squash merges on `main`, Conventional Commits for PR titles.

---

## Contributing

We welcome issues, docs improvements, and pull requests. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

- **Code of conduct:** be respectful in issues and discussions
- **PRs:** squash merge only; PR title must follow Conventional Commits
- **Docs:** run `npm run docs:check-all` when changing tools, providers, or architecture
- **Governance:** [GOVERNANCE.md](GOVERNANCE.md)

---

## License

[Apache-2.0](LICENSE) — Copyright CardSorting and Cline Bot Inc. (see [NOTICE](NOTICE)).

This project is a derivative work of [Cline](https://github.com/cline/cline) (Apache-2.0 © Cline Bot Inc. and contributors). See [Origins & acknowledgments](#origins--acknowledgments) above.
