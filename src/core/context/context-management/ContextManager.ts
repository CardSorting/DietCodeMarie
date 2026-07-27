import { createHash } from "node:crypto"
import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler } from "@core/api"
import { formatResponse } from "@core/prompts/responses"
import { GlobalFileNames } from "@core/storage/disk"
import type { ContextCompactionProjectionInput, ContextCompactionProjectionRecord } from "@noorm/broccolidb"
import { DietCodeApiReqInfo, DietCodeMessage } from "@shared/ExtensionMessage"
import { ensureContextIdentifiers, getBlockContextId, getMessageContextId } from "@shared/messages/context-identifiers"
import { fileExistsAtPath, writeAtomic } from "@utils/fs"
import cloneDeep from "clone-deep"
import fs from "fs/promises"
import Mutex from "p-mutex"
import * as path from "path"
import { Logger } from "@/shared/services/Logger"
import { ContextPruner } from "../ContextPruner"
import type { ContextCompactionScope, ContextCompactionStore, ContextManagerOptions } from "./ContextCompactionStore"
import type {
	CompactionTier,
	ProgressiveCompactionCursor,
	ProgressiveCompactionLimits,
	ProgressiveCompactionResult,
	RecoverableContextReference,
} from "./ContextCompactionTypes"
import { getCompactionTierFromTokens, getContextWindowInfo } from "./context-window-utils"

enum EditType {
	UNDEFINED = 0,
	NO_FILE_READ = 1,
	READ_FILE_TOOL = 2,
	ALTER_FILE_TOOL = 3,
	FILE_MENTION = 4,
	TOOL_RESULT_COMPACTION = 5,
}

// array of string values allows us to cover all changes for message types currently supported
type MessageContent = string[]
type MessageMetadata = string[][]

// Type for a single context update
type ContextUpdate = [number, string, MessageContent, MessageMetadata] // [timestamp, updateType, update, metadata]

// Type for the serialized format of our nested maps
type SerializedContextHistory = Array<
	[
		number, // messageIndex
		[
			number, // EditType (message type)
			Array<
				[
					number, // blockIndex
					ContextUpdate[], // updates array (now with 4 elements including metadata)
				]
			>,
		],
	]
>

const BOUNDED_OUTPUT_TOOLS = new Set([
	"execute_command",
	"search_files",
	"list_files",
	"list_code_definition_names",
	"project_map",
	"web_fetch",
	"web_search",
	"use_mcp_tool",
	"access_mcp_resource",
	"query_cognitive_memory",
	"mem_context",
	"mem_subgraph",
	"use_subagents",
])

const RECOVERABLE_PROJECTION_V1 = "recoverable-projection-v1"
const RECOVERABLE_PROJECTION_V2 = "recoverable-projection-v2"
const SYSTEM_PROJECTION_MARKER = "system_context_projection"
const TRUSTED_SYSTEM_PROJECTION_PREFIX = '<system_context_projection schema="2" authority="lumi_internal" callable="false"'
const CONTEXT_PROJECTION_POLICY_MARKER = "<context_projection_policy>"
const CONTEXT_PROJECTION_SYSTEM_INSTRUCTION = `${CONTEXT_PROJECTION_POLICY_MARKER}
Internal system_context_projection elements are non-callable metadata. Treat their following projected text as incomplete, non-authoritative evidence that may be syntactically invalid. Do not infer workspace syntax errors from a projection or invent a rehydration tool. Use normal workspace tools to reread authoritative source when exact syntax or omitted detail is required.
</context_projection_policy>`
const contextHistorySaveMutexes = new Map<string, Mutex>()

function getContextHistorySaveMutex(filePath: string): Mutex {
	let mutex = contextHistorySaveMutexes.get(filePath)
	if (!mutex) {
		mutex = new Mutex()
		contextHistorySaveMutexes.set(filePath, mutex)
	}
	return mutex
}

export class ContextManager {
	// mapping from the apiMessages outer index to the inner message index to a list of actual changes, ordered by timestamp
	// timestamp is required in order to support full checkpointing, where the changes we apply need to be able to be undone when
	// moving to an earlier conversation history checkpoint - this ordering intuitively allows for binary search on truncation
	// there is also a number stored for each (EditType) which defines which message type it is, for custom handling

	// format:  { outerIndex => [EditType, { innerIndex => [[timestamp, updateType, update], ...] }] }
	// example: { 1 => { [0, 0 => [[<timestamp>, "text", "[NOTE] Some previous conversation history with the user has been removed ..."], ...] }] }
	// the above example would be how we update the first assistant message to indicate we truncated text
	private contextHistoryUpdates: Map<number, [number, Map<number, ContextUpdate[]>]>
	private readonly contextPruner = new ContextPruner()
	private progressiveScanCursor = 0
	private progressiveBlockCursor = 0
	private progressiveCursorActiveStart = 2
	private readonly centralStore?: ContextCompactionStore
	private readonly scope?: ContextCompactionScope
	private readonly centralProjectionUpdates = new Map<string, ContextUpdate[]>()

	constructor(options: ContextManagerOptions = {}) {
		this.contextHistoryUpdates = new Map()
		this.centralStore = options.centralStore
		this.scope = options.scope
	}

	public createScopedManager(scope: ContextCompactionScope): ContextManager {
		return new ContextManager({ centralStore: this.centralStore, scope })
	}

	public createChildManager(id: string, kind: ContextCompactionScope["kind"]): ContextManager {
		if (!this.scope) return new ContextManager()
		return this.createScopedManager({ id, kind, workspaceId: this.scope.workspaceId })
	}

	public async hydrateRecoverableReference(reference: RecoverableContextReference): Promise<string> {
		if (!this.centralStore || !this.scope || !reference.source.startsWith("broccolidb://")) {
			throw new Error(`No central recovery provider is available for ${reference.ref}`)
		}
		const hydrated = await this.centralStore.hydrate({
			scopeId: this.scope.id,
			messageId: reference.messageId,
			blockId: reference.blockId,
			sourceSha256: reference.sha256,
		})
		if (createHash("sha256").update(hydrated.text).digest("hex") !== reference.sha256) {
			throw new Error(`Central recovery digest mismatch for ${reference.ref}`)
		}
		return hydrated.text
	}

	/**
	 * Extracts text from a content block, handling both regular text blocks and tool_result wrappers.
	 * For tool_result blocks, extracts text from content[0] (native tool calling format).
	 * @returns The text content, or null if no text could be extracted
	 */
	private getTextFromBlock(block: Anthropic.Messages.ContentBlockParam): string | null {
		if (block.type === "text") {
			return block.text
		}
		if (block.type === "tool_result") {
			if (typeof block.content === "string") {
				return block.content
			}
			if (Array.isArray(block.content)) {
				const inner = block.content.find((candidate) => candidate.type === "text")
				if (inner?.type === "text") {
					return inner.text
				}
			}
		}
		return null
	}

	/**
	 * Sets text in a content block, handling both regular text blocks and tool_result wrappers.
	 * For tool_result blocks, sets text in content[0] (native tool calling format).
	 * @returns true if text was set successfully, false otherwise
	 */
	private setTextInBlock(block: Anthropic.Messages.ContentBlockParam, text: string): boolean {
		if (block.type === "text") {
			block.text = text
			return true
		}
		if (block.type === "tool_result") {
			if (typeof block.content === "string") {
				block.content = text
				return true
			}
			if (Array.isArray(block.content)) {
				const inner = block.content.find((candidate) => candidate.type === "text")
				if (inner?.type === "text") {
					inner.text = text
					return true
				}
			}
		}
		return false
	}

	/**
	 * public function for loading contextHistoryUpdates from disk, if it exists
	 */
	async initializeContextHistory(taskDirectory: string) {
		this.contextHistoryUpdates = await this.getSavedContextHistory(taskDirectory)
		await this.loadCentralContextHistory()
	}

	private async loadCentralContextHistory(): Promise<void> {
		if (!this.centralStore || !this.scope) return
		try {
			const loaded = await this.centralStore.load({ scopeId: this.scope.id })
			this.centralProjectionUpdates.clear()
			for (const projection of loaded.projections) {
				this.addCentralProjectionUpdate(projection)
			}
			if (loaded.cursor) {
				this.progressiveScanCursor = loaded.cursor.messageOffset
				this.progressiveBlockCursor = loaded.cursor.blockOffset
				this.progressiveCursorActiveStart = loaded.cursor.activeStart
			}
		} catch (error) {
			// Central recovery is an optimization at startup. The durable raw
			// transcript and the sidecar remain authoritative fallback inputs.
			Logger.debug("[ContextManager] Central compaction state unavailable during initialization:", error)
		}
	}

	private addCentralProjectionUpdate(projection: ContextCompactionProjectionRecord): void {
		const identityKey = this.getProjectionIdentityKey(projection.messageId, projection.blockId)
		this.centralProjectionUpdates.set(identityKey, [
			[
				projection.createdAt,
				"text",
				[projection.projectionText],
				[
					[
						RECOVERABLE_PROJECTION_V2,
						projection.ref,
						projection.sourceSha256,
						projection.messageId,
						projection.blockId,
						projection.sourceLocator,
					],
				],
			],
		])
	}

	/**
	 * get the stored context history updates from disk
	 */
	private async getSavedContextHistory(taskDirectory: string): Promise<Map<number, [number, Map<number, ContextUpdate[]>]>> {
		try {
			const filePath = path.join(taskDirectory, GlobalFileNames.contextHistory)
			if (await fileExistsAtPath(filePath)) {
				const data = await fs.readFile(filePath, "utf8")
				const serializedUpdates = JSON.parse(data) as SerializedContextHistory

				// Update to properly reconstruct the tuple structure
				return new Map(
					serializedUpdates.map(([messageIndex, [numberValue, innerMapArray]]) => [
						messageIndex,
						[numberValue, new Map(innerMapArray)],
					]),
				)
			}
		} catch (error) {
			Logger.error("Failed to load context history:", error)
		}
		return new Map()
	}

