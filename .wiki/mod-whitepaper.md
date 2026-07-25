# Master of Design (MoD): Technical Specification & Whitepaper

## Abstract
This whitepaper specifies the **Master of Design (MoD)** system prompt steering architecture within LUMI. MoD integrates senior product design engineering principles into the unified task execution engine (`initiateTaskLoop`).

---

## 1. System Architecture

```text
┌────────────────────────────────────────────────────────┐
│             Task Loop Hook (initiateTaskLoop)          │
└──────────────────────────┬─────────────────────────────┘
                           │ (modEnabled = true)
                           ▼
┌────────────────────────────────────────────────────────┐
│        SystemPromptSection.MOD_DESIGNER_STEERING       │
│  (Injected after SystemPromptSection.AGENT_ROLE)       │
└──────────────────────────┬─────────────────────────────┘
                           │ Steered Prompt Context
                           ▼
┌────────────────────────────────────────────────────────┐
│               Unified Coding Task Loop                 │
│  (100% Tool Parity: read_file, replace_in_file, etc.)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Task Execution & Subagents
                           ▼
┌────────────────────────────────────────────────────────┐
│           Subagent Swarm Prompt Context                │
│    (SubagentRunner inherits modEnabled: true)         │
└────────────────────────────────────────────────────────┘
```

---

## 2. The 6 Senior Design Engineering Steering Pillars

1. **Design Token Sensing & System Hierarchy**:
   - Inspects existing CSS/Tailwind tokens (`var(--primary)`, `text-muted-foreground`) before creating new styles.
2. **Complete 7-State UI Matrix**:
   - Explicitly handles Idle, Hover, Active, Disabled, Loading/Skeleton, Empty, and Error states.
3. **WCAG 2.1 AA Accessibility & Motion**:
   - Contrast ratios >= 4.5:1, touch targets >= 44x44px, visible focus rings, ARIA semantic tags, and reduced motion fallbacks.
4. **Visual Aesthetics & Spatial Harmony**:
   - Typographic scale, dark/light balance, glassmorphism (`backdrop-blur`), and fluid micro-transitions (150ms-200ms ease-out).
5. **Responsive Layouts & Grid Ergonomics**:
   - Mobile-first grid and flex layouts without horizontal scrollbar leaks.
6. **5-Whys Cognitive Ergonomics**:
   - Usability friction reduction and clear CTA paths.

---

## 3. Subagent Inheritance & UX Switcher

- **Subagent Swarms**: `src/core/task/tools/subagent/SubagentRunner.ts` extracts `modEnabled` from state settings and threads it into child `SystemPromptContext`.
- **Slash Commands**: `/deep-planning` and custom slash commands thread `modEnabled` into prompt context.
- **UX Switcher Component**: `webview-ui/src/components/chat/ModModeSwitcher.tsx` provides a accessible segmented control bar with keyboard navigation (`ArrowLeft` / `ArrowRight`) and zero-jargon popover guides.
