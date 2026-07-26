import type { ExtensionMessage } from "@shared/ExtensionMessage"
import { KeyValuePair } from "@shared/proto/dietcode/common"
import { ResetStateRequest } from "@shared/proto/dietcode/state"
import { UserOrganization } from "@shared/proto/index.dietcode"
import {
	Boxes,
	CheckCheck,
	Cloud,
	Cpu,
	Flame,
	FlaskConical,
	Globe,
	HardDriveDownload,
	Info,
	Key,
	Layers,
	type LucideIcon,
	Search,
	Sparkles,
	SquareMousePointer,
	SquareTerminal,
	Wrench,
	Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useEvent } from "react-use"
import { useDietCodeAuth } from "@/context/DietCodeAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useDensity } from "@/hooks/useDensity"
import { cn } from "@/lib/utils"
import { StateServiceClient } from "@/services/grpc-client"
import { isAdminOrOwner } from "../account/helpers"
import { Tab, TabContent, TabList, TabTrigger } from "../common/Tab"
import SectionHeader from "./SectionHeader"
import AboutSection from "./sections/AboutSection"
import BrowserSettingsSection from "./sections/BrowserSettingsSection"
import DebugSection from "./sections/DebugSection"
import FeatureSettingsSection from "./sections/FeatureSettingsSection"
import GeneralSettingsSection from "./sections/GeneralSettingsSection"
import ProviderModelGridSection, { SupportedProviderTabID } from "./sections/ProviderModelGridSection"
import { RemoteConfigSection } from "./sections/RemoteConfigSection"
import SkillsSettingsSection from "./sections/SkillsSettingsSection"
import TerminalSettingsSection from "./sections/TerminalSettingsSection"

const IS_DEV = process.env.IS_DEV

// Tab definitions
type SettingsTabID =
	| SupportedProviderTabID
	| "features"
	| "skills"
	| "browser"
	| "terminal"
	| "general"
	| "about"
	| "debug"
	| "remote-config"

interface SettingsTab {
	id: SettingsTabID
	name: string
	tooltipText: string
	headerText: string
	icon: LucideIcon
	hidden?: (params?: { activeOrganization: UserOrganization | null }) => boolean
}

export const SETTINGS_TABS: SettingsTab[] = [
	{
		id: "provider-openrouter",
		name: "OpenRouter",
		tooltipText: "OpenRouter models grid",
		headerText: "OpenRouter Models",
		icon: Globe,
	},
	{
		id: "provider-openaicodex",
		name: "ChatGPT",
		tooltipText: "ChatGPT & OpenAI models grid",
		headerText: "ChatGPT / OpenAI Models",
		icon: Sparkles,
	},
	{
		id: "provider-nousresearch",
		name: "NousResearch",
		tooltipText: "NousResearch models grid",
		headerText: "NousResearch Models",
		icon: Cpu,
	},
	{
		id: "provider-cloudflare",
		name: "Cloudflare",
		tooltipText: "Cloudflare Workers AI models grid",
		headerText: "Cloudflare Models",
		icon: Cloud,
	},
	{
		id: "provider-cerebras",
		name: "Cerebras",
		tooltipText: "Cerebras models grid",
		headerText: "Cerebras Models",
		icon: Zap,
	},
	{
		id: "provider-clinepass",
		name: "ClinePass",
		tooltipText: "ClinePass models grid",
		headerText: "ClinePass Models",
		icon: Key,
	},
	{
		id: "provider-xaioauth",
		name: "Grok",
		tooltipText: "Grok / xAI models grid",
		headerText: "Grok / xAI Models",
		icon: Flame,
	},
	{
		id: "provider-qwen",
		name: "Qwen",
		tooltipText: "Qwen Token Plan models grid",
		headerText: "Qwen Models",
		icon: Layers,
	},
	{
		id: "provider-zai",
		name: "Z AI",
		tooltipText: "Z AI (GLM) models grid",
		headerText: "Z AI (GLM) Models",
		icon: Boxes,
	},
	{
		id: "features",
		name: "Preferences",
		tooltipText: "How LUMI behaves",
		headerText: "Preferences",
		icon: CheckCheck,
	},
	{
		id: "skills",
		name: "Skills",
		tooltipText: "Manage LUMI skills",
		headerText: "Skills",
		icon: Sparkles,
	},
	{
		id: "browser",
		name: "Browser",
		tooltipText: "Browser Settings",
		headerText: "Browser Settings",
		icon: SquareMousePointer,
	},
	{
		id: "terminal",
		name: "Terminal",
		tooltipText: "Terminal Settings",
		headerText: "Terminal Settings",
		icon: SquareTerminal,
	},
	{
		id: "general",
		name: "General",
		tooltipText: "Language and privacy",
		headerText: "General",
		icon: Wrench,
	},
	{
		id: "remote-config",
		name: "Remote Config",
		tooltipText: "Remotely configured fields",
		headerText: "Remote Config",
		icon: HardDriveDownload,
		hidden: ({ activeOrganization } = { activeOrganization: null }) =>
			!activeOrganization || !isAdminOrOwner(activeOrganization),
	},
	{
		id: "about",
		name: "About",
		tooltipText: "About LUMI",
		headerText: "About",
		icon: Info,
	},
	// Only show in dev mode
	{
		id: "debug",
		name: "Debug",
		tooltipText: "Debug Tools",
		headerText: "Debug",
		icon: FlaskConical,
		hidden: () => !IS_DEV,
	},
]

const OpenRouterGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-openrouter" {...props} />
const OpenAiCodexGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-openaicodex" {...props} />
const NousResearchGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-nousresearch" {...props} />
const CloudflareGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-cloudflare" {...props} />
const CerebrasGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-cerebras" {...props} />
const ClinePassGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-clinepass" {...props} />
const XAiGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-xaioauth" {...props} />
const QwenGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-qwen" {...props} />
const ZAiGridSection = (props: any) => <ProviderModelGridSection providerTabId="provider-zai" {...props} />

const TAB_KEYWORDS: Record<SettingsTabID, string[]> = {
	"provider-openrouter": ["openrouter", "models", "claude", "gpt", "gemini", "deepseek"],
	"provider-openaicodex": ["chatgpt", "openai", "gpt-4o", "o1", "o3", "codex"],
	"provider-nousresearch": ["nous", "nousresearch", "hermes", "deephermes"],
	"provider-cloudflare": ["cloudflare", "workers ai", "llama", "deepseek"],
	"provider-cerebras": ["cerebras", "fast", "wafer", "llama3.3"],
	"provider-clinepass": ["clinepass", "pass"],
	"provider-xaioauth": ["grok", "xai", "x.ai"],
	"provider-qwen": ["qwen", "alibaba", "qwq"],
	"provider-zai": ["zai", "zhipu", "glm"],
	features: ["preferences", "behavior", "subagents", "think together", "tool calls", "plan", "auto-compact", "parallel"],
	skills: ["skills", "mcp", "tools", "plugins", "marketplace"],
	browser: ["browser", "chrome", "viewport", "screenshot", "web"],
	terminal: ["terminal", "shell", "bash", "zsh", "timeout", "reuse", "output", "lockout"],
	general: ["general", "language", "privacy", "telemetry", "analytics", "reports"],
	"remote-config": ["remote", "config", "organization", "admin"],
	about: ["about", "version", "community", "discord", "github", "support"],
	debug: ["debug", "reset", "state", "test", "developer"],
}

const AI_SEARCH_TABS: string[] = [
	"provider-openrouter",
	"provider-openaicodex",
	"provider-nousresearch",
	"provider-cloudflare",
	"provider-cerebras",
	"provider-clinepass",
	"provider-xaioauth",
	"provider-qwen",
	"provider-zai",
]
const BEHAVIOR_TABS: string[] = ["features", "skills"]
const INTEGRATION_TABS: string[] = ["browser", "terminal"]
const GENERAL_TABS: string[] = ["general", "about"]
const ADVANCED_TABS: string[] = ["remote-config", "debug"]

type SettingsViewProps = {
	onDone: () => void
	targetSection?: string
}

