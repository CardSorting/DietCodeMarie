import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"

const GENERIC: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id: DietCodeDefaultTool.BASH,
	name: "execute_command",
	description: `[EXECUTE_COMMAND_CONTRACT]
- PURPOSE: Execute CLI commands in working directory ({{CWD}}{{MULTI_ROOT_HINT}}).
- EXECUTION_RULES: Tailor to OS context | Prefer CLI flags over script files | Prefer non-interactive flags (--no-pager, -y).`,
	parameters: [
		{
			name: "command",
			required: true,
			instruction: `CLI command to execute. Valid for OS, absolute paths required, no standalone cd.`,
			usage: "Your command here",
		},
		{
			name: "requires_approval",
			required: true,
			instruction:
				"Boolean: true for destructive/modifying operations (installs, deletes, system config); false for safe reads/builds.",
			usage: "true or false",
			type: "boolean",
		},
		{
			name: "timeout",
			required: false,
			type: "integer",
			contextRequirements: (context) => context.yoloModeToggled === true,
			instruction: "Command execution timeout in seconds.",
			usage: "30",
		},
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id: DietCodeDefaultTool.BASH,
	name: DietCodeDefaultTool.BASH,
	description: "[EXECUTE_COMMAND_CONTRACT]\n- PURPOSE: Execute system CLI operations.",
	parameters: [
		{
			name: "command",
			required: true,
			instruction: "CLI command to execute. No ~ or $HOME. Absolute paths required.",
		},
		{
			name: "requires_approval",
			required: true,
			instruction: "Boolean: true for destructive operations, false for non-destructive reads/builds.",
			type: "boolean",
		},
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

const GEMINI_3: DietCodeToolSpec = {
	variant: ModelFamily.GEMINI_3,
	id: DietCodeDefaultTool.BASH,
	name: DietCodeDefaultTool.BASH,
	description:
		"[EXECUTE_COMMAND_CONTRACT]\n- PURPOSE: Execute CLI commands. Use shell operator && for chaining. Avoid vague search commands.",
	parameters: [
		{
			name: "command",
			required: true,
			instruction: "CLI command to execute. Use proper shell operators (&&). No ~ or $HOME.",
		},
		{
			name: "requires_approval",
			required: true,
			instruction: "Boolean: true for destructive operations, false for non-destructive reads/builds.",
			type: "boolean",
		},
	],
}

export const execute_command_variants: DietCodeToolSpec[] = [GENERIC, NATIVE_GPT_5, NATIVE_NEXT_GEN, GEMINI_3]