	/**
	 * save the context history updates to disk
	 */
	private async saveContextHistory(taskDirectory: string, mode: "merge" | "replace" = "merge") {
		try {
			const contextHistoryPath = path.join(taskDirectory, GlobalFileNames.contextHistory)
			await getContextHistorySaveMutex(contextHistoryPath).withLock(async () => {
				// Atomic replacement prevents torn JSON. Re-reading and merging
				// under a process-wide, path-keyed mutex also prevents two manager
				// instances in the extension host from losing one another's updates.
				// Cross-process writers are deliberately unsupported; only the
				// parent extension-host manager persists this sidecar.
				if (mode === "merge") {
					const persisted = await this.getSavedContextHistory(taskDirectory)
					this.contextHistoryUpdates = this.mergeContextHistories(persisted, this.contextHistoryUpdates)
				}
				const serializedUpdates: SerializedContextHistory = Array.from(this.contextHistoryUpdates.entries()).map(
					([messageIndex, [numberValue, innerMap]]) => [messageIndex, [numberValue, Array.from(innerMap.entries())]],
				)
				await writeAtomic(contextHistoryPath, JSON.stringify(serializedUpdates))
			})
		} catch (error) {
			Logger.error("Failed to save context history:", error)
		}
	}

	private mergeContextHistories(
		persisted: Map<number, [number, Map<number, ContextUpdate[]>]>,
		pending: Map<number, [number, Map<number, ContextUpdate[]>]>,
	): Map<number, [number, Map<number, ContextUpdate[]>]> {
		for (const [messageIndex, [pendingType, pendingBlocks]] of pending) {
			const persistedEntry = persisted.get(messageIndex)
			if (!persistedEntry) {
				persisted.set(messageIndex, [pendingType, new Map(pendingBlocks)])
				continue
			}

			persistedEntry[0] = pendingType
			for (const [blockIndex, pendingUpdates] of pendingBlocks) {
				const existingUpdates = persistedEntry[1].get(blockIndex) ?? []
				const seen = new Set<string>()
				const merged = [...existingUpdates, ...pendingUpdates]
					.filter((update) => {
						const serialized = JSON.stringify(update)
						if (seen.has(serialized)) return false
						seen.add(serialized)
						return true
					})
					.sort((left, right) => left[0] - right[0])
				persistedEntry[1].set(blockIndex, merged)
			}
		}
		return persisted
	}

	/**
	 * Determine whether we should compact context window, based on token counts
	 */
	shouldCompactContextWindow(
		dietcodeMessages: DietCodeMessage[],
		api: ApiHandler,
		previousApiReqIndex: number,
		thresholdPercentage?: number,
	): boolean {
		if (previousApiReqIndex >= 0) {
			const totalTokens = this.getTotalTokens(dietcodeMessages[previousApiReqIndex])
			if (totalTokens === null) return false

			const { contextWindow, microCompactThreshold, emergencyCompactThreshold } = getContextWindowInfo(api)
			const hasExplicitThreshold =
				typeof thresholdPercentage === "number" && Number.isFinite(thresholdPercentage) && thresholdPercentage > 0
			const requestedThreshold = hasExplicitThreshold
				? Math.floor(contextWindow * thresholdPercentage)
				: emergencyCompactThreshold
			const thresholdTokens = Math.max(microCompactThreshold, Math.min(requestedThreshold, emergencyCompactThreshold))
			return totalTokens >= thresholdTokens
		}
		return false
	}

	private getTotalTokens(message: DietCodeMessage | undefined): number | null {
		if (!message?.text) return null
		try {
			const { tokensIn, tokensOut, cacheWrites, cacheReads }: DietCodeApiReqInfo = JSON.parse(message.text)
			const values = [tokensIn, tokensOut, cacheWrites, cacheReads].map((value) =>
				Number.isFinite(value) ? Math.max(0, Number(value)) : 0,
			)
			return values.reduce((total, value) => total + value, 0)
		} catch {
			return null
		}
	}

	/**
	 * Evaluates current token usage against multi-tier progressive safety thresholds
	 */
	public evaluateCompactionTier(totalTokens: number, api: ApiHandler): CompactionTier {
		return getCompactionTierFromTokens(totalTokens, api)
	}

	/**
	 * Get telemetry data for context management decisions
	 * Returns the token counts and context window info that drove summarization
	 */
	getContextTelemetryData(
		dietcodeMessages: DietCodeMessage[],
		api: ApiHandler,
		triggerIndex?: number,
	): {
		tokensUsed: number
		maxContextWindow: number
	} | null {
		// Use provided triggerIndex or fallback to automatic detection
		let targetIndex: number
		if (triggerIndex !== undefined) {
			targetIndex = triggerIndex
		} else {
			// Find all API request indices
			const apiReqIndices = dietcodeMessages
				.map((msg, index) => (msg.say === "api_req_started" ? index : -1))
				.filter((index) => index !== -1)

			// We want the second-to-last API request (the one that caused summarization)
			targetIndex = apiReqIndices.length >= 2 ? apiReqIndices[apiReqIndices.length - 2] : -1
		}

		if (targetIndex >= 0) {
			const tokensUsed = this.getTotalTokens(dietcodeMessages[targetIndex])
			if (tokensUsed !== null) {
				const { contextWindow } = getContextWindowInfo(api)
				return {
					tokensUsed,
					maxContextWindow: contextWindow,
				}
			}
		}
		return null
	}

	/**
	 * primary entry point for getting up to date context
	 */
	async getNewContextMessagesAndMetadata(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		dietcodeMessages: DietCodeMessage[],
		api: ApiHandler,
		conversationHistoryDeletedRange: [number, number] | undefined,
		previousApiReqIndex: number,
		taskDirectory: string,
		useAutoCondense: boolean, // option to use new auto-condense or old programmatic context management
	) {
		let updatedConversationHistoryDeletedRange = false
		const previousRequest = previousApiReqIndex >= 0 ? dietcodeMessages[previousApiReqIndex] : undefined
		const totalTokens = this.getTotalTokens(previousRequest)

		// Passive projection work is performed only at this request boundary.
		// It never mutates the source API history and never runs against an
		// active provider or tool stream.
		if (useAutoCondense && totalTokens !== null) {
			const tier = getCompactionTierFromTokens(totalTokens, api)
			if (tier !== "normal") {
				const startIndex = conversationHistoryDeletedRange ? conversationHistoryDeletedRange[1] + 1 : 2
				const result = await this.applyProgressiveContextCompaction(
					apiConversationHistory,
					startIndex,
					previousRequest?.ts ?? Date.now(),
					tier,
				)
				if (result.updatedMessageIndices.size > 0) {
					await this.saveContextHistory(taskDirectory)
				}
			}
		}

		if (!useAutoCondense) {
			// If the previous API request's total token usage is close to the context window, truncate the conversation history to free up space for the new request
			if (previousApiReqIndex >= 0) {
				const previousRequestText = dietcodeMessages[previousApiReqIndex]?.text
				if (previousRequestText) {
					const timestamp = dietcodeMessages[previousApiReqIndex].ts
					const parsedTotalTokens = this.getTotalTokens(dietcodeMessages[previousApiReqIndex])
					const { maxAllowedSize } = getContextWindowInfo(api)

					// This is the most reliable way to know when we're close to hitting the context window.
					if (parsedTotalTokens !== null && parsedTotalTokens >= maxAllowedSize) {
						// Since the user may switch between models with different context windows, truncating half may not be enough (ie if switching from claude 200k to deepseek 64k, half truncation will only remove 100k tokens, but we need to remove much more)
						// So if totalTokens/2 is greater than maxAllowedSize, we truncate 3/4 instead of 1/2
						const keep = parsedTotalTokens / 2 > maxAllowedSize ? "quarter" : "half"

						// Attempt file read optimization and check if we need to truncate
						let { anyContextUpdates, needToTruncate } = await this.attemptFileReadOptimizationCore(
							apiConversationHistory,
							conversationHistoryDeletedRange,
							timestamp,
							"emergency",
						)

						if (needToTruncate) {
							// go ahead with truncation
							anyContextUpdates = this.applyStandardContextTruncationNoticeChange(timestamp) || anyContextUpdates

							// NOTE: it's okay that we overwriteConversationHistory in resume task since we're only ever removing the last user message and not anything in the middle which would affect this range
							conversationHistoryDeletedRange = this.getNextTruncationRange(
								apiConversationHistory,
								conversationHistoryDeletedRange,
								keep,
							)

							updatedConversationHistoryDeletedRange = true
						}

						// if we alter the context history, save the updated version to disk
						if (anyContextUpdates) {
							await this.saveContextHistory(taskDirectory)
						}
					}
				}
			}
		}

		const truncatedConversationHistory = this.getAndAlterTruncatedMessages(
			apiConversationHistory,
			conversationHistoryDeletedRange,
		)

		return {
			conversationHistoryDeletedRange: conversationHistoryDeletedRange,
			updatedConversationHistoryDeletedRange: updatedConversationHistoryDeletedRange,
			truncatedConversationHistory: truncatedConversationHistory,
		}
	}

	/**
	 * get truncation range
	 */
	public getNextTruncationRange(
		apiMessages: Anthropic.Messages.MessageParam[],
		currentDeletedRange: [number, number] | undefined,
		keep: "none" | "lastTwo" | "half" | "quarter",
	): [number, number] {
		// We always keep the first user-assistant pairing, and truncate an even number of messages from there
		const rangeStartIndex = 2 // index 0 and 1 are kept
		const startOfRest = currentDeletedRange ? currentDeletedRange[1] + 1 : 2 // inclusive starting index

		let messagesToRemove: number
		if (keep === "none") {
			// Removes all messages beyond the first core user/assistant message pair
			messagesToRemove = Math.max(apiMessages.length - startOfRest, 0)
		} else if (keep === "lastTwo") {
			// Keep the last user-assistant pair in addition to the first core user/assistant message pair
			messagesToRemove = Math.max(apiMessages.length - startOfRest - 2, 0)
		} else if (keep === "half") {
			// Remove half of remaining user-assistant pairs
			// We first calculate half of the messages then divide by 2 to get the number of pairs.
			// After flooring, we multiply by 2 to get the number of messages.
			// Note that this will also always be an even number.
			messagesToRemove = Math.floor((apiMessages.length - startOfRest) / 4) * 2 // Keep even number
		} else {
			// Remove 3/4 of remaining user-assistant pairs
			// We calculate 3/4ths of the messages then divide by 2 to get the number of pairs.
			// After flooring, we multiply by 2 to get the number of messages.
			// Note that this will also always be an even number.
			messagesToRemove = Math.floor(((apiMessages.length - startOfRest) * 3) / 4 / 2) * 2
		}

		let rangeEndIndex = startOfRest + messagesToRemove - 1 // inclusive ending index

		// Make sure that the last message being removed is a assistant message, so the next message after the initial user-assistant pair is an assistant message. This preserves the user-assistant-user-assistant structure.
		// NOTE: anthropic format messages are always user-assistant-user-assistant, while openai format messages can have multiple user messages in a row (we use anthropic format throughout dietcode)
		if (apiMessages[rangeEndIndex] && apiMessages[rangeEndIndex].role !== "assistant") {
			rangeEndIndex -= 1
		}

		// this is an inclusive range that will be removed from the conversation history
		return [rangeStartIndex, rangeEndIndex]
	}

