import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id: DietCodeDefaultTool.ASK,
	name: "ask_followup_question",
	description:
		"[ASK_FOLLOWUP_QUESTION_CONTRACT]\n- PURPOSE: Gather user clarification or decisions. BANNED: Options regarding mode switching.",
	contextRequirements: (context) => !context.yoloModeToggled,
	parameters: [
		{
			name: "question",
			required: true,
			instruction: "Clear, specific question for user.",
			usage: "Your question here",
		},
		{
			name: "options",
			required: false,
			instruction: "Optional array of 2-5 answer options. NEVER include mode switching options.",
			usage: '["Option 1", "Option 2"]',
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: DietCodeDefaultTool.ASK,
	name: "ask_followup_question",
	description: "[ASK_FOLLOWUP_QUESTION_CONTRACT]\n- PURPOSE: Single clarifying question with selectable answer options.",
	contextRequirements: (context) => !context.yoloModeToggled,
	parameters: [
		{
			name: "question",
			required: true,
			instruction: "Single question string.",
		},
		{
			name: "options",
			required: true,
			instruction: "Array of 2-5 option strings. BANNED: Mode switching options.",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const ask_followup_question_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN]
