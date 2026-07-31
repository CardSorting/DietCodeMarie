import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getActVsPlanModeTemplateText = (_context: SystemPromptContext) => `[MODE_EXECUTION_CONTRACT]

- MODE_OVERVIEW: System manages PLAN/ACT mode transitions automatically based on environment_details.
- ACT_MODE: Execute tasks directly with all available tools. Complete with attempt_completion.
- PLAN_MODE: Gather context, explore codebase, architect detailed plan.
  - Existing Codebase Workflow: project_map first -> Fact Check (search_files/read_file) -> Plan.
  - Sovereign Drafting Requirement: Draft in scratchpad.md using Triad Audit (Architect, Critic, SRE) with verifiable evidence.
  - Final Plan Delivery: Call plan_mode_respond with finished plan. System automatically transitions to ACT_MODE.
  - Scope Pivots: If user redirects scope in ACT_MODE, system transitions back to PLAN_MODE automatically.${_context.yoloModeToggled === true ? " (YOLO_MODE: Tasks start directly in ACT_MODE, skipping plan phase.)" : ""}`

export async function getActVsPlanModeSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.ACT_VS_PLAN]?.template || getActVsPlanModeTemplateText

	return new TemplateEngine().resolve(template, context, {})
}
