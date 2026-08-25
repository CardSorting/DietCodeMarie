import { projectMessageForWebview, projectMessagesForWebview } from "@shared/diagnostics/webviewDiagnostics"
import type { ExtensionState } from "@shared/ExtensionMessage"
import { DEFAULT_STALE_AFTER_MS } from "@shared/grpc/persistent-stream"
import { EmptyRequest } from "@shared/proto/dietcode/common"
import type { McpServers, McpMarketplaceCatalog as ProtoMcpMarketplaceCatalog } from "@shared/proto/dietcode/mcp"
import type { OpenRouterCompatibleModelInfo } from "@shared/proto/dietcode/models"
import type { State, TerminalProfile } from "@shared/proto/dietcode/state"
import type { DietCodeMessage } from "@shared/proto/dietcode/ui"
import { convertProtoToDietCodeMessage } from "@shared/proto-conversions/dietcode-message"
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import { startTransition, useCallback, useEffect, useRef } from "react"
import { useGrpcSubscription } from "@/hooks/useGrpcSubscription"
import { StateServiceClient, UiServiceClient } from "@/services/core-grpc-client"
import { createLazyMcpSubscription } from "@/services/mcp-grpc-loader"
import { convertModelResponse, createLazyModelSubscription } from "@/services/model-grpc-loader"
import type { ModelInfo } from "../../../src/shared/api"
import { openRouterDefaultModelId, openRouterDefaultModelInfo } from "../../../src/shared/api-defaults"
import type { McpMarketplaceCatalog, McpServer } from "../../../src/shared/mcp"

const EMPTY_REQUEST = EmptyRequest.create({})
const EMPTY_UI_REQUEST = {}
const subscribeToOpenRouterModels = createLazyModelSubscription("subscribeToOpenRouterModels")
const subscribeToLiteLlmModels = createLazyModelSubscription("subscribeToLiteLlmModels")
const subscribeToMcpServers = createLazyMcpSubscription("subscribeToMcpServers")
const subscribeToMcpMarketplaceCatalog = createLazyMcpSubscription("subscribeToMcpMarketplaceCatalog")

export interface ExtensionGrpcSubscriptionsParams {
	setState: Dispatch<SetStateAction<ExtensionState>>
	setDietcodeMessages: Dispatch<SetStateAction<ExtensionState["dietcodeMessages"]>>
	setDidHydrateState: (value: boolean) => void
	setShowWelcome: (value: boolean) => void
	setMcpServers: (value: McpServer[]) => void
	setMcpMarketplaceCatalog: (value: McpMarketplaceCatalog) => void
	setOpenRouterModels: (value: Record<string, ModelInfo>) => void
	setLiteLlmModels: (value: Record<string, ModelInfo>) => void
	setAvailableTerminalProfiles: (value: TerminalProfile[]) => void
	isStateHydrated: boolean
	relinquishControlCallbacks: MutableRefObject<Set<() => void>>
	navigateToHistory: () => void
	navigateToChat: () => void
	navigateToSettings: () => void
	navigateToWorktrees: () => void
}

