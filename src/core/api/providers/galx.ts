import { galxDefaultBaseUrl, galxDefaultModelId, galxDefaultModelInfo, galxModels, ModelInfo } from "@shared/api"
import OpenAI from "openai"
import type { ChatCompletionTool as OpenAITool } from "openai/resources/chat/completions"
import { broccoliTransportSubstrate } from "@/integrations/galx/BroccoliTransportSubstrate"
import { DietCodeStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { ToolCallProcessor } from "../transform/tool-call-processor"
import { ApiHandler, CommonApiHandlerOptions } from "../types"

export interface GalxHandlerOptions extends CommonApiHandlerOptions {
	galxApiKey?: string
	galxBaseUrl?: string
	galxModelId?: string
	galxModelInfo?: ModelInfo
	reasoningEffort?: string
	thinkingBudgetTokens?: number
}

/**
 * GalxHandler - Uses GALXAI Wholesale Compute Clearinghouse (OpenAI-compatible /v1 endpoints)
 */
export class GalxHandler implements ApiHandler {
	private options: GalxHandlerOptions
	private client: OpenAI | undefined

	constructor(options: GalxHandlerOptions) {
		this.options = options
	}

	private ensureClient(): OpenAI {
		if (!this.client) {
			if (!this.options.galxApiKey) {
				throw new Error("GALXAI API key is required. Please configure your key in Settings.")
			}
			try {
				const baseURL = (this.options.galxBaseUrl || galxDefaultBaseUrl || "https://galx.ai/v1").replace(/\/$/, "")
				this.client = createOpenAIClient({
					baseURL,
					apiKey: this.options.galxApiKey,
					defaultHeaders: {
						"X-GALX-Client": "LUMI/12.5.1",
						"X-GALX-Client-ID": "lumi-ide",
						"X-OpenRouter-Title": "LUMI",
					},
				})
			} catch (error: any) {
				throw new Error(`Error creating GALXAI client: ${error.message}`)
			}
		}
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: DietCodeStorageMessage[], tools?: OpenAITool[]): ApiStream {
		const client = this.ensureClient()
		const model = this.getModel()

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		const requestParams: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
			model: model.id,
			messages: openAiMessages,
			stream: true,
			stream_options: { include_usage: true },
		}

		if (tools && tools.length > 0) {
			requestParams.tools = tools
		}

		if (model.info.supportsReasoning && this.options.reasoningEffort) {
			;(requestParams as unknown as Record<string, unknown>).reasoning_effort = this.options.reasoningEffort
		}

		const activeAffinity = broccoliTransportSubstrate.getActiveSessionAffinity()
		const requestHeaders: Record<string, string> = {
			...(activeAffinity ? { "X-Galx-Session-Affinity": activeAffinity } : {}),
		}

		let stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>
		try {
			const responsePromise = client.chat.completions.create(requestParams, {
				headers: requestHeaders,
			})
			if (typeof (responsePromise as any).withResponse === "function") {
				const { data, response } = await (responsePromise as any).withResponse()
				const resAffinity =
					response?.headers?.get?.("x-galx-session-affinity") ||
					response?.headers?.get?.("X-Galx-Session-Affinity")
				if (resAffinity) {
					broccoliTransportSubstrate.setActiveSessionAffinity(resAffinity)
				}
				stream = data
			} else {
				stream = await responsePromise
			}
		} catch (error: unknown) {
			const err = error as any
			const errMsg = String(err?.message || "")
			const isAffinityError =
				err?.status === 429 ||
				err?.statusCode === 429 ||
				err?.status === 400 ||
				err?.status === 401 ||
				err?.status === 403 ||
				err?.status === 404 ||
				err?.status === 410 ||
				err?.status === 500 ||
				errMsg.includes("capacity_constrained") ||
				errMsg.includes("router_dispatch_failed") ||
				errMsg.includes("credential shards") ||
				errMsg.includes("pool_exhausted")

			if (isAffinityError && activeAffinity) {
				Logger.warn(
					`[GalxHandler] Session affinity constrained (${errMsg}). Evicting session route ticket and retrying with automatic failover...`,
				)
				broccoliTransportSubstrate.clearActiveSessionAffinity()
				try {
					const retryPromise = client.chat.completions.create(requestParams)
					if (typeof (retryPromise as any).withResponse === "function") {
						const { data, response } = await (retryPromise as any).withResponse()
						const resAffinity =
							response?.headers?.get?.("x-galx-session-affinity") ||
							response?.headers?.get?.("X-Galx-Session-Affinity")
						if (resAffinity) {
							broccoliTransportSubstrate.setActiveSessionAffinity(resAffinity)
						}
						stream = data
					} else {
						stream = await retryPromise
					}
				} catch (retryErr: unknown) {
					Logger.error(`GALXAI API Request Error after session failover retry: ${(retryErr as any)?.message}`, retryErr)
					throw retryErr
				}
			} else {
				if (isAffinityError) {
					broccoliTransportSubstrate.clearActiveSessionAffinity()
				}
				Logger.error(`GALXAI API Request Error: ${err.message}`, err)
				throw error
			}
		}

		let didOutputUsage = false
		const toolCallProcessor = new ToolCallProcessor()

		for await (const chunk of stream) {
			// Handle any custom error returned on chunk
			const chunkRecord = chunk as unknown as { error?: { message?: string } }
			if (chunkRecord.error) {
				const err = chunkRecord.error
				throw new Error(`GALXAI API Error: ${err.message || JSON.stringify(err)}`)
			}

			const choice = chunk.choices?.[0]
			const delta = choice?.delta as
				| (OpenAI.Chat.ChatCompletionChunk.Choice.Delta & {
						reasoning_content?: string
						reasoning?: string | Record<string, unknown>
				  })
				| undefined

			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}

			if (delta?.tool_calls) {
				yield* toolCallProcessor.processToolCallDeltas(delta.tool_calls)
			}

			// Capture reasoning / thinking tokens if available
			if (delta?.reasoning_content) {
				yield {
					type: "reasoning",
					reasoning: delta.reasoning_content,
				}
			} else if (delta?.reasoning) {
				yield {
					type: "reasoning",
					reasoning: typeof delta.reasoning === "string" ? delta.reasoning : JSON.stringify(delta.reasoning),
				}
			}

			if (!didOutputUsage && chunk.usage) {
				const promptTokens = chunk.usage.prompt_tokens || 0
				const cachedTokens = chunk.usage.prompt_tokens_details?.cached_tokens || 0
				const inputTokens = Math.max(0, promptTokens - cachedTokens)
				const outputTokens = chunk.usage.completion_tokens || 0

				// Calculate cost if pricing is available
				let totalCost: number | undefined
				if (model.info.inputPrice !== undefined && model.info.outputPrice !== undefined) {
					const inputCost = (inputTokens / 1_000_000) * model.info.inputPrice
					const outputCost = (outputTokens / 1_000_000) * model.info.outputPrice
					const cacheCost =
						model.info.cacheReadsPrice !== undefined ? (cachedTokens / 1_000_000) * model.info.cacheReadsPrice : 0
					totalCost = inputCost + outputCost + cacheCost
				}

				yield {
					type: "usage",
					cacheWriteTokens: 0,
					cacheReadTokens: cachedTokens,
					inputTokens,
					outputTokens,
					totalCost,
				}
				didOutputUsage = true
			}
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		const modelId = this.options.galxModelId || galxDefaultModelId
		const modelInfo = this.options.galxModelInfo || galxModels[modelId] || galxDefaultModelInfo
		return { id: modelId, info: modelInfo }
	}
}
