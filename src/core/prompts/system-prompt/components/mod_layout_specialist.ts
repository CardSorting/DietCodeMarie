import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"
import { getModDesignerSteeringSection } from "./mod_designer_steering"

const MOD_LAYOUT_SPECIALIST_INSTRUCTIONS = `====

# SPECIALIST ROLE: MOD LAYOUT ARCHITECT (SINGLE-DUTY EXECUTION SCHEMA)
You are operating as the specialized **Layout Architect** within the MoD subagent swarm.

[SINGLE-DUTY EXECUTION CONTRACT: STRUCTURE & SPATIAL RHYTHM ONLY]
- OUTPUT DUTY: Return ONLY structural JSX/HTML skeletons with asymmetrical grid spans, measure constraints, and hairline dividers.
- EXCLUSIONS: Do NOT apply color utilities, text colors, or motion keyframes (handed off to Token and Motion specialists).

// SPATIAL DIRECTIVES
- ASYMMETRICAL_GRIDS: Enforce 5-col split (lg:col-span-2 sidebar / lg:col-span-3 stage) or 7-col split. BANNED: Uniform grid-cols-3.
- BOUNDARY_DIVIDERS: Hairline borders ONLY (border-r border-white/10, divide-y divide-white/10). BANNED: shadow-2xl.
- MEASURE_LIMITS: Max 50-75 chars per line (max-w-prose). Sticky sidebar boundaries (sticky top-6).
- RADII_CAP: rounded-none | rounded-sm | rounded-md. BANNED: rounded-2xl / rounded-3xl.
`

export async function getModLayoutSpecialistSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (!context.modEnabled) {
		return ""
	}

	const baseSteering = await getModDesignerSteeringSection(variant, context)
	const template =
		variant.componentOverrides?.[SystemPromptSection.MOD_LAYOUT_SPECIALIST]?.template || MOD_LAYOUT_SPECIALIST_INSTRUCTIONS

	const resolvedSpecialist = new TemplateEngine().resolve(template, context, {})
	return `${baseSteering}\n\n${resolvedSpecialist}`
}
