# Handoff Transfer

> **What is this?** A volatile transfer brief containing current implementation, documentation, validation, and workspace-state facts.
> **When do I use it?** At an agent handoff boundary before changing coordination, scheduling, or completion behavior.
> **What is the source of truth?** The current working tree and the implementation paths linked below.

Last updated: 2026-07-18

## Current Task

The production-grade lease reconciliation and execution-hardening pass is implemented and its directly affected documentation has been reconciled. The strategy now has three explicit boundaries:

1. SQLite is the sole production coordination authority; memory and filesystem records are projections.
2. Deadlock recovery is based on a versioned typed wait-for snapshot and escape-aware SCC analysis.
3. Task completion becomes terminal only through a durable lease/state CAS.

## Implementation State

| Surface | Current behavior | Primary files |
|---------|------------------|---------------|
| Master of Design (MoD) Steering | Injects 6 senior design engineering pillars when `modEnabled` is true | `src/core/prompts/system-prompt/components/mod_designer_steering.ts` |
| Prompt Builder Integration | Positions MoD steering right after `AGENT_ROLE_SECTION` across all prompt variants | `src/core/prompts/system-prompt/registry/PromptBuilder.ts` |
| Task Loop Parity | Runs MoD Mode through standard task loop with 100% tool parity (`read_file`, `replace_in_file`, `execute_command`, `browser_action`, subagents, MCP) | `src/core/task/index.ts` |
| Subagent Swarm Propagation | Subagent tasks automatically inherit `modEnabled: true` context | `src/core/task/tools/subagent/SubagentRunner.ts` |
| UX Ergonomics Bar | Segmented control bar with zero-jargon copy, keyboard navigation, popover guides | `webview-ui/src/components/chat/ModModeSwitcher.tsx` |

The working tree also contains earlier user changes across policy, audit, roadmap, subagent, and completion files. Preserve them; do not reset or rewrite unrelated modifications.

## Documentation Updated

Only the surfaces that describe this strategy were changed:

- `docs/architecture/sqlite-storage-and-memory-lifecycle.md`
- `DECISIONS.md` (ADR-014: SQLite Storage Retention & Memory Lifecycle Hardening)
- `docs/governed-execution-authority.md`
- `docs/governed-execution-schema.md`
- `docs/governed-execution-decisions.md`
- `docs/governed-execution-runbook.md`
- `docs/governed-subagent-execution.md`
- `docs/WORKING_WITH_SUBAGENTS.md`
- `docs/completion-lifecycle-decision-engine.md`
- `src/core/prompts/system-prompt/README.md`
- Root and `.wiki/agent/` continuity pages that describe these contracts

Provider, feature, BroccoliDB, and unrelated user documentation was intentionally left unchanged.

## Validation Evidence

| Command/suite | Result |
|---------------|--------|
| Focused coordination/liveness/completion and governed regression suite | 210 passing |
| Broad unit suite | 2,373 passing; 4 expected pending |
| `npx tsc --noEmit --pretty false` | Passed |
| `npm run lint` | Passed, including protobuf lint and handler-import checks |
| `git diff --check` | Passed before the documentation pass |
| `npm run rebuild:electron:better-sqlite3` | Passed; Electron-native module restored after Node DB tests |
| Agent-doc links and branding | Passed |
| Docs README and root README links | Passed |
| Root README metadata, metrics, and links | Passed after updating release identity to `9.0.0` |
| Aggregate docs check | README checks pass; blocked only by the existing Mintlify broken-link backlog |
| Mintlify broken links | Reports 145 pre-existing links in 37 unrelated files; none of the changed governed-execution docs were listed |

Use `--no-config` for focused Mocha commands. `.mocharc.json` otherwise adds the entire recursive test suite. Do not run broad suites concurrently because governed tests share process-global authority state.

## Durable Constraints

- Never fall back from SQLite authority to memory/filesystem state in production.
- Never compare fencing identity through JavaScript `number`.
- Never unlink a malformed projection automatically.
- Never expose administrative force cleanup through `LockAuthority` or normal orchestration.
- Never classify a cycle as deadlock until all typed escape transitions are checked.
- Never apply scheduler recovery after either snapshot version changes.
- Never publish terminal in-memory state before the durable completion transaction commits.
- Keep the Electron `better-sqlite3` build restored after Node-native database testing.

## Recommended Next Actions

1. If implementation changes further, rerun the three focused hardening suites before broad validation.
2. Resolve the unrelated Mintlify broken-link backlog only in a separately scoped documentation pass.
3. Commit only after separating this pass from any unrelated pre-existing workspace changes according to maintainer preference.

## Final Review Checklist

- [x] Production authority and failure behavior documented.
- [x] Exact lease/projection identity and precision rules documented.
- [x] Normal reconciliation and administrative override separated.
- [x] Typed deadlock graph and snapshot consistency documented.
- [x] Durable completion identity, CAS, idempotency, and conflict behavior documented.
- [x] ACT execution-state prompt contract documented.
- [x] Agent playbook, memory, findings, troubleshooting, pitfalls, patterns, and index updated.
- [x] Documentation/link checks rerun after this documentation pass; unrelated baseline failures recorded above.
