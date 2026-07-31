import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"

const id = DietCodeDefaultTool.ATTEMPT

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "attempt_completion",
	description: `[ATTEMPT_COMPLETION_CONTRACT]
- PURPOSE: Present verified task completion result to the user.
- PREREQUISITE: Confirm previous tool executions succeeded and all requirements are met.
- CONVERSATION_STYLE: Non-conversational final report. Do NOT end with questions or offers of assistance.`,
	parameters: [
		{
			name: "result",
			required: true,
			instruction: "Clear, specific description of task results.",
			usage: "Your final result description here",
		},
		{
			name: "command",
			required: false,
			instruction:
				"Optional OS-compatible demo CLI command (e.g. `open index.html` or `open localhost:3000`). BANNED: echo/cat text printing.",
			usage: "Your command here (optional)",
		},
		// Different than the vanilla ASK_PROGRESS_PARAMETER
		{
			name: "task_progress",
			required: false,
			instruction: "Completed checklist showing task progress.",
			usage: "Checklist here",
			dependencies: [DietCodeDefaultTool.TODO],
		},
	],
}

const GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.GPT_5,
	id,
	name: "attempt_completion",
	description: `[ATTEMPT_COMPLETION_CONTRACT]
- PURPOSE: Present verified final task completion result.
- PREREQUISITE: Confirm tool success and complete goal fulfillment.`,
	parameters: [
		{
			name: "result",
			required: true,
			instruction: "Clear, specific description of task results.",
			usage: "Your final result description here",
		},
		{
			name: "command",
			required: false,
			instruction: "Optional OS-compatible demo CLI command. BANNED: echo/cat text printing.",
			usage: "Your command here (optional)",
		},
		// Different than the vanilla ASK_PROGRESS_PARAMETER
		{
			name: "task_progress",
			required: false,
			instruction: "Completed checklist showing task progress.",
			usage: "Checklist here",
			dependencies: [DietCodeDefaultTool.TODO],
		},
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id,
	name: "attempt_completion",
	description:
		"[ATTEMPT_COMPLETION_CONTRACT]\n- PURPOSE: Present verified task completion result.\n- PREREQUISITE: Complete all task_progress checklist items and required workspace edits.",
	parameters: [
		{
			name: "result",
			required: true,
			instruction: "Clear, concise 1-2 paragraph summary of the final result.",
		},
		{
			name: "command",
			required: false,
			instruction: "Actionable terminal demo command (e.g. `start localhost:3000`). BANNED: echo/cat text printing.",
		},
		{
			name: "task_progress",
			required: false,
			dependencies: [DietCodeDefaultTool.TODO],
			instruction: "Completed task progress checklist.",
		},
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const attempt_completion_variants = [generic, GPT_5, NATIVE_NEXT_GEN, NATIVE_GPT_5]