// Helper to render section header - moved outside component for better performance
const renderSectionHeader = (tabId: string) => {
	const tab = SETTINGS_TABS.find((t) => t.id === tabId)
	if (!tab) {
		return null
	}

	return (
		<SectionHeader>
			<div className="flex items-center gap-2">
				<tab.icon className="w-4" />
				<div>{tab.headerText}</div>
			</div>
		</SectionHeader>
	)
}

const SettingsView = ({ targetSection }: SettingsViewProps) => {
	// Memoize to avoid recreation
	// biome-ignore lint/suspicious/noExplicitAny: Components in map take different props
	const TAB_CONTENT_MAP: Record<SettingsTabID, React.ComponentType<any>> = useMemo(
		() => ({
			"provider-openrouter": OpenRouterGridSection,
			"provider-openaicodex": OpenAiCodexGridSection,
			"provider-nousresearch": NousResearchGridSection,
			"provider-cloudflare": CloudflareGridSection,
			"provider-cerebras": CerebrasGridSection,
			"provider-clinepass": ClinePassGridSection,
			"provider-xaioauth": XAiGridSection,
			"provider-qwen": QwenGridSection,
			"provider-zai": ZAiGridSection,
			general: GeneralSettingsSection,
			features: FeatureSettingsSection,
			skills: SkillsSettingsSection,
			browser: BrowserSettingsSection,
			terminal: TerminalSettingsSection,
			"remote-config": RemoteConfigSection,
			about: AboutSection,
			debug: DebugSection,
		}),
		[],
	) // Empty deps - these imports never change

	const { version, settingsInitialModelTab } = useExtensionState()
	const { activeOrganization } = useDietCodeAuth()
	const { width } = useDensity()
	const useHorizontalNavigation = width < 340

	const [activeTab, setActiveTab] = useState<SettingsTabID>(() =>
		SETTINGS_TABS.some((tab) => tab.id === targetSection) ? (targetSection as SettingsTabID) : SETTINGS_TABS[0].id,
	)
	const [searchQuery, setSearchQuery] = useState("")
	const searchInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isInputActive =
				document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
			if (!isInputActive && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "f"))) {
				e.preventDefault()
				searchInputRef.current?.focus()
				searchInputRef.current?.select()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	const visibleTabs = useMemo(() => {
		const filtered = SETTINGS_TABS.filter((tab) => !tab.hidden?.({ activeOrganization }))
		if (!searchQuery.trim()) {
			return filtered
		}
		const query = searchQuery.toLowerCase().trim()
		return filtered.filter((tab) => {
			const nameMatch = tab.name.toLowerCase().includes(query)
			const tooltipMatch = tab.tooltipText.toLowerCase().includes(query)
			const headerMatch = tab.headerText.toLowerCase().includes(query)
			const keywords = TAB_KEYWORDS[tab.id] || []
			const keywordMatch = keywords.some((kw) => kw.includes(query))
			return nameMatch || tooltipMatch || headerMatch || keywordMatch
		})
	}, [activeOrganization, searchQuery])

	// Auto-switch active tab to the first match if the current active tab is filtered out
	useEffect(() => {
		if (searchQuery.trim() && visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
			setActiveTab(visibleTabs[0].id)
		}
	}, [searchQuery, visibleTabs, activeTab])

	// Optimized message handler with early returns
	const handleMessage = useCallback((event: MessageEvent) => {
		const message: ExtensionMessage = event.data
		if (message.type !== "grpc_response") {
			return
		}

		const grpcMessage = message.grpc_response?.message as KeyValuePair | undefined
		if (grpcMessage?.key !== "scrollToSettings") {
			return
		}

		const tabId = grpcMessage.value
		if (!tabId) {
			return
		}

		// Check if valid tab ID
		if (SETTINGS_TABS.some((tab) => tab.id === tabId)) {
			setActiveTab(tabId as SettingsTabID)
			return
		}

		// Fallback to element scrolling
		requestAnimationFrame(() => {
			const element = document.getElementById(tabId)
			if (!element) {
				return
			}

			element.scrollIntoView({ behavior: "smooth" })
			element.style.transition = "background-color 0.5s ease"
			element.style.backgroundColor = "var(--vscode-textPreformat-background)"

			setTimeout(() => {
				element.style.backgroundColor = "transparent"
			}, 1200)
		})
	}, [])

	useEvent("message", handleMessage)

	// Memoized reset state handler
	const handleResetState = useCallback(async (resetGlobalState?: boolean) => {
		try {
			await StateServiceClient.resetState(ResetStateRequest.create({ global: resetGlobalState }))
		} catch (error) {
			console.error("Failed to reset state:", error)
		}
	}, [])

	// Update active tab when targetSection changes
	useEffect(() => {
		if (targetSection && visibleTabs.some((tab) => tab.id === targetSection)) {
			setActiveTab(targetSection as SettingsTabID)
		}
	}, [targetSection, visibleTabs])

	useEffect(() => {
		if (!visibleTabs.some((tab) => tab.id === activeTab)) {
			setActiveTab(visibleTabs[0]?.id ?? SETTINGS_TABS[0].id)
		}
	}, [activeTab, visibleTabs])

	// Memoized tab item renderer
	const renderTabItem = useCallback(
		(tab: (typeof SETTINGS_TABS)[0]) => {
			const isActive = activeTab === tab.id
			return (
				<TabTrigger
					aria-label={tab.name}
					className={cn(
						"flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border-transparent px-3 text-foreground/70 hover:bg-list-hover hover:text-foreground",
						useHorizontalNavigation
							? "min-h-10 w-auto justify-start border-b-2"
							: "min-h-[30px] h-[30px] w-full justify-start border-l-2 rounded-r-md px-4 transition-colors",
						isActive &&
							(useHorizontalNavigation
								? "border-b-foreground bg-selection-inactive text-foreground"
								: "border-l-foreground bg-selection-inactive text-foreground"),
					)}
					data-testid={`tab-${tab.id}`}
					key={tab.id}
					title={tab.tooltipText}
					value={tab.id}>
					<tab.icon aria-hidden className="h-4 w-4 shrink-0 opacity-80" />
					<span className="truncate text-left text-xs font-medium">{tab.name}</span>
				</TabTrigger>
			)
		},
		[activeTab, useHorizontalNavigation],
	)

	// Memoized active content component
	const ActiveContent = useMemo(() => {
		const Component = TAB_CONTENT_MAP[activeTab as keyof typeof TAB_CONTENT_MAP]
		if (!Component) {
			return null
		}

		// Special props for specific components
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic props mapped to specific components
		const props: any = { renderSectionHeader }
		if (activeTab === "debug") {
			props.onResetState = handleResetState
		} else if (activeTab === "about") {
			props.version = version
		}

		return <Component {...props} />
	}, [activeTab, handleResetState, settingsInitialModelTab, version, TAB_CONTENT_MAP])

	return (
		<Tab>
			<div className={cn("flex flex-1 overflow-hidden", useHorizontalNavigation && "flex-col")}>
				{useHorizontalNavigation ? (
					<TabList
						aria-label="Settings sections"
						aria-orientation="horizontal"
						className="flex shrink-0 lumi-scroll-chips w-full flex-row overflow-x-auto border-b border-border/30"
						onValueChange={(value) => setActiveTab(value as SettingsTabID)}
						value={activeTab}>
						{visibleTabs.map(renderTabItem)}
					</TabList>
				) : (
					<div className="flex shrink-0 w-44 flex-col border-r border-border/30 overflow-hidden bg-(--vscode-sideBar-background)">
						{/* Search Box */}
						<div className="p-2 border-b border-border/10">
							<div className="relative flex items-center">
								<Search className="absolute left-2.5 h-3.5 w-3.5 text-(--vscode-input-placeholderForeground) opacity-65" />
								<input
									className="w-full pl-8 pr-12 py-1 text-xs rounded border border-border/40 bg-(--vscode-input-background) text-(--vscode-input-foreground) placeholder-(--vscode-input-placeholderForeground) focus:outline-none focus:border-(--vscode-focusBorder) transition-colors"
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search settings..."
									ref={searchInputRef}
									type="text"
									value={searchQuery}
								/>
								{!searchQuery ? (
									<span className="absolute right-2 text-[9px] font-mono px-1 py-0.5 rounded bg-border/20 text-(--vscode-input-placeholderForeground) select-none pointer-events-none opacity-70">
										{typeof navigator !== "undefined" && navigator.userAgent.includes("Mac")
											? "⌘F"
											: "Ctrl+F"}
									</span>
								) : (
									<button
										className="absolute right-2 text-xs text-(--vscode-input-placeholderForeground) hover:text-(--vscode-input-foreground) focus:outline-none"
										onClick={() => setSearchQuery("")}>
										✕
									</button>
								)}
							</div>
						</div>

						<TabList
							aria-label="Settings sections"
							aria-orientation="vertical"
							className="flex-1 overflow-y-auto flex flex-col gap-4 py-3"
							onValueChange={(value) => setActiveTab(value as SettingsTabID)}
							value={activeTab}>
							{visibleTabs.length === 0 ? (
								<div className="text-xs text-(--vscode-descriptionForeground) px-3 py-4 text-center select-none">
									No settings found
								</div>
							) : (
								<>
									{visibleTabs.some((t) => AI_SEARCH_TABS.includes(t.id)) && (
										<div>
											<div className="text-[9px] font-bold tracking-wider text-(--vscode-descriptionForeground) uppercase px-3 mb-1 select-none opacity-60">
												AI Assistant
											</div>
											<div className="flex flex-col gap-0.5">
												{visibleTabs.filter((t) => AI_SEARCH_TABS.includes(t.id)).map(renderTabItem)}
											</div>
										</div>
									)}
									{visibleTabs.some((t) => BEHAVIOR_TABS.includes(t.id)) && (
										<div>
											<div className="text-[9px] font-bold tracking-wider text-(--vscode-descriptionForeground) uppercase px-3 mb-1 select-none opacity-60">
												Behavior
											</div>
											<div className="flex flex-col gap-0.5">
												{visibleTabs.filter((t) => BEHAVIOR_TABS.includes(t.id)).map(renderTabItem)}
											</div>
										</div>
									)}
									{visibleTabs.some((t) => INTEGRATION_TABS.includes(t.id)) && (
										<div>
											<div className="text-[9px] font-bold tracking-wider text-(--vscode-descriptionForeground) uppercase px-3 mb-1 select-none opacity-60">
												System Tools
											</div>
											<div className="flex flex-col gap-0.5">
												{visibleTabs.filter((t) => INTEGRATION_TABS.includes(t.id)).map(renderTabItem)}
											</div>
										</div>
									)}
									{visibleTabs.some((t) => GENERAL_TABS.includes(t.id)) && (
										<div>
											<div className="text-[9px] font-bold tracking-wider text-(--vscode-descriptionForeground) uppercase px-3 mb-1 select-none opacity-60">
												General
											</div>
											<div className="flex flex-col gap-0.5">
												{visibleTabs.filter((t) => GENERAL_TABS.includes(t.id)).map(renderTabItem)}
											</div>
										</div>
									)}
									{visibleTabs.some((t) => ADVANCED_TABS.includes(t.id)) && (
										<div>
											<div className="text-[9px] font-bold tracking-wider text-(--vscode-descriptionForeground) uppercase px-3 mb-1 select-none opacity-60">
												Advanced
											</div>
											<div className="flex flex-col gap-0.5">
												{visibleTabs.filter((t) => ADVANCED_TABS.includes(t.id)).map(renderTabItem)}
											</div>
										</div>
									)}
								</>
							)}
						</TabList>
					</div>
				)}

				<TabContent
					aria-labelledby={`lumi-tab-${activeTab}`}
					className="flex-1 overflow-auto outline-none"
					id={`lumi-tabpanel-${activeTab}`}
					role="tabpanel"
					tabIndex={0}>
					<div className="animate-in fade-in-50 duration-200" key={activeTab}>
						{ActiveContent}
					</div>
				</TabContent>
			</div>
		</Tab>
	)
}

export default SettingsView
