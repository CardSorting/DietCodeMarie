---
title: "Task Resume and Recovery"
sidebarTitle: "Resume and Recovery"
description: "Generation-safe suspension, restoration, and explicit resume."
---
{/* [LAYER: INFRASTRUCTURE] */}

# Task resume and recovery

Resume is an explicit `TaskLifecycleFunnel` transition, never an assignment to task state.

- An explicitly `suspended` generation may resume with the same generation ID.
- A `terminal` generation can continue only with a fresh `newGenerationId`.
- A new generation is committed atomically and old callbacks, permits, and lifecycle intents fail as stale.
- Parent generation replacement waits for attached children of the old generation to terminalize.

On restore, the persistence adapter loads the exact committed record, revision, and referenced last event. Runtime guards validate the complete record schema and prove that the event matches the record's task, generation, revision, state, cancellation, timestamp, and monotonic sequence. Missing, malformed, contradictory, or mismatched data fails closed, and storage/UI do not infer whether the task should be active. Restoring a terminal or cancellation-fenced parent also reconciles any attached child whose typed propagation commit was interrupted. Child admission independently checks the exact durable parent generation, so the process-crash window cannot authorize execution. An interrupted active history is explicitly suspended before same-generation resume. Legacy history without a lifecycle record is migrated through typed registration/activation intents, and durable legacy completion is submitted as a completion fact rather than assigned directly.

## 5-Gate Task Reopening Architecture & Ergonomics

When a task has completed, a user can seamlessly continue the conversation, send follow-up instructions, or edit/resend previous turns. The 5-gate pipeline guarantees that terminal completion never acts as a permanent lock trap:

1. **Dual-Action Completion Presentation (`buttonConfig.ts` & `ActionButtons.tsx`)**: Replaces single "New chat" completion buttons with dual-action "Resume task" (primary) and "New chat" (secondary) controls. Action button interactivity is unblocked (`canInteract = enableButtons && !isProcessing`) so completion controls respond immediately.
2. **Unblocked User Message Resend (`UserMessage.tsx`)**: User message "Resend" and "Undo files & resend" controls execute checkpoint restoration and prompt resending without requiring text string modification (`text === editedText` restriction removed).
3. **Chat Send Route Priority (`chatInputPolicy.ts`)**: `resolveChatSendRoute` prioritizes `canSendTaskFeedback(messages, dietcodeAsk)` before `dietcodeAsk` so follow-ups on completed tasks route as `"follow_up"`, preventing `useMessageHandlers` from force-disabling chat inputs in React state.
4. **Timeline Truncation & Activity Unlocking (`taskCompletionEvidence.ts`, `agentActivity.ts`, `composerState.ts`)**: Editing a message or restoring a checkpoint removes completion evidence from active history. `BLOCKING_TASK_ASKS` excludes completion/resume asks, and `deriveComposerMode` checks `hasTerminalCompletionEvidence(messages)` to keep composer controls open (`"ready"` / `"steering"`).
5. **Automatic Backend Generation Replacement (`Task.ts` & `TaskLifecycleFunnel.ts`)**: `initiateTaskLoop` calls `commitResumeLifecycle()` at the start of any turn on a terminal task, submitting `ResumeWithGeneration` to issue a fresh generation ID (`G2`) in `active` state and broadcasting an active `TaskLifecycleEvent` to the webview UI.

If persistence fails or a newer revision already exists, restore/resume fails closed. It does not overwrite the record asynchronously or silently reactivate a terminal task.

See [Task lifecycle authority](task-lifecycle-authority.md) for the complete transaction and [Task history recovery](troubleshooting/task-history-recovery.mdx) for user-facing history reconstruction.
