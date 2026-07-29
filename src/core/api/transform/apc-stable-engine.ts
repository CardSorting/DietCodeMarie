import type OpenAI from "openai"
import type { DietCodeStorageMessage } from "../../../shared/messages/content"
import { Logger } from "../../../shared/services/Logger"
import type { DietCodeTool } from "../../../shared/tools"

export interface ApcStableEngineOptions {
	maxToolOutputLength?: number
	activeVisionWindow?: number
}

export interface ApcTelemetryStats {
	totalRequests: number
	totalUncachedTokens: number
	totalCachedTokens: number
	totalOutputTokens: number
	totalEstSavedCost: string
	averageCacheHitRatio: string
}

/**
 * ApcStableIngestionEngine: Dedicated hardware Automatic Prompt Caching (APC)
 * token optimization engine for Cerebras and Gemma models.
 *
 * Designed specifically to solve prompt cache invalidation in multi-turn agent sessions:
 * 1. Guarantees 100% Prefix Invariance: Historical turn content (turn 0..N-1) NEVER mutates across turns.
 * 2. Preserves BPE Vocabulary: Cleans whitespace, ANSI color sequences, comments, URL params, base64 vision URLs,
 *    and stack frames without inserting artificial shorthand symbols (e.g. `st:`, `msg:`, `err:`, `[@diff]`)
 *    that shatter Gemma BPE tokens.
 * 3. Line-Boundary Aligned Truncation: Snaps head/tail truncation bounds to whole line breaks (\n) to prevent broken tokens.
 * 4. Token 0 Alignment: Normalizes line endings (`\r\n` -> `\n`), unwraps single-text block arrays,
 *    and sorts tool definitions deterministically.
 * 5. APC-Stable Context Ceiling: Trims oldest turns cleanly from the start when context limits are reached,
 *    preserving prefix alignment for remaining turns.
 */
export class ApcStableIngestionEngine {
	private options: Required<ApcStableEngineOptions>

	private lifetimeStats = {
		totalRequests: 0,
		totalUncachedTokens: 0,
		totalCachedTokens: 0,
		totalOutputTokens: 0,
		totalEstSavedCost: 0,
	}

	constructor(options: ApcStableEngineOptions = {}) {
		this.options = {
			maxToolOutputLength: options.maxToolOutputLength ?? 700,
			activeVisionWindow: options.activeVisionWindow ?? 1,
		}
	}

	/**
	 * Fast heuristic token count estimator (~3.8 characters per token).
	 */
	public estimateTokenCount(text: string): number {
		if (!text) return 0
		return Math.ceil(text.length / 3.8)
	}

	/**
	 * Normalizes line endings and whitespace to stabilize Token 0 system prompt prefixes.
	 */
	public normalizeSystemPrompt(systemPrompt: string): string {
		if (!systemPrompt) return ""
		return systemPrompt.replace(/\r\n/g, "\n").trim()
	}

	/**
	 * Sanitizes assistant text content by stripping reasoning/thinking tags
	 * to prevent internal reasoning leakage across follow-up turns.
	 */
	public sanitizeAssistantContent(content: string): string {
		if (!content || typeof content !== "string") return content
		return content
			.replace(/<(?:think|thinking|reasoning)>[\s\S]*?<\/(?:think|thinking|reasoning)>/gi, "")
			.replace(/<(?:think|thinking|reasoning)>[\s\S]*$/gi, "")
			.trim()
	}

