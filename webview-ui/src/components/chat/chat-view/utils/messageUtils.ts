/**
 * Utility functions for message filtering, grouping, and manipulation
 */

import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import type { DietCodeMessage, DietCodeSayBrowserAction, DietCodeSayTool } from "@shared/ExtensionMessage"
import { FileIcon, FolderOpenDotIcon, FolderOpenIcon, SearchIcon, ShapesIcon, WrenchIcon } from "lucide-react"

/**
 * Low-stakes tool types that should be grouped together
 */
const LOW_STAKES_TOOLS = new Set([
	"readFile",
	"listFilesTopLevel",
	"listFilesRecursive",
	"listCodeDefinitionNames",
	"searchFiles",
])

type ToolClassificationCacheEntry = {
	text: string | undefined
	type: DietCodeMessage["type"]
	ask: DietCodeMessage["ask"]
	say: DietCodeMessage["say"]
	isLowStakes: boolean
}

// A streamed transcript reuses immutable message objects for every row that
// did not change. Cache the small tool classification so grouping, request
// activity, and row rendering do not repeatedly parse the same JSON payload.
const toolClassificationCache = new WeakMap<DietCodeMessage, ToolClassificationCacheEntry>()

export interface ApiRequestTextInfo {
	parsed: boolean
	hasCost: boolean
	cost?: number
	hasCancelReason: boolean
	hasStreamingFailedMessage: boolean
}

interface ApiRequestTextInfoCacheEntry extends ApiRequestTextInfo {
	text: string
}

// API request payloads can include a large prompt. Cache only the scalar
// decisions used by the timeline so repeated render passes do not retain or
// reparse another copy of that payload.
const apiRequestTextInfoCache = new WeakMap<DietCodeMessage, ApiRequestTextInfoCacheEntry>()

export function getApiRequestTextInfo(message: DietCodeMessage): ApiRequestTextInfo {
	const text = message.text ?? ""
	const cached = apiRequestTextInfoCache.get(message)
	if (cached?.text === text) {
		return cached
	}

	try {
		const parsedData = JSON.parse(text || "{}") as Record<string, unknown> | null
		if (parsedData === null) {
			const invalidEntry = {
				text,
				parsed: false,
				hasCost: false,
				hasCancelReason: false,
				hasStreamingFailedMessage: false,
			}
			apiRequestTextInfoCache.set(message, invalidEntry)
			return invalidEntry
		}

		const info: ApiRequestTextInfoCacheEntry = {
			text,
			parsed: true,
			hasCost: parsedData.cost != null,
			cost: typeof parsedData.cost === "number" ? parsedData.cost : undefined,
			hasCancelReason: Boolean(parsedData.cancelReason),
			hasStreamingFailedMessage: Boolean(parsedData.streamingFailedMessage),
		}
		apiRequestTextInfoCache.set(message, info)
		return info
	} catch {
		const invalidEntry = {
			text,
			parsed: false,
			hasCost: false,
			hasCancelReason: false,
			hasStreamingFailedMessage: false,
		}
		apiRequestTextInfoCache.set(message, invalidEntry)
		return invalidEntry
	}
}

const BROWSER_SESSION_SAY_TYPES = new Set([
	"browser_action_launch",
	"api_req_started",
	"text",
	"browser_action",
	"browser_action_result",
	"checkpoint_created",
	"reasoning",
	"error_retry",
])

/**
 * Check if a tool message is a low-stakes tool
 */
export function isLowStakesTool(message: DietCodeMessage): boolean {
	if (message.say !== "tool" && message.ask !== "tool") {
		return false
	}
	const cached = toolClassificationCache.get(message)
	if (
		cached &&
		cached.text === message.text &&
		cached.type === message.type &&
		cached.ask === message.ask &&
		cached.say === message.say
	) {
		return cached.isLowStakes
	}

	let isLowStakes = false
	try {
		const tool = JSON.parse(message.text || "{}") as DietCodeSayTool
		isLowStakes = LOW_STAKES_TOOLS.has(tool.tool)
	} catch {
		isLowStakes = false
	}
	toolClassificationCache.set(message, {
		text: message.text,
		type: message.type,
		ask: message.ask,
		say: message.say,
		isLowStakes,
	})
	return isLowStakes
}