	/**
	 * external interface to support old calls
	 */
	public getTruncatedMessages(
		messages: Anthropic.Messages.MessageParam[],
		deletedRange: [number, number] | undefined,
	): Anthropic.Messages.MessageParam[] {
		return this.getAndAlterTruncatedMessages(messages, deletedRange)
	}

	/**
	 * Adds model-facing interpretation rules only when the already-sanitized
	 * request contains a trusted, ledger-created projection marker.
	 */
	public getSystemPromptForProjection(systemPrompt: string, requestMessages: Anthropic.Messages.MessageParam[]): string {
		if (systemPrompt.includes(CONTEXT_PROJECTION_POLICY_MARKER) || !this.containsTrustedSystemProjection(requestMessages)) {
			return systemPrompt
		}
		return `${systemPrompt}\n\n${CONTEXT_PROJECTION_SYSTEM_INSTRUCTION}`
	}

	/**
	 * apply all required truncation methods to the messages in context
	 */
	private getAndAlterTruncatedMessages(
		messages: Anthropic.Messages.MessageParam[],
		deletedRange: [number, number] | undefined,
	): Anthropic.Messages.MessageParam[] {
		if (messages.length === 0) {
			return messages
		}

		ensureContextIdentifiers(messages)
		const rawBlocksByIdentity = this.indexBlocksByContextIdentity(messages)
		const sanitizedSource = this.escapeReservedMarkersInSourceMessages(messages)
		if (messages.length === 1) {
			return sanitizedSource
		}
		const updatedMessages = this.applyContextHistoryUpdates(
			sanitizedSource,
			deletedRange ? deletedRange[1] + 1 : 2,
			rawBlocksByIdentity,
		)

		// Validate and fix tool_use/tool_result pairing
		this.ensureToolResultsFollowToolUse(updatedMessages)

		// OLD NOTE: if you try to Logger log these, don't forget that logging a reference to an array may not provide the same result as logging a slice() snapshot of that array at that exact moment. The following DOES in fact include the latest assistant message.
		return updatedMessages
	}

	private escapeReservedMarkersInSourceMessages(
		messages: Anthropic.Messages.MessageParam[],
	): Anthropic.Messages.MessageParam[] {
		let clonedMessages: Anthropic.Messages.MessageParam[] | undefined

		for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
			const message = messages[messageIndex]
			if (typeof message.content === "string") {
				const escaped = this.escapeReservedProjectionMarkers(message.content)
				if (escaped === message.content) continue
				clonedMessages ??= messages.slice()
				clonedMessages[messageIndex] = { ...message, content: escaped }
				continue
			}

			let clonedMessage: Anthropic.Messages.MessageParam | undefined
			for (let blockIndex = 0; blockIndex < message.content.length; blockIndex++) {
				const block = message.content[blockIndex]
				const text = this.getTextFromBlock(block)
				if (!text) continue
				const escaped = this.escapeReservedProjectionMarkers(text)
				if (escaped === text) continue

				clonedMessages ??= messages.slice()
				clonedMessage ??= cloneDeep(message)
				const clonedBlock = Array.isArray(clonedMessage.content) ? clonedMessage.content[blockIndex] : undefined
				if (clonedBlock) this.setTextInBlock(clonedBlock, escaped)
			}

			if (clonedMessage && clonedMessages) clonedMessages[messageIndex] = clonedMessage
		}

