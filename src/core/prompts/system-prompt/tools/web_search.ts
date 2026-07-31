import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const GENERIC: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id: DietCodeDefaultTool.WEB_SEARCH,
	name: "web_search",
	description: `[WEB_SEARCH_CONTRACT]
- PURPOSE: Perform web search returning titles and URLs. Read-only.
- DOMAIN_FILTERING: Provide allowed_domains OR blocked_domains (JSON array of strings), never both.`,
	contextRequirements: (context) => context.providerInfo.providerId === "dietcode" && context.dietcodeWebToolsEnabled === true,
	parameters: [
		{
			name: "query",
			required: true,
			instruction: "Search query string (min 2 chars).",
			usage: "latest AI research",
		},
		{
			name: "allowed_domains",
			required: false,
			instruction: "JSON array of allowed domains.",
			usage: '["example.com"]',
		},
		{
			name: "blocked_domains",
			required: false,
			instruction: "JSON array of blocked domains.",
			usage: '["spam.com"]',
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: DietCodeDefaultTool.WEB_SEARCH,
	name: "web_search",
	description: "[WEB_SEARCH_CONTRACT]\n- PURPOSE: Perform web search returning titles and URLs.",
	contextRequirements: (context) => context.providerInfo.providerId === "dietcode" && context.dietcodeWebToolsEnabled === true,
	parameters: [
		{
			name: "query",
			required: true,
			instruction: "Search query.",
		},
		{
			name: "allowed_domains",
			required: false,
			instruction: "Allowed domains JSON array.",
		},
		{
			name: "blocked_domains",
			required: false,
			instruction: "Blocked domains JSON array.",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const web_search_variants = [GENERIC, NATIVE_GPT_5, NATIVE_NEXT_GEN]
