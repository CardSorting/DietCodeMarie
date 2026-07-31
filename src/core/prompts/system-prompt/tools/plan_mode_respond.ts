import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"

/**
 * ## plan_mode_respond
Description: Respond to the user's inquiry in an effort to plan a solution to the user's task. This tool should ONLY be used when you have already explored the relevant files and are ready to present a concrete plan. DO NOT use this tool to announce what files you're going to read - just read them first. This tool is only available in PLAN MODE. The environment_details will specify the current mode; if it is not PLAN_MODE then you should not use this tool.
However, if while writing your response you realize you actually need to do more exploration before providing a complete plan, you can add the optional needs_more_exploration parameter to indicate this. This allows you to acknowledge that you should have done more exploration first, and signals that your next message will use exploration tools instead.
Parameters:
- response: (required) The response to provide to the user. Do not try to use tools in this parameter, this is simply a chat response. (You MUST use the response parameter, do not simply place the response text directly within <plan_mode_respond> tags.)
- needs_more_exploration: (optional) Set to true if while formulating your response that you found you need to do more exploration with tools, for example reading files. (You can explore the project with tools like read_file while remaining in PLAN MODE.) Defaults to false if not specified.
${focusChainSettings.enabled ? `- task_progress: (optional) A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)` : "" }
Usage:
<plan_mode_respond>
<response>Your response here</response>
<needs_more_exploration>true or false (optional, but you MUST set to true if in <response> you need to read files or use other exploration tools)</needs_more_exploration>
${focusChainSettings.enabled ? `<task_progress>
Checklist here (If you have presented the user with concrete steps or requirements, you can optionally include a todo list outlining these steps.)
</task_progress>` : "" }
</plan_mode_respond>
 */

const id = DietCodeDefaultTool.PLAN_MODE

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "plan_mode_respond",
	description: `[PLAN_MODE_RESPOND_CONTRACT]
- AVAILABILITY: PLAN_MODE ONLY. Transition to ACT_MODE occurs automatically upon submission.
- PURPOSE: Deliver concrete plan after file exploration. Do NOT use to announce file reads before doing them.
- EXPLORATION_RECOVERY: If response formulation reveals need for further research, set needs_more_exploration=true.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `The plan or response to provide to the user. Must be supplied within response parameter.`,
			usage: "Your response here",
		},
		{
			name: "needs_more_exploration",
			required: false,
			instruction:
				"Set true if further exploration with tools (read_file/search) is required before finalizing plan. Defaults false.",
			usage: "true or false",
			type: "boolean",
		},
		// Different than the vanilla TASK_PROGRESS_PARAMETER
		{
			name: "task_progress",
			required: false,
			instruction: "Checklist showing task progress after tool use (see 'Updating Task Progress').",
			usage: "Checklist here",
			dependencies: [DietCodeDefaultTool.TODO],
		},
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "plan_mode_respond",
	description: `[PLAN_MODE_RESPOND_CONTRACT]
- AVAILABILITY: PLAN_MODE ONLY. Automatic transition to ACT_MODE upon submission.
- PURPOSE: Deliver concrete plan after file exploration.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `The plan response to provide to the user.`,
		},
		{
			name: "task_progress",
			required: false,
			instruction: "Checklist showing task progress status.",
		},
	],
}

const GEMINI_3: DietCodeToolSpec = {
	variant: ModelFamily.GEMINI_3,
	id,
	name: "plan_mode_respond",
	description: `[PLAN_MODE_RESPOND_CONTRACT]
- AVAILABILITY: PLAN_MODE ONLY. Automatic transition to ACT_MODE upon submission.
- PURPOSE: Present concrete plan after exploring files.
- EXPLORATION_RECOVERY: If further research is required, set needs_more_exploration=true.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `Plan response to provide to user.`,
			usage: "Your response here",
		},
		{
			name: "needs_more_exploration",
			required: false,
			instruction: `Set true if further exploration with tools is required before finalizing plan.`,
			usage: "true or false",
			type: "boolean",
		},
		{
			name: "task_progress",
			required: false,
			instruction: "Checklist showing task progress after tool use (see 'Updating Task Progress').",
			usage: "Checklist here",
			dependencies: [DietCodeDefaultTool.TODO],
		},
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const plan_mode_respond_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN, GEMINI_3]
