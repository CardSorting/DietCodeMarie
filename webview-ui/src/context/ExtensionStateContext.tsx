import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings"
import type { DietCodeMessage, ExtensionState } from "@shared/ExtensionMessage"
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@shared/FocusChainSettings"
import { DEFAULT_MCP_DISPLAY_MODE } from "@shared/McpDisplayMode"
import type { UserInfo } from "@shared/proto/dietcode/account"
import { EmptyRequest } from "@shared/proto/dietcode/common"
import type { OpenRouterCompatibleModelInfo } from "@shared/proto/dietcode/models"
import { type TerminalProfile } from "@shared/proto/dietcode/state"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ModelInfo } from "../../../src/shared/api"
import {
	openRouterDefaultModelId,
	openRouterDefaultModelInfo,
	requestyDefaultModelId,
	requestyDefaultModelInfo,
} from "../../../src/shared/api-defaults"
import { Environment } from "../../../src/shared/config-types"
import type { McpMarketplaceCatalog, McpServer } from "../../../src/shared/mcp"
import { DEFAULT_PLATFORM } from "../../../src/shared/platform-default"
import { convertModelResponse, loadModelsServiceClient } from "../services/model-grpc-loader"
import { useExtensionGrpcSubscriptions } from "./useExtensionGrpcSubscriptions"

export interface ExtensionStateContextType extends ExtensionState {
	didHydrateState: boolean
	showWelcome: boolean
	dietcodeModels: Record<string, ModelInfo> | null
	openRouterModels: Record<string, ModelInfo>
	vercelAiGatewayModels: Record<string, ModelInfo>
	hicapModels: Record<string, ModelInfo>
	liteLlmModels: Record<string, ModelInfo>
	openAiModels: string[]
	requestyModels: Record<string, ModelInfo>
	groqModels: Record<string, ModelInfo>
	basetenModels: Record<string, ModelInfo>
	huggingFaceModels: Record<string, ModelInfo>
	nousResearchModels: Record<string, ModelInfo>
	mcpServers: McpServer[]
	mcpMarketplaceCatalog: McpMarketplaceCatalog
	totalTasksSize: number | null
	lastDismissedCliBannerVersion: number
	dismissedBanners?: Array<{ bannerId: string; dismissedAt: number }>

	availableTerminalProfiles: TerminalProfile[]

	// View state
	showSettings: boolean
	settingsTargetSection?: string
	settingsInitialModelTab?: "recommended" | "free"
	showHistory: boolean
	showWorktrees: boolean
	showAnnouncement: boolean
	expandTaskHeader: boolean
	showNewChatConfirm: boolean

	// Setters
	setShowNewChatConfirm: (value: boolean) => void
	setShowAnnouncement: (value: boolean) => void
	setShouldShowAnnouncement: (value: boolean) => void
	setMcpServers: (value: McpServer[]) => void
	setRequestyModels: (value: Record<string, ModelInfo>) => void
	setGroqModels: (value: Record<string, ModelInfo>) => void
	setBasetenModels: (value: Record<string, ModelInfo>) => void
	setHuggingFaceModels: (value: Record<string, ModelInfo>) => void
	setGlobalDietCodeRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalDietCodeRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalCursorRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalWindsurfRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalAgentsRulesToggles: (toggles: Record<string, boolean>) => void
	setLocalWorkflowToggles: (toggles: Record<string, boolean>) => void
	setGlobalWorkflowToggles: (toggles: Record<string, boolean>) => void
	setGlobalSkillsToggles: (toggles: Record<string, boolean>) => void
	setLocalSkillsToggles: (toggles: Record<string, boolean>) => void
	setRemoteRulesToggles: (toggles: Record<string, boolean>) => void
	setRemoteWorkflowToggles: (toggles: Record<string, boolean>) => void
	setMcpMarketplaceCatalog: (value: McpMarketplaceCatalog) => void
	setTotalTasksSize: (value: number | null) => void
	setExpandTaskHeader: (value: boolean) => void
	setShowWelcome: (value: boolean) => void

