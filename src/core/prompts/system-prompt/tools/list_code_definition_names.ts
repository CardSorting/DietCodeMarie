import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const id = DietCodeDefaultTool.LIST_CODE_DEF

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "list_code_definition_names",
	description:
		"[LIST_CODE_DEFINITION_NAMES_CONTRACT]\n- PURPOSE: List top-level code definition names (classes, functions, methods) in target directory for architecture mapping.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `Directory path (relative to {{CWD}}){{MULTI_ROOT_HINT}}.`,
			usage: "Directory path here",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "list_code_definition_names",
	description: "[LIST_CODE_DEFINITION_NAMES_CONTRACT]\n- PURPOSE: List top-level code definition names in directory.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `Directory path (relative to {{CWD}}){{MULTI_ROOT_HINT}}.`,
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const list_code_definition_names_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN]
