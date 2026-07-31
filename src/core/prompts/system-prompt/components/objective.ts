import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getObjectiveTemplateText = (context: SystemPromptContext) =>
	`[OBJECTIVE_CONTRACT]
- ITERATIVE_EXECUTION: Accomplish task sequentially. Analyze environment_details file structure and evaluate required vs inferred tool parameters inside <thinking></thinking> tags before tool use.
- PARAMETER_POLICY: Missing required parameters -> DO NOT call tool${context.yoloModeToggled !== true ? " (use ask_followup_question to request missing values)" : ""}. Do not ask for optional parameters if missing.
- ATTEMPT_COMPLETION_FUNNEL: attempt_completion is the sole authoritative funnel. Verify requirements & output files exist before completing. Never end completion results with questions/conversational offers.`

export async function getObjectiveSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.OBJECTIVE]?.template || getObjectiveTemplateText

	return new TemplateEngine().resolve(template, context, {})
}