/**
 * Check if a message group is a tool group (array with _isToolGroup marker)
 */
export function isToolGroup(item: DietCodeMessage | DietCodeMessage[]): item is DietCodeMessage[] & { _isToolGroup: true } {
	return Array.isArray(item) && (item as DietCodeMessage[] & { _isToolGroup?: boolean })._isToolGroup === true
}

/**
 * Combine API requests and command sequences in messages
 */
export function processMessages(messages: DietCodeMessage[]): DietCodeMessage[] {
	return combineApiRequests(combineCommandSequences(messages))
}

/**
 * Filter messages that should be visible in the chat
 */
export function filterVisibleMessages(messages: DietCodeMessage[]): DietCodeMessage[] {
	// `use_subagents` is hidden once a later subagent row exists. Precompute that
	// suffix fact once so filtering stays linear and does not allocate/scan a tail
	// slice for every message.
	const hasSubagentControlMessage = messages.some(
		(message) => message.ask === "use_subagents" || message.say === "use_subagents",
	)
	const hasSubagentAfter = hasSubagentControlMessage ? new Uint8Array(messages.length) : undefined
	if (hasSubagentAfter) {
		let hasSubagent = false
		for (let index = messages.length - 1; index >= 0; index--) {
			hasSubagentAfter[index] = hasSubagent ? 1 : 0
			if (messages[index].type === "say" && messages[index].say === "subagent") {
				hasSubagent = true
			}
		}
	}

	return messages.filter((message, index) => {
		switch (message.ask) {
			case "completion_result":
				// don't show a chat row for a completion_result ask without text. This specific type of message only occurs if dietcode wants to execute a command as part of its completion result, in which case we interject the completion_result tool with the execute_command tool.
				if (message.text === "") {
					return false
				}
				break
			case "api_req_failed": // this message is used to update the latest api_req_started that the request failed
			case "resume_task":
			case "resume_completed_task":
				return false
			case "use_subagents":
				if (hasSubagentAfter?.[index]) {
					return false
				}
				break
		}
		switch (message.say) {
			case "api_req_finished": // combineApiRequests removes this from modifiedMessages anyways
			case "api_req_retried": // this message is used to update the latest api_req_started that the request was retried
			case "deleted_api_reqs": // aggregated api_req metrics from deleted messages
			case "subagent_usage": // aggregated subagent usage metrics for task-level accounting
			case "task_progress": // task progress messages are displayed in TaskHeader, not in main chat
				return false
			// NOTE: reasoning passes through to be included in tool groups
			case "api_req_started": {
				// api_req_started rows only render visible content for errors/cancels.
				// Reasoning has its own standalone ChatRows. Everything else renders
				// as invisible padding. Filter out unless there's an error.
				const info = getApiRequestTextInfo(message)
				if (!info.parsed || info.hasCancelReason || info.hasStreamingFailedMessage) {
					break // keep on parse error to be safe
				}
				return false
			}
			case "text":
				// Sometimes dietcode returns an empty text message, we don't want to render these. (We also use a say text for user messages, so in case they just sent images we still render that)
				if ((message.text ?? "") === "" && (message.images?.length ?? 0) === 0) {
					return false
				}
				break
			case "mcp_server_request_started":
				return false
			case "use_subagents":
				if (hasSubagentAfter?.[index]) {
					return false
				}
				break
		}
		return true
	})
}

/**
 * Check if a message is part of a browser session
 */
export function isBrowserSessionMessage(message: DietCodeMessage): boolean {
	if (message.type === "ask") {
		return message.ask === "browser_action_launch"
	}
	if (message.type === "say") {
		return message.say !== undefined && BROWSER_SESSION_SAY_TYPES.has(message.say)
	}
	return false
}

/**
 * Group messages, combining browser session messages into arrays
 */
