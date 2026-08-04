import { isAgentActiveForPlaceholder, isTaskInIdleGap } from "@shared/agentActivity"
import { buildAuditEventLiveAnnouncement } from "@shared/audit/auditEventAnnouncements"
import { buildUIGateEvaluationOptions } from "@shared/audit/auditGateUiOptions"
import { getAutoScrollAuditEventTs, getLatestAdvisorySnapshot, getLatestGateBlockSnapshot } from "@shared/audit/auditHistoryUtils"
import { buildAuditMessageIndex, getAuditTrend } from "@shared/audit/auditMessages"
import { findAuditMessageIndex, findMessageIndexForAuditTs } from "@shared/audit/auditNavigation"
import { buildPreCompletionChecklistSummary } from "@shared/audit/auditPreCompletionChecklist"
import { computeAuditHealthSummaryWithBaseline } from "@shared/audit/auditRollup"
import { buildSubagentAuditSummary } from "@shared/audit/auditSubagentRollup"
import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import { combineErrorRetryMessages } from "@shared/combineErrorRetryMessages"
import { combineHookSequences } from "@shared/combineHookSequences"
import { resolveCompletionFunnelSnapshot } from "@shared/completion/completionFunnelMessages"
import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { getApiMetrics, getLastApiReqTotalTokens } from "@shared/getApiMetrics"
import { BooleanRequest, type String as ProtoString, StringRequest } from "@shared/proto/dietcode/common"
import type { ShowWebviewEvent } from "@shared/proto/dietcode/ui"
import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useMount } from "react-use"
import { isChatInputEnabled } from "@/components/chat/chat-view/shared/chatInputPolicy"
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"
import { useChatMessages, useExtensionState } from "@/context/ExtensionStateContext"
import { pickChatPlaceholder } from "@/copy/lumiVoice"
import { useAuditAutoScrollPolicy } from "@/hooks/useAuditAutoScrollPolicy"
import { useAuditGateConfig } from "@/hooks/useAuditGateConfig"
import { useGrpcSubscription } from "@/hooks/useGrpcSubscription"
import { useLumiSessionComfort } from "@/hooks/useLumiSessionComfort"
import { FileServiceClient, UiServiceClient } from "@/services/grpc-client"
import { ChatFooter } from "./chat-view/components/layout/ChatFooter"
import { ChatLayout } from "./chat-view/components/layout/ChatLayout"
import { CHAT_CONSTANTS } from "./chat-view/constants"
import { useChatState } from "./chat-view/hooks/useChatState"
import { useMessageHandlers } from "./chat-view/hooks/useMessageHandlers"
import { useScrollBehavior } from "./chat-view/hooks/useScrollBehavior"
import type { ChatState, MessageHandlers } from "./chat-view/types/chatTypes"
import { filterVisibleMessages, groupLowStakesTools, groupMessages } from "./chat-view/utils/messageUtils"

interface ChatViewProps {
	isHidden: boolean
	showAnnouncement: boolean
	hideAnnouncement: () => void
	showHistoryView: () => void
}

interface ActiveChatViewProps extends ChatViewProps {
	messages: DietCodeMessage[]
	chatState: ChatState
	messageHandlers: MessageHandlers
}

// Use constants from the imported module
const MAX_IMAGES_AND_FILES_PER_MESSAGE = CHAT_CONSTANTS.MAX_IMAGES_AND_FILES_PER_MESSAGE

// Keep the composer and bridge subscriptions in the initial chat chunk. The
// transcript, task header, welcome surface, and history panel are independently
// loaded because only one of them is visible at a time and each pulls in a
// substantial secondary module graph.
const InlineHistoryPanel = lazy(() =>
	import("@/components/history/InlineHistoryPanel").then(({ InlineHistoryPanel: component }) => ({ default: component })),
)
const MessagesArea = lazy(() =>
	import("./chat-view/components/layout/MessagesArea").then(({ MessagesArea: component }) => ({ default: component })),
)
const TaskSection = lazy(() =>
	import("./chat-view/components/layout/TaskSection").then(({ TaskSection: component }) => ({ default: component })),
)
const WelcomeSection = lazy(() =>
	import("./chat-view/components/layout/WelcomeSection").then(({ WelcomeSection: component }) => ({ default: component })),
)

