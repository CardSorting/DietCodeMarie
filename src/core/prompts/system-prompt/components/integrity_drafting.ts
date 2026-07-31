import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getIntegrityDraftingTemplateText = () => `[INTEGRITY_DRAFTING_CONTRACT]

- SCRATCHPAD_REQUIREMENT: Write physical scratchpad.md via write_to_file tool. Do NOT use internal <scratchpad> tags or thinking blocks.
- GROUNDED_TRIAD_AUDIT: Process every plan through 3 probes with cited file paths/evidence:
  1. THE ARCHITECT (Boundary Probe): Vulnerability, JoyZoning boundary compliance proof.
  2. THE CRITIC (Assumption Probe): Dangerous assumption, specific architectural fix/guardrail.
  3. THE SRE (Atomic Probe): Partial failure path, concrete atomic recovery logic & error boundaries.
- QUALITY_STANDARDS: Cite specific file paths (src/...) | Substantive depth | Concrete failure recovery path.
- AUDIT_TEMPLATE: Header # INTEGRITY AUDIT: [Task] | Probes (Architect, Critic, SRE) | Final Resolution (Synthesis & MANTRA: "Double down on this concept, audit and revise in its entirety").
- ACT_TRANSITION: Update implementation_plan.md -> Call plan_mode_respond immediately after final resolution.`

export async function getIntegrityDraftingSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = getIntegrityDraftingTemplateText()
	return new TemplateEngine().resolve(template, context, {})
}