export function groupMessages(visibleMessages: DietCodeMessage[]): (DietCodeMessage | DietCodeMessage[])[] {
	const result: (DietCodeMessage | DietCodeMessage[])[] = []
	let currentGroup: DietCodeMessage[] = []
	let isInBrowserSession = false
	let lastApiReqStarted: DietCodeMessage | undefined

	const endBrowserSession = () => {
		if (currentGroup.length > 0) {
			result.push([...currentGroup])
			currentGroup = []
			isInBrowserSession = false
			lastApiReqStarted = undefined
		}
	}

	for (const message of visibleMessages) {
		if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
			// complete existing browser session if any
			endBrowserSession()
			// start new
			isInBrowserSession = true
			lastApiReqStarted = undefined
			currentGroup.push(message)
		} else if (isInBrowserSession) {
			// end session if api_req_started is cancelled
			if (message.say === "api_req_started") {
				// get last api_req_started in currentGroup to check if it's cancelled
				if (lastApiReqStarted?.text != null) {
					const info = JSON.parse(lastApiReqStarted.text)
					const isCancelled = info.cancelReason != null
					if (isCancelled) {
						endBrowserSession()
						result.push(message)
						continue
					}
				}
			}

			if (isBrowserSessionMessage(message)) {
				currentGroup.push(message)
				if (message.say === "api_req_started") {
					lastApiReqStarted = message
				}

				// Check if this is a close action
				if (message.say === "browser_action") {
					const browserAction = JSON.parse(message.text || "{}") as DietCodeSayBrowserAction
					if (browserAction.action === "close") {
						endBrowserSession()
					}
				}
			} else {
				// complete existing browser session if any
				endBrowserSession()
				result.push(message)
			}
		} else {
			result.push(message)
		}
	}

	// Handle case where browser session is the last group
	if (currentGroup.length > 0) {
		result.push([...currentGroup])
	}

	return result
}

/**
 * Get the task message from the messages array
 */
export function getTaskMessage(messages: DietCodeMessage[]): DietCodeMessage | undefined {
	return messages.at(0)
}

/**
 * Check if we should show the scroll to bottom button
 */
export function shouldShowScrollButton(disableAutoScroll: boolean, isAtBottom: boolean): boolean {
	return disableAutoScroll && !isAtBottom
}

/**
 * Find reasoning content associated with an api_req_started message.
 */
export function findReasoningForApiReq(apiReqTs: number, allMessages: DietCodeMessage[]): { reasoning: string | undefined } {
	const apiReqIndex = allMessages.findIndex((m) => m.ts === apiReqTs && m.say === "api_req_started")
	if (apiReqIndex === -1) {
		return { reasoning: undefined }
	}

	// Collect reasoning content until the next API request.
	const reasoningParts: string[] = []

	for (let i = apiReqIndex + 1; i < allMessages.length; i++) {
		const msg = allMessages[i]
		// Stop at next api_req_started
		if (msg.say === "api_req_started") {
			break
		}
		// Collect reasoning content
		if (msg.say === "reasoning" && msg.text) {
			reasoningParts.push(msg.text)
		}
	}

	return {
		reasoning: reasoningParts.length > 0 ? reasoningParts.join("\n\n") : undefined,
	}
}

/** Build reasoning lookups once for all visible API request rows. */
export function buildReasoningByApiReqTimestamp(allMessages: DietCodeMessage[]): Map<number, string | undefined> {
	const reasoningByApiReqTimestamp = new Map<number, string | undefined>()
	let currentApiReqTs: number | undefined
	let reasoningParts: string[] = []

	const flush = () => {
		if (currentApiReqTs === undefined || reasoningByApiReqTimestamp.has(currentApiReqTs)) return
		reasoningByApiReqTimestamp.set(currentApiReqTs, reasoningParts.length > 0 ? reasoningParts.join("\n\n") : undefined)
	}

	for (const message of allMessages) {
		if (message.say === "api_req_started") {
			flush()
			currentApiReqTs = message.ts
			reasoningParts = []
			continue
		}
		if (currentApiReqTs !== undefined && message.say === "reasoning" && message.text) {
			reasoningParts.push(message.text)
		}
	}
	flush()
	return reasoningByApiReqTimestamp
}

/** Build text-row pending state once instead of scanning backwards per row. */
export function buildPendingToolCallByTextTimestamp(allMessages: DietCodeMessage[]): Map<number, boolean> {
	const pendingByTextTimestamp = new Map<number, boolean>()
	let currentApiReqPending = false

	for (const message of allMessages) {
		if (message.say === "text" && !pendingByTextTimestamp.has(message.ts)) {
			pendingByTextTimestamp.set(message.ts, currentApiReqPending)
		}

		if (message.type === "say" && message.say === "api_req_started") {
			const info = getApiRequestTextInfo(message)
			// Match isTextMessagePendingToolCall's defensive behavior.
			currentApiReqPending = info.parsed && !info.hasCost
		}
	}

	return pendingByTextTimestamp
}

