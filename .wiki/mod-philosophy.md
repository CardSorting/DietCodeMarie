# Master of Design (MoD): Design Engineering Philosophy

## Calm, Senior Product Design Engineering

The **Master of Design (MoD)** philosophy in LUMI embeds senior design engineering instincts directly into the developer workflow. Rather than treating design as a separate, downstream post-processing step, MoD steers code creation at the moment of authoring.

### 1. Mirror, Steer, Verify
- **Mirror**: Sensing existing design tokens and CSS variables (`var(--primary)`, `bg-background`) before creating new UI elements.
- **Steer**: Guiding component state structures to satisfy the 7-State UI Matrix (Idle, Hover, Active, Disabled, Loading, Empty, Error).
- **Verify**: Enforcing WCAG 2.1 AA contrast standards, visible focus rings, touch targets, and mobile/desktop reflow.

### 2. 5-Whys Cognitive Ergonomics
When evaluating user requests, MoD probes root usability friction:
- *Why is this action confusing?* -> Surface affordance is missing.
- *Why is the affordance missing?* -> Status state is unrepresented.
- *Why is the state unrepresented?* -> Component lacks an explicit loading/disabled state.
- *Root Solution*: Implement explicit 7-state UI handling with clear feedback.

### 3. Subagent Swarm Coherence
When complex tasks require subagent task swarms, MoD steering propagates down to every subagent worker (`SubagentRunner.ts`). The swarm operates with unified design engineering standards across all parallel workers.
