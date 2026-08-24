import { ApiConfiguration, ModelInfo, openRouterDefaultModelId } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"

export function validateApiConfiguration(currentMode: Mode, apiConfiguration?: ApiConfiguration): string | undefined {
	if (!apiConfiguration) {
		return undefined
	}

	const { apiProvider } = getModeSpecificFields(apiConfiguration, currentMode)

	switch (apiProvider) {
		case "openai-codex":
			// Authentication is handled via OAuth, not API key
			break
		case "openrouter":
			if (!apiConfiguration.openRouterApiKey) {
				return "You must provide a valid API key or choose a different provider."
			}
			break
	}

	return undefined
}

export function validateModelId(
	currentMode: Mode,
	apiConfiguration?: ApiConfiguration,
	openRouterModels?: Record<string, ModelInfo>,
): string | undefined {
	if (!apiConfiguration) {
		return undefined
	}

	const { apiProvider, openRouterModelId } = getModeSpecificFields(apiConfiguration, currentMode)

	if (apiProvider === "openrouter") {
		const modelId = openRouterModelId || openRouterDefaultModelId
		if (!modelId) {
			return "You must provide a model ID."
		}
		if (openRouterModels && !Object.keys(openRouterModels).includes(modelId)) {
			return "The model ID you provided is not available. Please choose a different model."
		}
	}

	return undefined
}