/**
 * Find the API request info for a checkpoint message.
 * Looks backwards from the checkpoint to find the preceding api_req_started.
 * Returns cost and request content.
 */
export function findApiReqInfoForCheckpoint(
	checkpointTs: number,
	allMessages: DietCodeMessage[],
): { cost: number | undefined; request: string | undefined } {
	const checkpointIndex = allMessages.findIndex((m) => m.ts === checkpointTs && m.say === "checkpoint_created")
	if (checkpointIndex === -1) {
		return { cost: undefined, request: undefined }
	}

	// Look backwards for the most recent api_req_started
	for (let i = checkpointIndex - 1; i >= 0; i--) {
		const msg = allMessages[i]
		if (msg.say === "api_req_started" && msg.text) {
			try {
				const info = JSON.parse(msg.text)
				return {
					cost: info.cost,
					request: info.request,
				}
			} catch {
				return { cost: undefined, request: undefined }
			}
		}
	}
	return { cost: undefined, request: undefined }
}

/**
 * Check if a checkpoint at the given index would be displayed (not absorbed into a tool group).
 * A checkpoint is absorbed if it's PRECEDED by low-stakes tools (meaning we're in a tool group).
 * A checkpoint is displayed if it's preceded by non-tool content (meaning no active tool group).
 */
function isDisplayedCheckpoint(checkpointIndex: number, allMessages: DietCodeMessage[]): boolean {
	// Look BACKWARDS to see if we're in a tool group
	// A checkpoint is absorbed if the previous meaningful content was a low-stakes tool
	for (let i = checkpointIndex - 1; i >= 0; i--) {
		const msg = allMessages[i]

		// Skip api_req messages - they don't affect tool group status
		if (msg.say === "api_req_started" || msg.say === "api_req_finished") {
			continue
		}

		// Skip reasoning messages
		if (msg.say === "reasoning") {
			continue
		}

		// Skip other checkpoints - they don't end tool groups
		if (msg.say === "checkpoint_created") {
			continue
		}

		// If preceded by a low-stakes tool, this checkpoint is in the tool group (absorbed)
		if (msg.say === "tool" || msg.ask === "tool") {
			try {
				const tool = JSON.parse(msg.text || "{}") as DietCodeSayTool
				if (LOW_STAKES_TOOLS.has(tool.tool)) {
					return false // absorbed into tool group
				}
			} catch {
				// Can't parse, treat as displayed
			}
		}

		// Any other content before this checkpoint ends the tool group, so this is displayed
		return true
	}

	// Start of messages - checkpoint is displayed (no preceding tool group)
	return true
}

/**
 * Find the total cost for the segment starting at a checkpoint.
 * Looks FORWARD from the checkpoint to the next DISPLAYED checkpoint (skipping absorbed ones).
 * Sums all api_req_started costs in between.
 * Returns undefined if the segment is incomplete (no next displayed checkpoint yet).
 */
export function findNextSegmentCost(checkpointTs: number, allMessages: DietCodeMessage[]): number | undefined {
	const checkpointIndex = allMessages.findIndex((m) => m.ts === checkpointTs && m.say === "checkpoint_created")
	if (checkpointIndex === -1) {
		return undefined
	}
	// Find the next DISPLAYED checkpoint (skip absorbed ones)
	let nextDisplayedCheckpointIndex = -1
	for (let i = checkpointIndex + 1; i < allMessages.length; i++) {
		if (allMessages[i].say === "checkpoint_created") {
			if (isDisplayedCheckpoint(i, allMessages)) {
				nextDisplayedCheckpointIndex = i
				break
			}
			// Otherwise continue looking for next displayed checkpoint
		}
	}

	// If no next displayed checkpoint, sum to end of messages (in-progress segment)
	const endIndex = nextDisplayedCheckpointIndex === -1 ? allMessages.length : nextDisplayedCheckpointIndex

	// Sum all api_req_started costs between this checkpoint and the end
	let totalCost = 0
	for (let i = checkpointIndex + 1; i < endIndex; i++) {
		const msg = allMessages[i]
		if (msg.say === "api_req_started" && msg.text) {
			const info = getApiRequestTextInfo(msg)
			if (info.cost !== undefined) {
				totalCost += info.cost
			}
		}
	}

	return totalCost > 0 ? totalCost : undefined
}

