import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"

/**
 * ## act_mode_respond
Description: Provide a progress update or preamble to the user during ACT MODE execution. This tool allows you to communicate your thought process and what you're about to do, without interrupting the execution flow. After displaying your message, execution will automatically continue, allowing you to proceed with subsequent tool calls. This tool is only available in ACT MODE for OpenAI native models. The environment_details will specify the current mode; if it is not ACT_MODE then you should not use this tool.
Use this tool when you want to:
- Explain what you're about to do before executing tools
- Provide progress updates during long-running tasks
- Clarify your approach or reasoning
- Keep the user informed of your progress
Parameters:
- response: (required) The message to provide to the user. This should explain what you're about to do, your current progress, or your reasoning. (You MUST use the response parameter, do not simply place the response text directly within <act_mode_respond> tags.)
- task_progress: (optional) A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)
Usage:
<act_mode_respond>
<response>Your message here</response>
<task_progress>Checklist here (optional)</task_progress>
</act_mode_respond>
 */

const id = DietCodeDefaultTool.ACT_MODE

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "act_mode_respond",
	description: `[ACT_MODE_RESPOND_CONTRACT]
- PURPOSE: Provide brief execution preamble or progress update in ACT MODE.
- BANNED: Never call twice in a row. Must be followed by action tool call. Do NOT call upon task completion (use attempt_completion).`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `Brief conversational message informing user of planned action or current status.`,
			usage: "Your message here",
		},
		{
			name: "task_progress",
			required: false,
			instruction: "Checklist showing current task progress status.",
		},
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

const GEMINI_3: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.GEMINI_3,
}

export const act_mode_respond_variants = [NATIVE_GPT_5, NATIVE_NEXT_GEN, GEMINI_3]
