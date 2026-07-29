import { DietCodeStorageMessage } from "@/shared/messages/content"
import { Logger } from "@/shared/services/Logger"
import { DietCodeTool } from "@/shared/tools"

export interface TokenBufferOptions {
	activeVisionWindow?: number
	keepFullToolTurns?: number
	enableDslCompression?: boolean
	maxToolOutputLength?: number
}

/**
 * TokenIngestionBufferEngine: A centralized context and token optimization engine
 * shared across all LLM providers (Cerebras, Anthropic, OpenRouter, OpenAI, Gemini, Bedrock, etc.).
 *
 * Responsibilities:
 * 1. Single-Turn Vision Payload Eviction (pruneHistoricalVisionPayloads)
 * 2. Epistemic Tool Result Compaction (compactHistoricalToolOutputs)
 * 3. 10-Stage Domain-Specific Language (DSL) Token Compression (compressDslText)
 * 4. Deterministic Tool Schema Alignment (alignToolSchemas)
 * 5. System Prompt Normalization (normalizeSystemPrompt)
 * 6. Observability & Cache Telemetry Analytics (logCacheTelemetry)
 */
export class TokenIngestionBufferEngine {
	private options: Required<TokenBufferOptions>

	constructor(options: TokenBufferOptions = {}) {
		this.options = {
			activeVisionWindow: options.activeVisionWindow ?? 1,
			keepFullToolTurns: options.keepFullToolTurns ?? 2,
			enableDslCompression: options.enableDslCompression ?? true,
			maxToolOutputLength: options.maxToolOutputLength ?? 800,
		}
	}

	/**
	 * Normalizes line endings and whitespace to stabilize Token 0 prompt prefixes across providers.
	 */
	public normalizeSystemPrompt(systemPrompt: string): string {
		if (!systemPrompt) return ""
		return systemPrompt.replace(/\r\n/g, "\n").trim()
	}

