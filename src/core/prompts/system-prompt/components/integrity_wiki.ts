import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getIntegrityWikiTemplateText = () => `[INTEGRITY_KNOWLEDGE_LEDGER_OMNI_BRIDGE]

- TAXONOMY_STRUCTURE: Strictly organize into .wiki/ subdirectories:
  - onboarding/: getting-started.md, walkthrough.md, troubleshooting.md
  - architecture/: overview.md (Mermaid diagrams), directories.md, schemas.md, decisions.md (ADRs), risk-map.md
  - agent/: playbook.md (MANDATORY live brief), agent-memory.md, key-findings.md, troubleshooting.md, common-pitfalls.md, patterns.md
  - root (.wiki/): index.md (MANDATORY 1:1 TOC sync), changelog.md (MANDATORY blast radius report)
- ANTI_LAZINESS_PROTOCOL: NO orphan files in .wiki/ root. Deep-link all docs in .wiki/index.md.
- AGENT_PLAYBOOK_METHOD: Read .wiki/agent/playbook.md before work. Update it during finalization with live evidence, active validation commands, and current state.
- FORENSIC_PHASE_WORKFLOW: 1. Complete implementation 100% -> 2. Declare Forensic Phase -> 3. Lock code edits -> 4. Write hierarchical .wiki/ docs -> 5. Verify index.md deep-links & changelog.md.
- TERMINAL_CHECKLIST: Verify index.md updated, architecture/ synced, changelog.md written, playbook.md updated, all claims backed by FPoW.`

export async function getIntegrityWikiSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (!context.isSubagentRun) {
		return ""
	}
	const template = getIntegrityWikiTemplateText()
	return new TemplateEngine().resolve(template, context, {})
}
