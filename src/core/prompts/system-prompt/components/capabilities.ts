import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getCapabilitiesTemplateText = (context: SystemPromptContext) => `[SYSTEM_CAPABILITIES_DIRECTIVES]

// AVAILABLE TOOLSUITE
- CORE_TOOLS: Execute CLI commands, list files, view code definitions, regex search{{BROWSER_SUPPORT}}, read/edit files${context.yoloModeToggled !== true ? ", ask followup questions" : ""}.
- PROJECT_MAP: Use first in Plan Mode for existing codebases to discover starting files, connected modules, and risk areas. Verify suggestions with search_files/read_file.
- FILE_EXPLORATION: Initial environment_details contains recursive filetree of '{{CWD}}'. Use list_files (recursive=true) for external directories.
- CODE_DEFINITIONS: Use list_code_definition_names to inspect top-level definitions and module structure across target directories.
- CLI_EXECUTION: Explain command intent | Prefer non-interactive flags (--no-pager, -y) | Redirect 2>&1 on uncertain commands | Each command runs in isolated terminal instance.
- MCP_SERVERS: Access external MCP tools/resources sequentially with confirmation.{{BROWSER_CAPABILITIES}}{{WEB_TOOLS_CAPABILITIES}}`

export async function getCapabilitiesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.CAPABILITIES]?.template || getCapabilitiesTemplateText

	const browserSupport = context.supportsBrowserUse ? ", browser actions" : ""
	const browserCapabilities = context.supportsBrowserUse
		? `\n- BROWSER_ACTION: Interact with web applications and local dev servers via Puppeteer browser (clicks, inputs, screenshots, console logs).`
		: ""

	const webToolsCapabilities =
		context.providerInfo.providerId === "dietcode" && context.dietcodeWebToolsEnabled === true
			? `\n- WEB_TOOLS: Use web_search for current web information and web_fetch to retrieve content from URLs.`
			: ""

	const templateEngine = new TemplateEngine()
	return templateEngine.resolve(template, context, {
		BROWSER_SUPPORT: browserSupport,
		BROWSER_CAPABILITIES: browserCapabilities,
		WEB_TOOLS_CAPABILITIES: webToolsCapabilities,
		CWD: context.cwd || process.cwd(),
	})
}
