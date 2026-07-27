import { Anthropic } from "@anthropic-ai/sdk"
import { v4 as uuidv4 } from "uuid"

export const CONTEXT_MESSAGE_ID_PREFIX = "ctx_msg_"
export const CONTEXT_BLOCK_ID_PREFIX = "ctx_blk_"

export type ContextIdentifiedContentBlock = Anthropic.Messages.ContentBlockParam & {
	contextId?: string
}

export type ContextIdentifiedMessage = Anthropic.Messages.MessageParam & {
	contextId?: string
	content: string | ContextIdentifiedContentBlock[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isContextIdentifier(value: unknown, prefix: string): value is string {
	return typeof value === "string" && value.startsWith(prefix) && UUID_PATTERN.test(value.slice(prefix.length))
}

export function isContextMessageId(value: unknown): value is string {
	return isContextIdentifier(value, CONTEXT_MESSAGE_ID_PREFIX)
}

export function isContextBlockId(value: unknown): value is string {
	return isContextIdentifier(value, CONTEXT_BLOCK_ID_PREFIX)
}

export function createContextMessageId(): string {
	return `${CONTEXT_MESSAGE_ID_PREFIX}${uuidv4()}`
}

export function createContextBlockId(): string {
	return `${CONTEXT_BLOCK_ID_PREFIX}${uuidv4()}`
}

/**
 * Adds durable identity metadata without changing prompt-visible content.
 * Existing valid identifiers are never regenerated, so array reordering,
 * truncation, and checkpoint rollback cannot retarget a recovery reference.
 */
export function ensureContextIdentifiers(messages: Anthropic.Messages.MessageParam[]): boolean {
	let changed = false
	const seenMessageIds = new Set<string>()
	const seenBlockIds = new Set<string>()

	for (const rawMessage of messages) {
		const message = rawMessage as ContextIdentifiedMessage
		if (!isContextMessageId(message.contextId) || seenMessageIds.has(message.contextId)) {
			message.contextId = createContextMessageId()
			changed = true
		}
		seenMessageIds.add(message.contextId)

		if (!Array.isArray(message.content)) continue
		for (const rawBlock of message.content) {
			const block = rawBlock as Anthropic.Messages.ContentBlockParam & { contextId?: string }
			if (!isContextBlockId(block.contextId) || seenBlockIds.has(block.contextId)) {
				block.contextId = createContextBlockId()
				changed = true
			}
			seenBlockIds.add(block.contextId)
		}
	}

	return changed
}

export function getMessageContextId(message: Anthropic.Messages.MessageParam): string | undefined {
	const contextId = (message as ContextIdentifiedMessage).contextId
	return isContextMessageId(contextId) ? contextId : undefined
}

export function getBlockContextId(block: Anthropic.Messages.ContentBlockParam): string | undefined {
	const contextId = (block as ContextIdentifiedContentBlock).contextId
	return isContextBlockId(contextId) ? contextId : undefined
}
