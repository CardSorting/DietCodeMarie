# MEOW-017: Guided Spec Execution Mode (v1.0.0-spec) & Zero-Syntax Shielding

- **Status**: Accepted
- **Date**: 2026-08-06
- **Context Domain**: Core Execution Engine, UI/UX Presentation Layer, System Prompt Architecture

## 1. Context and Problem Statement

Classic AI coding assistants require all users—including non-technical product managers, client approvers, and business stakeholders—to interact as software architects. Stakeholders must write complex prompts, interpret code diffs, read terminal execution logs, and diagnose stack traces.

This creates severe friction for non-technical users:
- High prompt writing fatigue.
- Visual noise from code blocks and raw command execution outputs.
- Ambiguity when assessing feature build progress and evaluating choices.

## 2. Decision Outcome

We decided to implement **Guided Spec Mode (`v1.0.0-spec`)** under the `AUTO` execution mode as a deterministic execution wrapper layered over the core LLM engine.

### Architectural Rules & Interfaces

1. **Execution Mode Extension**: Added `"auto"` to the `Mode` union type across storage (`src/shared/storage/types.ts`), policy engines (`UniversalGuard`, `FluidPolicyEngine`), system prompts, and UI controls.
2. **Zero-Code System Prompt Override**: Injected `# SYSTEM OVERRIDE: LUMI GUIDED SPEC MODE` via `PromptBuilder.ts` when mode is `"auto"`, banning raw markdown code blocks, raw shell execution, and speculative developer language.
3. **4-State Lifecycle Machine**:
   - `DISCOVERY` $\rightarrow$ `SPEC LOCK` $\rightarrow$ `MILESTONE EXEC` $\rightarrow$ `HANDOFF`
   - Enforces 4-block structured output formatting:
     - **Block 1: Breadboard Spec** (`Place`, `Affordances`, `Wiring`)
     - **Block 2: Milestone Stepper** (`[DONE]`, `[IN PROGRESS]`, `[PENDING]`)
     - **Block 3: Decision Waypoint** (Question statement)
     - **Block 4: Decision Chips** (`Option A` & `Option B`)
4. **Real-time Parser & Transcendent UI**:
   - `parseGuidedSpecOutput()` (`src/shared/guidedSpec/parser.ts`) extracts streamed outputs in real time.
   - `GuidedSpecCard.tsx` renders 4-phase stepper bars, breadboard surface maps, milestone timers (`2/3 - 66%`), trade-off rationale drawers (`💡 Why Option A is Recommended`), single-key Superhuman shortcuts (`Press A` / `Press B`), and an interactive **Product Architecture Canvas Drawer**.
   - `ChatTextArea.tsx` renders a sticky 1-click **"Proceed with Defaults"** quick action button.
   - `ModModeSwitcher.tsx` renders a live telemetry capsule: `⚡ Zero-Syntax Shielding Active`.

## 3. Technical Implementation

- **Data Models**: `src/shared/guidedSpec/types.ts`
- **Parser**: `src/shared/guidedSpec/parser.ts`
- **System Prompts**: `src/core/prompts/system-prompt/registry/PromptBuilder.ts`
- **Policy Enforcement**: `src/core/policy/UniversalGuard.ts`, `src/core/policy/FluidPolicyEngine.ts`
- **Webview UI Components**: `webview-ui/src/components/chat/GuidedSpecCard.tsx`, `webview-ui/src/components/chat/ChatTextArea.tsx`, `webview-ui/src/components/chat/ModModeSwitcher.tsx`

## 4. Consequences & Verification

- **Consequences**: Shielding code and terminal output enables non-technical stakeholders to approve milestones with single clicks or keypress `A`. Feature handoff automatically creates a rollback restoration snapshot (`📸 Snapshot Ready`).
- **Automated Verification**: `2/2 passing` mocha parser tests (`src/shared/guidedSpec/__tests__/parser.test.ts`), `0 errors` in `npm run check-types`.
