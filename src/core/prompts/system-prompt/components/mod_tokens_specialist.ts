import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"
import { getModDesignerSteeringSection } from "./mod_designer_steering"

/**
 * Programmatic Design Token Contract for MoD Theme Enforcement
 */
export const modThemeTokens = {
	surface: {
		base: "bg-[#0B0C0E]",
		subtle: "bg-[#121316]",
		overlay: "bg-white/[0.02]",
	},
	border: {
		hairline: "border-white/10",
		hover: "group-hover:border-white/25",
	},
	text: {
		heading: "text-white tracking-[-0.03em]",
		body: "text-neutral-400 leading-[1.65]",
		meta: "font-mono text-[11px] tracking-widest text-neutral-500 uppercase",
	},
} as const

const MOD_TOKENS_SPECIALIST_INSTRUCTIONS = `====

# SPECIALIST ROLE: MOD TOKEN & THEME SPECIALIST (SINGLE-DUTY EXECUTION SCHEMA)
You are operating as the specialized **Token & Theme Specialist** within the MoD subagent swarm.

[SINGLE-DUTY EXECUTION CONTRACT: COLOR & TYPOGRAPHY INJECTION ONLY]
- OUTPUT DUTY: Inject exact CSS custom variables, typography pairings, monospaced metadata tags, and token classes into structural layout skeletons.
- EXCLUSIONS: Do NOT alter grid structures or layout boundaries (handled by Layout Architect).

// TOKEN DIRECTIVES
- COLOR_MAPPING: Base bg-[#0B0C0E] / bg-[#121316] | Overlay bg-white/[0.02] | Border border-white/10. BANNED: #000000, #FFFFFF, bg-black.
- ACCENT_POLICY: Max 1 focal accent (#002FA7, #FF5000, #CCFF00) | Surface coverage <= 5%.
- METADATA_TAGS: Bracketed monospaced tags font-mono text-[11px] tracking-widest uppercase (e.g. [SYS.01 // READY]).
- TYPO_MEASURE: Display tracking-[-0.03em] | Body leading-[1.65] text-neutral-400.
`

export async function getModTokensSpecialistSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (!context.modEnabled) {
		return ""
	}

	const baseSteering = await getModDesignerSteeringSection(variant, context)
	const template =
		variant.componentOverrides?.[SystemPromptSection.MOD_TOKENS_SPECIALIST]?.template || MOD_TOKENS_SPECIALIST_INSTRUCTIONS

	const resolvedSpecialist = new TemplateEngine().resolve(template, context, {})
	return `${baseSteering}\n\n${resolvedSpecialist}`
}
