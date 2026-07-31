import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

/**
 * ## write_to_file
Description: Request to write content to a file at the specified path. If the file exists, it will be overwritten with the provided content. If the file doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.
Parameters:
- path: (required) The path of the file to write to (relative to the current working directory ${cwd.toPosix()})
- content: (required) The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions. You MUST include ALL parts of the file, even if they haven't been modified.
${focusChainSettings.enabled ? `- task_progress: (optional) A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)` : "" }
Usage:
<write_to_file>
<path>File path here</path>
<content>
Your file content here
</content>
${focusChainSettings.enabled ? `<task_progress>
Checklist here (optional)
</task_progress>` : "" }
</write_to_file>
 */

const id = DietCodeDefaultTool.FILE_NEW

const GENERIC: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "write_to_file",
	description:
		"[WRITE_TO_FILE_CONTRACT]\n- PURPOSE: Create new file or overwrite existing file with complete final content. Auto-creates parent directories.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `File path relative to working directory ({{CWD}}){{MULTI_ROOT_HINT}}.`,
			usage: "File path here",
		},
		{
			name: "content",
			required: true,
			instruction: "COMPLETE intended content without truncation or omissions.",
			usage: "Your file content here",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id,
	name: "write_to_file",
	description: "[WRITE_TO_FILE_CONTRACT]\n- PURPOSE: Write complete content to file path (auto-creates directories).",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: "File path to write to (relative or absolute).",
		},
		{
			name: "content",
			required: true,
			instruction: "Complete file content to write.",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const write_to_file_variants = [GENERIC, NATIVE_NEXT_GEN, NATIVE_GPT_5]