const ActiveChatView = memo<ActiveChatViewProps>(
	({ isHidden, showAnnouncement, hideAnnouncement, showHistoryView, messages, chatState, messageHandlers }) => {
		// Keep input/navigation decisions on the live stream, but let the expensive
		// timeline and audit derivations settle at concurrent priority. This gives
		// the composer an urgent lane during dense token bursts.
		const renderMessages = useDeferredValue(messages)
		const {
			version,
			taskHistory,
			apiConfiguration,
			telemetrySetting,
			mode,
			currentFocusChainChecklist,
			focusChainSettings,
			hooksEnabled,
			isNewUser,
			currentTaskItem,
			showHistory,
			hideHistory,
		} = useExtensionState()
		//const task = messages.length > 0 ? (messages[0].say === "task" ? messages[0] : undefined) : undefined) : undefined
		const task = useMemo(() => messages.at(0), [messages]) // leaving this less safe version here since if the first message is not a task, then the extension is in a bad state and needs to be debugged (see LUMI.abort)
		const modifiedMessages = useMemo(() => {
			const slicedMessages = renderMessages.slice(1)
			// Only combine hook sequences if hooks are enabled
			const withHooks = hooksEnabled ? combineHookSequences(slicedMessages) : slicedMessages
			return combineErrorRetryMessages(combineApiRequests(combineCommandSequences(withHooks)))
		}, [renderMessages, hooksEnabled])
		// has to be after api_req_finished are all reduced into api_req_started messages
		const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

		const lastApiReqTotalTokens = useMemo(() => getLastApiReqTotalTokens(modifiedMessages) || undefined, [modifiedMessages])

		const auditMessageIndex = useMemo(() => buildAuditMessageIndex(renderMessages), [renderMessages])
		const latestAuditMetadata = auditMessageIndex.latestGateAudit
		const completionFunnelSnapshot = useMemo(() => resolveCompletionFunnelSnapshot(renderMessages), [renderMessages])
		const auditTrend = useMemo(
			() => getAuditTrend(auditMessageIndex.previousGateAudit, latestAuditMetadata),
			[auditMessageIndex, latestAuditMetadata],
		)
		const auditSnapshots = auditMessageIndex.displaySnapshots
		const planAuditBaseline = auditMessageIndex.latestPlanAudit
		const auditHealth = useMemo(
			() => computeAuditHealthSummaryWithBaseline(auditSnapshots, planAuditBaseline),
			[auditSnapshots, planAuditBaseline],
		)
		const subagentAuditSummary = useMemo(() => buildSubagentAuditSummary(renderMessages), [renderMessages])
		const gateConfig = useAuditGateConfig()
		const auditAutoScrollPolicy = useAuditAutoScrollPolicy()
		const checklistSummary = useMemo(
			() =>
				buildPreCompletionChecklistSummary(
					latestAuditMetadata,
					buildUIGateEvaluationOptions(gateConfig, renderMessages, latestAuditMetadata),
				),
			[latestAuditMetadata, gateConfig, renderMessages],
		)

		const {
			selectedImages,
			setSelectedImages,
			selectedFiles,
			setSelectedFiles,
			sendingDisabled,
			enableButtons,
			expandedRows,
			setExpandedRows,
			textAreaRef,
		} = chatState

		const { sessionMinutes, isNightDesk, serenityLevel } = useLumiSessionComfort()

		useEffect(() => {
			const handleCopy = async (e: ClipboardEvent) => {
				const targetElement = e.target as HTMLElement | null
				// If the copy event originated from an input or textarea,
				// let the default browser behavior handle it.
				if (
					targetElement &&
					(targetElement.tagName === "INPUT" || targetElement.tagName === "TEXTAREA" || targetElement.isContentEditable)
				) {
					return
				}

				if (window.getSelection) {
					const selection = window.getSelection()
					if (selection && selection.rangeCount > 0) {
						const range = selection.getRangeAt(0)
						const commonAncestor = range.commonAncestorContainer
						let textToCopy: string | null = null

						// Check if the selection is inside an element where plain text copy is preferred
						let currentElement =
							commonAncestor.nodeType === Node.ELEMENT_NODE
								? (commonAncestor as HTMLElement)
								: commonAncestor.parentElement
						let preferPlainTextCopy = false
						while (currentElement) {
							if (currentElement.tagName === "PRE" && currentElement.querySelector("code")) {
								preferPlainTextCopy = true
								break
							}
							// Check computed white-space style
							const computedStyle = window.getComputedStyle(currentElement)
							if (
								computedStyle.whiteSpace === "pre" ||
								computedStyle.whiteSpace === "pre-wrap" ||
								computedStyle.whiteSpace === "pre-line"
							) {
								// If the element itself or an ancestor has pre-like white-space,
								// and the selection is likely contained within it, prefer plain text.
								// This helps with elements like the TaskHeader's text display.
								preferPlainTextCopy = true
								break
							}

							// Stop searching if we reach a known chat message boundary or body
							if (
								currentElement.classList.contains("chat-row-assistant-message-container") ||
								currentElement.classList.contains("chat-row-user-message-container") ||
								currentElement.tagName === "BODY"
							) {
								break
							}
							currentElement = currentElement.parentElement
						}

						if (preferPlainTextCopy) {
							// For code blocks or elements with pre-formatted white-space, get plain text.
							textToCopy = selection.toString()
						} else {
							// For other content, use the existing HTML-to-Markdown conversion
							const clonedSelection = range.cloneContents()
							const div = document.createElement("div")
							div.appendChild(clonedSelection)
							const selectedHtml = div.innerHTML
							// This conversion pulls in unified/rehype/remark. Keep that
							// clipboard-only graph out of the initial interaction chunk.
							const { convertHtmlToMarkdown } = await import("./chat-view/utils/markdownUtils")
							textToCopy = await convertHtmlToMarkdown(selectedHtml)
						}

						if (textToCopy !== null) {
							try {
								FileServiceClient.copyToClipboard(StringRequest.create({ value: textToCopy })).catch((err) => {
									console.error("Error copying to clipboard:", err)
								})
								e.preventDefault()
							} catch (error) {
								console.error("Error copying to clipboard:", error)
							}
						}
					}
				}
			}
			document.addEventListener("copy", handleCopy)

			return () => {
				document.removeEventListener("copy", handleCopy)
			}
		}, [])
		// Button state is now managed by useButtonState hook

		// handleFocusChange is already provided by chatState

		const renderChatState = useDeferredValue(chatState)
		const renderMessageHandlers = useDeferredValue(messageHandlers)

		const { selectedModelInfo } = useMemo(() => {
			return normalizeApiConfiguration(apiConfiguration, mode)
		}, [apiConfiguration, mode])
		const taskHeaderModelInfo = useMemo(
			() => ({
				supportsPromptCache: selectedModelInfo.supportsPromptCache,
				supportsImages: selectedModelInfo.supportsImages || false,
			}),
			[selectedModelInfo.supportsPromptCache, selectedModelInfo.supportsImages],
		)

		const selectFilesAndImages = useCallback(async () => {
			try {
				const response = await FileServiceClient.selectFiles(
					BooleanRequest.create({
						value: selectedModelInfo.supportsImages,
					}),
				)
				if (response?.values1 && response.values2 && (response.values1.length > 0 || response.values2.length > 0)) {
					const currentTotal = selectedImages.length + selectedFiles.length
					const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - currentTotal

					if (availableSlots > 0) {
						// Prioritize images first
						const imagesToAdd = Math.min(response.values1.length, availableSlots)
						if (imagesToAdd > 0) {
							setSelectedImages((prevImages) => [...prevImages, ...response.values1.slice(0, imagesToAdd)])
						}

						// Use remaining slots for files
						const remainingSlots = availableSlots - imagesToAdd
						if (remainingSlots > 0) {
							setSelectedFiles((prevFiles) => [...prevFiles, ...response.values2.slice(0, remainingSlots)])
						}
					}
				}
			} catch (error) {
				console.error("Error selecting images & files:", error)
			}
		}, [selectedModelInfo.supportsImages, selectedFiles.length, selectedImages.length, setSelectedFiles, setSelectedImages])

		const shouldDisableFilesAndImages = selectedImages.length + selectedFiles.length >= MAX_IMAGES_AND_FILES_PER_MESSAGE

		useMount(() => {
			// NOTE: the vscode window needs to be focused for this to work
			textAreaRef.current?.focus()
		})

		const visibleMessages = useMemo(() => {
			return filterVisibleMessages(modifiedMessages)
		}, [modifiedMessages])

		const lastProgressMessageText = useMemo(() => {
			if (!focusChainSettings.enabled) {
				return undefined
			}

			// First check if we have a current focus chain list from the extension state
			if (currentFocusChainChecklist) {
				return currentFocusChainChecklist
			}

			// Fall back to the last task_progress message if no state focus chain list.
			// Walk backwards without allocating a reversed copy of the stream.
			for (let index = modifiedMessages.length - 1; index >= 0; index--) {
				if (modifiedMessages[index].say === "task_progress") {
					return modifiedMessages[index].text
				}
			}
			return undefined
		}, [focusChainSettings.enabled, modifiedMessages, currentFocusChainChecklist])

		const showFocusChainPlaceholder = useMemo(() => {
			// Show placeholder whenever focus chain is enabled and no checklist exists yet.
			return focusChainSettings.enabled && !lastProgressMessageText
		}, [focusChainSettings.enabled, lastProgressMessageText])

		const groupedMessages = useMemo(() => {
			return groupLowStakesTools(groupMessages(visibleMessages))
		}, [visibleMessages])

		// Use scroll behavior hook
		const scrollBehavior = useScrollBehavior(renderMessages, visibleMessages, groupedMessages, expandedRows, setExpandedRows)

		const handleScrollToAuditMessage = useCallback(
			(ts: number) => {
				const snapshot = auditSnapshots.find((entry) => entry.ts === ts)
				const index = snapshot
					? findAuditMessageIndex(renderMessages, snapshot)
					: findMessageIndexForAuditTs(renderMessages, ts)
				if (index >= 0) {
					scrollBehavior.scrollToMessage(index)
				}
			},
			[renderMessages, auditSnapshots, scrollBehavior],
		)

		const previousAuditSnapshotCountRef = useRef(auditSnapshots.length)
		const [auditLiveAnnouncement, setAuditLiveAnnouncement] = useState("")
		useEffect(() => {
			const scrollTs = getAutoScrollAuditEventTs(
				auditSnapshots,
				previousAuditSnapshotCountRef.current,
				auditAutoScrollPolicy,
			)
			if (scrollTs !== undefined) {
				const snapshot = auditSnapshots.find((entry) => entry.ts === scrollTs)
				if (snapshot) {
					setAuditLiveAnnouncement(buildAuditEventLiveAnnouncement(snapshot))
				}
				handleScrollToAuditMessage(scrollTs)
			}
			previousAuditSnapshotCountRef.current = auditSnapshots.length
		}, [auditSnapshots, auditAutoScrollPolicy, handleScrollToAuditMessage])

		const handleScrollToLatestGateBlock = useCallback(() => {
			const latest = getLatestGateBlockSnapshot(auditSnapshots)
			if (latest) {
				handleScrollToAuditMessage(latest.ts)
			}
		}, [auditSnapshots, handleScrollToAuditMessage])

		const handleScrollToLatestAdvisory = useCallback(() => {
			const latest = getLatestAdvisorySnapshot(auditSnapshots)
			if (latest) {
				handleScrollToAuditMessage(latest.ts)
			}
		}, [auditSnapshots, handleScrollToAuditMessage])

		const taskSessionActive = Boolean(currentTaskItem?.id)

		const chatInputEnabled = useMemo(
			() => isChatInputEnabled(messages, chatState.dietcodeAsk, { sendingDisabled }, { taskSessionActive }),
			[messages, chatState.dietcodeAsk, sendingDisabled, taskSessionActive],
		)

		useEffect(() => {
			const timer = setTimeout(() => {
				if (!isHidden && chatInputEnabled && !enableButtons) {
					textAreaRef.current?.focus()
				}
			}, 50)
			return () => {
				clearTimeout(timer)
			}
		}, [isHidden, chatInputEnabled, enableButtons, textAreaRef.current])

		const placeholderText = useMemo(() => {
			const seed = task?.ts ?? 0
			const agentActive = isAgentActiveForPlaceholder(messages, chatState.dietcodeAsk)
			const idleGap = isTaskInIdleGap(messages, chatState.dietcodeAsk)
			return pickChatPlaceholder(Boolean(task), seed, sessionMinutes, isNightDesk, agentActive, idleGap)
		}, [task, sessionMinutes, isNightDesk, messages, chatState.dietcodeAsk])

		return (
			<ChatLayout isHidden={isHidden} isNightDesk={isNightDesk} serenityLevel={serenityLevel}>
				<div aria-atomic="true" aria-live="polite" className="sr-only">
					{auditLiveAnnouncement}
				</div>
				<div className="flex flex-col flex-1 overflow-hidden">
					{showHistory ? (
						<Suspense fallback={<div aria-hidden className="flex min-h-0 flex-1" />}>
							<InlineHistoryPanel hasActiveConversation={Boolean(task)} onClose={hideHistory} />
						</Suspense>
					) : task ? (
						<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
							<div className="shrink-0 z-[5] bg-background">
								<Suspense fallback={<div aria-hidden className="min-h-10 w-full" />}>
									<TaskSection
										apiMetrics={apiMetrics}
										auditHealth={auditHealth}
										auditSnapshots={auditSnapshots}
										auditTrend={auditTrend}
										checklistSummary={checklistSummary}
										completionFunnelSnapshot={completionFunnelSnapshot}
										lastApiReqTotalTokens={lastApiReqTotalTokens}
										lastProgressMessageText={lastProgressMessageText}
										latestAuditMetadata={latestAuditMetadata}
										messageHandlers={renderMessageHandlers}
										messages={renderMessages}
										onScrollToAuditMessage={handleScrollToAuditMessage}
										onScrollToLatestAdvisory={handleScrollToLatestAdvisory}
										onScrollToLatestGateBlock={handleScrollToLatestGateBlock}
										selectedModelInfo={taskHeaderModelInfo}
										showFocusChainPlaceholder={showFocusChainPlaceholder}
										subagentAuditSummary={subagentAuditSummary}
										task={task}
									/>
								</Suspense>
							</div>
							<Suspense fallback={<div aria-hidden className="flex min-h-0 flex-1" />}>
								<MessagesArea
									chatState={renderChatState}
									groupedMessages={groupedMessages}
									messageHandlers={renderMessageHandlers}
									modifiedMessages={modifiedMessages}
									rawMessages={renderMessages}
									scrollBehavior={scrollBehavior}
									task={task}
								/>
							</Suspense>
						</div>
					) : !isNewUser ? (
						<Suspense fallback={<div aria-hidden className="flex min-h-0 flex-1" />}>
							<WelcomeSection
								chatState={chatState}
								hideAnnouncement={hideAnnouncement}
								messageHandlers={messageHandlers}
								messages={messages}
								mode={mode}
								placeholderText={placeholderText}
								selectFilesAndImages={selectFilesAndImages}
								shouldDisableFilesAndImages={shouldDisableFilesAndImages}
								showAnnouncement={showAnnouncement}
								showHistoryView={showHistoryView}
								taskHistory={taskHistory}
								taskSessionActive={taskSessionActive}
								telemetrySetting={telemetrySetting}
								version={version}
							/>
						</Suspense>
					) : null}
				</div>
				<ChatFooter
					chatState={chatState}
					isNewUser={isNewUser}
					messageHandlers={messageHandlers}
					messages={messages}
					placeholderText={placeholderText}
					scrollBehavior={scrollBehavior}
					selectFilesAndImages={selectFilesAndImages}
					shouldDisableFilesAndImages={shouldDisableFilesAndImages}
					showHistory={showHistory}
					task={task}
					taskSessionActive={taskSessionActive}
				/>
			</ChatLayout>
		)
	},
)

