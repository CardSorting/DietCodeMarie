---
title: "Master of Design (MoD) Prompt Steering Architecture"
sidebarTitle: "Master of Design (MoD)"
description: "Architecture, system prompt steering toggle, 6 design engineering pillars, subagent swarm inheritance, and UX ergonomics for Master of Design in LUMI."
---

# Master of Design (MoD) Architecture

The **Master of Design (MoD)** framework in LUMI is a unified, prompt-steered execution mode that injects senior product design engineering instincts directly into the standard coding task loop. Rather than bypassing the core agent pipeline with isolated orchestrators, MoD Mode mirrors the unified coding agent path with 100% tool parity (`read_file`, `replace_in_file`, `execute_command`, `browser_action`, subagents, MCP tools), automatically steering every code edit, architecture decision, and subagent task with senior design engineering principles.

---

## Code Map

| Component | Path | Responsibility |
|-----------|------|----------------|
| System Prompt Steering Component | `src/core/prompts/system-prompt/components/mod_designer_steering.ts` | Injects senior designer instincts prompt section when `modEnabled` is true |
| Prompt Builder Registry | `src/core/prompts/system-prompt/registry/PromptBuilder.ts` | Dynamically evaluates and places `MOD_DESIGNER_STEERING` right after `AGENT_ROLE_SECTION` |
| Task Loop Integration | `src/core/task/index.ts` | Passes `modEnabled` setting to `SystemPromptContext` in the unified execution loop |
| Subagent Swarm Inheritance | `src/core/task/tools/subagent/SubagentRunner.ts` | Propagates `modEnabled` prompt steering down to subagent task contexts |
| Slash Command Alignment | `src/core/prompts/commands/deep-planning/index.ts` | Passes `modEnabled` steering to `/deep-planning` slash command templates |
| UX Mode Switcher | `webview-ui/src/components/chat/ModModeSwitcher.tsx` | Segmented control bar with zero-jargon copy, keyboard navigation, and popover guides |
| Unit Test Suite | `src/core/task/tools/subagent/__tests__/mod.test.ts` | 100% test coverage verifying prompt steering injection and subagent inheritance |

---

## 6 Core Design Engineering Pillars

When `modEnabled` is toggled ON, the agent automatically applies these 6 design engineering pillars:

1. **Design Token Sensing & System Hierarchy**:
   - Prefers existing project design tokens (e.g., `var(--primary)`, `bg-background`, `text-muted-foreground`, `rounded-lg`) over hardcoded pixel/hex values.
   - Inspects existing component hierarchies before creating new UI surfaces.

2. **Complete 7-State UI Matrix**:
   - Every interactive UI element or surface explicitly handles 7 states:
     1. *Default / Idle*: Clean visual presentation with proper contrast.
     2. *Hover / Interactive*: Subtle tactile feedback.
     3. *Active / Pressed*: Physical pressed response (`scale-[0.98]`).
     4. *Disabled / Inactive*: Reduced opacity (`opacity-50`) with `cursor-not-allowed` and ARIA disabled states.
     5. *Loading / Skeleton*: Pulsing loaders or shimmer UI during async data fetching.
     6. *Empty / Zero State*: Helpful guidance text or illustrations for empty datasets.
     7. *Error / Warning Boundary*: Inline error feedback with clear recovery CTAs.

3. **WCAG 2.1 AA Accessibility & Motion Standards**:
   - Text contrast >= 4.5:1 (3:1 for large headings) and touch targets >= 44x44px.
   - Visible keyboard focus rings (`focus-visible:ring-2`), semantic HTML5 tags (`<main>`, `<nav>`, `<article>`, `<button>`), and `prefers-reduced-motion` fallbacks.

4. **Visual Aesthetics & Spatial Harmony**:
   - Typographic hierarchy, vibrant dark/light mode balance, subtle glassmorphism (`backdrop-blur`), and fluid micro-transitions (150ms-200ms ease-out).

5. **Responsive Layouts & Grid Ergonomics**:
   - Mobile-first, fluid grid and flex layouts across mobile, tablet, and desktop viewports without horizontal scrollbar leaks or overflow cropping.

6. **5-Whys Cognitive Ergonomics**:
   - Root-cause usability analysis tracing surface UX requests down to cognitive friction.
   - Eliminates unnecessary workflow steps and guides users along prominent call-to-action (CTA) paths.

---

## Subagent Swarm Propagation

When a primary task running in MoD Mode launches subagents via `use_subagents`, `SubagentRunner.ts` automatically propagates `modEnabled: true` to the subagent's `SystemPromptContext`. The entire subagent swarm operates with senior design instincts while maintaining execution boundaries.

---

## World-Class UX Ergonomics

- **Segmented Control Pill**: Clean, zero-jargon toggle between **Coding Mode** and **Design Mode (MoD)** positioned directly above the chat composer input.
- **Keyboard Ergonomics**: Keyboard arrow key navigation (`ArrowLeft` / `ArrowRight`) across execution tabs with proper `role="tablist"` ARIA attributes.
- **Execution Mode Guide**: Integrated popover offering non-technical explanations and visual indicator badges.
