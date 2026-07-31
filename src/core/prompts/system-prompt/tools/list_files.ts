import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const id = DietCodeDefaultTool.LIST_FILES

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "list_files",
	description:
		"[LIST_FILES_CONTRACT]\n- PURPOSE: List directory contents (top-level or recursive). BANNED: Confirmation of created files.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: "Directory path to list (relative to {{CWD}}){{MULTI_ROOT_HINT}}.",
			usage: "Directory path here",
		},
		{
			name: "recursive",
			required: false,
			instruction: "Boolean: true for recursive listing, false/omit for top-level only.",
			usage: "true or false",
			type: "boolean",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "list_files",
	description: "[LIST_FILES_CONTRACT]\n- PURPOSE: List directory contents. BANNED: Creation confirmation checks.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: "Directory path to list.",
		},
		{
			name: "recursive",
			required: false,
			instruction: "Boolean: true for recursive listing, false/omit for top-level only.",
			type: "boolean",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const list_files_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN]
