---
title: "Master of Design (MoD) Prompt Steering Architecture"
sidebarTitle: "Master of Design (MoD)"
description: "Architecture, system prompt steering toggle, Principal Frontend Architect design tokens, subagent swarm inheritance, and UX ergonomics for Master of Design in LUMI."
---

# Master of Design (MoD) Architecture

The **Master of Design (MoD)** framework in LUMI is a unified, prompt-steered execution mode that injects senior product design engineering instincts directly into the standard coding task loop. Operating as a **Principal Frontend Architect & Design System Linter**, MoD Mode systematically eliminates generic AI-generated UI clichés ("vibecoded" neon purple/cyan gradients, floating `rounded-2xl` cards, generic typography, bouncy spring animations) and replaces them with bespoke, studio-quality frontend implementations.

Rather than bypassing the core agent pipeline with isolated orchestrators, MoD Mode mirrors the unified coding agent path with 100% tool parity (`read_file`, `replace_in_file`, `execute_command`, `browser_action`, subagents, MCP tools), automatically steering every code edit, architecture decision, and subagent task with strict design system tokens.

---

## Code Map

| Component | Path | Responsibility |
|-----------|------|----------------|
| System Prompt Steering Component | `src/core/prompts/system-prompt/components/mod_designer_steering.ts` | Injects Principal Frontend Architect design system linter rules when `modEnabled` is true |
| Layout Architect Specialist | `src/core/prompts/system-prompt/components/mod_layout_specialist.ts` | Specialized prompt enforcing spatial rhythm, asymmetrical 5/7-col grids, hairline dividers, sticky sidebars |
| Token & Theme Specialist | `src/core/prompts/system-prompt/components/mod_tokens_specialist.ts` | Specialized prompt enforcing color balance, monospaced metadata, and `modThemeTokens` contract |
| Micro-Motion & State Specialist | `src/core/prompts/system-prompt/components/mod_motion_specialist.ts` | Specialized prompt enforcing complete 7-State UI Matrix & custom bezier transitions |
| AST Compliance Linter | `scripts/lint-mod-compliance.ts` | CI/Build regex & AST compliance checker scanning for banned AI-slop UI patterns |
| Prompt Builder Registry | `src/core/prompts/system-prompt/registry/PromptBuilder.ts` | Dynamically evaluates and places `MOD_DESIGNER_STEERING` right after `AGENT_ROLE_SECTION` |
| Task Loop Integration | `src/core/task/index.ts` | Passes `modEnabled` setting to `SystemPromptContext` in the unified execution loop |
| Subagent Swarm Inheritance | `src/core/task/tools/subagent/SubagentRunner.ts` | Propagates `modEnabled` prompt steering down to subagent task contexts |
| Slash Command Alignment | `src/core/prompts/commands/deep-planning/index.ts` | Passes `modEnabled` steering to `/deep-planning` slash command templates |
| UX Mode Switcher | `webview-ui/src/components/chat/ModModeSwitcher.tsx` | Segmented control bar with zero-jargon copy, keyboard navigation, and popover guides |
| Unit Test Suite | `src/core/task/tools/subagent/__tests__/mod.test.ts` | 100% test coverage verifying prompt steering injection, subagent inheritance, and AST linter rules |

---

## Zero-Fluff Steering Compression & Token Density

Primary MoD steering collapses verbose instructions into a dense, bracketed key-value payload (`MOD_SYSTEM_DIRECTIVES`), reducing prompt token overhead by ~35% while increasing LLM attention determinism:

```typescript
export const MOD_SYSTEM_DIRECTIVES = `
[STRICT SYSTEM CONSTRAINTS: STUDIO-GRADE FRONTEND ARCHITECTURE]

// BANNED PATTERNS (AUTOMATIC DISQUALIFICATION)
- BANNED_RADII: rounded-2xl, rounded-3xl, rounded-full (containers)
- BANNED_COLORS: #000000, #FFFFFF, bg-black, bg-white, neon purple/cyan gradients
- BANNED_EFFECTS: shadow-2xl, ambient glows, hover:scale-105, bouncy springs

