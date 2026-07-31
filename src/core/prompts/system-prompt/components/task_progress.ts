import { ModelFamily } from "@/shared/prompts"
import { PromptVariant, SystemPromptContext, SystemPromptSection, TemplateEngine } from ".."

const UPDATING_TASK_PROGRESS = `[TASK_PROGRESS_CONTRACT]
- EXECUTION: Pass task_progress parameter silently in tool calls (do not announce to user).
- FORMAT: Standard Markdown checklist format ("- [ ]" for open, "- [x]" for done).
- SCOPE: Focus on milestone achievements. Avoid excessive micro-granularity.
- MANDATORY_FINAL_ITEM: Final item MUST be "- [ ] Finalize Knowledge Ledger via run_finalization [Same-session]".`

const UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN = `[TASK_PROGRESS_CONTRACT]
- EXECUTION: Pass task_progress parameter silently as a separate parameter in tool calls.
- FORMAT: Standard Markdown checklist format ("- [ ]" for open, "- [x]" for done).
- SCOPE: Focus on milestone achievements.
- MANDATORY_FINAL_ITEM: Final item MUST be "- [ ] Finalize Knowledge Ledger via run_finalization [Same-session]".`

const UPDATING_TASK_PROGRESS_NATIVE_GPT5 = `[TASK_PROGRESS_CONTRACT]
- EXECUTION: Pass task_progress parameter silently as a separate parameter in tool calls.
- FORMAT: Standard Markdown checklist format ("- [ ]" for open, "- [x]" for done).
- SCOPE: Focus on milestone achievements.
- MANDATORY_FINAL_ITEM: Final item MUST be "- [ ] Finalize Knowledge Ledger via run_finalization [Same-session]".`

export async function getUpdatingTaskProgress(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	if (!context.focusChainSettings?.enabled) {
		return undefined
	}

	// Check for component override first
	if (variant.componentOverrides?.[SystemPromptSection.TASK_PROGRESS]?.template) {
		const template = variant.componentOverrides[SystemPromptSection.TASK_PROGRESS].template
		return new TemplateEngine().resolve(template, context, {})
	}

	// Select template based on model family
	let template = UPDATING_TASK_PROGRESS
	if (variant.id === ModelFamily.NATIVE_NEXT_GEN) {
		template = UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN
	}
	if (variant.id === ModelFamily.NATIVE_GPT_5) {
		template = UPDATING_TASK_PROGRESS_NATIVE_GPT5
	}

	return new TemplateEngine().resolve(template, context, {})
}
