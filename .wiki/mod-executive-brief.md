# Master of Design (MoD) Architecture: Executive Brief
**A Prompt-Steered Senior Design Engineering Runtime for LUMI Task Execution**

---

## 1. Executive Summary

### Unified Architecture: Prompt Steering Toggle
The **Master of Design (MoD)** mode in LUMI centralizes design engineering capabilities directly within the primary coding agent task loop (`initiateTaskLoop` in `src/core/task/index.ts`). Rather than using isolated backend orchestrator bypasses, MoD operates as a system prompt steering toggle (`modEnabled`) with 100% tool parity (`read_file`, `replace_in_file`, `execute_command`, `browser_action`, subagents, MCP tools).

### Core Principles
When `modEnabled` is active, the agent automatically evaluates every code edit, architecture decision, and subagent task against 6 Senior Design Engineering Pillars:
1. **Design Token Sensing & System Hierarchy**: Custom property sensing (`var(--primary)`, Tailwind tokens) before modifying markup.
2. **Complete 7-State UI Matrix**: Idle, Hover, Active, Disabled, Loading, Empty, and Error boundaries.
3. **WCAG 2.1 AA Accessibility & Motion**: Contrast ratios >= 4.5:1, touch targets >= 44x44px, visible keyboard focus rings, and reduced motion fallbacks.
4. **Visual Aesthetics & Spatial Harmony**: Typographic scales, dark/light mode balance, glassmorphism, and micro-transitions.
5. **Responsive Layouts & Grid Ergonomics**: Mobile-first flex/grid layouts without horizontal scrollbar leaks.
6. **5-Whys Cognitive Ergonomics**: Root usability friction analysis and prominent call-to-action (CTA) paths.

```text
[ User Prompt ]
      │
      ▼ (modEnabled: true)
[ System Prompt Steering Component: MOD_DESIGNER_STEERING ]
      │ (Inserted right after AGENT_ROLE_SECTION)
      ▼
[ Unified Task Loop Execution with 100% Tool Parity ]
      │
      ├─► Direct Code Edits & Refactoring
      ├─► Terminal Command Execution & Build Tests
      ├─► Browser Action Verification
      └─► Subagent Task Swarm (Propagates modEnabled: true)
```

---

## 2. Key Architecture Benefits

- **Zero Pipeline Fragmentation**: Single unified task loop eliminates backend orchestration drift and redundant code paths.
- **Subagent Swarm Inheritance**: Primary tasks pass `modEnabled: true` context to child subagent swarms via `SubagentRunner.ts`.
- **Slash Command Integration**: Threads design steering into slash commands like `/deep-planning`.
- **Non-Technical UX Ergonomics**: Segmented control pill (`ModModeSwitcher.tsx`) in the chat composer bar with zero-jargon copy, keyboard navigation (`ArrowLeft` / `ArrowRight`), popover guides, and visual feedback.
