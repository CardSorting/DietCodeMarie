# ADR-003: Guided Spec Mode (v1.0.0-spec) & Deterministic Execution Wrapper

- **Status**: Accepted & Implemented
- **Date**: 2026-08-06
- **Authors**: LUMI Lead AI Systems Architect & Pair Programming Agent
- **Deciders**: LUMI Product & Architecture Steering Committee
- **Technical Scope**: `src/shared/storage/types.ts`, `src/core/prompts/system-prompt/registry/PromptBuilder.ts`, `src/shared/guidedSpec/parser.ts`, `src/shared/guidedSpec/types.ts`, `webview-ui/src/components/chat/GuidedSpecCard.tsx`, `webview-ui/src/components/chat/ChatTextArea.tsx`, `webview-ui/src/components/chat/ModModeSwitcher.tsx`

---

## 1. Context and Problem Statement

In classic AI coding extensions, interaction model assumptions require stakeholders to act as **software architects**—drafting technical prompts, inspecting code diffs, reading terminal execution logs, and diagnosing stack traces.

For non-technical product managers, client approvers, and business stakeholders, this workflow creates severe friction:
1. **Prompt Fatigue**: Non-technical users struggle to formulate precise engineering prompts.
2. **Syntax Noise**: Exposure to code blocks and terminal output obscures product-level decision making.
3. **Execution Ambiguity**: Non-technical stakeholders cannot easily verify if a milestone is complete or what decision choices are recommended.

To bridge this gap, LUMI required a **deterministic execution wrapper** layered over the core LLM engine that intercept outputs, suppresses terminal/code artifacts, and forces every state transition to render as a low-friction product management interface (**Breadboards, Milestone Steppers, and Decision Chips**).

---

## 2. Decision Outcome

We decided to implement **Guided Spec Mode (`v1.0.0-spec`)** under the `AUTO` execution mode.

### Key Invariants & Architectural Boundaries

1. **`AUTO` Mode Integration**:
   - Extended `Mode` union type across backend and webview storage to include `"auto"` alongside `"plan"` and `"act"`.
   - Policy engines (`UniversalGuard`, `FluidPolicyEngine`) strictly scope `"auto"` execution turns.

2. **Zero-Code & Zero-Terminal Prompt Injection**:
   - When mode is `"auto"`, `PromptBuilder.ts` automatically injects `# SYSTEM OVERRIDE: LUMI GUIDED SPEC MODE`.
   - Strict constraints ban raw markdown code blocks (`\`\`\`ts`, `\`\`\`py`), raw bash commands, and speculative developer language (`"I think"`, `"maybe"`).

3. **4-State Lifecycle Engine**:
   - `0. IDLE` $\rightarrow$ `1. DISCOVERY` $\rightarrow$ `2. SPEC LOCK` $\rightarrow$ `3. MILESTONE EXEC` $\rightarrow$ `4. HANDOFF`
   - Every response must output structured 4-block specifications:
     - **Block 1: Breadboard Spec** (`Place`, `Affordances`, `Wiring`)
     - **Block 2: Milestone Stepper** (`[DONE]`, `[IN PROGRESS]`, `[PENDING]`)
     - **Block 3: Decision Waypoint** (Question statement)
     - **Block 4: Decision Chips** (`Option A (Recommended Default)` & `Option B (Alternative Pathway)`)

4. **Real-time Output Stream Parser**:
   - `parseGuidedSpecOutput()` ([`parser.ts`](file:///Users/bozoegg/Downloads/codemarie-new/src/shared/guidedSpec/parser.ts)) extracts `GuidedSpecState` from streamed model output in real time.

5. **Zenith & Beyond-the-Beyond UI/UX Components**:
   - **`GuidedSpecCard.tsx`**: Renders 4-phase stepper bars, breadboard surface maps, milestone progress timers (`2/3 - 66%`), interactive milestone accordions, trade-off rationale drawers (`💡 Why Option A is Recommended`), and an interactive **Product Architecture Canvas Drawer**.
   - **Single-Key Superhuman Acceleration (`Press A` / `Press B`)**: Keyboard event listeners allow instant 1-key decision approvals.
   - **Composer Quick Action Pill**: [`ChatTextArea.tsx`](file:///Users/bozoegg/Downloads/codemarie-new/webview-ui/src/components/chat/ChatTextArea.tsx) renders a sticky 1-click **"Proceed with Defaults (1-Click Approve)"** action button.
   - **Live Telemetry Capsule**: [`ModModeSwitcher.tsx`](file:///Users/bozoegg/Downloads/codemarie-new/webview-ui/src/components/chat/ModModeSwitcher.tsx) displays `⚡ Zero-Syntax Shielding Active`.

---

## 3. Consequences & Verification

### Trade-offs & Benefits
- **+ Zero Technical Friction**: Non-technical clients approve visual milestones with 1 click or keypress `A`.
- **+ Zero Output Noise**: Code blocks and terminal execution dumps are completely suppressed in favor of visual outcome cards.
- **+ Guaranteed Rollbacks**: State 4 (`HANDOFF`) auto-generates a snapshot restoration point.
- **- Model Compliance Requirement**: Models must strictly adhere to the 4-block structured layout format when `AUTO` mode prompt override is active.

### Verification Matrix

| Validation Suite | Target Command | Result |
| :--- | :--- | :--- |
| **Parser Unit Tests** | `npx cross-env TS_NODE_PROJECT=./tsconfig.unit-test.json mocha src/shared/guidedSpec/__tests__/parser.test.ts` | **2/2 Passing** |
| **TypeScript Type Checks** | `npm run check-types` | **0 Errors** (Clean build across extension & webview) |
