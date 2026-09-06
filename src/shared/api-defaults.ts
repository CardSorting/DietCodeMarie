import type { ApiProvider, ModelInfo } from "./api"

/**
 * Small, chat-safe provider defaults. Keep these separate from api.ts so the
 * webview shell does not parse the complete model catalog just to render the
 * composer.
 */
export const DEFAULT_API_PROVIDER: ApiProvider = "openrouter"

export const openRouterDefaultModelId = "anthropic/claude-sonnet-4.5"
export const openRouterDefaultModelInfo: ModelInfo = {
	maxTokens: 64_000,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description:
		"Claude Sonnet 4.5 delivers superior intelligence across coding, agentic search, and AI agent capabilities. It's a powerful choice for agentic coding, and can complete tasks across the entire software development lifecycle, from initial planning to bug fixes, maintenance to large refactors. It offers strong performance in both planning and solving for complex coding tasks, making it an ideal choice to power end-to-end software development processes.\n\nRead more in the [blog post here](https://www.anthropic.com/claude/sonnet)",
}

export const requestyDefaultModelId = "anthropic/claude-3-7-sonnet-latest"
export const requestyDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description: "Anthropic's most intelligent model. Highest level of intelligence and capability.",
}

export const galxDefaultBaseUrl = "https://galx.ai/v1"
export const galxDefaultModelId = "gpt-5.6-sol"
export const galxDefaultModelInfo: ModelInfo = {
	name: "OpenAI Codex GPT-5.6 Sol (Flagship SOTA)",
	maxTokens: 128_000,
	contextWindow: 900_000,
	supportsImages: true,
	supportsPromptCache: true,
	supportsReasoning: true,
	inputPrice: 3.75,
	outputPrice: 15.0,
	cacheReadsPrice: 1.25,
	description:
		"Flagship coding, deep mathematics, algorithmic reasoning, and multi-file architecture with 25% wholesale discount and 75% prompt cache pass-through.",
}