// REQUIRED TOKENS & DENSITY
- BASE_SURFACES: Warm Slate Dark (#0B0C0E / #121316) | Warm Neutral Light (#FAFA3 / #F4F4F6)
- BOUNDARIES: 1px hairline borders ONLY (border-white/10 or border-black/10)
- ACCENT_CAP: 1 high-contrast accent max | Surface area <= 5%
- TYPO_SCALE: Display tracking-[-0.03em] | Body leading-[1.65] | Tags font-mono text-[11px] uppercase
- MOTION_EASING: ease-[cubic-bezier(0.16,1,0.3,1)] duration-200

// MANDATORY 7-STATE UI COVERAGE
Idle | Hover | Active | Disabled | Loading (Shimmer/Tag) | Empty ([0 RECORDS]) | Error (Recovery CTA)
`;
```

---

## Single-Duty Subagent Handoff Protocol

Subagent specialists operate under a **Single-Duty Execution Schema** for fast, cheap, and modular code generation:

1. **Layout Architect (`mod_layout_specialist.ts`)**: Returns *only* structural JSX/HTML skeletons with asymmetrical grid spans (5-col / 7-col), measure constraints (`max-w-prose`), hairline dividers, and zero color/motion noise.
2. **Token & Theme Specialist (`mod_tokens_specialist.ts`)**: Injects exact CSS custom properties, typography pairings, monospaced metadata tags (`[SYS.01 // READY]`), and `modThemeTokens` utility classes into layout skeletons.
3. **Micro-Motion & State Specialist (`mod_motion_specialist.ts`)**: Applies `:hover`, `:active`, `:focus-visible`, custom cubic-bezier transitions (`ease-[cubic-bezier(0.16,1,0.3,1)]`), and 7-State UI Matrix nodes across interactive elements.

---

## Subagent Swarm Specialization

To prevent prompt bloat while maximizing execution quality across large codebases, MoD decomposes into 3 specialized downstream subagent prompts extending the primary steering:

```
                  ┌──────────────────────────────────────────┐
                  │   MoD Primary Steering (mod_designer)    │
                  └────────────────────┬─────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌───────────────┐              ┌───────────────┐              ┌───────────────┐
│ Layout Architect │           │ Token & Theme │              │ Micro-Motion  │
│ (Asymmetry)   │              │ Specialist    │              │ Specialist    │
└───────────────┘              └───────────────┘              └───────────────┘
```

1. **Layout Architect (`mod_layout_specialist.ts`)**: Single-Duty spatial structure, asymmetrical 5/7-col grids, hairline dividers, sticky sidebars, and optimal measure (`max-w-prose`).
2. **Token & Theme Specialist (`mod_tokens_specialist.ts`)**: Single-Duty color architecture, monospaced metadata tags (`[SYS.01 // READY]`), and `modThemeTokens` contract injection:

```typescript
export const modThemeTokens = {
  surface: {
    base: 'bg-[#0B0C0E]',
    subtle: 'bg-[#121316]',
    overlay: 'bg-white/[0.02]',
  },
  border: {
    hairline: 'border-white/10',
    hover: 'group-hover:border-white/25',
  },
  text: {
    heading: 'text-white tracking-[-0.03em]',
    body: 'text-neutral-400 leading-[1.65]',
    meta: 'font-mono text-[11px] tracking-widest text-neutral-500 uppercase',
  },
} as const;
```

3. **Micro-Motion & State Specialist (`mod_motion_specialist.ts`)**: Single-Duty 7-State UI Matrix nodes and cubic-bezier transitions (`ease-[cubic-bezier(0.16,1,0.3,1)]`).


---

## MoD AST Compliance Linter Script

To ensure human engineers or non-MoD LLM tasks do not introduce AI-slop UI back into the codebase, run the automated compliance linter:

```bash
npm run lint:mod
```

The compliance engine (`scripts/lint-mod-compliance.ts`) automatically audits component files against banned patterns (`rounded-2xl`, `bg-black`, `border-purple-500`, `shadow-2xl`) and enforces 100% studio-quality design system compliance across the repository.

---

## Principal Design System Tokens & Anti-AI-Slop Rules

When `modEnabled` is toggled ON, the agent automatically enforces these non-negotiable design system tokens:

1. **Restrained Neutral Color Architecture**:
   - Background Base: Warm slate darks (`#0B0C0E`, `#121316`) or warm light neutrals (`#FAFA3`, `#F4F4F6`). Never pure `#000000` or `#FFFFFF`.
   - Structural Boundaries: 1px hairline borders (`border-white/10` or `rgba(255,255,255,0.08)`). No heavy drop-shadows.
   - Accents: Single-purpose high-contrast focal accent (`#002FA7`, `#FF5000`, `#CCFF00`), max 5% surface coverage.

2. **Typographic Rhythm & Monospaced Metadata**:
   - Display Headings: Tight tracking (`tracking-[-0.03em]`), fluid clamp scaling (`clamp(2rem, 4vw + 1rem, 4.5rem)`).
   - Metadata / Tags: Monospace, all-caps, padded, bracketed/bordered (e.g., `[SYS.01 // READY]`, `font-mono text-[11px] tracking-widest uppercase`).
   - Body Measure: Increased line height (`leading-[1.65]`), max 50-75 characters per line.

3. **Spatial Rhythm & Minimal Radii**:
   - Asymmetrical layout grids (e.g., 2-col sticky sidebar/summary + 3-col content).
   - Flat card layout with hairline borders, sharp/minimal radii (`rounded-none`, `rounded-sm`, `rounded-md`). Zero `rounded-2xl` or `rounded-3xl` on primary containers.

4. **Tactile Motion & Custom Bezier Easing**:
   - Custom bezier curve transitions: `transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]`.
   - Micro-opacity shifts and discrete inset states. Bouncy spring scales and heavy hover elevations are strictly banned.

5. **Complete 7-State UI Matrix & WCAG 2.1 AA**:
   - Explicitly handles 7 UI states: Idle, Hover, Active, Disabled, Loading (shimmer), Empty (monospaced tag guidance), and Error (recovery CTA).
   - Touch targets >= 44x44px, contrast >= 4.5:1, keyboard focus rings (`focus-visible:ring-1`), semantic HTML5.

---

## Subagent Swarm Propagation

When a primary task running in MoD Mode launches subagents via `use_subagents`, `SubagentRunner.ts` automatically propagates `modEnabled: true` to the subagent's `SystemPromptContext`. The entire subagent swarm operates with senior design instincts while maintaining execution boundaries.

---

## World-Class UX Ergonomics & 3-Mode Switcher

- **3-Segment Control Pill**: Clean, zero-jargon toggle between **Coding Mode** (direct execution), **Design Mode (MoD)** (studio design steering), and **AUTO Mode (Guided Spec)** positioned directly above the chat composer input (`ModModeSwitcher.tsx`).
- **Guided Spec (`AUTO`) Synergy**: While MoD Mode enforces studio-grade frontend design engineering, **Guided Spec Mode (`v1.0.0-spec`)** layers a zero-syntax product management wrapper over LLM outputs for non-technical stakeholders (visual Breadboards, Progress Steppers, 1-Click Decision Chips, Superhuman shortcuts `A`/`B`, and Product Architecture Canvas).
- **Keyboard Ergonomics**: Keyboard arrow key navigation (`ArrowLeft` / `ArrowRight`) across execution tabs with proper `role="tablist"` ARIA attributes.
- **Execution Mode Guide**: Integrated popover offering non-technical explanations, visual indicator badges, and live telemetry status (`⚡ Zero-Syntax Shielding Active`).