/**
 * Check if a text message's associated API request is still in progress.
 * Returns true if there's no cost yet on the parent api_req_started.
 */
export function isTextMessagePendingToolCall(textTs: number, allMessages: DietCodeMessage[]): boolean {
	// Find the api_req_started that precedes this text message
	const textIndex = allMessages.findIndex((m) => m.ts === textTs)
	if (textIndex === -1) {
		return false
	}

	// Look backwards for the most recent api_req_started
	for (let i = textIndex - 1; i >= 0; i--) {
		const msg = allMessages[i]
		if (msg.say === "api_req_started" && msg.text) {
			const info = getApiRequestTextInfo(msg)
			// If no cost, the request is still in progress
			return info.parsed && !info.hasCost
		}
	}
	return false
}

/**
 * Check if a tool group should be hidden because its tools are currently being
 * displayed in the loading state animation.
 *
 * Returns true when:
 * 1. (Case A) The MOST RECENT api_req_started overall has no cost (loading state is active) AND
 *    this tool group falls in the "current activities" range (between the previous completed api_req and the current one)
 * 2. (Case B) The MOST RECENT api_req_started overall has cost (is complete) AND
 *    this tool group appears after it (just arrived, waiting to be shown as "in flight")
 *
 * This mirrors the ChatRow currentActivities logic - we only hide tools that are
 * actively being shown in the loading state, not older tool groups.
 */
export function isToolGroupInFlight(toolGroupMessages: DietCodeMessage[], allMessages: DietCodeMessage[]): boolean {
	if (toolGroupMessages.length === 0) {
		return false
	}

	// Step 1: Find the MOST RECENT api_req_started overall (search backwards)
	let mostRecentApiReq: DietCodeMessage | null = null
	let mostRecentApiReqIndex = -1
	for (let i = allMessages.length - 1; i >= 0; i--) {
		if (allMessages[i].say === "api_req_started") {
			mostRecentApiReq = allMessages[i]
			mostRecentApiReqIndex = i
			break
		}
	}

	if (!mostRecentApiReq?.text) {
		return false
	}

	// Step 2: Determine if most recent api_req is complete (has cost) or incomplete (no cost)
	const mostRecentApiReqInfo = getApiRequestTextInfo(mostRecentApiReq)
	if (!mostRecentApiReqInfo.parsed) {
		return false
	}
	const mostRecentHasCost = mostRecentApiReqInfo.hasCost

	// Find the last tool in this group
	const lastTool = [...toolGroupMessages].reverse().find((m) => isLowStakesTool(m))
	if (!lastTool) {
		return false
	}

	const toolIndex = allMessages.findIndex((m) => m.ts === lastTool.ts)
	if (toolIndex === -1) {
		return false
	}

	// Step 3: Determine if tool group is in-flight
	if (!mostRecentHasCost) {
		// CASE A: Most recent api_req is INCOMPLETE (loading state active)
		// Tool group is in-flight if it's between prev completed and current incomplete

		// Find the previous COMPLETED api_req
		let prevCompletedApiReqIndex = -1
		for (let i = mostRecentApiReqIndex - 1; i >= 0; i--) {
			const msg = allMessages[i]
			if (msg.say === "api_req_started" && msg.text) {
				const prevInfo = getApiRequestTextInfo(msg)
				if (prevInfo.parsed && prevInfo.hasCost) {
					prevCompletedApiReqIndex = i
					break
				}
			}
		}

		// If no previous completed api_req, there's no "current activities" range
		if (prevCompletedApiReqIndex === -1) {
			return false
		}

		// Tool group is in-flight if AFTER prevCompleted AND BEFORE current
		return toolIndex > prevCompletedApiReqIndex && toolIndex < mostRecentApiReqIndex
	}
	// CASE B: Most recent api_req is COMPLETE (has cost)
	// Tool group is in-flight if it appears AFTER this completed api_req (just arrived)
	return toolIndex > mostRecentApiReqIndex
}

