import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getForensicToolsTemplateText = () => `[FORENSIC_TOOLS_CONTRACT]

- DIAGNOSTIC_ENGINE: Use \`npx tsx scripts/agent-spider.ts [cmd]\` for physical reality verification:
  - status (Node Count / Substrate Entropy) | blast-radius <file> | deps <file> | conflicts | verify-graph | find-symbol <symbol> | seed / re-seed.
- PATTERN: Map then verify (project_map/spider -> physical grep/read verification).
- REPORTING: Ground claims in literal tool evidence (FPoW). Do not invent metrics.`

export async function getForensicToolsSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (!context.isSubagentRun) {
		return ""
	}
	const template = getForensicToolsTemplateText()
	return new TemplateEngine().resolve(template, context, {})
}
