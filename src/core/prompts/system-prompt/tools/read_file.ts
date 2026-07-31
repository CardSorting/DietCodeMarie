import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const id = DietCodeDefaultTool.FILE_READ

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "read_file",
	description:
		"[READ_FILE_CONTRACT]\n- PURPOSE: Read contents of file at specified path. Auto-extracts PDF/DOCX text. DO NOT use on directories.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `File path to read (relative to {{CWD}}){{MULTI_ROOT_HINT}}.`,
			usage: "File path here",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "read_file",
	description:
		"[READ_FILE_CONTRACT]\n- PURPOSE: Read file contents at path. Auto-extracts PDF/DOCX. DO NOT use on directories.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `File path to read (relative to {{CWD}}){{MULTI_ROOT_HINT}}.`,
			usage: "File path here",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const read_file_variants = [generic, NATIVE_NEXT_GEN, NATIVE_GPT_5]