interface ToolActivityRuntime {
	tsToIndex: Map<number, number>
	mostRecentApiReqIndex: number
	mostRecentHasCost: boolean
	mostRecentApiReqIsUsable: boolean
	previousCompletedApiReqIndex: number
}

// ToolGroupRenderer can ask for the same transcript-wide activity facts once
// per visible group. Keep that scan shared for the lifetime of the immutable
// message array; WeakMap avoids retaining old transcripts.
const toolActivityRuntimeCache = new WeakMap<DietCodeMessage[], ToolActivityRuntime>()

function getToolActivityRuntime(allMessages: DietCodeMessage[]): ToolActivityRuntime {
	const cached = toolActivityRuntimeCache.get(allMessages)
	if (cached) return cached

	const tsToIndex = new Map<number, number>()
	for (let index = 0; index < allMessages.length; index++) {
		tsToIndex.set(allMessages[index].ts, index)
	}

	let mostRecentApiReqIndex = -1
	let mostRecentHasCost = false
	let mostRecentApiReqIsUsable = false
	for (let index = allMessages.length - 1; index >= 0; index--) {
		const message = allMessages[index]
		if (message.say !== "api_req_started") continue
		mostRecentApiReqIndex = index
		if (message.text) {
			const info = getApiRequestTextInfo(message)
			mostRecentHasCost = info.hasCost
			mostRecentApiReqIsUsable = info.parsed
		}
		break
	}

	let previousCompletedApiReqIndex = -1
	if (mostRecentApiReqIndex !== -1 && !mostRecentHasCost) {
		for (let index = mostRecentApiReqIndex - 1; index >= 0; index--) {
			const message = allMessages[index]
			if (message.say !== "api_req_started" || !message.text) continue
			const info = getApiRequestTextInfo(message)
			if (info.parsed && info.hasCost) {
				previousCompletedApiReqIndex = index
				break
			}
		}
	}

	const runtime = {
		tsToIndex,
		mostRecentApiReqIndex,
		mostRecentHasCost,
		mostRecentApiReqIsUsable,
		previousCompletedApiReqIndex,
	}
	toolActivityRuntimeCache.set(allMessages, runtime)
	return runtime
}

/**
 * Filter a tool group to exclude tools that are in the "current activities" range.
 * Returns the filtered array of messages (may be empty).
 *
 * This is used so ToolGroupRenderer shows PAST tools (what's already in context),
 * while the loading state shows ACTIVE tools (what's being "read" now).
 *
 * "Current activities" includes:
 * - (Case A) Tools between a previous completed api_req and the current incomplete api_req
 * - (Case B) Tools after the most recent api_req overall (either because it's complete, or no loading state is active yet)
 */
export function getToolsNotInCurrentActivities(
	toolGroupMessages: DietCodeMessage[],
	allMessages: DietCodeMessage[],
): DietCodeMessage[] {
	const { tsToIndex, mostRecentApiReqIndex, mostRecentHasCost, mostRecentApiReqIsUsable, previousCompletedApiReqIndex } =
		getToolActivityRuntime(allMessages)

	if (mostRecentApiReqIndex === -1) {
		// No api_req at all - show all tools
		return toolGroupMessages
	}
	if (!mostRecentApiReqIsUsable) {
		return toolGroupMessages
	}

	if (!mostRecentHasCost) {
		// CASE A: Most recent api_req is INCOMPLETE (loading state active)
		// Tools are in-flight if they're between prev completed api_req and current incomplete one

		if (previousCompletedApiReqIndex === -1) {
			// No previous completed api_req, so no tools are in the "current activities" range
			return toolGroupMessages
		}

		// Filter out tools in the range (prevCompleted, current)
		return toolGroupMessages.filter((msg) => {
			// Keep non-low-stakes tools
			if (!isLowStakesTool(msg)) {
				return true
			}

			// Filter out only tools awaiting approval (ask === 'tool')
			// Completed tools (say === 'tool') should still be shown
			if (msg.ask === "tool") {
				const toolIndex = tsToIndex.get(msg.ts)
				if (toolIndex === undefined) {
					return true
				}
				// Tool is in "current activities" range if AFTER prevCompleted AND BEFORE current
				const isInCurrentActivitiesRange = toolIndex > previousCompletedApiReqIndex && toolIndex < mostRecentApiReqIndex
				// Filter out if in current activities range
				return !isInCurrentActivitiesRange
			}

			// Keep completed tools (say === 'tool')
			return true
		})
	}
	// CASE B: Most recent api_req is COMPLETE (has cost)
	// Tools that appear AFTER this completed api_req are "in flight" (just arrived)
	// Filter them out so they appear in currentActivities instead

	return toolGroupMessages.filter((msg) => {
		// Keep non-low-stakes tools
		if (!isLowStakesTool(msg)) {
			return true
		}

		// Filter out only tools awaiting approval (ask === 'tool')
		// Completed tools (say === 'tool') should still be shown
		if (msg.ask === "tool") {
			const toolIndex = tsToIndex.get(msg.ts)
			if (toolIndex === undefined) {
				return true
			}
			// Tool is in "current activities" if it appears AFTER the most recent api_req
			const isInCurrentActivitiesRange = toolIndex > mostRecentApiReqIndex
			// Filter out if in current activities range
			return !isInCurrentActivitiesRange
		}

		// Keep completed tools (say === 'tool')
		return true
	})
}

