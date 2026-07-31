import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const GENERIC: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id: DietCodeDefaultTool.WEB_FETCH,
	name: "web_fetch",
	description: `[WEB_FETCH_CONTRACT]
- PURPOSE: Fetch & analyze webpage content. HTTP upgraded to HTTPS. Read-only.
- MCP_PREFERENCE: Prefer MCP web fetch tool if available.`,
	contextRequirements: (context) => context.providerInfo.providerId === "dietcode" && context.dietcodeWebToolsEnabled === true,
	parameters: [
		{
			name: "url",
			required: true,
			instruction: "Target URL to fetch.",
			usage: "https://example.com/docs",
		},
		{
			name: "prompt",
			required: true,
			instruction: "Analysis prompt for webpage content.",
			usage: "Summarize key points",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: DietCodeDefaultTool.WEB_FETCH,
	name: "web_fetch",
	description: "[WEB_FETCH_CONTRACT]\n- PURPOSE: Fetch and analyze URL content.",
	contextRequirements: (context) => context.providerInfo.providerId === "dietcode" && context.dietcodeWebToolsEnabled === true,
	parameters: [
		{
			name: "url",
			required: true,
			instruction: "Target URL.",
		},
		{
			name: "prompt",
			required: true,
			instruction: "Analysis prompt.",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const web_fetch_variants = [GENERIC, NATIVE_GPT_5, NATIVE_NEXT_GEN]
