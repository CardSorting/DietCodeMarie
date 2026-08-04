import type { DietCodeMessage } from "@shared/ExtensionMessage"
import type React from "react"
import { memo } from "react"
import BrowserSessionRow from "@/components/chat/BrowserSessionRow"
import ChatRow from "@/components/chat/ChatRow"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { cn } from "@/lib/utils"
import type { ChatState, MessageHandlers } from "../../types/chatTypes"
import { buildPendingToolCallByTextTimestamp, buildReasoningByApiReqTimestamp, isToolGroup } from "../../utils/messageUtils"
import { ActionButtons } from "../layout/ActionButtons"
import { ToolGroupRenderer } from "./ToolGroupRenderer"

interface MessageRendererProps {
	messageOrGroup: DietCodeMessage | DietCodeMessage[]
	modifiedMessages: DietCodeMessage[]
	isLastMessage: boolean
	isLastToolGroup: boolean
	lastModifiedMessage?: DietCodeMessage
	reasoningContent?: string
	isRequestInProgress: boolean
	expandedRows: Record<number, boolean>
	onToggleExpand: (ts: number) => void
	onHeightChange: (isTaller: boolean) => void
	onPendingQuoteChange: (quote: string | null) => void
	onCancelCommand: () => void
	inputValue: string
	messageHandlers: MessageHandlers
	footerActive: boolean
	chatState: ChatState
	task: DietCodeMessage
}

/**
 * Specialized component for rendering different message types
 * Handles browser sessions, regular messages, and checkpoint logic
 */
const MessageRendererContent: React.FC<MessageRendererProps> = ({
	messageOrGroup,
	modifiedMessages,
	isLastMessage,
	isLastToolGroup,
	lastModifiedMessage,
	reasoningContent,
	isRequestInProgress,
	expandedRows,
	onToggleExpand,
	onHeightChange,
	onPendingQuoteChange,
	onCancelCommand,
	inputValue,
	messageHandlers,
	footerActive,
	chatState,
	task,
}) => {
	const { mode } = useExtensionState()

	const content = (() => {
		if (isToolGroup(messageOrGroup)) {
			return <ToolGroupRenderer allMessages={modifiedMessages} isLastGroup={isLastToolGroup} messages={messageOrGroup} />
		}

		// Browser session group
		if (Array.isArray(messageOrGroup)) {
			return (
				<BrowserSessionRow
					expandedRows={expandedRows}
					isLast={isLastMessage}
					key={messageOrGroup[0]?.ts}
					lastModifiedMessage={lastModifiedMessage}
					messages={messageOrGroup}
					onHeightChange={onHeightChange}
					onPendingQuoteChange={onPendingQuoteChange}
					onToggleExpand={onToggleExpand}
				/>
			)
		}

		// Regular message
		return (
			<ChatRow
				inputValue={inputValue}
				isExpanded={expandedRows[messageOrGroup.ts] || false}
				isLast={isLastMessage}
				isRequestInProgress={isRequestInProgress}
				key={messageOrGroup.ts}
				lastModifiedMessage={lastModifiedMessage}
				message={messageOrGroup}
				mode={mode}
				onCancelCommand={onCancelCommand}
				onHeightChange={onHeightChange}
				onPendingQuoteChange={onPendingQuoteChange}
				onToggleExpand={onToggleExpand}
				reasoningContent={reasoningContent}
				sendMessageFromChatRow={messageHandlers.handleSendMessage}
			/>
		)
	})()

	return (
		<div
			className={cn({
				"pb-2.5": isLastMessage && !footerActive,
			})}
			data-message-ts={Array.isArray(messageOrGroup) ? messageOrGroup[0]?.ts : messageOrGroup.ts}>
			{content}
			{isLastMessage && (
				<div className="mt-2.5">
					<ActionButtons
						chatState={chatState}
						messageHandlers={messageHandlers}
						messages={modifiedMessages}
						mode={mode}
						task={task}
					/>
				</div>
			)}
		</div>
	)
}

