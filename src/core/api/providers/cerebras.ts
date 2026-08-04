import { CerebrasModelId, cerebrasDefaultModelId, cerebrasModels, ModelInfo } from "@shared/api"
import type OpenAI from "openai"
import { DietCodeStorageMessage } from "@/shared/messages/content"
import { DietCodeTool } from "@/shared/tools"
import { withRetry } from "../retry"
import { ApcStableIngestionEngine, defaultApcStableEngine } from "../transform/apc-stable-engine"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { ApiHandler, CommonApiHandlerOptions } from "../types"

interface CerebrasHandlerOptions extends CommonApiHandlerOptions {
	cerebrasApiKey?: string
	apiModelId?: string
}

type OpenAIMessageWithReasoning = OpenAI.Chat.ChatCompletionMessageParam & {
	reasoning?: unknown
	reasoning_content?: unknown
	reasoning_details?: unknown
}

const CEREBRAS_DEFAULT_MAX_TOKENS = 16_384

function stripThinkingTags(content: string): string {
	return content
		.replace(/<think>[\s\S]*?<\/think>/gi, "")
		.replace(/<think>[\s\S]*$/gi, "")
		.trim()
}

export const pruneHistoricalVisionPayloads = (messages: DietCodeStorageMessage[], activeVisionWindow = 1) =>
	new ApcStableIngestionEngine({ activeVisionWindow }).pruneHistoricalVisionPayloads(messages)

export const compressDslText = (text: string) => defaultApcStableEngine.cleanText(text)

export const compactHistoricalToolOutputs = (messages: OpenAI.Chat.ChatCompletionMessageParam[], keepFullTurns = 2) =>
	defaultApcStableEngine.processApcStableMessages(messages)

export function prepareCerebrasMessages(messages: DietCodeStorageMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
	const prepared: OpenAI.Chat.ChatCompletionMessageParam[] = []

	for (const message of convertToOpenAiMessages(messages, "cerebras")) {
		const sanitized = { ...message } as OpenAIMessageWithReasoning
		delete sanitized.reasoning
		delete sanitized.reasoning_content
		delete sanitized.reasoning_details

		if (sanitized.role !== "assistant") {
			prepared.push(sanitized)
			continue
		}

		if (typeof sanitized.content === "string") {
			sanitized.content = stripThinkingTags(sanitized.content)
		}

		const hasContent =
			(typeof sanitized.content === "string" && sanitized.content.trim().length > 0) ||
			(Array.isArray(sanitized.content) && sanitized.content.length > 0)
		const hasToolCalls = Array.isArray(sanitized.tool_calls) && sanitized.tool_calls.length > 0

		if (!hasContent && hasToolCalls && typeof sanitized.content === "string") {
			sanitized.content = null as unknown as string
		}

		if (hasContent || hasToolCalls) {
			prepared.push(sanitized)
		}
	}

	return prepared
}

export class CerebrasHandler implements ApiHandler {
	private options: CerebrasHandlerOptions

	constructor(options: CerebrasHandlerOptions) {
		this.options = options
	}

	public getModel(): { id: CerebrasModelId; info: ModelInfo } {
		const modelId = (this.options.apiModelId || cerebrasDefaultModelId) as CerebrasModelId
		const info = cerebrasModels[modelId] || cerebrasModels[cerebrasDefaultModelId]
		return { id: modelId, info }
	}

	@withRetry({
		maxRetries: 3,
		baseDelay: 2_000,
		maxDelay: 15_000,
	})
	async *createMessage(systemPrompt: string, messages: DietCodeStorageMessage[], _tools?: DietCodeTool[]): ApiStream {
		const apiKey = (this.options.cerebrasApiKey || process.env.CEREBRAS_API_KEY || "").trim()
		if (!apiKey) {
			throw new Error("Cerebras API key is missing")
		}

		const model = this.getModel()
		const normalizedSystemPrompt = defaultApcStableEngine.normalizeSystemPrompt(systemPrompt)
		const visionOptimized = defaultApcStableEngine.pruneHistoricalVisionPayloads(messages)
		const rawOpenAiMessages = prepareCerebrasMessages(visionOptimized)
		const apcStableMessages = defaultApcStableEngine.processApcStableMessages(rawOpenAiMessages)
		const cerebrasMessages = [{ role: "system" as const, content: normalizedSystemPrompt }, ...apcStableMessages]

		const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"User-Agent": "LUMI-Bench/1.0",
			},
			body: JSON.stringify({
				model: model.id,
				messages: cerebrasMessages,
				temperature: model.info.temperature ?? 0,
				stream: true,
				max_completion_tokens: CEREBRAS_DEFAULT_MAX_TOKENS,
			}),
		})

		if (!res.ok) {
			const errBody = await res.text()
			throw new Error(`Cerebras API HTTP ${res.status}: ${errBody}`)
		}

		const reader = res.body?.getReader()
		if (!reader) {
			throw new Error("Cerebras API response stream unreadable")
		}

		const decoder = new TextDecoder()
		let buffer = ""
		let totalPromptTokens = 0
		let totalCompletionTokens = 0

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split("\n")
			buffer = lines.pop() || ""

			for (const line of lines) {
				const trimmed = line.trim()
				if (trimmed.startsWith("data: ")) {
					const dataStr = trimmed.slice(6)
					if (dataStr === "[DONE]") break
					try {
						const json = JSON.parse(dataStr)
						const delta = json.choices?.[0]?.delta
						if (delta?.content) {
							yield { type: "text", text: delta.content }
						}
						if (json.usage) {
							totalPromptTokens = json.usage.prompt_tokens || totalPromptTokens
							totalCompletionTokens = json.usage.completion_tokens || totalCompletionTokens
						}
					} catch {
						// Ignore partial JSON chunks
					}
				}
			}
		}

		// Yield final token usage summary
		if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
			yield {
				type: "usage",
				inputTokens: totalPromptTokens,
				outputTokens: totalCompletionTokens,
			}
		}
	}
}
