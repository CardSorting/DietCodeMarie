---
name: agent-playbook-method
description: Maintain a workspace-specific Agent Playbook inside the wiki. Use when updating .wiki documentation, preserving agent handoff knowledge, reducing repeated workspace discovery, or recording key findings, troubleshooting, common pitfalls, validation commands, and active development state for future agents.
---

# Agent Playbook Method

Use this skill to keep the workspace wiki useful for future agents, not only human operators.

## Goal

Create or update an agent-first playbook inside `.wiki/agent/` and Architecture Decision Records (ADRs) inside `.wiki/adr/` that mirror the workspace's current development state. The playbook and ADRs should allow future agents to orient quickly without rediscovering the same files, commands, pitfalls, and architectural decisions.

## Required Files

Maintain these files when the wiki is in scope:

- `.wiki/agent/playbook.md`: Entry point with current snapshot, orientation loop, validation commands, and ADR links.
- `.wiki/agent/agent-memory.md`: Strict constraints and durable operating assumptions.
- `.wiki/agent/key-findings.md`: Evidence-backed findings worth preserving.
- `.wiki/agent/troubleshooting.md`: Reproduced failures, exact commands, fixes, and workarounds.
- `.wiki/agent/common-pitfalls.md`: Workspace-specific mistakes and risky assumptions.
- `.wiki/agent/patterns.md`: Repeatable workflows for common tasks linked to underlying ADRs.
- `.wiki/adr/MEOW-XXX-<topic>.md`: Formal Architecture Decision Records documenting **The What**, **The How**, and **The Why** for core changes.
- `.wiki/adr/README.md`: Index of all active ADRs grouped by architectural domain.
- `.wiki/index.md`: Must link the agent playbook files and ADR index.

## ADR-Driven Documentation Doctrine (The What, The How, The Why)

For every non-trivial architectural change, structural pass, or core system feature, agents MUST create or update an ADR in `.wiki/adr/` following the MADR 3.0 specification (see [references/MADR_TEMPLATE.md](references/MADR_TEMPLATE.md) and [references/ADR_GOVERNANCE_DOCTRINE.md](references/ADR_GOVERNANCE_DOCTRINE.md)).

1. **Context & Motivation (The Why)**:
   - What real-world operational failure, bottleneck, or scaling limit motivated this change?
   - Why were existing mechanisms insufficient?

2. **Architectural Decision (The What)**:
   - What exact invariants, interfaces, and state boundaries are established?
   - What contracts are guaranteed?

3. **Technical Implementation (The How)**:
   - Which exact files, classes, methods, schema DDLs, and algorithms implement the decision?
   - What exact commands build and verify the implementation?

4. **Consequences & Verification**:
   - What are the trade-offs, performance gains, and automated test guardrails?

## Automated ADR CLI Tooling

Agents should leverage the following automated workspace tooling:

- `npm run scaffold:adr "<Title>"`: Automatically generates a pre-formatted MADR 3.0 file in `.wiki/adr/MEOW-XXX-...` pre-populated with mandatory sections.
- `npm run audit:adr`: Automatically audits all `.wiki/adr/` files against MADR compliance rules and physical file link existence.
- `npm run link:adr`: Automatically updates `.wiki/adr/README.md` with an updated Mermaid dependency graph of all cross-referenced ADRs.

## Workflow

1. Inspect current evidence before writing:
   - Manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `ROADMAP.md`).
   - Active changed files and recent task scope.
   - Existing wiki files and ADR index (`.wiki/adr/README.md`).
   - Validation scripts and commands (`npm test`, `npm run audit:adr`, `npm run link:adr`, `npm run test:guardrails`).
   - Diagnostic outputs and trace logs.

2. Record architectural decisions (The What, How, Why):
   - Run `npm run scaffold:adr "<Title>"` to create a new ADR when introducing architectural changes.
   - Populate **The Why**, **The What**, and **The How** using `references/MADR_TEMPLATE.md`.
   - Update `.wiki/adr/README.md` to index the ADR under its functional domain and run `npm run link:adr`.
   - Run `npm run audit:adr` to verify 100% compliance.

3. Update the playbook with current facts:
   - Active workspace shape and important directories.
   - Validated commands and known broken commands.
   - Key findings and ADR cross-references.
   - Troubleshooting paths and common pitfalls.
   - Risky files or surfaces and what to test after touching them.

4. Keep content agent-readable:
   - Concise bullets.
   - Exact paths and file links (`file:///...`).
   - Exact command snippets.
   - Clear "when touching X, validate Y" guidance.

5. Preserve quality:
   - Do not paste generic boilerplate.
   - Do not append endless history.
   - Replace stale guidance when evidence changes.
   - Mark uncertainty explicitly when evidence is incomplete.
   - Keep human-authored wiki content intact when possible.

## Completion Check

Before finishing a wiki/playbook task, verify:

- `npm run audit:adr` passes with 0 violations.
- `.wiki/index.md` links every agent playbook file and ADR index.
- `.wiki/adr/README.md` indexes all active ADRs.
- Every architectural change has a corresponding ADR detailing **The What**, **The How**, and **The Why**.
- `.wiki/agent/playbook.md` reflects the current workspace state.
- Key findings, troubleshooting, and common pitfalls are evidence-backed.
- Validation commands come from project evidence, not guesses.