	// Refresh functions
	refreshDietCodeModels: () => void
	refreshOpenRouterModels: () => void
	refreshVercelAiGatewayModels: () => void
	refreshHicapModels: () => void
	refreshLiteLlmModels: () => Promise<void>
	refreshNousResearchModels: () => void
	setUserInfo: (userInfo?: UserInfo) => void

	// Navigation functions
	navigateToSettings: (targetSection?: string) => void
	navigateToSettingsModelPicker: (opts: { targetSection?: string; initialModelTab?: "recommended" | "free" }) => void
	navigateToHistory: () => void
	navigateToWorktrees: () => void
	navigateToChat: () => void

	// Hide functions
	hideSettings: () => void
	hideHistory: () => void
	hideWorktrees: () => void
	hideAnnouncement: () => void

	// Event callbacks
	onRelinquishControl: (callback: () => void) => () => void
}

export const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined)

// Streaming messages change far more frequently than the rest of the extension
// state. Keeping them on their own context prevents composer, navigation, and
// settings consumers from invalidating on every streamed token.
export const ChatMessagesContext = createContext<DietCodeMessage[] | undefined>(undefined)

export const ExtensionStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	// UI view state
	const [showSettings, setShowSettings] = useState(false)
	const [settingsTargetSection, setSettingsTargetSection] = useState<string | undefined>(undefined)
	const [settingsInitialModelTab, setSettingsInitialModelTab] = useState<"recommended" | "free" | undefined>(undefined)
	const [showHistory, setShowHistory] = useState(false)
	const [showWorktrees, setShowWorktrees] = useState(false)
	const [showAnnouncement, setShowAnnouncement] = useState(false)
	const [showNewChatConfirm, setShowNewChatConfirm] = useState(false)

	// Hide functions
	const hideSettings = useCallback(() => {
		setShowSettings(false)
		setSettingsTargetSection(undefined)
		setSettingsInitialModelTab(undefined)
	}, [])
	const hideHistory = useCallback(() => setShowHistory(false), [])
	const hideWorktrees = useCallback(() => setShowWorktrees(false), [])
	const hideAnnouncement = useCallback(() => setShowAnnouncement(false), [])

	// Navigation functions
	const navigateToSettings = useCallback((targetSection?: string) => {
		setShowHistory(false)
		setShowWorktrees(false)
		setSettingsTargetSection(targetSection)
		setSettingsInitialModelTab(undefined)
		setShowSettings(true)
	}, [])

	const navigateToSettingsModelPicker = useCallback(
		(opts: { targetSection?: string; initialModelTab?: "recommended" | "free" }) => {
			setShowHistory(false)
			setShowWorktrees(false)
			setSettingsTargetSection(opts.targetSection)
			setSettingsInitialModelTab(opts.initialModelTab)
			setShowSettings(true)
		},
		[],
	)

	const navigateToHistory = useCallback(() => {
		setShowSettings(false)
		setShowWorktrees(false)
		setShowHistory(true)
	}, [])

	const navigateToWorktrees = useCallback(() => {
		setShowSettings(false)
		setShowHistory(false)
		setShowWorktrees(true)
	}, [])

	const navigateToChat = useCallback(() => {
		setShowSettings(false)
		setShowHistory(false)
		setShowWorktrees(false)
	}, [])

	const [state, setState] = useState<ExtensionState>({
		version: "",
		dietcodeMessages: [],
		taskHistory: [],
		shouldShowAnnouncement: false,
		autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
		browserSettings: DEFAULT_BROWSER_SETTINGS,
		focusChainSettings: DEFAULT_FOCUS_CHAIN_SETTINGS,
		preferredLanguage: "English",
		mode: "act",
		platform: DEFAULT_PLATFORM,
		environment: Environment.production,
		telemetrySetting: "unset",
		distinctId: "",
		planActSeparateModelsSetting: true,
		enableCheckpointsSetting: true,
		mcpDisplayMode: DEFAULT_MCP_DISPLAY_MODE,
		globalDietCodeRulesToggles: {},
		localDietCodeRulesToggles: {},
		localCursorRulesToggles: {},
		localWindsurfRulesToggles: {},
		localAgentsRulesToggles: {},
		localWorkflowToggles: {},
		globalWorkflowToggles: {},
		shellIntegrationTimeout: 2000,
		terminalReuseEnabled: true,
		vscodeTerminalExecutionMode: "vscodeTerminal",
		terminalOutputLineLimit: 500,
		maxConsecutiveMistakes: 3,
		defaultTerminalProfile: "default",
		isNewUser: false,
		welcomeViewCompleted: false,
		mcpResponsesCollapsed: false, // Default value (expanded), will be overwritten by extension state
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		customPrompt: undefined,
		useAutoCondense: false,
		subagentsEnabled: false,
		modEnabled: false,
		modOutcome: "plan-and-implement",
		dietcodeWebToolsEnabled: { user: true, featureFlag: false },
		worktreesEnabled: { user: true, featureFlag: false },
		favoritedModelIds: [],
		lastDismissedInfoBannerVersion: 0,
		lastDismissedModelBannerVersion: 0,
		optOutOfRemoteConfig: false,
		remoteConfigSettings: {},
		backgroundCommandRunning: false,
		backgroundCommandTaskId: undefined,
		lastDismissedCliBannerVersion: 0,
		backgroundEditEnabled: false,
		doubleCheckCompletionEnabled: false,
		auditCompletionGateEnabled: true,
		auditCompletionGateThreshold: 50,
		auditCompletionGateCriticalOnly: false,
		auditActModeAdvisoryEnabled: true,
		auditAdvisoryEscalationEnabled: true,
		auditAdvisoryAutoScrollMode: "critical",
		auditPlanRegressionGateEnabled: true,
		auditToolOutputAdvisoryEnabled: true,
		auditFileWriteAdvisoryEnabled: true,
		auditIntentThresholdAdjustmentsEnabled: true,
		auditIntentThresholdOverrides: "{}",
		auditSarifHookExportEnabled: true,
		auditWorkspaceArtifactsEnabled: true,
		globalSkillsToggles: {},
		localSkillsToggles: {},

		// NEW: Add workspace information with defaults
		workspaceRoots: [],
		primaryRootIndex: 0,
		isMultiRootWorkspace: false,
		multiRootSetting: { user: false, featureFlag: false },
		hooksEnabled: false,
		nativeToolCallSetting: false,
		enableParallelToolCalling: false,
	})
	const [dietcodeMessages, setDietcodeMessages] = useState<DietCodeMessage[]>([])
	const dietcodeMessagesRef = useRef(dietcodeMessages)
	dietcodeMessagesRef.current = dietcodeMessages
	const [expandTaskHeader, setExpandTaskHeader] = useState(false)
	const [didHydrateState, setDidHydrateState] = useState(false)

	const [showWelcome, setShowWelcome] = useState(false)

	const [dietcodeModels, setDietCodeModels] = useState<Record<string, ModelInfo> | null>(null)
	const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({
		[openRouterDefaultModelId]: openRouterDefaultModelInfo,
	})
	const [vercelAiGatewayModels, setVercelAiGatewayModels] = useState<Record<string, ModelInfo>>({})
	const [hicapModels, setHicapModels] = useState<Record<string, ModelInfo>>({})
	const [liteLlmModels, setLiteLlmModels] = useState<Record<string, ModelInfo>>({})
	const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null)
	const [availableTerminalProfiles, setAvailableTerminalProfiles] = useState<TerminalProfile[]>([])

	const [openAiModels, _setOpenAiModels] = useState<string[]>([])
	const [requestyModels, setRequestyModels] = useState<Record<string, ModelInfo>>({
		[requestyDefaultModelId]: requestyDefaultModelInfo,
	})
	// Provider catalogs are populated by the settings surface. Empty maps keep
	// the chat-critical bundle from carrying every provider's static catalog.
	const [groqModelsState, setGroqModels] = useState<Record<string, ModelInfo>>({})
	const [basetenModelsState, setBasetenModels] = useState<Record<string, ModelInfo>>({})
	const [huggingFaceModels, setHuggingFaceModels] = useState<Record<string, ModelInfo>>({})
	const [nousResearchModelsState, setNousResearchModels] = useState<Record<string, ModelInfo>>({})
	const [mcpServers, setMcpServers] = useState<McpServer[]>([])
	const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({ items: [] })
	const autoRefreshOpenRouterRequested = useRef(false)
	const autoRefreshVercelRequested = useRef(false)
	const autoRefreshBasetenRequested = useRef(false)
	const autoRefreshLiteLlmRequested = useRef(false)

	const relinquishControlCallbacks = useRef<Set<() => void>>(new Set())

	const onRelinquishControl = useCallback((callback: () => void) => {
		relinquishControlCallbacks.current.add(callback)
		return () => {
			relinquishControlCallbacks.current.delete(callback)
		}
	}, [])

	useExtensionGrpcSubscriptions({
		setState,
		setDietcodeMessages,
		setDidHydrateState,
		setShowWelcome,
		setMcpServers,
		setMcpMarketplaceCatalog,
		setOpenRouterModels,
		setLiteLlmModels,
		setAvailableTerminalProfiles,
		isStateHydrated: didHydrateState,
		relinquishControlCallbacks,
		navigateToHistory,
		navigateToChat,
		navigateToSettings,
		navigateToWorktrees,
	})

	const refreshOpenRouterModels = useCallback(() => {
		loadModelsServiceClient()
			.then((client) => client.refreshOpenRouterModelsRpc(EmptyRequest.create({})))
			.then((response: OpenRouterCompatibleModelInfo) => convertModelResponse(response))
			.then((models) => {
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
					...models,
				})
			})
			.catch((error: Error) => console.error("Failed to refresh OpenRouter models:", error))
	}, [])

	const refreshHicapModels = useCallback(() => {
		loadModelsServiceClient()
			.then((client) => client.refreshHicapModels(EmptyRequest.create({})))
			.then((response: OpenRouterCompatibleModelInfo) => {
				const models = response.models
				setHicapModels({
					...models,
				})
			})
			.catch((error: Error) => console.error("Failed to refresh Hicap models:", error))
	}, [])

	const refreshLiteLlmModels = useCallback(() => {
		return loadModelsServiceClient()
			.then((client) => client.refreshLiteLlmModelsRpc(EmptyRequest.create({})))
			.then((response: OpenRouterCompatibleModelInfo) => convertModelResponse(response))
			.then((models) => {
				setLiteLlmModels(models)
			})
			.catch((error: Error) => console.error("Failed to refresh LiteLLM models:", error))
	}, [])

	const refreshBasetenModels = useCallback(() => {
		loadModelsServiceClient()
			.then((client) => client.refreshBasetenModelsRpc(EmptyRequest.create({})))
			.then((response) => convertModelResponse(response))
			.then((models) => {
				setBasetenModels(models)
			})
			.catch((err) => console.error("Failed to refresh Baseten models:", err))
	}, [])

	const refreshVercelAiGatewayModels = useCallback(() => {
		loadModelsServiceClient()
			.then((client) => client.refreshVercelAiGatewayModelsRpc(EmptyRequest.create({})))
			.then((response: OpenRouterCompatibleModelInfo) => convertModelResponse(response))
			.then((models) => {
				setVercelAiGatewayModels(models)
			})
			.catch((error: Error) => console.error("Failed to refresh Vercel AI Gateway models:", error))
	}, [])

	const refreshNousResearchModels = useCallback(() => {
		loadModelsServiceClient()
			.then((client) => client.refreshNousResearchModelsRpc(EmptyRequest.create({})))
			.then((response: OpenRouterCompatibleModelInfo) => convertModelResponse(response))
			.then((models) => {
				if (models && Object.keys(models).length > 0) {
					setNousResearchModels(models)
				}
			})
			.catch((error: Error) => console.error("Failed to refresh NousResearch models:", error))
	}, [])

	// Auto-refresh model lists on API key availability
	useEffect(() => {
		if (!didHydrateState) return

		// Give the hydrated shell an idle window before optional model catalogs compete
		// for the extension bridge and main-thread work.
		const refreshOptionalModels = () => {
			if (!autoRefreshOpenRouterRequested.current) {
				autoRefreshOpenRouterRequested.current = true
				refreshOpenRouterModels()
			}
			if (!autoRefreshVercelRequested.current) {
				autoRefreshVercelRequested.current = true
				refreshVercelAiGatewayModels()
			}
			if (state.apiConfiguration?.basetenApiKey && !autoRefreshBasetenRequested.current) {
				autoRefreshBasetenRequested.current = true
				refreshBasetenModels()
			}
			if (state.apiConfiguration?.liteLlmApiKey && !autoRefreshLiteLlmRequested.current) {
				autoRefreshLiteLlmRequested.current = true
				refreshLiteLlmModels()
			}
		}

		let idleCallbackId: number | undefined
		let fallbackTimer: ReturnType<typeof setTimeout> | undefined
		if ("requestIdleCallback" in window) {
			idleCallbackId = window.requestIdleCallback(refreshOptionalModels, { timeout: 1_000 })
		} else {
			fallbackTimer = setTimeout(refreshOptionalModels, 250)
		}

		return () => {
			if (idleCallbackId !== undefined) {
				window.cancelIdleCallback(idleCallbackId)
			}
			if (fallbackTimer) {
				clearTimeout(fallbackTimer)
			}
		}
	}, [
		didHydrateState,
		refreshOpenRouterModels,
		refreshVercelAiGatewayModels,
		state?.apiConfiguration?.basetenApiKey,
		refreshBasetenModels,
		state?.apiConfiguration?.liteLlmApiKey,
		refreshLiteLlmModels,
	])

	// Refresh LUMI models function
	const refreshDietCodeModels = useCallback(() => {
		loadModelsServiceClient()
			.then((client) => client.refreshDietCodeModelsRpc(EmptyRequest.create({})))
			.then((response: OpenRouterCompatibleModelInfo) => convertModelResponse(response))
			.then((models) => {
				setDietCodeModels((prev) => (Object.keys(models).length > 0 ? models : (prev ?? null)))
			})
			.catch((error: Error) => console.error("Failed to refresh LUMI models:", error))
	}, [])

	// Auto-refresh LUMI models when provider is dietcode
	useEffect(() => {
		const hasDietCodeProvider =
			state.apiConfiguration?.actModeApiProvider === "dietcode" ||
			state.apiConfiguration?.planModeApiProvider === "dietcode"
		if (hasDietCodeProvider && dietcodeModels === null) {
			refreshDietCodeModels()
		}
	}, [
		state.apiConfiguration?.actModeApiProvider,
		state.apiConfiguration?.planModeApiProvider,
		dietcodeModels,
		refreshDietCodeModels,
	])

	const contextValue = useMemo<ExtensionStateContextType>(
		() => ({
			...state,
			// Keep legacy consumers source-compatible while the dedicated message
			// context owns the live array and updates independently.
			get dietcodeMessages() {
				return dietcodeMessagesRef.current
			},
			didHydrateState,
			showWelcome,
			dietcodeModels,
			openRouterModels,
			vercelAiGatewayModels,
			hicapModels,
			liteLlmModels,
			openAiModels,
			requestyModels,
			groqModels: groqModelsState,
			basetenModels: basetenModelsState,
			huggingFaceModels,
			nousResearchModels: nousResearchModelsState,
			mcpServers,
			mcpMarketplaceCatalog,
			totalTasksSize,
			availableTerminalProfiles,
			showSettings,
			settingsTargetSection,
			settingsInitialModelTab,
			showHistory,
			showWorktrees,
			showAnnouncement,
			showNewChatConfirm,
			globalDietCodeRulesToggles: state.globalDietCodeRulesToggles || {},
			localDietCodeRulesToggles: state.localDietCodeRulesToggles || {},
			localCursorRulesToggles: state.localCursorRulesToggles || {},
			localWindsurfRulesToggles: state.localWindsurfRulesToggles || {},
			localAgentsRulesToggles: state.localAgentsRulesToggles || {},
			localWorkflowToggles: state.localWorkflowToggles || {},
			globalWorkflowToggles: state.globalWorkflowToggles || {},
			remoteRulesToggles: state.remoteRulesToggles || {},
			remoteWorkflowToggles: state.remoteWorkflowToggles || {},
			enableCheckpointsSetting: state.enableCheckpointsSetting,
			currentFocusChainChecklist: state.currentFocusChainChecklist,

			// Navigation functions
			navigateToSettings,
			navigateToSettingsModelPicker,
			navigateToHistory,
			navigateToWorktrees,
			navigateToChat,

			// Hide functions
			hideSettings,
			hideHistory,
			hideWorktrees,
			hideAnnouncement,
			setShowAnnouncement,
			setShowNewChatConfirm,
			setShowWelcome,
			setShouldShowAnnouncement: (value) =>
				setState((prevState) => ({
					...prevState,
					shouldShowAnnouncement: value,
				})),
			setMcpServers: (mcpServers: McpServer[]) => setMcpServers(mcpServers),
			setRequestyModels: (models: Record<string, ModelInfo>) => setRequestyModels(models),
			setGroqModels: (models: Record<string, ModelInfo>) => setGroqModels(models),
			setBasetenModels: (models: Record<string, ModelInfo>) => setBasetenModels(models),
			setHuggingFaceModels: (models: Record<string, ModelInfo>) => setHuggingFaceModels(models),
			setMcpMarketplaceCatalog: (catalog: McpMarketplaceCatalog) => setMcpMarketplaceCatalog(catalog),
			setGlobalDietCodeRulesToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					globalDietCodeRulesToggles: toggles,
				})),
			setLocalDietCodeRulesToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					localDietCodeRulesToggles: toggles,
				})),
			setLocalCursorRulesToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					localCursorRulesToggles: toggles,
				})),
			setLocalWindsurfRulesToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					localWindsurfRulesToggles: toggles,
				})),
			setLocalAgentsRulesToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					localAgentsRulesToggles: toggles,
				})),
			setLocalWorkflowToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					localWorkflowToggles: toggles,
				})),
			setGlobalWorkflowToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					globalWorkflowToggles: toggles,
				})),
			setGlobalSkillsToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					globalSkillsToggles: toggles,
				})),
			setLocalSkillsToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					localSkillsToggles: toggles,
				})),
			setRemoteRulesToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					remoteRulesToggles: toggles,
				})),
			setRemoteWorkflowToggles: (toggles) =>
				setState((prevState) => ({
					...prevState,
					remoteWorkflowToggles: toggles,
				})),
			setTotalTasksSize,
			refreshDietCodeModels,
			refreshOpenRouterModels,
			refreshVercelAiGatewayModels,
			refreshHicapModels,
			refreshLiteLlmModels,
			refreshNousResearchModels,
			onRelinquishControl,
			setUserInfo: (userInfo?: UserInfo) => setState((prevState) => ({ ...prevState, userInfo })),
			expandTaskHeader,
			setExpandTaskHeader,
		}),
		[
			state,
			didHydrateState,
			showWelcome,
			dietcodeModels,
			openRouterModels,
			vercelAiGatewayModels,
			hicapModels,
			liteLlmModels,
			openAiModels,
			requestyModels,
			groqModelsState,
			basetenModelsState,
			huggingFaceModels,
			nousResearchModelsState,
			mcpServers,
			mcpMarketplaceCatalog,
			totalTasksSize,
			availableTerminalProfiles,
			showSettings,
			settingsTargetSection,
			settingsInitialModelTab,
			showHistory,
			showWorktrees,
			showAnnouncement,
			showNewChatConfirm,
			navigateToSettings,
			navigateToSettingsModelPicker,
			navigateToHistory,
			navigateToWorktrees,
			navigateToChat,
			hideSettings,
			hideHistory,
			hideWorktrees,
			hideAnnouncement,
			refreshDietCodeModels,
			refreshOpenRouterModels,
			refreshVercelAiGatewayModels,
			refreshHicapModels,
			refreshLiteLlmModels,
			refreshNousResearchModels,
			onRelinquishControl,
			expandTaskHeader,
		],
	)

	return (
		<ExtensionStateContext.Provider value={contextValue}>
			<ChatMessagesContext.Provider value={dietcodeMessages}>{children}</ChatMessagesContext.Provider>
		</ExtensionStateContext.Provider>
	)
}

export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext)
	if (context === undefined) {
		throw new Error("useExtensionState must be used within an ExtensionStateContextProvider")
	}
	return context
}

export const useChatMessages = () => {
	const messages = useContext(ChatMessagesContext)
	if (messages === undefined) {
		throw new Error("useChatMessages must be used within a ChatMessagesContext provider")
	}
	return messages
}