		return clonedMessages ?? messages
	}

	private containsTrustedSystemProjection(messages: Anthropic.Messages.MessageParam[]): boolean {
		const trustedUpdates = this.getLatestIdentityProjectionUpdates()
		for (const message of messages) {
			if (!Array.isArray(message.content)) continue
			const messageId = getMessageContextId(message)
			if (!messageId) continue
			for (const block of message.content) {
				const blockId = getBlockContextId(block)
				if (!blockId) continue
				const trustedUpdate = trustedUpdates.get(this.getProjectionIdentityKey(messageId, blockId))
				const text = this.getTextFromBlock(block)
				if (trustedUpdate && text === trustedUpdate[2][0] && text.startsWith(TRUSTED_SYSTEM_PROJECTION_PREFIX)) {
					return true
				}
			}
		}
		return false
	}

	private indexBlocksByContextIdentity(
		messages: Anthropic.Messages.MessageParam[],
	): Map<string, Anthropic.Messages.ContentBlockParam> {
		const indexed = new Map<string, Anthropic.Messages.ContentBlockParam>()
		for (const message of messages) {
			if (!Array.isArray(message.content)) continue
			const messageId = getMessageContextId(message)
			if (!messageId) continue
			for (const block of message.content) {
				const blockId = getBlockContextId(block)
				if (blockId) indexed.set(this.getProjectionIdentityKey(messageId, blockId), block)
			}
		}
		return indexed
	}

	/**
	 * Ensures that every tool_use block in assistant messages has a corresponding tool_result in the next user message,
	 * and that tool_result blocks immediately follow their corresponding tool_use blocks
	 */
	private ensureToolResultsFollowToolUse(messages: Anthropic.Messages.MessageParam[]): void {
		for (let i = 0; i < messages.length - 1; i++) {
			const message = messages[i]

			// Only process assistant messages with content
			if (message.role !== "assistant" || !Array.isArray(message.content)) {
				continue
			}

			// Extract tool_use IDs in order
			const toolUseIds: string[] = []
			for (const block of message.content) {
				if (block.type === "tool_use" && block.id) {
					toolUseIds.push(block.id)
				}
			}

			// Skip if no tool_use blocks found
			if (toolUseIds.length === 0) {
				continue
			}

			const nextMessage = messages[i + 1]

			// Skip if next message is not a user message
			if (nextMessage.role !== "user") {
				continue
			}

			// Ensure content is an array
			if (!Array.isArray(nextMessage.content)) {
				nextMessage.content = []
			}

			// Separate tool_results from other blocks in a single pass
			const toolResultMap = new Map<string, Anthropic.Messages.ToolResultBlockParam>()
			const otherBlocks: Anthropic.Messages.ContentBlockParam[] = []
			let needsUpdate = false

			for (const block of nextMessage.content) {
				if (block.type === "tool_result" && block.tool_use_id) {
					toolResultMap.set(block.tool_use_id, block)
				} else {
					otherBlocks.push(block)
				}
			}

			// Check if reordering is needed (tool_results not at start in correct order)
			if (toolResultMap.size > 0) {
				let expectedIndex = 0
				for (let j = 0; j < nextMessage.content.length && expectedIndex < toolUseIds.length; j++) {
					const block = nextMessage.content[j]
					if (block.type === "tool_result" && block.tool_use_id === toolUseIds[expectedIndex]) {
						expectedIndex++
					} else if (block.type === "tool_result" || expectedIndex < toolUseIds.length) {
						needsUpdate = true
						break
					}
				}
				if (!needsUpdate && expectedIndex < toolResultMap.size) {
					needsUpdate = true
				}
			}

			// Add missing tool_results
			for (const toolUseId of toolUseIds) {
				if (!toolResultMap.has(toolUseId)) {
					toolResultMap.set(toolUseId, {
						type: "tool_result",
						tool_use_id: toolUseId,
						content: "result missing",
					})
					needsUpdate = true
				}
			}

			// Only modify if changes are needed
			if (!needsUpdate) {
				continue
			}

			// Build new content: tool_results first (in toolUseIds order), then other blocks
			const newContent: Anthropic.Messages.ContentBlockParam[] = []

			// Add tool_results in the order of toolUseIds
			const processedToolResults = new Set<string>()
			for (const toolUseId of toolUseIds) {
				const toolResult = toolResultMap.get(toolUseId)
				if (toolResult) {
					newContent.push(toolResult)
					processedToolResults.add(toolUseId)
				}
			}

			// Add all other blocks
			newContent.push(...otherBlocks)

			// Clone and update the message
			const clonedMessage = cloneDeep(nextMessage)
			clonedMessage.content = newContent
			messages[i + 1] = clonedMessage
		}
	}

	/**
	 * applies deletedRange truncation and other alterations based on changes in this.contextHistoryUpdates
	 */
	private applyContextHistoryUpdates(
		messages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
		rawBlocksByIdentity: Map<string, Anthropic.Messages.ContentBlockParam>,
	): Anthropic.Messages.MessageParam[] {
		// runtime is linear in length of user messages, if expecting a limited number of alterations, could be more optimal to loop over alterations

		const firstChunk = messages.slice(0, 2) // get first user-assistant pair
		const secondChunk = messages.slice(startFromIndex) // get remaining messages within context
		const messagesToUpdate = [...firstChunk, ...secondChunk]

		// Remove orphaned tool_results from the first message after truncation (if it's a user message)
		if (startFromIndex > 2 && messagesToUpdate.length > 2) {
			const firstMessageAfterTruncation = messagesToUpdate[2]
			if (firstMessageAfterTruncation.role === "user" && Array.isArray(firstMessageAfterTruncation.content)) {
				const hasToolResults = firstMessageAfterTruncation.content.some((block) => block.type === "tool_result")
				if (hasToolResults) {
					// Clone and filter out all tool_result blocks
					messagesToUpdate[2] = cloneDeep(firstMessageAfterTruncation)
					;(messagesToUpdate[2].content as Anthropic.Messages.ContentBlockParam[]) = (
						firstMessageAfterTruncation.content as Anthropic.Messages.ContentBlockParam[]
					).filter((block) => block.type !== "tool_result")
				}
			}
		}

		// we need the mapping from the local indices in messagesToUpdate to the global array of updates in this.contextHistoryUpdates
		const originalIndices = [
			...Array(2).keys(),
			...Array(secondChunk.length)
				.fill(0)
				.map((_, i) => i + startFromIndex),
		]
		const identityUpdates = this.getLatestIdentityProjectionUpdates()

		for (let arrayIndex = 0; arrayIndex < messagesToUpdate.length; arrayIndex++) {
			const messageIndex = originalIndices[arrayIndex]
			const innerTuple = this.contextHistoryUpdates.get(messageIndex)
			const message = messagesToUpdate[arrayIndex]
			if (!Array.isArray(message.content)) continue
			const messageId = getMessageContextId(message)
			let clonedMessage: Anthropic.Messages.MessageParam | undefined

			for (let blockIndex = 0; blockIndex < message.content.length; blockIndex++) {
				const sourceBlock = message.content[blockIndex]
				const blockId = getBlockContextId(sourceBlock)
				const identityKey = messageId && blockId ? this.getProjectionIdentityKey(messageId, blockId) : undefined
				const identityCandidate = identityKey ? identityUpdates.get(identityKey) : undefined
				const identityChange =
					identityCandidate &&
					identityKey &&
					this.canApplyIdentityUpdate(identityCandidate, rawBlocksByIdentity.get(identityKey))
						? identityCandidate
						: undefined
				const positionalChange = innerTuple?.[1].get(blockIndex)?.at(-1)
				const safePositionalChange =
					positionalChange && this.canApplyPositionalUpdate(positionalChange, sourceBlock)
						? positionalChange
						: undefined
				const latestChange =
					identityChange && safePositionalChange
						? identityChange[0] >= safePositionalChange[0]
							? identityChange
							: safePositionalChange
						: (identityChange ?? safePositionalChange)

				if (latestChange?.[1] !== "text") continue
				clonedMessage ??= cloneDeep(message)
				const targetBlock = Array.isArray(clonedMessage.content) ? clonedMessage.content[blockIndex] : undefined
				if (targetBlock) {
					this.setTextInBlock(targetBlock, latestChange[2][0])
				}
			}

			if (clonedMessage) messagesToUpdate[arrayIndex] = clonedMessage
		}

		return messagesToUpdate
	}

	private getLatestIdentityProjectionUpdates(): Map<string, ContextUpdate> {
		const identityUpdates = new Map<string, ContextUpdate>()
		for (const [key, updates] of this.getIdentityProjectionUpdateArrays()) {
			const latestUpdate = this.getLatestProjectionUpdateForIdentity(updates, key)
			if (latestUpdate) identityUpdates.set(key, latestUpdate)
		}
		return identityUpdates
	}

	private getLatestProjectionUpdateForIdentity(updates: ContextUpdate[], identityKey: string): ContextUpdate | undefined {
		for (let index = updates.length - 1; index >= 0; index--) {
			const update = updates[index]
			if (this.getProjectionIdentityFromUpdate(update) === identityKey) return update
		}
		return undefined
	}

	private getProjectionIdentityFromUpdate(update: ContextUpdate): string | undefined {
		const metadata = update[3]?.[0]
		if (metadata?.[0] !== RECOVERABLE_PROJECTION_V2 || !metadata[3] || !metadata[4]) return undefined
		return this.getProjectionIdentityKey(metadata[3], metadata[4])
	}

	private getProjectionIdentityKey(messageId: string, blockId: string): string {
		return `${messageId}\0${blockId}`
	}

	private canApplyPositionalUpdate(update: ContextUpdate, sourceBlock: Anthropic.Messages.ContentBlockParam): boolean {
		const metadata = update[3]?.[0]
		if (metadata?.[0] === RECOVERABLE_PROJECTION_V2) {
			// V2 updates are applied exclusively through immutable identity.
			return false
		}
		if (metadata?.[0] !== RECOVERABLE_PROJECTION_V1) return true

		// Legacy positional projections are accepted only if their digest still
		// matches the block at that coordinate. This turns index rot into a safe
		// miss instead of projecting the wrong source evidence.
		const sourceText = this.getTextFromBlock(sourceBlock)
		const expectedSha256 = metadata[2]
		return (
			typeof sourceText === "string" &&
			typeof expectedSha256 === "string" &&
			createHash("sha256").update(sourceText).digest("hex") === expectedSha256
		)
	}

	private canApplyIdentityUpdate(
		update: ContextUpdate,
		sourceBlock: Anthropic.Messages.ContentBlockParam | undefined,
	): boolean {
		if (!sourceBlock) return false
		const sourceText = this.getTextFromBlock(sourceBlock)
		const expectedSha256 = update[3]?.[0]?.[2]
		if (typeof sourceText !== "string" || typeof expectedSha256 !== "string") return false

		// An in-memory subagent conversation may already contain this manager's
		// exact projected replacement. Otherwise the stable identity must still
		// resolve to source bytes matching the recorded digest.
		return sourceText === update[2][0] || createHash("sha256").update(sourceText).digest("hex") === expectedSha256
	}

	/**
	 * removes all context history updates that occurred after the specified timestamp and saves to disk
	 */
	async truncateContextHistory(timestamp: number, taskDirectory: string): Promise<void> {
		this.truncateContextHistoryAtTimestamp(this.contextHistoryUpdates, timestamp)

		// save the modified context history to disk
		await this.saveContextHistory(taskDirectory, "replace")
	}

	/**
	 * alters the context history to remove all alterations after a given timestamp
	 * removes the index if there are no alterations there anymore, both outer and inner indices
	 */
	private truncateContextHistoryAtTimestamp(
		contextHistory: Map<number, [number, Map<number, ContextUpdate[]>]>,
		timestamp: number,
	): void {
		for (const [messageIndex, [_, innerMap]] of contextHistory) {
			// track which blockIndices to delete
			const blockIndicesToDelete: number[] = []

			// loop over the innerIndices of the messages in this block
			for (const [blockIndex, updates] of innerMap) {
				// updates ordered by timestamp, so find cutoff point by iterating from right to left
				let cutoffIndex = updates.length - 1
				while (cutoffIndex >= 0 && updates[cutoffIndex][0] > timestamp) {
					cutoffIndex--
				}

				// If we found updates to remove
				if (cutoffIndex < updates.length - 1) {
					// Modify the array in place to keep only updates up to cutoffIndex
					updates.length = cutoffIndex + 1

					// If no updates left after truncation, mark this block for deletion
					if (updates.length === 0) {
						blockIndicesToDelete.push(blockIndex)
					}
				}
			}

			// Remove empty blocks from inner map
			for (const blockIndex of blockIndicesToDelete) {
				innerMap.delete(blockIndex)
			}

			// If inner map is now empty, remove the message index from outer map
			if (innerMap.size === 0) {
				contextHistory.delete(messageIndex)
			}
		}
	}

	/**
	 * applies the context optimization steps and returns whether any changes were made
	 */
	public applyContextOptimizations(
		apiMessages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
		timestamp: number,
	): [boolean, Set<number>] {
		const [fileReadUpdatesBool, uniqueFileReadIndices] = this.findAndPotentiallySaveFileReadContextHistoryUpdates(
			apiMessages,
			startFromIndex,
			timestamp,
		)

		// true if any context optimization steps alter state
		const contextHistoryUpdated = fileReadUpdatesBool

		return [contextHistoryUpdated, uniqueFileReadIndices]
	}

	/**
	 * Private helper that attempts file read optimization and checks threshold.
	 */
	private async attemptFileReadOptimizationCore(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		conversationHistoryDeletedRange: [number, number] | undefined,
		timestamp: number,
		tier: CompactionTier = "emergency",
		recoverySource = GlobalFileNames.apiConversationHistory,
		enableLegacyDuplicateOptimization = true,
	): Promise<{
		anyContextUpdates: boolean
		needToTruncate: boolean
		percentSaved: number
		references: RecoverableContextReference[]
	}> {
		const startIndex = conversationHistoryDeletedRange ? conversationHistoryDeletedRange[1] + 1 : 2
		const limits = this.getProgressiveCompactionLimits(tier)
		// The legacy duplicate-read optimizer predates bounded progressive
		// compaction. Restrict its emergency work to the same message budget so
		// a single request boundary never performs an unbounded history scan.
		const duplicateScanStart = Math.max(startIndex, apiConversationHistory.length - limits.maxMessagesPerPass)

		const [fileReadUpdates, uniqueFileReadIndices] = enableLegacyDuplicateOptimization
			? this.applyContextOptimizations(apiConversationHistory, duplicateScanStart, timestamp)
			: [false, new Set<number>()]
		const progressiveResult = await this.applyProgressiveContextCompaction(
			apiConversationHistory,
			startIndex,
			timestamp,
			tier,
			recoverySource,
		)
		for (const messageIndex of progressiveResult.updatedMessageIndices) {
			uniqueFileReadIndices.add(messageIndex)
		}
		const anyContextUpdates = fileReadUpdates || progressiveResult.compactedBlocks > 0

		if (!anyContextUpdates) {
			return {
				anyContextUpdates: false,
				needToTruncate: true,
				percentSaved: 0,
				references: progressiveResult.references,
			}
		}

		const percentSaved = this.calculateContextOptimizationMetrics(
			apiConversationHistory,
			conversationHistoryDeletedRange,
			uniqueFileReadIndices,
		)

		return {
			anyContextUpdates: true,
			needToTruncate: percentSaved < 0.3,
			percentSaved,
			references: progressiveResult.references,
		}
	}

	/**
	 * Public helper that attempts file read optimization and saves to disk.
	 */
	async attemptFileReadOptimization(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		conversationHistoryDeletedRange: [number, number] | undefined,
		dietcodeMessages: DietCodeMessage[],
		previousApiReqIndex: number,
		taskDirectory: string,
		api?: ApiHandler,
	): Promise<boolean> {
		// Extract timestamp using same logic as getNewContextMessagesAndMetadata
		if (previousApiReqIndex < 0) {
			return true
		}

		const previousRequest = dietcodeMessages[previousApiReqIndex]
		if (!previousRequest || !previousRequest.text) {
			return true
		}

		const timestamp = previousRequest.ts

		const { anyContextUpdates, needToTruncate, percentSaved } = await this.attemptFileReadOptimizationCore(
			apiConversationHistory,
			conversationHistoryDeletedRange,
			timestamp,
			"emergency",
		)

		if (anyContextUpdates) {
			await this.saveContextHistory(taskDirectory)
		}

		if (api) {
			const totalTokens = this.getTotalTokens(previousRequest)
			if (totalTokens !== null) {
				const estimatedTokensAfterProjection = Math.ceil(totalTokens * Math.max(0, 1 - percentSaved))
				return estimatedTokensAfterProjection >= getContextWindowInfo(api).ledgerCompactThreshold
			}
		}

		return needToTruncate
	}

	/**
	 * Public helper that attempts file read optimization in memory without persisting context history.
	 */
	public async attemptFileReadOptimizationInMemory(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		conversationHistoryDeletedRange: [number, number] | undefined,
		timestamp: number,
		tier: CompactionTier = "emergency",
		recoverySource = "subagent_transcript",
	): Promise<{
		anyContextUpdates: boolean
		needToTruncate: boolean
		optimizedConversationHistory: Anthropic.Messages.MessageParam[]
		references: RecoverableContextReference[]
	}> {
		const { anyContextUpdates, needToTruncate, references } = await this.attemptFileReadOptimizationCore(
			apiConversationHistory,
			conversationHistoryDeletedRange,
			timestamp,
			tier,
			recoverySource,
			false,
		)

		if (!anyContextUpdates) {
			return {
				anyContextUpdates: false,
				needToTruncate: true,
				optimizedConversationHistory: apiConversationHistory,
				references,
			}
		}

		return {
			anyContextUpdates: true,
			needToTruncate,
			optimizedConversationHistory: this.getTruncatedMessages(apiConversationHistory, conversationHistoryDeletedRange),
			references,
		}
	}

	/**
	 * Performs one bounded pass over old, high-volume tool results. Replacements
	 * are prompt projections only: the original blocks remain in
	 * api_conversation_history.json
	 * and every projection carries an exact message/block reference and digest.
	 */
	public async applyProgressiveContextCompaction(
		apiMessages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
		timestamp: number,
		tier: CompactionTier,
		recoverySource = GlobalFileNames.apiConversationHistory,
		trigger = "turn_boundary",
	): Promise<ProgressiveCompactionResult> {
		const effectiveRecoverySource =
			this.centralStore && this.scope ? this.centralStore.getRecoverySource(this.scope.id) : recoverySource
		const historyBefore = this.cloneContextHistory(this.contextHistoryUpdates)
		const cursorBefore = this.getProgressiveCompactionCursor()
		const startedAt = Date.now()
		const result = this.planProgressiveContextCompaction(
			apiMessages,
			startFromIndex,
			timestamp,
			tier,
			effectiveRecoverySource,
		)
		if (!this.centralStore || !this.scope || result.scannedMessages === 0) {
			return result
		}

		try {
			const records = this.buildCentralProjectionRecords(apiMessages, result.references, tier)
			await this.centralStore.commit({
				scopeId: this.scope.id,
				scopeKind: this.scope.kind,
				workspaceId: this.scope.workspaceId,
				recoverySource: effectiveRecoverySource,
				records,
				cursor: this.getProgressiveCompactionCursor(),
				run: {
					trigger,
					tier,
					scannedMessages: result.scannedMessages,
					scannedBlocks: result.scannedBlocks,
					compactedBlocks: result.compactedBlocks,
					originalCharacters: result.originalCharacters,
					projectedCharacters: result.projectedCharacters,
					startedAt,
					completedAt: Date.now(),
				},
			})
			return result
		} catch (error) {
			if (result.references.length === 0) {
				Logger.debug("[ContextManager] Central cursor checkpoint failed; retaining in-process cursor:", error)
				return result
			}
			// Fail closed: a marker is never exposed unless its exact source and
			// projection metadata crossed BroccoliDB's explicit flush barrier.
			this.contextHistoryUpdates = historyBefore
			this.progressiveScanCursor = cursorBefore.messageOffset
			this.progressiveBlockCursor = cursorBefore.blockOffset
			this.progressiveCursorActiveStart = cursorBefore.activeStart
			Logger.debug("[ContextManager] Central compaction commit failed; preserving raw context:", error)
			return {
				...result,
				compactedBlocks: 0,
				originalCharacters: 0,
				projectedCharacters: 0,
				updatedMessageIndices: new Set<number>(),
				references: [],
			}
		}
	}

	private planProgressiveContextCompaction(
		apiMessages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
		timestamp: number,
		tier: CompactionTier,
		recoverySource = GlobalFileNames.apiConversationHistory,
	): ProgressiveCompactionResult {
		// Legacy histories are upgraded in place with prompt-invisible IDs.
		// MessageStateHandler persists these IDs; in-memory subagent histories
		// retain them for the lifetime of the governed run.
		ensureContextIdentifiers(apiMessages)
		const limits = this.getProgressiveCompactionLimits(tier)
		const updatedMessageIndices = new Set<number>()
		const references: RecoverableContextReference[] = []
		const activeStart = Math.max(2, startFromIndex)
		if (activeStart !== this.progressiveCursorActiveStart) {
			this.progressiveScanCursor = 0
			this.progressiveBlockCursor = 0
			this.progressiveCursorActiveStart = activeStart
		}
		const endExclusive = Math.max(activeStart, apiMessages.length - limits.preserveRecentMessages)
		const eligibleMessages = endExclusive - activeStart

		if (tier === "normal" || eligibleMessages <= 0) {
			return {
				tier,
				scannedMessages: 0,
				scannedBlocks: 0,
				compactedBlocks: 0,
				originalCharacters: 0,
				projectedCharacters: 0,
				updatedMessageIndices,
				references,
			}
		}

		const scanCount = Math.min(eligibleMessages, limits.maxMessagesPerPass)
		const initialOffset = this.progressiveScanCursor % eligibleMessages
		let scannedMessages = 0
		let scannedBlocks = 0
		let compactedBlocks = 0
		let originalCharacters = 0
		let projectedCharacters = 0
		let stoppedWithinMessage = false
		const identityUpdateArrays = this.getIdentityProjectionUpdateArrays()

		messageScan: for (let offset = 0; offset < scanCount; offset++) {
			const messageIndex = activeStart + ((initialOffset + offset) % eligibleMessages)
			const message = apiMessages[messageIndex]
			scannedMessages++
			if (message.role !== "user" || !Array.isArray(message.content)) continue
			const messageId = getMessageContextId(message)
			if (!messageId) continue

			const firstBlockIndex = offset === 0 ? Math.min(this.progressiveBlockCursor, message.content.length) : 0
			for (let blockIndex = firstBlockIndex; blockIndex < message.content.length; blockIndex++) {
				if (scannedBlocks >= limits.maxBlocksInspectedPerPass || compactedBlocks >= limits.maxBlocksPerPass) {
					this.progressiveScanCursor = (initialOffset + offset) % eligibleMessages
					this.progressiveBlockCursor = blockIndex
					stoppedWithinMessage = true
					break messageScan
				}
				scannedBlocks++
				const block = message.content[blockIndex]
				const blockId = getBlockContextId(block)
				if (!blockId) continue
				const text = this.getTextFromBlock(block)
				if (!text || !this.hasMinimumLineCount(text, limits.minLinesToCompact)) continue
				const identityUpdates = identityUpdateArrays.get(this.getProjectionIdentityKey(messageId, blockId))
				const positionalUpdates = this.contextHistoryUpdates.get(messageIndex)?.[1].get(blockIndex)
				const identityKey = this.getProjectionIdentityKey(messageId, blockId)
				const latestUpdate = identityUpdates
					? this.getLatestProjectionUpdateForIdentity(identityUpdates, identityKey)
					: positionalUpdates?.at(-1)
				const projectionVersion = latestUpdate?.[3]?.[0]?.[0]
				const isPreviousRecoverableProjection =
					projectionVersion === RECOVERABLE_PROJECTION_V1 || projectionVersion === RECOVERABLE_PROJECTION_V2
				if (latestUpdate && !isPreviousRecoverableProjection) continue
				if (projectionVersion === RECOVERABLE_PROJECTION_V2) {
					const expectedSha256 = latestUpdate?.[3]?.[0]?.[2]
					// Parent histories still expose the original bytes and may
					// refine them at a stricter tier. A subagent's active view may
					// already contain the projection; never hash or persist that
					// projection as though it were the recoverable source.
					if (
						text === latestUpdate?.[2]?.[0] ||
						typeof expectedSha256 !== "string" ||
						createHash("sha256").update(text).digest("hex") !== expectedSha256
					) {
						continue
					}
				}

				const toolName = this.resolveToolResultName(apiMessages, messageIndex, block, text)
				const projection = this.projectToolResult(toolName, text, limits.maxProjectedLines)
				if (!projection || projection.foldedLines <= 0) continue

				const recoveryReference = `${messageId}:${blockId}`
				const reference: RecoverableContextReference = {
					source: recoverySource,
					ref: recoveryReference,
					messageId,
					blockId,
					sha256: projection.sha256,
					originalCharacters: text.length,
					originalLines: projection.originalLines,
				}
				const pointer = this.createSystemProjectionMarker(reference)
				const replacement = `${pointer}\n${this.escapeReservedProjectionMarkers(projection.text)}`
				const currentProjectionLength = latestUpdate?.[2]?.[0]?.length ?? text.length

				// Avoid churn when a small or pathologically dense result would
				// become larger, or when a later pass cannot improve an
				// already compacted projection by a meaningful amount. A v1
				// positional pointer is always allowed to migrate to v2 identity.
				if (
					replacement.length >= text.length * 0.9 ||
					(projectionVersion !== RECOVERABLE_PROJECTION_V1 && replacement.length >= currentProjectionLength * 0.95)
				) {
					continue
				}

				const innerTuple = this.contextHistoryUpdates.get(messageIndex)
				const innerMap = innerTuple?.[1] ?? new Map<number, ContextUpdate[]>()
				const updates = [...(identityUpdates ?? innerMap.get(blockIndex) ?? [])]
				updates.push([
					timestamp,
					"text",
					[replacement],
					[[RECOVERABLE_PROJECTION_V2, recoveryReference, reference.sha256, messageId, blockId, recoverySource]],
				])
				innerMap.set(blockIndex, updates)
				if (!innerTuple) {
					this.contextHistoryUpdates.set(messageIndex, [EditType.TOOL_RESULT_COMPACTION, innerMap])
				}

				updatedMessageIndices.add(messageIndex)
				references.push(reference)
				compactedBlocks++
				originalCharacters += text.length
				projectedCharacters += replacement.length
			}
		}

		if (!stoppedWithinMessage) {
			this.progressiveScanCursor = eligibleMessages > 0 ? (initialOffset + scannedMessages) % eligibleMessages : 0
			this.progressiveBlockCursor = 0
		}
		return {
			tier,
			scannedMessages,
			scannedBlocks,
			compactedBlocks,
			originalCharacters,
			projectedCharacters,
			updatedMessageIndices,
			references,
		}
	}

	private cloneContextHistory(
		source: Map<number, [number, Map<number, ContextUpdate[]>]>,
	): Map<number, [number, Map<number, ContextUpdate[]>]> {
		return new Map(
			[...source].map(([messageIndex, [editType, blocks]]) => [
				messageIndex,
				[
					editType,
					new Map(
						[...blocks].map(([blockIndex, updates]) => [
							blockIndex,
							updates.map(
								([updateTimestamp, updateType, content, metadata]): ContextUpdate => [
									updateTimestamp,
									updateType,
									[...content],
									metadata.map((row) => [...row]),
								],
							),
						]),
					),
				],
			]),
		)
	}

	private buildCentralProjectionRecords(
		apiMessages: Anthropic.Messages.MessageParam[],
		references: RecoverableContextReference[],
		tier: CompactionTier,
	): ContextCompactionProjectionInput[] {
		const sourceByIdentity = new Map<string, string>()
		for (const message of apiMessages) {
			if (!Array.isArray(message.content)) continue
			const messageId = getMessageContextId(message)
			if (!messageId) continue
			for (const block of message.content) {
				const blockId = getBlockContextId(block)
				const text = blockId ? this.getTextFromBlock(block) : null
				if (blockId && text !== null) {
					sourceByIdentity.set(this.getProjectionIdentityKey(messageId, blockId), text)
				}
			}
		}
		const updates = this.getLatestIdentityProjectionUpdates()
		return references.map((reference) => {
			const identityKey = this.getProjectionIdentityKey(reference.messageId, reference.blockId)
			const sourceText = sourceByIdentity.get(identityKey)
			const projectionText = updates.get(identityKey)?.[2]?.[0]
			if (sourceText === undefined || projectionText === undefined) {
				throw new Error(`Unable to materialize central context projection ${reference.ref}`)
			}
			if (createHash("sha256").update(sourceText).digest("hex") !== reference.sha256) {
				throw new Error(`Central context source digest mismatch for ${reference.ref}`)
			}
			return {
				messageId: reference.messageId,
				blockId: reference.blockId,
				ref: reference.ref,
				sourceLocator: reference.source,
				sourceText,
				sourceSha256: reference.sha256,
				projectionText,
				projectionSha256: createHash("sha256").update(projectionText).digest("hex"),
				tier,
				tierRank: this.getCompactionTierRank(tier),
				originalCharacters: reference.originalCharacters,
				originalLines: reference.originalLines,
			}
		})
	}

	private getCompactionTierRank(tier: CompactionTier): number {
		const ranks: Record<CompactionTier, number> = {
			normal: 0,
			micro: 1,
			ast_prune: 2,
			semantic_compact: 3,
			zero_loss_ledger: 4,
			hyper_compressed: 5,
			emergency: 6,
		}
		return ranks[tier]
	}

	public getProgressiveCompactionCursor(): ProgressiveCompactionCursor {
		return {
			messageOffset: this.progressiveScanCursor,
			blockOffset: this.progressiveBlockCursor,
			activeStart: this.progressiveCursorActiveStart,
		}
	}

	private getIdentityProjectionUpdateArrays(): Map<string, ContextUpdate[]> {
		const indexed = new Map<string, ContextUpdate[]>(this.centralProjectionUpdates)
		const latestTimestampByIdentity = new Map<string, number>()
		for (const [key, updates] of this.centralProjectionUpdates) {
			latestTimestampByIdentity.set(key, updates.at(-1)?.[0] ?? 0)
		}
		for (const [, innerMap] of this.contextHistoryUpdates.values()) {
			for (const updates of innerMap.values()) {
				for (const update of updates) {
					const key = this.getProjectionIdentityFromUpdate(update)
					if (!key) continue
					const latestTimestamp = latestTimestampByIdentity.get(key)
					if (latestTimestamp === undefined || update[0] >= latestTimestamp) {
						indexed.set(key, updates)
						latestTimestampByIdentity.set(key, update[0])
					}
				}
			}
		}
		return indexed
	}

	private createSystemProjectionMarker(reference: RecoverableContextReference): string {
		return `<${SYSTEM_PROJECTION_MARKER} schema="2" authority="lumi_internal" callable="false" ref="${this.escapeXmlAttribute(reference.ref)}" source="${this.escapeXmlAttribute(reference.source)}" sha256="${reference.sha256}" original_lines="${reference.originalLines}" syntax_fidelity="non_authoritative"/>`
	}

	private escapeXmlAttribute(value: string): string {
		return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
	}

	private escapeReservedProjectionMarkers(value: string): string {
		return value.replace(
			/<(\/?)system_context_projection\b/gi,
			(_match, closing: string) => `&lt;${closing}${SYSTEM_PROJECTION_MARKER}`,
		)
	}

	private getProgressiveCompactionLimits(tier: CompactionTier): ProgressiveCompactionLimits {
		switch (tier) {
			case "micro":
				return {
					maxMessagesPerPass: 160,
					maxBlocksPerPass: 8,
					maxBlocksInspectedPerPass: 64,
					preserveRecentMessages: 8,
					minLinesToCompact: 600,
					maxProjectedLines: 180,
				}
			case "ast_prune":
			case "semantic_compact":
				return {
					maxMessagesPerPass: 320,
					maxBlocksPerPass: 16,
					maxBlocksInspectedPerPass: 128,
					preserveRecentMessages: 6,
					minLinesToCompact: 320,
					maxProjectedLines: 140,
				}
			case "zero_loss_ledger":
				return {
					maxMessagesPerPass: 640,
					maxBlocksPerPass: 32,
					maxBlocksInspectedPerPass: 256,
					preserveRecentMessages: 4,
					minLinesToCompact: 160,
					maxProjectedLines: 100,
				}
			case "hyper_compressed":
			case "emergency":
				return {
					maxMessagesPerPass: 1_200,
					maxBlocksPerPass: 64,
					maxBlocksInspectedPerPass: 512,
					preserveRecentMessages: 2,
					minLinesToCompact: 80,
					maxProjectedLines: 72,
				}
			default:
				return {
					maxMessagesPerPass: 0,
					maxBlocksPerPass: 0,
					maxBlocksInspectedPerPass: 0,
					preserveRecentMessages: 8,
					minLinesToCompact: Number.MAX_SAFE_INTEGER,
					maxProjectedLines: 180,
				}
		}
	}

	private resolveToolResultName(
		apiMessages: Anthropic.Messages.MessageParam[],
		messageIndex: number,
		block: Anthropic.Messages.ContentBlockParam,
		text: string,
	): string | undefined {
		const headerMatch = text.match(/^\[([^\s\]]+)(?:\s+for\b[^\]]*)?\]\s+Result:/)
		if (headerMatch?.[1]) return headerMatch[1]

		if (block.type !== "tool_result" || !block.tool_use_id) return undefined
		const assistantMessage = apiMessages[messageIndex - 1]
		if (assistantMessage?.role !== "assistant" || !Array.isArray(assistantMessage.content)) return undefined
		const toolUse = assistantMessage.content.find(
			(candidate) => candidate.type === "tool_use" && candidate.id === block.tool_use_id,
		)
		return toolUse?.type === "tool_use" ? toolUse.name : undefined
	}

	private projectToolResult(
		toolName: string | undefined,
		text: string,
		maxProjectedLines: number,
	):
		| {
				text: string
				foldedLines: number
				originalLines: number
				sha256: string
		  }
		| undefined {
		if (!toolName) return undefined

		if (toolName === "read_file") {
			const result = this.contextPruner.skeletonizeCode(text, Math.max(4, maxProjectedLines - 1))
			return {
				text: result.skeletonText,
				foldedLines: result.foldedLines,
				originalLines: result.originalLines,
				sha256: result.sha256,
			}
		}

		if (!BOUNDED_OUTPUT_TOOLS.has(toolName)) return undefined

		const result = this.contextPruner.compressCommandOutput(text, Math.max(4, maxProjectedLines - 1))
		return {
			text: result.compressedText,
			foldedLines: result.foldedLines,
			originalLines: result.originalLines,
			sha256: result.sha256,
		}
	}

	private hasMinimumLineCount(text: string, minimumLines: number): boolean {
		if (minimumLines <= 1) return true
		let lines = 1
		for (let index = 0; index < text.length; index++) {
			if (text.charCodeAt(index) !== 10) continue
			lines++
			if (lines >= minimumLines) return true
		}
		return false
	}

	/**
	 * Public function for triggering potentially setting the truncation message.
	 * Silent mode still records the truncation transaction, but re-projects the
	 * retained assistant text byte-for-byte. Only internal metadata changes, so
	 * the agent receives no compaction notice or synthetic continuity marker.
	 */
	async triggerApplyStandardContextTruncationNoticeChange(
		timestamp: number,
		taskDirectory: string,
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		silent = true,
	) {
		const assistantUpdated = silent
			? this.applySilentContextContinuityChange(timestamp, apiConversationHistory)
			: this.applyStandardContextTruncationNoticeChange(timestamp)
		// Transparent compaction retains the original objective. Semantic
		// condense/truncation can still opt into the legacy replacement.
		const userUpdated = silent ? false : this.applyFirstUserMessageReplacement(timestamp, apiConversationHistory)
		if (assistantUpdated || userUpdated) {
			await this.saveContextHistory(taskDirectory)
		}
	}

	/**
	 * Alters the retained assistant message with the legacy explanatory notice.
	 */
	private applyStandardContextTruncationNoticeChange(timestamp: number): boolean {
		if (!this.contextHistoryUpdates.has(1)) {
			// first assistant message always at index 1
			const innerMap = new Map<number, ContextUpdate[]>()
			innerMap.set(0, [[timestamp, "text", [formatResponse.contextTruncationNotice()], []]])
			this.contextHistoryUpdates.set(1, [0, innerMap]) // EditType is undefined for first assistant message
			return true
		}
		return false
	}

	private applySilentContextContinuityChange(
		timestamp: number,
		apiConversationHistory: Anthropic.Messages.MessageParam[],
	): boolean {
		if (this.contextHistoryUpdates.has(1)) return false
		const assistant = apiConversationHistory[1]
		let originalText = ""
		let textBlockIndex = 0
		if (assistant && Array.isArray(assistant.content)) {
			textBlockIndex = assistant.content.findIndex((block) => block.type === "text")
			const firstTextBlock = textBlockIndex >= 0 ? assistant.content[textBlockIndex] : undefined
			if (firstTextBlock?.type === "text") originalText = firstTextBlock.text
		} else if (assistant && typeof assistant.content === "string") {
			originalText = assistant.content
		}
		if (!originalText) return false

		const innerMap = new Map<number, ContextUpdate[]>()
		innerMap.set(textBlockIndex, [[timestamp, "text", [originalText], [["silent-compaction-v2"]]]])
		this.contextHistoryUpdates.set(1, [EditType.TOOL_RESULT_COMPACTION, innerMap])
		return true
	}

	/**
	 * Replace the first user message when context window is compacted
	 */
	private applyFirstUserMessageReplacement(
		timestamp: number,
		apiConversationHistory: Anthropic.Messages.MessageParam[],
	): boolean {
		if (!this.contextHistoryUpdates.has(0)) {
			try {
				// choosing to be extra careful here, but likely not required
				let firstUserMessage = ""

				const message = apiConversationHistory[0]
				if (Array.isArray(message.content)) {
					const block = message.content[0]
					if (block && block.type === "text") {
						firstUserMessage = block.text
					}
				}

				if (firstUserMessage) {
					const processedFirstUserMessage = formatResponse.processFirstUserMessageForTruncation()

					const innerMap = new Map<number, ContextUpdate[]>()
					innerMap.set(0, [[timestamp, "text", [processedFirstUserMessage], []]])
					this.contextHistoryUpdates.set(0, [0, innerMap]) // same EditType as first assistant truncation notice

					return true
				}
			} catch (error) {
				Logger.error("applyFirstUserMessageReplacement:", error)
			}
		}
		return false
	}

	/**
	 * wraps the logic for determining file reads to overwrite, and altering state
	 * returns whether any updates were made (bool) and indices where updates were made
	 */
	private findAndPotentiallySaveFileReadContextHistoryUpdates(
		apiMessages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
		timestamp: number,
	): [boolean, Set<number>] {
		const [fileReadIndices, messageFilePaths] = this.getPossibleDuplicateFileReads(apiMessages, startFromIndex)
		return this.applyFileReadContextHistoryUpdates(fileReadIndices, messageFilePaths, apiMessages, timestamp)
	}

	/**
	 * generate a mapping from unique file reads from multiple tool calls to their outer index position(s)
	 * also return additional metadata to support multiple file reads in file mention text blocks
	 */
	private getPossibleDuplicateFileReads(
		apiMessages: Anthropic.Messages.MessageParam[],
		startFromIndex: number,
	): [Map<string, [number, number, string, string, number][]>, Map<number, string[]>] {
		// fileReadIndices: { fileName => [outerIndex, EditType, searchText, replaceText, innerIndex] }
		// messageFilePaths: { outerIndex => [fileRead1, fileRead2, ..] }
		// searchText in fileReadIndices is only required for file mention file-reads since there can be more than one file in the text
		// searchText will be the empty string "" in the case that it's not required, for non-file mentions
		// messageFilePaths is only used for file mentions as there can be multiple files read in the same text chunk

		// for all text blocks per file, has info for updating the block
		// originally our messages were formatted where the innerIndex was consistently at index=1, but that is no longer the case
		// which is why we now need to support both an outerIndex and innerIndex in this mapping
		const fileReadIndices = new Map<string, [number, number, string, string, number][]>()

		// for file mention text blocks, track all the unique files read
		const messageFilePaths = new Map<number, string[]>()

		for (let i = startFromIndex; i < apiMessages.length; i++) {
			let thisExistingFileReads: string[] = []

			if (this.contextHistoryUpdates.has(i)) {
				const innerTuple = this.contextHistoryUpdates.get(i)

				if (innerTuple) {
					// safety check
					const editType = innerTuple[0]

					if (editType === EditType.FILE_MENTION) {
						const innerMap = innerTuple[1]

						// Get the first entry from the innerMap since we only process one inner block index for FILE_MENTION
						const blockUpdates = innerMap.values().next().value

						// if we have updated this text previously, we want to check whether the lists of files in the metadata are the same
						if (blockUpdates && blockUpdates.length > 0) {
							// the first list indicates the files we have replaced in this text, second list indicates all unique files in this text
							// if they are equal then we have replaced all the files in this text already, and can ignore further processing
							if (
								blockUpdates[blockUpdates.length - 1][3][0].length ===
								blockUpdates[blockUpdates.length - 1][3][1].length
							) {
								continue
							}
							// otherwise there are still file reads here we can overwrite, so still need to process this text chunk
							// to do so we need to keep track of which files we've already replaced so we don't replace them again

							thisExistingFileReads = blockUpdates[blockUpdates.length - 1][3][0]
						}
					} else if (editType !== EditType.TOOL_RESULT_COMPACTION) {
						// for all other cases we can assume that we dont need to check this again
						continue
					}
				}
			}

			const message = apiMessages[i]
			if (message.role === "user" && Array.isArray(message.content) && message.content.length > 0) {
				const firstBlock = message.content[0]
				// Extract text from either a direct text block or from inside a tool_result wrapper (native tool calling)
				const firstBlockText = this.getTextFromBlock(firstBlock)

				if (firstBlockText) {
					const result = this.parseToolCallWithFormat(firstBlockText)
					let foundNormalFileRead = false
					if (result) {
						const [toolName, filePath, contentBlockIndex, headerText] = result

						if (toolName === "read_file") {
							// For native tool calling format, we assume contentBlockIndex=0 which is what happens naturally
							this.handleReadFileToolCall(i, filePath, fileReadIndices, contentBlockIndex, headerText)
							foundNormalFileRead = true
						} else if (toolName === "replace_in_file" || toolName === "write_to_file") {
							// For native tool calling format, the content is assumed to always in the same block (index=0 inside tool_result)
							// For the XML format, the old format has the file contents in index=1 whereas the new format has it in index=0
							let blockText: string | undefined
							if (firstBlock.type === "tool_result") {
								blockText = firstBlockText
							} else if (contentBlockIndex === 0) {
								// remaining cases are for type="text"
								blockText = firstBlockText
							} else if (contentBlockIndex === 1 && message.content.length > 1) {
								const secondBlock = message.content[1]
								if (secondBlock.type === "text") {
									blockText = secondBlock.text
								}
							}

							if (blockText) {
								this.handlePotentialFileChangeToolCalls(
									i,
									filePath,
									blockText,
									fileReadIndices,
									contentBlockIndex,
								)
								foundNormalFileRead = true
							}
						}
					}

					// file mentions can happen in most other user message blocks
					if (!foundNormalFileRead) {
						// search over indices 0-2 inclusive for file mentions
						// this is a heuristic to catch most occurrences without looping over all inner indices
						for (const candidateIndex of [0, 1, 2]) {
							if (candidateIndex >= message.content.length) {
								break
							}

							const block = message.content[candidateIndex]
							// Extract text from either a direct text block or from inside a tool_result wrapper
							const blockText = this.getTextFromBlock(block)
							if (blockText) {
								const [hasFileRead, filePaths] = this.handlePotentialFileMentionCalls(
									i,
									blockText,
									fileReadIndices,
									thisExistingFileReads, // file reads we've already replaced in this text in the latest version of this updated text
									candidateIndex,
								)
								if (hasFileRead) {
									messageFilePaths.set(i, filePaths) // all file paths in this string
									break // at most one file mentions block per outer index
								}
							}
						}
					}
				}
			}
		}

		return [fileReadIndices, messageFilePaths]
	}

	/**
	 * handles potential file content mentions in text blocks
	 * there will not be more than one of the same file read in a text block
	 */
	private handlePotentialFileMentionCalls(
		i: number,
		blockText: string,
		fileReadIndices: Map<string, [number, number, string, string, number][]>,
		thisExistingFileReads: string[],
		innerIndex: number,
	): [boolean, string[]] {
		const pattern = /<file_content path="([^"]*)">([\s\S]*?)<\/file_content>/g

		let foundMatch = false
		const filePaths: string[] = []

		for (const match of blockText.matchAll(pattern)) {
			foundMatch = true

			const filePath = match[1]
			filePaths.push(filePath) // we will record all unique paths from file mentions in this text

			// we can assume that thisExistingFileReads does not have many entries
			if (!thisExistingFileReads.includes(filePath)) {
				// meaning we haven't already replaced this file read

				const entireMatch = match[0] // The entire matched string

				// Create the replacement text - keep the tags but replace the content
				const replacementText = `<file_content path="${filePath}">${formatResponse.duplicateFileReadNotice()}</file_content>`

				const indices = fileReadIndices.get(filePath) || []
				// use the actual inner index where file mentions were found
				indices.push([i, EditType.FILE_MENTION, entireMatch, replacementText, innerIndex])
				fileReadIndices.set(filePath, indices)
			}
		}

		return [foundMatch, filePaths]
	}

	/**
	 * Parses tool call formats and returns null if no acceptable format is found
	 * Supports older version (content in separate block), and newer (content in same block)
	 * Returns [toolName, filePath, contentBlockIndex, headerText]
	 */
	private parseToolCallWithFormat(text: string): [string, string, number, string] | null {
		const match = text.match(/^\[([^\s]+) for '([^']+)'\] Result:/)

		if (!match) {
			return null
		}

		const headerLength = match[0].length
		let contentBlockIndex = 1
		if (text.length > headerLength) {
			// newer format: content follows header in this block (index 0)
			// in the older format the content is in the following block (index 1)
			contentBlockIndex = 0
		}

		return [match[1], match[2], contentBlockIndex, match[0]]
	}

	/**
	 * file_read tool call always pastes the file, so this is always a hit
	 */
	private handleReadFileToolCall(
		i: number,
		filePath: string,
		fileReadIndices: Map<string, [number, number, string, string, number][]>,
		contentBlockIndex: number,
		headerText: string,
	) {
		const indices = fileReadIndices.get(filePath) || []

		if (contentBlockIndex === 1) {
			// the original tool call format
			indices.push([i, EditType.READ_FILE_TOOL, "", formatResponse.duplicateFileReadNotice(), contentBlockIndex])
		} else {
			// the new tool call format (index=0)
			// in the new format the tool call output for read_file is appended to the tool call header with a newline separator
			// this means we need to extract just the header and append the duplicateFileReadNotice to it with the separator
			indices.push([
				i,
				EditType.READ_FILE_TOOL,
				"",
				`${headerText}\n${formatResponse.duplicateFileReadNotice()}`,
				contentBlockIndex,
			])
		}

		fileReadIndices.set(filePath, indices)
	}

	/**
	 * write_to_file and replace_in_file tool output are handled similarly
	 */
	private handlePotentialFileChangeToolCalls(
		i: number,
		filePath: string,
		blockText: string,
		fileReadIndices: Map<string, [number, number, string, string, number][]>,
		contentBlockIndex: number,
	) {
		const pattern = /(<final_file_content path="[^"]*">)[\s\S]*?(<\/final_file_content>)/

		// check if this exists in the text, it won't exist if the user rejects the file change for example
		if (pattern.test(blockText)) {
			const replacementText = blockText.replace(pattern, `$1 ${formatResponse.duplicateFileReadNotice()} $2`)
			const indices = fileReadIndices.get(filePath) || []
			indices.push([i, EditType.ALTER_FILE_TOOL, "", replacementText, contentBlockIndex])
			fileReadIndices.set(filePath, indices)
		}
	}

	/**
	 * alter all occurrences of file read operations and track which messages were updated
	 * returns the outer index of messages we alter, to count number of changes
	 */
	private applyFileReadContextHistoryUpdates(
		fileReadIndices: Map<string, [number, number, string, string, number][]>,
		messageFilePaths: Map<number, string[]>,
		apiMessages: Anthropic.Messages.MessageParam[],
		timestamp: number,
	): [boolean, Set<number>] {
		let didUpdate = false
		const updatedMessageIndices = new Set<number>() // track which messages we update on this round
		const fileMentionUpdates = new Map<number, [string, string[], number]>() // [baseText, prevFilesReplaced, innerIndex]

		for (const [filePath, indices] of fileReadIndices.entries()) {
			// Only process if there are multiple reads of the same file, else we will want to keep the latest read of the file
			if (indices.length > 1) {
				// Process all but the last index, as we will keep that instance of the file read
				for (let i = 0; i < indices.length - 1; i++) {
					const messageIndex = indices[i][0]
					const messageType = indices[i][1] // EditType value
					const searchText = indices[i][2] // search text (for file mentions, else empty string)
					const messageString = indices[i][3] // what we will replace the string with
					const innerIndex = indices[i][4] // inner block index where we are making the change

					didUpdate = true
					updatedMessageIndices.add(messageIndex)

					// for single-fileread text we can set the updates here
					// for potential multi-fileread text we need to determine all changes & iteratively update the text prior to saving the final change
					if (messageType === EditType.FILE_MENTION) {
						if (!fileMentionUpdates.has(messageIndex)) {
							// Get base text either from existing updates or from apiMessages
							let baseText = ""
							let prevFilesReplaced: string[] = []

							const innerTuple = this.contextHistoryUpdates.get(messageIndex)
							if (innerTuple) {
								const blockUpdates = innerTuple[1].get(innerIndex)
								if (blockUpdates && blockUpdates.length > 0) {
									baseText = blockUpdates[blockUpdates.length - 1][2][0] // index 0 of MessageContent
									prevFilesReplaced = blockUpdates[blockUpdates.length - 1][3][0] // previously overwritten file reads in this text
								}
							}

							// can assume that this content will exist, otherwise it would not have been in fileReadIndices
							const messageContent = apiMessages[messageIndex]?.content
							if (!baseText && Array.isArray(messageContent) && messageContent.length > innerIndex) {
								// contentBlock can either be the type="text" dict or type="tool_result" dict which has its own content array
								// but we currently assume the content we will overwrite is at index=0 in this content array
								const contentBlock = messageContent[innerIndex]
								const extractedText = this.getTextFromBlock(contentBlock)
								if (extractedText) {
									baseText = extractedText
								}
							}

							// prevFilesReplaced keeps track of the previous file reads we've replace in this string, empty array if none
							fileMentionUpdates.set(messageIndex, [baseText, prevFilesReplaced, innerIndex])
						}

						// Replace searchText with messageString for all file reads we need to replace in this text
						if (searchText) {
							const currentTuple = fileMentionUpdates.get(messageIndex) || ["", [], 0]
							if (currentTuple[0]) {
								// safety check
								// replace this text chunk
								const updatedText = currentTuple[0].replace(searchText, messageString)

								// add the newly added filePath read
								const updatedFileReads = currentTuple[1]
								updatedFileReads.push(filePath)

								fileMentionUpdates.set(messageIndex, [updatedText, updatedFileReads, currentTuple[2]])
							}
						}
					} else {
						const innerTuple = this.contextHistoryUpdates.get(messageIndex)
						let innerMap: Map<number, ContextUpdate[]>

						if (!innerTuple) {
							innerMap = new Map<number, ContextUpdate[]>()
							this.contextHistoryUpdates.set(messageIndex, [messageType, innerMap])
						} else {
							innerMap = innerTuple[1]
						}

						const blockIndex = innerIndex

						const updates = innerMap.get(blockIndex) || []

						// metadata array is empty for non-file mention occurrences
						updates.push([timestamp, "text", [messageString], []])

						innerMap.set(blockIndex, updates)
					}
				}
			}
		}

		// apply file mention updates to contextHistoryUpdates
		// in fileMentionUpdates, filePathsUpdated includes all the file paths which are updated in the latest version of this altered text
		for (const [messageIndex, [updatedText, filePathsUpdated, blockIndex]] of fileMentionUpdates.entries()) {
			const innerTuple = this.contextHistoryUpdates.get(messageIndex)
			let innerMap: Map<number, ContextUpdate[]>

			if (!innerTuple) {
				innerMap = new Map<number, ContextUpdate[]>()
				this.contextHistoryUpdates.set(messageIndex, [EditType.FILE_MENTION, innerMap])
			} else {
				innerMap = innerTuple[1]
			}

			const updates = innerMap.get(blockIndex) || []

			// filePathsUpdated includes changes done previously to this timestamp, and right now
			if (messageFilePaths.has(messageIndex)) {
				const allFileReads = messageFilePaths.get(messageIndex)
				if (allFileReads) {
					// we gather all the file reads possible in this text from messageFilePaths
					// filePathsUpdated from fileMentionUpdates stores all the files reads we have replaced now & previously
					updates.push([timestamp, "text", [updatedText], [filePathsUpdated, allFileReads]])
					innerMap.set(blockIndex, updates)
				}
			}
		}

		return [didUpdate, updatedMessageIndices]
	}

	/**
	 * count total characters in messages and total savings within this range
	 */
	private countCharactersAndSavingsInRange(
		apiMessages: Anthropic.Messages.MessageParam[],
		startIndex: number,
		endIndex: number,
		uniqueFileReadIndices: Set<number>,
	): { totalCharacters: number; charactersSaved: number } {
		let totalCharCount = 0
		let totalCharactersSaved = 0

		for (let i = startIndex; i < endIndex; i++) {
			// looping over the outer indices of messages
			const message = apiMessages[i]

			if (!message.content) {
				continue
			}

			// hasExistingAlterations checks whether the outer idnex has any changes
			// hasExistingAlterations will also include the alterations we just made
			const hasExistingAlterations = this.contextHistoryUpdates.has(i)
			const hasNewAlterations = uniqueFileReadIndices.has(i)

			if (Array.isArray(message.content)) {
				for (let blockIndex = 0; blockIndex < message.content.length; blockIndex++) {
					// looping over inner indices of messages
					const block = message.content[blockIndex]

					// Extract text from either a direct text block or from inside a tool_result wrapper (native tool calling)
					const blockText = this.getTextFromBlock(block)
					if (blockText) {
						// true if we just altered it, or it was altered before
						if (hasExistingAlterations) {
							const innerTuple = this.contextHistoryUpdates.get(i)
							const updates = innerTuple?.[1].get(blockIndex) // updated text for this inner index

							if (updates && updates.length > 0) {
								// exists if we have an update for the message at this index
								const latestUpdate = updates[updates.length - 1]

								// if block was just altered, then calculate savings
								if (hasNewAlterations) {
									let originalTextLength: number
									if (updates.length > 1) {
										originalTextLength = updates[updates.length - 2][2][0].length // handles case if we have multiple updates for same text block
									} else {
										originalTextLength = blockText.length
									}

									const newTextLength = latestUpdate[2][0].length // replacement text
									totalCharactersSaved += originalTextLength - newTextLength

									totalCharCount += originalTextLength
								} else {
									// meaning there was an update to this text previously, but we didn't just alter it
									totalCharCount += latestUpdate[2][0].length
								}
							} else {
								// reach here if there was one inner index with an update, but now we are at a different index, so updates is not defined
								totalCharCount += blockText.length
							}
						} else {
							// reach here if there's no alterations for this outer index, meaning each inner index won't have any changes either
							totalCharCount += blockText.length
						}
					} else if (block.type === "image" && block.source) {
						if (block.source.type === "base64" && block.source.data) {
							totalCharCount += block.source.data.length
						}
					}
				}
			}
		}

		return { totalCharacters: totalCharCount, charactersSaved: totalCharactersSaved }
	}

	/**
	 * count total percentage character savings across in-range conversation
	 */
	private calculateContextOptimizationMetrics(
		apiMessages: Anthropic.Messages.MessageParam[],
		conversationHistoryDeletedRange: [number, number] | undefined,
		uniqueFileReadIndices: Set<number>,
	): number {
		// count for first user-assistant message pair
		const firstChunkResult = this.countCharactersAndSavingsInRange(apiMessages, 0, 2, uniqueFileReadIndices)

		// count for the remaining in-range messages
		const secondChunkResult = this.countCharactersAndSavingsInRange(
			apiMessages,
			conversationHistoryDeletedRange ? conversationHistoryDeletedRange[1] + 1 : 2,
			apiMessages.length,
			uniqueFileReadIndices,
		)

		const totalCharacters = firstChunkResult.totalCharacters + secondChunkResult.totalCharacters
		const totalCharactersSaved = firstChunkResult.charactersSaved + secondChunkResult.charactersSaved

		const percentCharactersSaved = totalCharacters === 0 ? 0 : totalCharactersSaved / totalCharacters

		return percentCharactersSaved
	}
}
