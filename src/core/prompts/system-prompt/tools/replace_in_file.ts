import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"
import { SystemPromptContext, TASK_PROGRESS_PARAMETER } from "../types"

const id = DietCodeDefaultTool.FILE_EDIT

const getOpenOrVisibleTabPaths = (context: SystemPromptContext) => {
	return [...(context.editorTabs?.open ?? []), ...(context.editorTabs?.visible ?? [])]
}

const shouldIncludeNotebookInstructions = (context: SystemPromptContext) => {
	return getOpenOrVisibleTabPaths(context).some((p) => p.endsWith(".ipynb"))
}

const BASE_DIFF_INSTRUCTIONS = `[DIFF_CONTRACT]
Format:
------- SEARCH
[exact content to find]
=======
[new content to replace with]
+++++++ REPLACE

Rules:
1. SEARCH block must match file section EXACTLY (character-for-character, whitespace, indentation).
2. Order multiple blocks top-to-bottom as they appear in the file.
3. Keep SEARCH blocks concise to unique lines only. No mid-line truncations.
4. Delete code: Empty REPLACE block. Move code: Delete + insert block.`

const NOTEBOOK_INSTRUCTIONS = `
  5. For Jupyter Notebook (.ipynb) files:
     * Match the exact JSON structure including quotes, commas, and \\n characters
     * Each line in "source" array (except last) must end with "\\n"
     * Each source line is a separate JSON string in the array
     * Example SEARCH block for notebook:
       ------- SEARCH
         "source": [
           "x = 10\\n",
           "print(x)"
         ]
       =======
         "source": [
           "x = 100\\n",
           "print(x)"
         ]
       +++++++ REPLACE`

const diffInstruction = (context: SystemPromptContext) => {
	return shouldIncludeNotebookInstructions(context) ? BASE_DIFF_INSTRUCTIONS + NOTEBOOK_INSTRUCTIONS : BASE_DIFF_INSTRUCTIONS
}

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "replace_in_file",
	description:
		"Request to replace sections of content in an existing file using SEARCH/REPLACE blocks that define exact changes to specific parts of the file. This tool should be used when you need to make targeted changes to specific parts of a file.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `The path of the file to modify (relative to the current working directory {{CWD}})`,
			usage: "File path here",
		},
		{
			name: "diff",
			required: true,
			instruction: diffInstruction,
			usage: "Search and replace blocks here",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id,
	name: "replace_in_file",
	description:
		"[IMPORTANT: Always output the path first] Request to replace sections of content in an existing file using SEARCH/REPLACE blocks that define exact changes to specific parts of the file. This tool should be used when you need to make targeted changes to specific parts of a file.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `The path of the file to modify (relative to the current working directory {{CWD}})`,
		},
		{
			name: "diff",
			required: true,
			instruction: diffInstruction,
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const replace_in_file_variants = [generic, NATIVE_NEXT_GEN, NATIVE_GPT_5]