/**
 * Keep the composer state and bridge subscriptions alive while secondary
 * screens are open, but suspend the expensive transcript derivation and
 * virtualization tree. The typed prompt survives navigation without making
 * Settings/MCP compete with a live stream for the main thread.
 */
const ChatView = (props: ChatViewProps) => {
	const messages = useChatMessages()
	const chatState = useChatState(messages)
	const messageHandlers = useMessageHandlers(messages, chatState)
	const { setInputValue, textAreaRef } = chatState
	const isHiddenRef = useRef(props.isHidden)
	isHiddenRef.current = props.isHidden

	useGrpcSubscription<Record<string, never>, ShowWebviewEvent>({
		key: "showWebview",
		debugLabel: "Show Webview Focus",
		subscribe: UiServiceClient.subscribeToShowWebview.bind(UiServiceClient),
		request: {},
		staleAfterMs: null,
		onMessage: (event) => {
			if (!isHiddenRef.current && !event.preserveEditorFocus) {
				textAreaRef.current?.focus()
			}
		},
	})

	useGrpcSubscription<Record<string, never>, ProtoString>({
		key: "addToInput",
		debugLabel: "Add To Input",
		subscribe: UiServiceClient.subscribeToAddToInput.bind(UiServiceClient),
		request: {},
		staleAfterMs: null,
		onMessage: (event) => {
			if (!event.value) return
			setInputValue((prevValue) => {
				const newTextWithNewline = `${event.value}\n`
				return prevValue ? `${prevValue}\n${newTextWithNewline}` : newTextWithNewline
			})
			setTimeout(() => {
				if (textAreaRef.current) {
					textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight
					textAreaRef.current.focus()
				}
			}, 0)
		},
	})

	if (props.isHidden) {
		return (
			<ChatLayout isHidden isNightDesk={false} serenityLevel={0}>
				<div aria-hidden />
			</ChatLayout>
		)
	}

	return <ActiveChatView {...props} chatState={chatState} messageHandlers={messageHandlers} messages={messages} />
}

export default ChatView