const areMessageRendererPropsEqual = (previous: MessageRendererProps, next: MessageRendererProps) => {
	const transcriptSensitive =
		previous.isLastMessage ||
		next.isLastMessage ||
		previous.isLastToolGroup ||
		next.isLastToolGroup ||
		isToolGroup(previous.messageOrGroup) ||
		isToolGroup(next.messageOrGroup)

	return (
		previous.messageOrGroup === next.messageOrGroup &&
		previous.isLastMessage === next.isLastMessage &&
		previous.isLastToolGroup === next.isLastToolGroup &&
		previous.lastModifiedMessage === next.lastModifiedMessage &&
		previous.reasoningContent === next.reasoningContent &&
		previous.isRequestInProgress === next.isRequestInProgress &&
		previous.expandedRows === next.expandedRows &&
		previous.onToggleExpand === next.onToggleExpand &&
		previous.onHeightChange === next.onHeightChange &&
		previous.onPendingQuoteChange === next.onPendingQuoteChange &&
		previous.onCancelCommand === next.onCancelCommand &&
		previous.inputValue === next.inputValue &&
		previous.messageHandlers === next.messageHandlers &&
		previous.footerActive === next.footerActive &&
		previous.chatState === next.chatState &&
		previous.task === next.task &&
		(!transcriptSensitive || previous.modifiedMessages === next.modifiedMessages)
	)
}

export const MessageRenderer = memo(MessageRendererContent, areMessageRendererPropsEqual)

/**
 * Factory function to create the itemContent callback for Virtuoso
 * This allows us to encapsulate the rendering logic while maintaining performance
 */
export const createMessageRenderer = (
	groupedMessages: (DietCodeMessage | DietCodeMessage[])[],
	modifiedMessages: DietCodeMessage[],
	expandedRows: Record<number, boolean>,
	onToggleExpand: (ts: number) => void,
	onHeightChange: (isTaller: boolean) => void,
	onPendingQuoteChange: (quote: string | null) => void,
	inputValue: string,
	messageHandlers: MessageHandlers,
	footerActive: boolean,
	chatState: ChatState,
	task: DietCodeMessage,
) => {
	let lastToolGroupIndex = -1
	for (let index = groupedMessages.length - 1; index >= 0; index--) {
		if (isToolGroup(groupedMessages[index])) {
			lastToolGroupIndex = index
			break
		}
	}
	const lastModifiedMessage = modifiedMessages.at(-1)
	const reasoningByApiReqTimestamp = buildReasoningByApiReqTimestamp(modifiedMessages)
	const pendingToolCallByTextTimestamp = buildPendingToolCallByTextTimestamp(modifiedMessages)
	const handleCancelCommand = () => {
		void messageHandlers.executeButtonAction("cancel")
	}

	return (index: number, messageOrGroup: DietCodeMessage | DietCodeMessage[]) => (
		<MessageRenderer
			chatState={chatState}
			expandedRows={expandedRows}
			footerActive={footerActive}
			inputValue={inputValue}
			isLastMessage={index === groupedMessages.length - 1}
			isLastToolGroup={index === lastToolGroupIndex}
			isRequestInProgress={
				!Array.isArray(messageOrGroup) && messageOrGroup.say === "text"
					? (pendingToolCallByTextTimestamp.get(messageOrGroup.ts) ?? false)
					: false
			}
			lastModifiedMessage={index === groupedMessages.length - 1 ? lastModifiedMessage : undefined}
			messageHandlers={messageHandlers}
			messageOrGroup={messageOrGroup}
			modifiedMessages={modifiedMessages}
			onCancelCommand={handleCancelCommand}
			onHeightChange={onHeightChange}
			onPendingQuoteChange={onPendingQuoteChange}
			onToggleExpand={onToggleExpand}
			reasoningContent={
				!Array.isArray(messageOrGroup) && messageOrGroup.say === "api_req_started"
					? reasoningByApiReqTimestamp.get(messageOrGroup.ts)
					: undefined
			}
			task={task}
		/>
	)
}
