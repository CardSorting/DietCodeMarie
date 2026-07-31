import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

/**
 * ## access_mcp_resource
Description: Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.
Parameters:
- server_name: (required) The name of the MCP server providing the resource
- uri: (required) The URI identifying the specific resource to access
- task_progress: (optional) A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)
Usage:
<access_mcp_resource>
<server_name>server name here</server_name>
<uri>resource URI here</uri>
<task_progress>
Checklist here (optional)
</task_progress>
</access_mcp_resource>
 */

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id: DietCodeDefaultTool.MCP_ACCESS,
	name: "access_mcp_resource",
	description:
		"[ACCESS_MCP_RESOURCE_CONTRACT]\n- PURPOSE: Read resource (file/API/data) provided by connected MCP server via URI.",
	contextRequirements: (context) => context.mcpHub !== undefined && context.mcpHub !== null,
	parameters: [
		{
			name: "server_name",
			required: true,
			instruction: "Name of target MCP server.",
			usage: "server_name",
		},
		{
			name: "uri",
			required: true,
			instruction: "Target resource URI.",
			usage: "resource_uri",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id: DietCodeDefaultTool.MCP_ACCESS,
	name: "access_mcp_resource",
	description: "[ACCESS_MCP_RESOURCE_CONTRACT]\n- PURPOSE: Read MCP server resource via URI.",
	contextRequirements: (context) => context.mcpHub !== undefined && context.mcpHub !== null,
	parameters: [
		{
			name: "server_name",
			required: true,
			instruction: "Target MCP server name.",
			usage: "server_name",
		},
		{
			name: "uri",
			required: true,
			instruction: "Target resource URI.",
			usage: "resource_uri",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const nextGen = { ...generic, variant: ModelFamily.NEXT_GEN }
const gpt = { ...generic, variant: ModelFamily.GPT }

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const access_mcp_resource_variants = [generic, nextGen, gpt, NATIVE_GPT_5, NATIVE_NEXT_GEN]