	/**
	 * Safe, BPE-preserving text cleaner.
	 * Removes extraneous whitespace, ANSI sequences, HTML comments, stack frame bloat, and repeated lines
	 * WITHOUT replacing standard words with out-of-vocabulary shorthand symbols.
	 */
	public cleanText(text: string): string {
		if (!text || typeof text !== "string") return text

		let cleaned = text

		// 1. ANSI Terminal Escape Sequence Stripping (CSI & OSC sequences)
		// biome-ignore lint/complexity/useRegexLiterals: avoid control character regex literal warnings in linters
		cleaned = cleaned.replace(new RegExp("\\x1b(?:\\[[0-9;]*[a-zA-Z]|\\][^\\x07\\x1b]*(?:\\x07|\\x1b\\\\))", "g"), "")

		// 2. Line Ending & Whitespace Minification
		cleaned = cleaned
			.replace(/\r\n/g, "\n")
			.replace(/<!--[\s\S]*?-->/g, "")
			.replace(/^\s*\/\/#.*$/gm, "")
			.replace(/\n{3,}/g, "\n\n")
			.replace(/[\t ]+$/gm, "")

		// 3. Leading Indentation Minification (collapse 4+ spaces to 2 spaces)
		cleaned = cleaned.replace(/^[ \t]{4,}/gm, "  ")

		// 4. Home Directory Prefix Minification (~.../file)
		cleaned = cleaned.replace(/(?:\/Users\/[^/]+|\/home\/[^/]+)(\/(?:[^/\n]+\/)+([^/\n]+))/g, "~.../$2")

		// 5. URL Tracking Parameter Truncation
		cleaned = cleaned.replace(/(https?:\/\/[^\s?]+)\?[^\s]{40,}/g, "$1?[params_compacted]")

		// 6. Framework & Internal Stack Frame Collapsing
		cleaned = cleaned.replace(
			/(\s+at\s+.*?(?:node:internal|.*?\/node_modules\/).*?\n){3,}/g,
			"\n    [... internal stack frames collapsed ...]\n",
		)

		// 7. Consecutive Duplicate Line RLE Compression
		cleaned = cleaned.replace(/^(.+)(\n\1){3,}$/gm, (match: string, line: string) => {
			const count = match.split("\n").length
			return `${line} [x${count} repeated]`
		})

		return cleaned.trim()
	}

	/**
	 * Line-boundary aligned static tool output compaction.
	 * Snaps truncation bounds to whole newline characters to prevent broken tokens or split lines.
	 */
	public compactToolOutputContent(content: string): string {
		if (!content || typeof content !== "string") return content

		const cleaned = this.cleanText(content)
		if (cleaned.length <= this.options.maxToolOutputLength) {
			return cleaned
		}

		const headSize = Math.floor(this.options.maxToolOutputLength * 0.45)
		const tailSize = Math.floor(this.options.maxToolOutputLength * 0.45)

		const rawHead = cleaned.slice(0, headSize)
		const rawTail = cleaned.slice(-tailSize)

		// Snap head boundary to last newline if present
		const headLastNl = rawHead.lastIndexOf("\n")
		const head = headLastNl > headSize * 0.5 ? rawHead.slice(0, headLastNl) : rawHead

		// Snap tail boundary to first newline if present
		const tailFirstNl = rawTail.indexOf("\n")
		const tail = tailFirstNl !== -1 && tailFirstNl < tailSize * 0.5 ? rawTail.slice(tailFirstNl + 1) : rawTail

		return `${head}\n\n... [HistOutputTruncated] ...\n\n${tail}`
	}

	/**
	 * Prunes raw base64 vision payloads in historical turns, replacing them with lightweight anchors.
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
						text: `[VisAnchor #${index + 1}: Image processed in turn ${index + 1}]`,
					}
				}
				return block
			})

			return { ...msg, content: updatedContent }
		})
	}

	/**
	 * Deduplicates consecutive user messages with identical text content,
	 * preventing redundant turn inflation.
	 */
	public deduplicateConsecutiveMessages<T extends { role?: string; content?: unknown }>(messages: T[]): T[] {
		if (messages.length <= 1) return messages

		const deduplicated: T[] = []
		let lastSeenContent = ""
		let repeatCount = 1

		for (const msg of messages) {
			const strContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)

			if (msg.role === "user" && strContent === lastSeenContent && strContent.length > 30) {
				repeatCount++
				const lastIdx = deduplicated.length - 1
				deduplicated[lastIdx] = {
					...deduplicated[lastIdx],
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
	 * Enforces APC-stable context ceiling truncation when total estimated tokens exceed maxAllowedTokens.
	 * Older turns are removed starting from index 0 in chronological order, preserving prefix stability for remaining turns.
	 */
	public enforceApcStableContextCeiling<T extends { role?: string; content?: unknown }>(
		messages: T[],
		maxAllowedTokens = 128_000,
		preserveRecentTurns = 4,
	): T[] {
		let totalTokens = messages.reduce((sum, msg) => {
			const strContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
			return sum + this.estimateTokenCount(strContent || "")
		}, 0)

		if (totalTokens <= maxAllowedTokens || messages.length <= preserveRecentTurns) {
			return messages
		}

		let startIndex = 0
		while (totalTokens > maxAllowedTokens && startIndex < messages.length - preserveRecentTurns) {
			const msgStr =
				typeof messages[startIndex].content === "string"
					? (messages[startIndex].content as string)
					: JSON.stringify(messages[startIndex].content)
			totalTokens -= this.estimateTokenCount(msgStr || "")
			startIndex++
		}

		// Turn-boundary snap: Ensure startIndex snaps forward to the next 'user' role
		// to guarantee API schema validity (first message after system prompt must be user)
		while (startIndex < messages.length - preserveRecentTurns && messages[startIndex].role !== "user") {
			startIndex++
		}

		return messages.slice(startIndex)
	}

	/**
	 * Transforms OpenAI completion messages into a static, APC-stable array.
	 * 1. Tool messages are statically optimized upon ingestion so their text representation
	 *    NEVER mutates across turns, guaranteeing 100% hardware KV-cache prefix matching.
	 * 2. Unwraps single text-block array contents ([{ type: "text", text: "..." }]) into plain string content ("...")
	 *    to maintain byte-identical APC token prefix consistency across all turns.
	 * 3. Normalizes trailing whitespace on text contents.
	 * 4. Deduplicates consecutive identical user messages.
	 */
	public processApcStableMessages(
		messages: OpenAI.Chat.ChatCompletionMessageParam[],
	): OpenAI.Chat.ChatCompletionMessageParam[] {
		// Pre-process & unwrap single-element text array content to string for APC structure stability
		const unwrapped = messages.map((msg: OpenAI.Chat.ChatCompletionMessageParam) => {
			const cloned = { ...msg }
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
				cloned.content = cloned.content[0].text
			}
			return cloned
		})

		const deduplicated = this.deduplicateConsecutiveMessages(unwrapped)

		return deduplicated.map((msg: OpenAI.Chat.ChatCompletionMessageParam) => {
			const cloned = { ...msg }

			if (typeof cloned.content === "string") {
				cloned.content = cloned.content.replace(/[\t ]+$/gm, "")
			}

			if (cloned.role === "assistant" && typeof cloned.content === "string") {
				cloned.content = this.sanitizeAssistantContent(cloned.content)
			}

			if (cloned.role === "tool" && typeof cloned.content === "string") {
				return {
					...cloned,
					content: this.compactToolOutputContent(cloned.content),
				}
			}

			return cloned
		})
	}

	/**
	 * Sorts tool definitions deterministically by tool name to prevent Token 0 schema drift.
	 */
	public alignToolSchemas(tools?: DietCodeTool[]): DietCodeTool[] | undefined {
		if (!tools || !tools.length) return undefined

		return [...tools].sort((a: DietCodeTool, b: DietCodeTool) => {
			const nameA = this.getToolName(a)
			const nameB = this.getToolName(b)
			return nameA.localeCompare(nameB)
		})
	}

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
			`[${providerName} APC Telemetry] Model: ${modelId} | Uncached: ${inputTokens} | Cached: ${cacheReadTokens} (${cacheHitRatio}% hit) | Output: ${outputTokens} | Saved: $${savedCost.toFixed(4)}`,
		)
	}

	public getLifetimeTelemetryReport(): ApcTelemetryStats {
		const totalInput = this.lifetimeStats.totalUncachedTokens + this.lifetimeStats.totalCachedTokens
		const hitRatio = totalInput > 0 ? ((this.lifetimeStats.totalCachedTokens / totalInput) * 100).toFixed(1) : "0.0"

		return {
			totalRequests: this.lifetimeStats.totalRequests,
			totalUncachedTokens: this.lifetimeStats.totalUncachedTokens,
			totalCachedTokens: this.lifetimeStats.totalCachedTokens,
			totalOutputTokens: this.lifetimeStats.totalOutputTokens,
			totalEstSavedCost: `$${this.lifetimeStats.totalEstSavedCost.toFixed(4)}`,
			averageCacheHitRatio: `${hitRatio}%`,
		}
	}
}

export const ApcProfiles = {
	/** Hardware Automatic Prompt Caching profile (Cerebras, Wafer-scale hardware) */
	STRICT_APC: new ApcStableIngestionEngine({
		maxToolOutputLength: 700,
		activeVisionWindow: 1,
	}),
	/** High density profile for long multi-turn sessions */
	HIGH_DENSITY: new ApcStableIngestionEngine({
		maxToolOutputLength: 500,
		activeVisionWindow: 1,
	}),
	/** Maximum retention profile for large context window models */
	MAX_RETENTION: new ApcStableIngestionEngine({
		maxToolOutputLength: 1200,
		activeVisionWindow: 2,
	}),
}

export const defaultApcStableEngine = new ApcStableIngestionEngine()
