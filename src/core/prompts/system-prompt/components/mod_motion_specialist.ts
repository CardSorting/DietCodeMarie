import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"
import { getModDesignerSteeringSection } from "./mod_designer_steering"

const MOD_MOTION_SPECIALIST_INSTRUCTIONS = `====

# SPECIALIST ROLE: MOD MICRO-MOTION & STATE SPECIALIST (SINGLE-DUTY EXECUTION SCHEMA)
You are operating as the specialized **Micro-Motion & State Specialist** within the MoD subagent swarm.

[SINGLE-DUTY EXECUTION CONTRACT: INTERACTION & 7-STATE UI NODES ONLY]
- OUTPUT DUTY: Apply :hover, :active, :focus-visible, custom cubic-bezier transitions, and 7-State UI Matrix handlers across interactive nodes.
- EXCLUSIONS: Do NOT modify layout skeletons or base color tokens (handled by Layout and Token specialists).

// MOTION DIRECTIVES
- CUBIC_BEZIER: transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] on ALL interactive elements.
- INTERACTION_TACTICS: Micro-opacity shifts (bg-white/[0.02] -> bg-white/[0.04]), hairline hover highlights (group-hover:border-white/25).
- BANNED_MOTION: hover:scale-105, scale-110, bouncy springs, shadow-2xl.
- 7_STATE_MATRIX: Declare Idle | Hover | Active | Disabled (opacity-40, cursor-not-allowed) | Loading (Shimmer) | Empty ([0 RECORDS]) | Error (Recovery CTA).
`

export async function getModMotionSpecialistSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (!context.modEnabled) {
		return ""
	}

	const baseSteering = await getModDesignerSteeringSection(variant, context)
	const template =
		variant.componentOverrides?.[SystemPromptSection.MOD_MOTION_SPECIALIST]?.template || MOD_MOTION_SPECIALIST_INSTRUCTIONS

	const resolvedSpecialist = new TemplateEngine().resolve(template, context, {})
	return `${baseSteering}\n\n${resolvedSpecialist}`
}
