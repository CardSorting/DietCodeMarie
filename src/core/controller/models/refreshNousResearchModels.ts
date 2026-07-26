import type { IController as Controller } from "@core/controller/types"
import { ensureCacheDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { ModelInfo, nousResearchModels } from "@shared/api"
import { fileExistsAtPath } from "@utils/fs"
import axios from "axios"
import fs from "fs/promises"
import path from "path"
import { StateManager } from "@/core/storage/StateManager"
import { telemetryService } from "@/services/telemetry"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"

// Track pending refresh promise to prevent duplicate concurrent fetches
let pendingRefresh: Promise<Record<string, ModelInfo>> | null = null

/**
 * Refreshes the NousResearch models by fetching from their API endpoint
 * @param controller The controller instance
 * @returns Record of model ID to ModelInfo
 */
export async function refreshNousResearchModels(controller: Controller): Promise<Record<string, ModelInfo>> {
	// Check in-memory cache first
	const cache = StateManager.get().getModelsCache("nousResearch")
	if (cache) {
		return cache
	}

	// If a fetch is already in progress, return the same promise
	if (pendingRefresh) {
		return pendingRefresh
	}

	// Start new fetch and track the promise
	pendingRefresh = (async () => {
		try {
			return await fetchAndCacheModels(controller)
		} finally {
			// Clear pending promise when done
			pendingRefresh = null
		}
	})()

	return pendingRefresh
}

async function fetchAndCacheModels(controller: Controller): Promise<Record<string, ModelInfo>> {
	const filePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.nousResearchModels)
	const apiKey = controller.stateManager.getSecretKey("nousResearchApiKey")

	let models: Record<string, Partial<ModelInfo>> = {}

	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"User-Agent": "DietCode-VSCode-Extension",
		}
		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey.trim()}`
		}

		Logger.log("Fetching NousResearch models from API...")

		const response = await axios.get("https://inference-api.nousresearch.com/v1/models", {
			headers,
			timeout: 10000,
			...getAxiosSettings(),
		})

		const rawModels = Array.isArray(response.data) ? response.data : response.data?.data
		if (Array.isArray(rawModels) && rawModels.length > 0) {
			for (const rawModel of rawModels) {
				if (!rawModel || typeof rawModel !== "object" || !rawModel.id) {
					continue
				}

				const modelId = String(rawModel.id)
				const staticModelInfo = nousResearchModels[modelId as keyof typeof nousResearchModels]

				// Parse per-token pricing to per-million-tokens pricing (* 1,000,000)
				const parsePrice = (val: unknown): number | undefined => {
					if (val === undefined || val === null) return undefined
					const num = typeof val === "number" ? val : Number.parseFloat(String(val))
					return Number.isNaN(num) ? undefined : num * 1_000_000
				}

				const pricing = rawModel.pricing || {}
				const topProvider = rawModel.top_provider || {}
				const architecture = rawModel.architecture || {}
				const supportedParams = Array.isArray(rawModel.supported_parameters) ? rawModel.supported_parameters : []
				const inputModalities = Array.isArray(architecture.input_modalities) ? architecture.input_modalities : []

				const inputPrice = parsePrice(pricing.prompt) ?? staticModelInfo?.inputPrice ?? 0
				const outputPrice = parsePrice(pricing.completion) ?? staticModelInfo?.outputPrice ?? 0
				const cacheWritesPrice = parsePrice(pricing.input_cache_write) ?? (staticModelInfo as any)?.cacheWritesPrice ?? 0
				const cacheReadsPrice = parsePrice(pricing.input_cache_read) ?? (staticModelInfo as any)?.cacheReadsPrice ?? 0

				const maxTokens =
					rawModel.max_completion_tokens || topProvider.max_completion_tokens || staticModelInfo?.maxTokens || 8192

				const contextWindow =
					rawModel.context_length || topProvider.context_length || staticModelInfo?.contextWindow || 128_000

				const supportsImages =
					inputModalities.includes("image") ||
					modelId.toLowerCase().includes("vision") ||
					staticModelInfo?.supportsImages ||
					false

				const supportsPromptCache =
					cacheReadsPrice > 0 ||
					cacheWritesPrice > 0 ||
					supportedParams.includes("prompt_cache_key") ||
					staticModelInfo?.supportsPromptCache ||
					false

				const supportsReasoning =
					!!rawModel.reasoning ||
					supportedParams.includes("reasoning") ||
					supportedParams.includes("include_reasoning") ||
					supportedParams.includes("reasoning_effort") ||
					(staticModelInfo as any)?.supportsReasoning ||
					false

				const modelInfo: Partial<ModelInfo> = {
					name: rawModel.name || modelId,
					maxTokens,
					contextWindow,
					supportsImages,
					supportsPromptCache,
					supportsReasoning,
					inputPrice,
					outputPrice,
					cacheWritesPrice,
					cacheReadsPrice,
					description:
						rawModel.description || staticModelInfo?.description || `${rawModel.name || modelId} via Nous Research`,
				}

				models[modelId] = modelInfo
			}

			await fs.writeFile(filePath, JSON.stringify(models))
			Logger.log(`NousResearch models fetched and saved (${Object.keys(models).length} models)`)
		} else {
			Logger.error("Invalid response from NousResearch API")
		}
	} catch (error) {
		Logger.error("Error fetching NousResearch models:", error)

		let errorMessage = "Unknown error occurred"
		if (axios.isAxiosError(error)) {
			errorMessage = `API request failed: ${error.response?.status || error.code || "Unknown error"}`
		} else if (error instanceof Error) {
			errorMessage = error.message
		}

		telemetryService.captureProviderApiError({
			ulid: controller.task?.ulid || "",
			errorMessage,
			model: "nousResearch",
		})

		// Try loading cached models from disk
		const cachedModels = await readNousResearchModels()
		if (cachedModels && Object.keys(cachedModels).length > 0) {
			Logger.log("Using cached NousResearch models from disk")
			models = cachedModels
		} else {
			// Fallback to static models from shared/api.ts
			Logger.log("Using static NousResearch models as fallback")
			for (const [mId, mInfo] of Object.entries(nousResearchModels)) {
				models[mId] = { ...mInfo }
			}
		}
	}

	const typedModels: Record<string, ModelInfo> = {}
	for (const [key, model] of Object.entries(models)) {
		typedModels[key] = {
			name: model.name || key,
			maxTokens: model.maxTokens ?? 8192,
			contextWindow: model.contextWindow ?? 128_000,
			supportsImages: model.supportsImages ?? false,
			supportsPromptCache: model.supportsPromptCache ?? false,
			supportsReasoning: model.supportsReasoning ?? false,
			inputPrice: model.inputPrice ?? 0,
			outputPrice: model.outputPrice ?? 0,
			cacheWritesPrice: model.cacheWritesPrice ?? 0,
			cacheReadsPrice: model.cacheReadsPrice ?? 0,
			description: model.description ?? "",
		}
	}

	// Save to StateManager in-memory cache
	StateManager.get().setModelsCache("nousResearch", typedModels)

	return typedModels
}

async function readNousResearchModels(): Promise<Record<string, Partial<ModelInfo>> | undefined> {
	const filePath = path.join(await ensureCacheDirectoryExists(), GlobalFileNames.nousResearchModels)
	const fileExists = await fileExistsAtPath(filePath)
	if (fileExists) {
		try {
			const fileContents = await fs.readFile(filePath, "utf8")
			return JSON.parse(fileContents)
		} catch (error) {
			Logger.error("Error reading cached NousResearch models:", error)
			return undefined
		}
	}
	return undefined
}
