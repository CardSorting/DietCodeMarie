import type { ModelInfo } from "@shared/api"
import { OpenRouterCompatibleModelInfo } from "@shared/proto/dietcode/models"
import { StateManager } from "@/core/storage/StateManager"
import { buildExternalBasicHeaders } from "@/services/EnvUtils"
import { fetch } from "@/shared/net"
import { toProtobufModels } from "@/shared/proto-conversions/models/typeConversion"
import { Logger } from "@/shared/services/Logger"
import { sendLiteLlmModelsEvent } from "./subscribeToLiteLlmModels"

interface LiteLlmModelInfoResponse {
	data: Array<{
		model_name: string
		litellm_params: {
			model: string
			[key: string]: any
		}
		model_info: {
			input_cost_per_token: number
			output_cost_per_token: number
			max_output_tokens?: number
			max_tokens?: number
			max_input_tokens?: number
			cache_creation_input_token_cost?: number
			cache_read_input_token_cost?: number
			supports_prompt_caching?: boolean
			supports_vision?: boolean
			supports_reasoning?: boolean
			[key: string]: any
		}
	}>
}

async function fetchLiteLlmModelsInfo(baseUrl: string, apiKey: string): Promise<LiteLlmModelInfoResponse | undefined> {
	const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`
	const url = `${normalizedBaseUrl}/model/info`

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				accept: "application/json",
				"x-litellm-api-key": apiKey,
				...buildExternalBasicHeaders(),
			},
		})

		if (response.ok) {
			const data: LiteLlmModelInfoResponse = await response.json()
			return data
		}
		return undefined
	} catch {
		return undefined
	}
}

/**
 * Core function: Refreshes the LiteLLM models and returns application types
 * @param controller The controller instance
 * @returns Record of model ID to ModelInfo (application types)
 */
export async function refreshLiteLlmModels(): Promise<Record<string, ModelInfo>> {
	const models: Record<string, ModelInfo> = {}

	const stateManager = StateManager.get()

	try {
		// Get the LiteLLM configuration
		const apiConfiguration = stateManager.getApiConfiguration()
		const baseUrl = apiConfiguration.liteLlmBaseUrl || "http://localhost:4000"
		const apiKey = apiConfiguration.liteLlmApiKey

		if (!apiKey) {
			throw new Error("LiteLLM API key is not configured or is invalid")
		}

		// Use the shared utility function to fetch model info
		const data = await fetchLiteLlmModelsInfo(baseUrl, apiKey)

		if (data?.data) {
			for (const rawModel of data.data) {
				const modelInfo: ModelInfo = {
					name: rawModel.model_name,
					maxTokens: rawModel.model_info?.max_output_tokens ?? rawModel.model_info?.max_tokens ?? 4096,
					contextWindow: rawModel.model_info?.max_input_tokens ?? rawModel.model_info?.max_tokens ?? 8192,
					supportsImages: rawModel.model_info?.supports_vision ?? false,
					supportsPromptCache: rawModel.model_info?.supports_prompt_caching ?? false,
					supportsReasoning: rawModel.model_info?.supports_reasoning ?? false,
					inputPrice: rawModel.model_info?.input_cost_per_token
						? rawModel.model_info.input_cost_per_token * 1_000_000
						: 0,
					outputPrice: rawModel.model_info?.output_cost_per_token
						? rawModel.model_info.output_cost_per_token * 1_000_000
						: 0,
					cacheWritesPrice: rawModel.model_info?.cache_creation_input_token_cost
						? rawModel.model_info.cache_creation_input_token_cost * 1_000_000
						: undefined,
					cacheReadsPrice: rawModel.model_info?.cache_read_input_token_cost
						? rawModel.model_info.cache_read_input_token_cost * 1_000_000
						: undefined,
					description: undefined,
				}

				// Use litellm_params.model as the key since that's the actual model ID users select
				// model_name may not include the region prefix (e.g., "us." for Bedrock models)
				if (rawModel.litellm_params?.model) {
					models[rawModel.litellm_params?.model] = modelInfo
				}
				models[rawModel.model_name] = modelInfo
			}
		}
	} catch (error) {
		Logger.error("Error fetching LiteLLM models:", error)
		throw error
	}

	// Store in StateManager's in-memory cache
	StateManager.get().setModelsCache("liteLlm", models)

	// Send event to subscribers
	try {
		await sendLiteLlmModelsEvent(
			OpenRouterCompatibleModelInfo.create({
				models: toProtobufModels(models),
			}),
		)
	} catch (error) {
		Logger.error("Error sending LiteLLM models event:", error)
	}

	return models
}
