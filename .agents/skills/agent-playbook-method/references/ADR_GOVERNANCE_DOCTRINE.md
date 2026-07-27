# Sovereign ADR Governance Doctrine

This document specifies the mandatory governance policies for Architectural Decision Records (ADRs) across the LUMI and BroccoliDB workspaces.

---

## 1. When an ADR is Required

An Architectural Decision Record (ADR) MUST be written in `.wiki/adr/` whenever:
1. **Adding or Modifying Core Monoliths**: Monoliths such as `ExecutionFunnel`, `TaskLifecycleFunnel`, `CompletionFunnel`, `BufferedDbPool`, or `StreamingToolExecutor` undergo structural changes.
2. **Introducing New Subsystems or Services**: A new service (e.g. `TokenRateGovernor`, `Epistemic PageRank`, `4-Pillar Forensic Probe`) is introduced.
3. **Altering Database Schemas or DDL**: Changing database DDL, adding SQLite tables, or modifying CAS storage invariants.
4. **Changing Concurrency or Rate Controls**: Altering thread boundaries, lock retry backoff jitter, circuit breaker policies, or token bucket rates.

---

## 2. Mandatory Structure (The What, The How, The Why)

Every ADR must strictly conform to MADR 3.0:
- **Title & Metadata**: Header containing `Status:`, `Date:`, `Author:`, and `Implementing Surfaces:`.
- **The Why (Context & Motivation)**: Empirical problem statement and scaling drivers.
- **The What (Decision & Architecture)**: Explicit architectural invariants and guaranteed contracts.
- **The How (Technical Implementation)**: Exact file paths, TypeScript signatures, and DDL migrations.
- **Consequences & Verification**: Measured trade-offs and automated test commands.

---

## 3. Automated Tooling & Lifecycle Commands

| Command | Purpose |
| :--- | :--- |
| `npm run scaffold:adr "<Title>"` | Scaffolds a new pre-formatted MADR file in `.wiki/adr/MEOW-XXX-...` |
| `npm run audit:adr` | Runs structural validation against all ADRs in `.wiki/adr/` |
| `npm run test:guardrails` | Verifies public API snapshots and documentation cross-links |

---

## 4. Indexing & Cross-Referencing

1. Every new ADR MUST be indexed in [.wiki/adr/README.md](file:///Users/bozoegg/Downloads/codemarie-new/.wiki/adr/README.md) under its functional domain.
2. Every new ADR MUST be linked in the navigation tree of [.wiki/index.md](file:///Users/bozoegg/Downloads/codemarie-new/.wiki/index.md).
3. The operational entry point [.wiki/agent/playbook.md](file:///Users/bozoegg/Downloads/codemarie-new/.wiki/agent/playbook.md) MUST link the ADR in its *Current Snapshot* section.