	/**
	 * Keeps raw visual base64 payloads ONLY on active turns (most recent N turns).
	 * Replaces historical base64 images with lightweight semantic anchors across any provider.
	 */
	public pruneHistoricalVisionPayloads(messages: DietCodeStorageMessage[]): DietCodeStorageMessage[] {
		let userMsgCount = 0
		let cutoffIndex = 0
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === "user") {
				userMsgCount++
				if (userMsgCount === this.options.activeVisionWindow) {
					cutoffIndex = i
					break
				}
			}
		}

		return messages.map((msg, index) => {
			if (index >= cutoffIndex || !Array.isArray(msg.content)) {
				return msg
			}

			const updatedContent = msg.content.map((block) => {
				if (block.type === "image") {
					return {
						type: "text" as const,
						text: `[Visual Context Anchor #${index + 1}: Image artifact processed in earlier turn]`,
					}
				}
				return block
			})

			return { ...msg, content: updatedContent }
		})
	}

	/**
	 * Sanitizes assistant text content by stripping reasoning/thinking tags
	 * across DeepSeek R1, Qwen R1, Claude, and Gemma models.
	 */
	public sanitizeAssistantContent(content: string): string {
		if (!content || typeof content !== "string") return content
		return content
			.replace(/<(?:think|thinking|reasoning)>[\s\S]*?<\/(?:think|thinking|reasoning)>/gi, "")
			.replace(/<(?:think|thinking|reasoning)>[\s\S]*$/gi, "")
			.trim()
	}

	/**
	 * Applies 10-Stage Domain-Specific Language (DSL) Token Compression to reduce payload size.
	 */
	public compressDslText(text: string): string {
		if (!text || typeof text !== "string") return text

		let compressed = text

		// 1. Syntactic & ANSI Stripping: Strip CSI & OSC terminal sequences, HTML comments, comment headers, and line gaps
		// biome-ignore lint/complexity/useRegexLiterals: avoid control character regex literal warnings in linters
		compressed = compressed
			.replace(/\x1b(?:\[[0-9;]*[a-zA-Z]|\][^\x07\x1b]*(?:\x07|\x1b\\))/g, "")
			.replace(/<!--[\s\S]*?-->/g, "")
			.replace(/^\s*\/\/#.*$/gm, "")
			.replace(/\r\n/g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.replace(/^[ \t]{4,}/gm, "  ")

		// 2. Deep Absolute Path Compaction: Compress long user home/workspace path prefixes
		compressed = compressed.replace(/(?:\/Users\/[^/]+|\/home\/[^/]+)(\/(?:[^/\n]+\/)+([^/\n]+))/g, "~.../$2")

		// 3. Meta-Token Mapping & Run-Length Encoding (RLE) for repetitive character dividers
		compressed = compressed
			.replace(/={10,}/g, "[====]")
			.replace(/-{10,}/g, "[----]")
			.replace(/\*{10,}/g, "[****]")

		// 4. Keyword Shortening & Shorthand Mapping
		compressed = compressed
			.replace(/Visual Context Anchor/g, "VisAnchor")
			.replace(/Historical Tool Output Truncated for Token Efficiency/g, "HistOutputTruncated")
			.replace(/Environment State/g, "EnvState")
			.replace(/Execution Status: Success/g, "ExecStatus:OK")

		// 5. JSON-to-DSL Structural Transpilation: Flatten expanded JSON object blocks into compact inline DSL
		compressed = compressed
			.replace(/{\s*\n\s*"tool":\s*"([^"]+)",\s*\n\s*"([a-zA-Z0-9_]+)":\s*"([^"]+)"\s*\n}/g, '[tool:$1 $2="$3"]')
			.replace(/{\s*\n\s*"([a-zA-Z0-9_]+)":\s*"([^"]+)"\s*\n}/g, '{$1="$2"}')

		// 6. Stack Trace Frame Collapsing: Collapse internal node_modules/framework stack frames
		compressed = compressed.replace(
			/(\s+at\s+.*?\((?:node:internal|.*?\/node_modules\/).*?\)\n){3,}/g,
			"\n    [... internal stack frames collapsed ...]\n",
		)

		// 7. Duplicate Line RLE Compression: Collapse 4+ identical consecutive lines
		compressed = compressed.replace(/^(.+)(\n\1){3,}$/gm, (match, line) => {
			const count = match.split("\n").length
			return `${line} [x${count} repeated]`
		})

		// 8. Diff Header DSL Transpilation: Compact heavy git diff headers into [@diff path Lrange]
		compressed = compressed.replace(/--- a\/(.*?)\n\+\+\+ b\/\1\n@@ -(\d+),\d+ \+(\d+),\d+ @@/g, "[@diff $1 L$2-$3]")

		// 9. URL Tracking Parameter Truncation: Strip bloated query tracking params in historical text
		compressed = compressed.replace(/(https?:\/\/[^\s?]+)\?[^\s]{40,}/g, "$1?[params_compacted]")

		// 10. Symbolic JSON Key Abbreviation & Line Trailing Whitespace Minification
		compressed = compressed
			.replace(/[\t ]+$/gm, "")
			.replace(/"status":\s*/g, "st:")
			.replace(/"message":\s*/g, "msg:")
			.replace(/"error":\s*/g, "err:")

		return compressed.trim()
	}

	/**
	 * Compacts historical tool outputs in older turns to eliminate O(N^2) quadratic context growth.
	 */
	public compactHistoricalToolOutputs<T extends { role?: string; content?: unknown }>(messages: T[]): T[] {
		const cutoffIndex = messages.length - this.options.keepFullToolTurns

		return messages.map((msg, index) => {
			if (index >= cutoffIndex || msg.role !== "tool" || typeof msg.content !== "string") {
				return msg
			}

			const dslCompressed = this.options.enableDslCompression ? this.compressDslText(msg.content) : msg.content

			if (dslCompressed.length > this.options.maxToolOutputLength) {
				const headSize = Math.floor(this.options.maxToolOutputLength * 0.45)
				const tailSize = Math.floor(this.options.maxToolOutputLength * 0.45)

				const rawHead = dslCompressed.slice(0, headSize)
				const rawTail = dslCompressed.slice(-tailSize)

				// Snap head boundary to last newline if present
				const headLastNl = rawHead.lastIndexOf("\n")
				const head = headLastNl > headSize * 0.5 ? rawHead.slice(0, headLastNl) : rawHead

				// Snap tail boundary to first newline if present
				const tailFirstNl = rawTail.indexOf("\n")
				const tail = tailFirstNl !== -1 && tailFirstNl < tailSize * 0.5 ? rawTail.slice(tailFirstNl + 1) : rawTail

				return {
					...msg,
					content: `${head}\n\n... [HistOutputTruncated] ...\n\n${tail}`,
				}
			}

			return {
				...msg,
				content: dslCompressed,
			}
		})
	}

	/**
	 * Sorts tool definitions deterministically by tool name across OpenAI, Anthropic, or Gemini schemas.
	 */
	public alignToolSchemas(tools?: DietCodeTool[]): DietCodeTool[] | undefined {
		if (!tools || !tools.length) return undefined

		return [...tools].sort((a, b) => {
			const nameA = this.getToolName(a)
			const nameB = this.getToolName(b)
			return nameA.localeCompare(nameB)
		})
	}

	/**
	 * Extracts tool name across heterogeneous tool definitions.
	 */
	private getToolName(tool: DietCodeTool): string {
		if ("function" in tool && tool.function && typeof tool.function.name === "string") {
			return tool.function.name
		}
		if ("name" in tool && typeof tool.name === "string") {
			return tool.name
		}
		return ""
	}

	/**
	 * Deduplicates consecutive user or environment payload messages with identical content,
	 * collapsing redundant turns to conserve token context.
	 */
	public deduplicateConsecutiveMessages<T extends { role?: string; content?: unknown }>(messages: T[]): T[] {
		if (messages.length <= 1) return messages

		const deduplicated: T[] = []
		let lastSeenContent = ""
		let repeatCount = 1

		for (const msg of messages) {
			const strContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)

			if (msg.role === "user" && strContent === lastSeenContent && strContent.length > 50) {
				repeatCount++
				// Replace previous turn content with collapsed notice
				const lastIndex = deduplicated.length - 1
				deduplicated[lastIndex] = {
					...deduplicated[lastIndex],
					content:
						typeof msg.content === "string"
							? `${msg.content}\n\n[Redundant turn content repeated x${repeatCount} collapsed]`
							: msg.content,
				}
				continue
			}

			repeatCount = 1
			lastSeenContent = strContent
			deduplicated.push(msg)
		}

		return deduplicated
	}

	/**
	 * Fast heuristic token count estimator (~4 characters per token).
	 */
	public estimateTokenCount(text: string): number {
		if (!text) return 0
		return Math.ceil(text.length / 4)
	}

	/**
	 * Automatically applies ephemeral prompt cache control markers ({ cache_control: { type: "ephemeral" } })
	 * to the last two user messages for providers supporting explicit prompt caching (Anthropic, OpenRouter, MiniMax).
	 */
	public applyEphemeralCacheControl<T extends { role?: string; content?: unknown }>(messages: T[]): T[] {
		const userIndices: number[] = []
		messages.forEach((msg, idx) => {
			if (msg.role === "user") {
				userIndices.push(idx)
			}
		})

		if (userIndices.length === 0) return messages

		const targetIndices = new Set([
			userIndices[userIndices.length - 1],
			...(userIndices.length > 1 ? [userIndices[userIndices.length - 2]] : []),
		])

		return messages.map((msg, idx) => {
			if (!targetIndices.has(idx)) return msg

			const cloned = { ...msg } as Record<string, unknown>
			if (typeof cloned.content === "string") {
				cloned.content = [{ type: "text", text: cloned.content, cache_control: { type: "ephemeral" } }]
			} else if (Array.isArray(cloned.content) && cloned.content.length > 0) {
				const lastBlockIndex = cloned.content.length - 1
				cloned.content = cloned.content.map((block: Record<string, unknown>, bIdx: number) => {
					if (bIdx === lastBlockIndex && (block.type === "text" || block.type === "image")) {
						return { ...block, cache_control: { type: "ephemeral" } }
					}
					return block
				})
			}
			return cloned as T
		})
	}

	/**
	 * Computes a detailed compression report detailing character reduction,
	 * estimated tokens saved, and financial savings.
	 */
	public generateCompressionReport(
		originalText: string,
		compressedText: string,
		inputPricePerMillion = 0.99,
	): CompressionReport {
		const originalLength = originalText ? originalText.length : 0
		const compressedLength = compressedText ? compressedText.length : 0
		const charsSaved = Math.max(0, originalLength - compressedLength)
		const reductionRatio = originalLength > 0 ? ((charsSaved / originalLength) * 100).toFixed(1) : "0.0"

		const estimatedTokensSaved = Math.ceil(charsSaved / 4)
		const estimatedDollarsSaved = ((estimatedTokensSaved * inputPricePerMillion) / 1_000_000).toFixed(4)

		return {
			originalLength,
			compressedLength,
			reductionPercentage: `${reductionRatio}%`,
			estimatedTokensSaved,
			estimatedDollarsSaved: `$${estimatedDollarsSaved}`,
		}
	}

	/**
	 * Enforces an adaptive context window ceiling guard.
	 * If estimated message tokens exceed maxAllowedTokens, older turns are trimmed to prevent context window overflow.
	 */
	public enforceContextCeiling<T extends { role?: string; content?: unknown }>(
		messages: T[],
		maxAllowedTokens = 100_000,
		preserveRecentTurns = 4,
	): T[] {
		let totalTokens = messages.reduce((sum, msg) => {
			const strContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
			return sum + Math.ceil((strContent || "").length / 4)
		}, 0)

		if (totalTokens <= maxAllowedTokens || messages.length <= preserveRecentTurns) {
			return messages
		}

		const result: T[] = [messages[0]]
		const middleTurns = messages.slice(1, messages.length - preserveRecentTurns)
		const recentTurns = messages.slice(messages.length - preserveRecentTurns)

		for (const msg of middleTurns) {
			const strContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
			const msgTokens = Math.ceil((strContent || "").length / 4)

			if (totalTokens > maxAllowedTokens) {
				totalTokens -= msgTokens
				continue
			}
			result.push(msg)
		}

		const combined = [...result, ...recentTurns]

		// Turn-boundary snap: Ensure combined array starts with a valid 'user' role (at or after index 1 if index 0 is system)
		let userSnapIndex = combined[0]?.role === "system" ? 1 : 0
		while (userSnapIndex < combined.length - preserveRecentTurns && combined[userSnapIndex]?.role !== "user") {
			userSnapIndex++
		}

		if (userSnapIndex > (combined[0]?.role === "system" ? 1 : 0)) {
			return combined[0]?.role === "system"
				? [combined[0], ...combined.slice(userSnapIndex)]
				: combined.slice(userSnapIndex)
		}

		return combined
	}

	/**
	 * Single-call full optimization pipeline that executes system prompt normalization,
	 * vision payload pruning, tool compaction, turn deduplication, tool alignment,
	 * context ceiling guards, and savings report generation in one unified pass.
	 */
	public optimizeMessagesPipeline(options: OptimizationPipelineOptions): OptimizationPipelineResult {
		const rawSystem = options.systemPrompt
		const normalizedSystemPrompt = this.normalizeSystemPrompt(rawSystem)

		// Unwrap single text-block array content to plain string and sanitize assistant content before deduplication
		let processedMessages = options.messages.map((msg) => {
			let cloned = { ...msg }
			if (
				Array.isArray(cloned.content) &&
				cloned.content.length === 1 &&
				typeof cloned.content[0] === "object" &&
				cloned.content[0] !== null &&
				"type" in cloned.content[0] &&
				cloned.content[0].type === "text" &&
				"text" in cloned.content[0] &&
				typeof cloned.content[0].text === "string"
			) {
				cloned = { ...cloned, content: cloned.content[0].text }
			}
			if (cloned.role === "assistant" && typeof cloned.content === "string") {
				cloned = { ...cloned, content: this.sanitizeAssistantContent(cloned.content) }
			}
			return cloned
		})

		processedMessages = this.pruneHistoricalVisionPayloads(processedMessages)
		processedMessages = this.compactHistoricalToolOutputs(processedMessages)
		processedMessages = this.deduplicateConsecutiveMessages(processedMessages)

		if (options.applyEphemeralTags) {
			processedMessages = this.applyEphemeralCacheControl(processedMessages)
		}

		if (options.maxAllowedTokens) {
			processedMessages = this.enforceContextCeiling(processedMessages, options.maxAllowedTokens)
		}

		const alignedTools = this.alignToolSchemas(options.tools)

		const originalPayload = rawSystem + JSON.stringify(options.messages)
		const compressedPayload = normalizedSystemPrompt + JSON.stringify(processedMessages)
		const compressionReport = this.generateCompressionReport(originalPayload, compressedPayload)

		return {
			normalizedSystemPrompt,
			optimizedMessages: processedMessages,
			alignedTools,
			compressionReport,
		}
	}

	private lifetimeStats = {
		totalRequests: 0,
		totalUncachedTokens: 0,
		totalCachedTokens: 0,
		totalOutputTokens: 0,
		totalEstSavedCost: 0,
	}

	/**
	 * Returns lifetime aggregate telemetry stats across all agent session turns.
	 */
	public getLifetimeTelemetryReport(): LifetimeTelemetryStats {
		const totalInput = this.lifetimeStats.totalUncachedTokens + this.lifetimeStats.totalCachedTokens
		const hitRatio = totalInput > 0 ? ((this.lifetimeStats.totalCachedTokens / totalInput) * 100).toFixed(1) : "0.0"

		return {
			totalRequests: this.lifetimeStats.totalRequests,
			totalUncachedTokens: this.lifetimeStats.totalUncachedTokens,
			totalCachedTokens: this.lifetimeStats.totalCachedTokens,
			totalOutputTokens: this.lifetimeStats.totalOutputTokens,
			totalEstDollarsSaved: `$${this.lifetimeStats.totalEstSavedCost.toFixed(4)}`,
			averageCacheHitRatio: `${hitRatio}%`,
		}
	}

	/**
	 * Logs real-time token telemetry and prompt cache performance metrics.
	 */
	public logCacheTelemetry(
		providerName: string,
		modelId: string,
		inputTokens: number,
		cacheReadTokens: number,
		outputTokens: number,
		inputPricePerMillion = 0.99,
	): void {
		const totalInput = inputTokens + cacheReadTokens
		const cacheHitRatio = totalInput > 0 ? ((cacheReadTokens / totalInput) * 100).toFixed(1) : "0.0"
		const savedCost = (cacheReadTokens * inputPricePerMillion) / 1_000_000

		this.lifetimeStats.totalRequests += 1
		this.lifetimeStats.totalUncachedTokens += inputTokens
		this.lifetimeStats.totalCachedTokens += cacheReadTokens
		this.lifetimeStats.totalOutputTokens += outputTokens
		this.lifetimeStats.totalEstSavedCost += savedCost

		Logger.info(
			`[${providerName} Cache Telemetry] Model: ${modelId} | Uncached: ${inputTokens} | Cached: ${cacheReadTokens} (${cacheHitRatio}% hit) | Output: ${outputTokens} | Est. Saved: $${savedCost.toFixed(4)}`,
		)
	}
}

