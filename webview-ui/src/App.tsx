import type { Boolean, EmptyRequest } from "@shared/proto/dietcode/common"
import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { NewChatConfirmModal } from "./components/common/NewChatConfirmModal"
import { AppShell } from "./components/layout/AppShell"
import { useExtensionState } from "./context/ExtensionStateContext"
import { Providers } from "./Providers"
import { TaskServiceClient, UiServiceClient } from "./services/core-grpc-client"

// Keep the first paint small. Secondary surfaces and their dependencies are fetched
// only when needed instead of being parsed on every webview launch.
const ChatView = lazy(() => import("./components/chat/ChatView"))
const McpView = lazy(() => import("./components/mcp/configuration/McpConfigurationView"))
const SettingsView = lazy(() => import("./components/settings/SettingsView"))
const WelcomeView = lazy(() => import("./components/welcome/WelcomeView"))
const WorktreesView = lazy(() => import("./components/worktrees/WorktreesView"))

const AppLoadingState = ({ label = "Starting LUMI…" }: { label?: string }) => (
	<div aria-busy="true" aria-live="polite" className="flex h-full w-full items-center justify-center bg-background">
		<div className="flex items-center gap-2 text-xs text-description">
			<span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-lumi" />
			{label}
		</div>
	</div>
)

const isEditableTarget = (target: EventTarget | null) => {
	if (!(target instanceof HTMLElement)) return false
	const tagName = target.tagName.toLowerCase()
	return (
		tagName === "input" ||
		tagName === "textarea" ||
		tagName === "select" ||
		target.isContentEditable ||
		tagName.startsWith("vscode-")
	)
}

const AppContent = () => {
	const {
		didHydrateState,
		shouldShowAnnouncement,
		showWelcome,
		showHistory,
		showMcp,
		mcpTab,
		showSettings,
		settingsTargetSection,
		showWorktrees,
		showAnnouncement,
		showNewChatConfirm,
		currentTaskItem,
		setShowAnnouncement,
		setShowNewChatConfirm,
		setShouldShowAnnouncement,
		closeMcpView,
		hideSettings,
		hideWorktrees,
		hideAnnouncement,
		navigateToHistory,
		navigateToMcp,
		navigateToSettings,
		navigateToChat,
		navigateToWorktrees,
	} = useExtensionState()

	const [isStartingNewChat, setIsStartingNewChat] = useState(false)
	const [newChatError, setNewChatError] = useState<string | null>(null)

	const hasActiveConversation = !!currentTaskItem?.id

	const handleRequestNewChat = useCallback(() => {
		setNewChatError(null)
		if (hasActiveConversation) {
			setShowNewChatConfirm(true)
			return
		}

		TaskServiceClient.clearTask({})
			.then(() => navigateToChat())
			.catch((error) => console.error("Failed to start a new chat:", error))
	}, [hasActiveConversation, navigateToChat, setShowNewChatConfirm])

	const handleCancelNewChat = useCallback(() => {
		if (isStartingNewChat) return
		setNewChatError(null)
		setShowNewChatConfirm(false)
	}, [isStartingNewChat, setShowNewChatConfirm])

	const handleConfirmNewChat = useCallback(async () => {
		if (isStartingNewChat) return
		setIsStartingNewChat(true)
		setNewChatError(null)

		try {
			await TaskServiceClient.clearTask({})
			setShowNewChatConfirm(false)
			navigateToChat()
		} catch (error) {
			console.error("Failed to start a new chat:", error)
			setNewChatError("Couldn’t start a new chat. Please try again.")
		} finally {
			setIsStartingNewChat(false)
		}
	}, [isStartingNewChat, navigateToChat, setShowNewChatConfirm])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || showNewChatConfirm || showWelcome) return

			if (
				event.key === "Escape" &&
				(showHistory || showMcp || showSettings || showWorktrees) &&
				!isEditableTarget(event.target)
			) {
				event.preventDefault()
				navigateToChat()
				return
			}

			// Alt + Shift + H / T / S / A / C / N / 1-5
			if (event.altKey && event.shiftKey) {
				const key = event.key.toLowerCase()
				if (key === "h" || key === "2") {
					event.preventDefault()
					navigateToHistory()
				} else if (key === "t" || key === "3") {
					event.preventDefault()
					navigateToMcp()
				} else if (key === "s" || key === "5") {
					event.preventDefault()
					navigateToSettings()
				} else if (key === "w" || key === "6") {
					event.preventDefault()
					navigateToWorktrees()
				} else if (key === "c") {
					event.preventDefault()
					navigateToChat()
				} else if (key === "n" || key === "1") {
					event.preventDefault()
					handleRequestNewChat()
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [
		showWelcome,
		showHistory,
		showMcp,
		showSettings,
		showWorktrees,
		showNewChatConfirm,
		navigateToHistory,
		navigateToMcp,
		navigateToSettings,
		navigateToChat,
		navigateToWorktrees,
		handleRequestNewChat,
	])

	useEffect(() => {
		if (shouldShowAnnouncement) {
			setShowAnnouncement(true)

			UiServiceClient.onDidShowAnnouncement({} as EmptyRequest)
				.then((response: Boolean) => {
					setShouldShowAnnouncement(response.value)
				})
				.catch((error) => {
					console.error("Failed to acknowledge announcement:", error)
				})
		}
	}, [shouldShowAnnouncement, setShouldShowAnnouncement, setShowAnnouncement])

	if (!didHydrateState) {
		return <AppLoadingState />
	}

	return (
		<div className="flex h-screen w-full flex-col bg-background">
			<a
				className="sr-only z-50 rounded bg-button-background px-3 py-2 text-button-foreground focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
				href="#lumi-main-content">
				Skip to content
			</a>
			{showWelcome ? (
				<Suspense fallback={<AppLoadingState label="Loading welcome…" />}>
					<WelcomeView />
				</Suspense>
			) : (
				<AppShell onRequestNewChat={handleRequestNewChat}>
					<div className="relative min-h-0 w-full flex-1 overflow-hidden" id="lumi-main-content" tabIndex={-1}>
						<Suspense fallback={<AppLoadingState label="Loading view…" />}>
							{showSettings && <SettingsView onDone={hideSettings} targetSection={settingsTargetSection} />}
							{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
							{showWorktrees && <WorktreesView onDone={hideWorktrees} />}
							<ChatView
								hideAnnouncement={hideAnnouncement}
								isHidden={showSettings || showMcp || showWorktrees}
								showAnnouncement={showAnnouncement}
								showHistoryView={navigateToHistory}
							/>
						</Suspense>
					</div>
				</AppShell>
			)}
			<NewChatConfirmModal
				error={newChatError}
				isOpen={showNewChatConfirm}
				isPending={isStartingNewChat}
				onCancel={handleCancelNewChat}
				onConfirm={handleConfirmNewChat}
			/>
		</div>
	)
}

const App = () => {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

export default App
