# Guided Spec Mode (`AUTO` Mode)

> **Low-Friction Product Management Interface for Non-Technical Stakeholders & Client Approvers.**

Guided Spec Mode (`AUTO` mode, `v1.0.0-spec`) is a deterministic execution wrapper layered over LUMI’s core engine. It intercepts LLM outputs, suppresses terminal/code artifacts, and forces every state transition to render as a low-friction product management interface (**Breadboards, Milestone Steppers, and Decision Chips**).

---

## Key Benefits for Non-Technical Users

- **Zero-Syntax Shielding**: Raw markdown code blocks, terminal execution logs, and stack traces are suppressed.
- **1-Click Approvals**: Approve recommended milestone options with a single click or keyboard shortcut (`Press A`).
- **Visual Breadboard Maps**: View UI surface locations (`Place`), user capabilities (`Affordances`), and system behaviors (`Wiring`) as clean visual tags.
- **Progress Waypoints**: Track feature build milestones with real-time percentage indicators (`66% Complete`).
- **Interactive Live Canvas**: Toggle a full product architecture canvas (`🎨 Live Canvas`) to inspect surface specifications.
- **Snapshot Rollback Safety**: Automated restoration checkpoints generated upon feature handoff (`📸 Snapshot Ready`).

---

## Execution Lifecycle (4-Phase State Machine)

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐       ┌────────────────┐
│ 1. DISCOVERY    │ ────> │ 2. SPEC LOCK    │ ────> │ 3. MILESTONE EXEC│ ────> │ 4. HANDOFF     │
│ Surface Mapping │       │ Scope Approval  │       │ Step Execution   │       │ Snapshot Lock  │
└─────────────────┘       └─────────────────┘       └──────────────────┘       └────────────────┘
```

1. **State 1: DISCOVERY**: LUMI probes requirements, identifies surface places, and maps affordances.
2. **State 2: SPEC LOCK**: LUMI locks the breadboard layout and milestone roadmap for client approval.
3. **State 3: MILESTONE EXEC**: LUMI executes milestone steps sequentially, updating progress badges in real time.
4. **State 4: HANDOFF**: LUMI completes feature delivery and locks an automated rollback restoration snapshot.

---

## Using Guided Spec Mode in VS Code

1. Click the execution mode switcher bar at the bottom of the LUMI chat panel.
2. Select **AUTO** mode (or press `ArrowRight` on the mode switcher pill).
3. Look for the `⚡ Zero-Syntax Shielding Active` live telemetry capsule in the header.
4. When LUMI presents a Waypoint Check-In:
   - Click **`Proceed with Defaults`** (or press key **`A`**) to execute the recommended option.
   - Click **`Select Option B`** (or press key **`B`**) to choose an alternative pathway.
   - Click **`Rationale`** to expand trade-off insights for either option.