export interface LifetimeTelemetryStats {
	totalRequests: number
	totalUncachedTokens: number
	totalCachedTokens: number
	totalOutputTokens: number
	totalEstDollarsSaved: string
	averageCacheHitRatio: string
}

export interface CompressionReport {
	originalLength: number
	compressedLength: number
	reductionPercentage: string
	estimatedTokensSaved: number
	estimatedDollarsSaved: string
}

export interface OptimizationPipelineOptions {
	systemPrompt: string
	messages: DietCodeStorageMessage[]
	tools?: DietCodeTool[]
	applyEphemeralTags?: boolean
	maxAllowedTokens?: number
}

export interface OptimizationPipelineResult {
	normalizedSystemPrompt: string
	optimizedMessages: DietCodeStorageMessage[]
	alignedTools?: DietCodeTool[]
	compressionReport: CompressionReport
}

export const TokenBufferProfiles = {
	/** Profile optimized for automatic hardware prompt caching (Cerebras, OpenAI, DeepSeek) */
	STRICT_CACHE_STABILITY: new TokenIngestionBufferEngine({
		activeVisionWindow: 1,
		keepFullToolTurns: 2,
		enableDslCompression: true,
		maxToolOutputLength: 700,
	}),
	/** Profile optimized for explicit ephemeral prompt caching (Anthropic, OpenRouter, MiniMax) */
	EPHEMERAL_PROMPT_CACHE: new TokenIngestionBufferEngine({
		activeVisionWindow: 1,
		keepFullToolTurns: 2,
		enableDslCompression: true,
		maxToolOutputLength: 800,
	}),
	/** High compression profile for long context sessions */
	HIGH_COMPRESSION: new TokenIngestionBufferEngine({
		activeVisionWindow: 1,
		keepFullToolTurns: 1,
		enableDslCompression: true,
		maxToolOutputLength: 500,
	}),
}

/** Default singleton instance for general provider use */
export const defaultTokenBufferEngine = new TokenIngestionBufferEngine()