/** Declarative, auto-reconnecting extension subscriptions — transport owned by GrpcSubscriptionRuntime. */
export function useExtensionGrpcSubscriptions(params: ExtensionGrpcSubscriptionsParams): void {
	const {
		setState,
		setDietcodeMessages,
		setDidHydrateState,
		setShowWelcome,
		setMcpServers,
		setMcpMarketplaceCatalog,
		setOpenRouterModels,
		setLiteLlmModels,
		setAvailableTerminalProfiles,
		isStateHydrated,
		relinquishControlCallbacks,
		navigateToHistory,
		navigateToChat,
		navigateToSettings,
		navigateToWorktrees,
	} = params

	const currentTaskIdRef = useRef<string | undefined>(undefined)
	const showInternalDiagnosticsRef = useRef(false)
	const pendingPartialMessagesRef = useRef(new Map<number, ExtensionState["dietcodeMessages"][number]>())
	const cancelPartialFlushRef = useRef<(() => void) | null>(null)
	const messageIndexCacheRef = useRef<{
		messages: ExtensionState["dietcodeMessages"]
		indexByTimestamp: Map<number, number>
	} | null>(null)

	// Partial messages can arrive much faster than the browser can paint. Keep
	// only the newest update for each message and commit the batch once per frame
	// so a fast stream cannot create an unbounded render queue.
	const flushPendingPartialMessages = useCallback(() => {
		cancelPartialFlushRef.current = null
		const pendingMessages = Array.from(pendingPartialMessagesRef.current.values())
		pendingPartialMessagesRef.current.clear()
		if (pendingMessages.length === 0) return

		startTransition(() => {
			setDietcodeMessages((previousMessages) => {
				let messageIndexByTimestamp = messageIndexCacheRef.current?.indexByTimestamp
				if (messageIndexCacheRef.current?.messages !== previousMessages || !messageIndexByTimestamp) {
					messageIndexByTimestamp = new Map<number, number>()
					for (let index = 0; index < previousMessages.length; index++) {
						// Assigning in forward order preserves findLastIndex semantics if
						// legacy state ever contains duplicate timestamps.
						messageIndexByTimestamp.set(previousMessages[index].ts, index)
					}
					messageIndexCacheRef.current = { messages: previousMessages, indexByTimestamp: messageIndexByTimestamp }
				}

				let nextMessages = previousMessages
				for (const incomingPartialMessage of pendingMessages) {
					const partialMessage = projectMessageForWebview(incomingPartialMessage, {
						showInternalDiagnostics: showInternalDiagnosticsRef.current,
					})
					const lastIndex = messageIndexByTimestamp.get(partialMessage.ts)
					if (lastIndex === undefined) continue
					if (nextMessages === previousMessages) {
						nextMessages = [...previousMessages]
					}
					nextMessages[lastIndex] = partialMessage
				}
				if (nextMessages !== previousMessages) {
					// Partial updates replace existing rows in place, so the timestamp
					// index remains valid for the new immutable array identity.
					messageIndexCacheRef.current = { messages: nextMessages, indexByTimestamp: messageIndexByTimestamp }
				}
				return nextMessages
			})
		})
	}, [setDietcodeMessages])

	const schedulePartialFlush = useCallback(() => {
		if (cancelPartialFlushRef.current) return

		if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
			const frameId = window.requestAnimationFrame(() => {
				cancelPartialFlushRef.current = null
				flushPendingPartialMessages()
			})
			cancelPartialFlushRef.current = () => window.cancelAnimationFrame(frameId)
			return
		}

		const timeoutId = setTimeout(() => {
			cancelPartialFlushRef.current = null
			flushPendingPartialMessages()
		}, 16)
		cancelPartialFlushRef.current = () => clearTimeout(timeoutId)
	}, [flushPendingPartialMessages])

	useEffect(() => {
		return () => {
			cancelPartialFlushRef.current?.()
			cancelPartialFlushRef.current = null
			pendingPartialMessagesRef.current.clear()
		}
	}, [])

	useGrpcSubscription<typeof EMPTY_REQUEST, State>({
		key: "state",
		debugLabel: "Extension State",
		subscribe: StateServiceClient.subscribeToState.bind(StateServiceClient),
		request: EMPTY_REQUEST,
		staleAfterMs: DEFAULT_STALE_AFTER_MS,
		onMessage: (response) => {
			if (!response.stateJson) {
				setDidHydrateState(true)
				return
			}
			try {
				const stateData = JSON.parse(response.stateJson) as ExtensionState
				showInternalDiagnosticsRef.current = stateData.showInternalDiagnostics === true
				stateData.dietcodeMessages = projectMessagesForWebview(stateData.dietcodeMessages ?? [], {
					showInternalDiagnostics: showInternalDiagnosticsRef.current,
				})
				const incomingTaskId = stateData.currentTaskItem?.id
				const taskChanged = incomingTaskId !== currentTaskIdRef.current
				currentTaskIdRef.current = incomingTaskId
				if (stateData.dietcodeMessages.length > 0 || taskChanged) {
					setDietcodeMessages(stateData.dietcodeMessages)
				}
				setState((prevState) => {
					const incomingVersion = stateData.autoApprovalSettings?.version ?? 1
					const currentVersion = prevState.autoApprovalSettings?.version ?? 1
					const shouldUpdateAutoApproval = incomingVersion > currentVersion
					return {
						...stateData,
						// The live message list is intentionally stored on its own
						// context; keep this compatibility field stable so the global
						// context does not broadcast on every partial.
						dietcodeMessages: prevState.dietcodeMessages,
						autoApprovalSettings: shouldUpdateAutoApproval
							? stateData.autoApprovalSettings
							: prevState.autoApprovalSettings,
					}
				})
				setShowWelcome(false)
				setDidHydrateState(true)
			} catch (error) {
				console.error("Error parsing state JSON:", error)
				setDidHydrateState(true)
			}
		},
		onError: (error) => {
			console.error("State subscription failed; rendering the fallback shell:", error)
			setDidHydrateState(true)
		},
	})

	useGrpcSubscription<typeof EMPTY_REQUEST, DietCodeMessage>({
		key: "partialMessage",
		debugLabel: "Partial Messages",
		subscribe: UiServiceClient.subscribeToPartialMessage.bind(UiServiceClient),
		request: EMPTY_REQUEST,
		onMessage: (protoMessage) => {
			try {
				if (!protoMessage.ts || protoMessage.ts <= 0) return
				const incomingPartialMessage = convertProtoToDietCodeMessage(protoMessage)
				pendingPartialMessagesRef.current.set(incomingPartialMessage.ts, incomingPartialMessage)
				schedulePartialFlush()
			} catch (error) {
				console.error("Failed to process partial message:", error, protoMessage)
			}
		},
	})

	useGrpcSubscription<typeof EMPTY_REQUEST, McpServers>({
		key: "mcpServers",
		debugLabel: "MCP Servers",
		subscribe: subscribeToMcpServers,
		request: EMPTY_REQUEST,
		staleAfterMs: DEFAULT_STALE_AFTER_MS,
		enabled: isStateHydrated,
		onMessage: (response) => {
			if (response.mcpServers) {
				setMcpServers(convertProtoMcpServersToMcpServers(response.mcpServers))
			}
		},
	})

	useGrpcSubscription<typeof EMPTY_REQUEST, ProtoMcpMarketplaceCatalog>({
		key: "mcpMarketplaceCatalog",
		debugLabel: "MCP Marketplace",
		subscribe: subscribeToMcpMarketplaceCatalog,
		request: EMPTY_REQUEST,
		staleAfterMs: DEFAULT_STALE_AFTER_MS,
		enabled: isStateHydrated,
		onMessage: (catalog) => setMcpMarketplaceCatalog(catalog),
	})

	useGrpcSubscription<typeof EMPTY_REQUEST, OpenRouterCompatibleModelInfo>({
		key: "openRouterModels",
		debugLabel: "OpenRouter Models",
		subscribe: subscribeToOpenRouterModels,
		request: EMPTY_REQUEST,
		staleAfterMs: DEFAULT_STALE_AFTER_MS,
		enabled: isStateHydrated,
		onMessage: (response) => {
			void convertModelResponse(response)
				.then((models) =>
					setOpenRouterModels({
						[openRouterDefaultModelId]: openRouterDefaultModelInfo,
						...models,
					}),
				)
				.catch((error) => console.error("Failed to convert OpenRouter models:", error))
		},
	})

	useGrpcSubscription<typeof EMPTY_REQUEST, OpenRouterCompatibleModelInfo>({
		key: "liteLlmModels",
		debugLabel: "LiteLLM Models",
		subscribe: subscribeToLiteLlmModels,
		request: EMPTY_REQUEST,
		staleAfterMs: DEFAULT_STALE_AFTER_MS,
		enabled: isStateHydrated,
		onMessage: (response) => {
			void convertModelResponse(response)
				.then(setLiteLlmModels)
				.catch((error) => console.error("Failed to convert LiteLLM models:", error))
		},
	})

	useGrpcSubscription({
		key: "mcpButtonClicked",
		debugLabel: "MCP Nav",
		subscribe: UiServiceClient.subscribeToMcpButtonClicked.bind(UiServiceClient),
		request: EMPTY_UI_REQUEST,
		staleAfterMs: null,
		onMessage: () => {},
	})
	useGrpcSubscription({
		key: "historyButtonClicked",
		debugLabel: "History Nav",
		subscribe: UiServiceClient.subscribeToHistoryButtonClicked.bind(UiServiceClient),
		request: EMPTY_UI_REQUEST,
		staleAfterMs: null,
		onMessage: () => navigateToHistory(),
	})
	useGrpcSubscription({
		key: "chatButtonClicked",
		debugLabel: "Chat Nav",
		subscribe: UiServiceClient.subscribeToChatButtonClicked.bind(UiServiceClient),
		request: EMPTY_UI_REQUEST,
		staleAfterMs: null,
		onMessage: () => navigateToChat(),
	})
	useGrpcSubscription({
		key: "settingsButtonClicked",
		debugLabel: "Settings Nav",
		subscribe: UiServiceClient.subscribeToSettingsButtonClicked.bind(UiServiceClient),
		request: EMPTY_REQUEST,
		staleAfterMs: null,
		onMessage: () => navigateToSettings(),
	})
	useGrpcSubscription({
		key: "worktreesButtonClicked",
		debugLabel: "Worktrees Nav",
		subscribe: UiServiceClient.subscribeToWorktreesButtonClicked.bind(UiServiceClient),
		request: EMPTY_REQUEST,
		staleAfterMs: null,
		onMessage: () => navigateToWorktrees(),
	})

	useGrpcSubscription({
		key: "relinquishControl",
		debugLabel: "Relinquish Control",
		subscribe: UiServiceClient.subscribeToRelinquishControl.bind(UiServiceClient),
		request: EMPTY_REQUEST,
		staleAfterMs: null,
		onMessage: () => {
			for (const callback of relinquishControlCallbacks.current) {
				callback()
			}
		},
	})

	useEffect(() => {
		UiServiceClient.initializeWebview(EMPTY_REQUEST).catch((error) => {
			console.error("Failed to initialize webview via gRPC:", error)
		})
	}, [])

	useEffect(() => {
		if (!isStateHydrated) return

		StateServiceClient.getAvailableTerminalProfiles(EMPTY_REQUEST)
			.then((response) => setAvailableTerminalProfiles(response.profiles))
			.catch((error) => console.error("Failed to fetch available terminal profiles:", error))
	}, [isStateHydrated, setAvailableTerminalProfiles])
}
