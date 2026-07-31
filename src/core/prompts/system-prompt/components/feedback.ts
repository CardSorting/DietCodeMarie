import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const FEEDBACK_TEMPLATE_TEXT = `[FEEDBACK_CONTRACT]
- REPORTING: Direct users to submit issues via /reportbug slash command in chat.
- DOCS_SEARCH: For product/capability queries ("can DietCode do..."), use web_fetch on https://docs.dietcode.bot (subpages: getting-started, model-selection, features, task-management, prompt-engineering, dietcode-tools, mcp, enterprise, more-info).`

export async function getFeedbackSection(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	if (!context.focusChainSettings?.enabled) {
		return undefined
	}

	const template = variant.componentOverrides?.[SystemPromptSection.FEEDBACK]?.template || FEEDBACK_TEMPLATE_TEXT

	return new TemplateEngine().resolve(template, context, {})
}