/**
 * Returns true if this api_req_started should be fully absorbed into a low-stakes tool group.
 *
 * This scans FORWARD from the api_req_started until the next api_req_started and checks:
 * - at least one low-stakes tool exists
 * - no high-stakes tool/command exists
 *
 * Note: this operates on a flat `DietCodeMessage[]` (e.g. `modifiedMessages`) rather than
 * grouped messages. It is used at render time to avoid transient UI frames where
 * `api_req_started` briefly appears before grouping absorbs it.
 */
export function isApiReqAbsorbable(apiReqTs: number, allMessages: DietCodeMessage[]): boolean {
	const apiReqIndex = allMessages.findIndex((m) => m.ts === apiReqTs && m.say === "api_req_started")
	if (apiReqIndex === -1) {
		return false
	}

	let hasLowStakesTool = false
	let hasReasoning = false
	for (let i = apiReqIndex + 1; i < allMessages.length; i++) {
		const msg = allMessages[i]
		if (msg.say === "api_req_started") {
			break
		}

		// Reasoning - mark it but don't absorb if present
		if (msg.say === "reasoning") {
			hasReasoning = true
			continue
		}

		// Checkpoints do not affect absorbability
		if (msg.say === "checkpoint_created") {
			continue
		}

		// Text is allowed (we still want to absorb api_req into the tool group)
		if (msg.say === "text") {
			continue
		}

		// Low-stakes tools mark absorbability
		if (isLowStakesTool(msg)) {
			hasLowStakesTool = true
			continue
		}

		// Any other tool/command is considered high-stakes; do not absorb
		if (msg.say === "tool" || msg.ask === "tool" || msg.say === "command" || msg.ask === "command") {
			return false
		}
	}

	// Don't absorb if there's reasoning - we want to show "Thoughts >"
	return hasLowStakesTool && !hasReasoning
}

/**
 * Group consecutive low-stakes tools (and their reasoning) into arrays.
 * Also filters out checkpoints that follow low-stakes tool groups.
 * Absorbs api_req_started messages that are followed only by low-stakes tools.
 * Only creates tool groups when there's at least one actual tool - reasoning-only groups are dropped.
 * Should be called after groupMessages.
 */
export function groupLowStakesTools(
	groupedMessages: (DietCodeMessage | DietCodeMessage[])[],
): (DietCodeMessage | DietCodeMessage[])[] {
	// Precompute the look-ahead decision for every api_req_started in one
	// reverse pass. The old implementation scanned forward until the next API
	// boundary for each request, which became quadratic on long transcripts.
	const apiReqAbsorbable = new Uint8Array(groupedMessages.length)
	let hasLowStakesToolAfter = false
	let hasReasoningAfter = false
	let hasHighStakesToolAfter = false
	for (let index = groupedMessages.length - 1; index >= 0; index--) {
		const item = groupedMessages[index]
		if (Array.isArray(item)) {
			hasLowStakesToolAfter = false
			hasReasoningAfter = false
			hasHighStakesToolAfter = false
			continue
		}

		if (item.say === "api_req_started") {
			apiReqAbsorbable[index] = hasLowStakesToolAfter && !hasReasoningAfter && !hasHighStakesToolAfter ? 1 : 0
			hasLowStakesToolAfter = false
			hasReasoningAfter = false
			hasHighStakesToolAfter = false
			continue
		}

		if (item.say === "reasoning") {
			hasReasoningAfter = true
			continue
		}
		if (isLowStakesTool(item)) {
			hasLowStakesToolAfter = true
			continue
		}
		if (item.say === "checkpoint_created" || item.say === "text") {
			continue
		}
		if (item.say === "tool" || item.ask === "tool" || item.ask === "command" || item.say === "command") {
			hasHighStakesToolAfter = true
		}
	}

	const result: (DietCodeMessage | DietCodeMessage[])[] = []
	let toolGroup: DietCodeMessage[] = []
	let pendingReasoning: DietCodeMessage[] = []
	let pendingApiReq: DietCodeMessage[] = []
	let hasTools = false
	const pendingTools: DietCodeMessage[] = []

	const flushPending = () => {
		for (const message of pendingApiReq) result.push(message)
		for (const message of pendingReasoning) result.push(message)
		pendingApiReq = []
		pendingReasoning = []
	}

	const commitToolGroup = () => {
		if (toolGroup.length > 0 && hasTools) {
			const group = toolGroup as DietCodeMessage[] & { _isToolGroup: boolean }
			group._isToolGroup = true
			result.push(group)
			pendingReasoning = []
			pendingApiReq = []
		}
		toolGroup = []
		hasTools = false
	}

	const absorbPending = () => {
		if (pendingApiReq.length > 0) {
			toolGroup.push(...pendingApiReq)
			pendingApiReq = []
		}
	}

	for (let i = 0; i < groupedMessages.length; i++) {
		const item = groupedMessages[i]

		// Browser session group - commit current work and pass through
		if (Array.isArray(item)) {
			commitToolGroup()
			flushPending()
			result.push(item)
			continue
		}

		const message = item
		const messageType = message.say
		const isLast = i === groupedMessages.length - 1

		// Low-stakes tool - absorb pending and add to group
		if (isLowStakesTool(message)) {
			// Keep reasoning visible as its own row when it happens before a tool group.
			// If we absorb it into the group, ToolGroupRenderer hides it entirely.
			if (!hasTools && pendingReasoning.length > 0) {
				flushPending()
			}
			absorbPending()
			hasTools = true
			toolGroup.push(message)
			// If the streaming has stopped and the last message is still an ask,
			// this means the tool requires user approval - show the old tool block UI.
			if (message.type === "ask" && !message.partial && isLast) {
				pendingTools.push(message)
			}
			continue
		}

		// Reasoning - add to group if active, otherwise queue
		if (messageType === "reasoning") {
			if (hasTools) {
				toolGroup.push(message)
			} else {
				pendingReasoning.push(message)
			}
			continue
		}

		// API request - absorb if followed by low-stakes tools, otherwise render
		if (messageType === "api_req_started") {
			if (apiReqAbsorbable[i] === 1) {
				absorbPending()
				pendingApiReq.push(message)
			} else {
				commitToolGroup()
				flushPending()
				result.push(message)
			}
			continue
		}

		// Checkpoint - absorb into active tool group
		if (messageType === "checkpoint_created" && hasTools) {
			toolGroup.push(message)
			continue
		}

		// Text - once a tool group is active, ignore additional text so it
		// doesn't continue mutating the text row rendered above the group.
		if (messageType === "text") {
			if (hasTools) {
				continue
			}
			flushPending()
			result.push(message)
			continue
		}

		// Everything else - commit group, flush pending, and render
		commitToolGroup()
		flushPending()
		result.push(message)
	}

	// Finalize any remaining work
	commitToolGroup()
	flushPending()

	if (pendingTools.length > 0) {
		result.push(...pendingTools)
	}

	return result
}

export function getIconByToolName(toolName: string) {
	switch (toolName) {
		case "readFile":
			return FileIcon
		case "listFilesTopLevel":
			return FolderOpenIcon
		case "listFilesRecursive":
			return FolderOpenDotIcon
		case "searchFiles":
			return SearchIcon
		case "listCodeDefinitionNames":
			return ShapesIcon
		default:
			return WrenchIcon
	}
}
