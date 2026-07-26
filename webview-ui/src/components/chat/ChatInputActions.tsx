import { AtSign, ChevronDown, Mic, MicOff, Paperclip } from "lucide-react"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { isMac } from "@/utils/platformUtils"
import type { ComposerMode } from "./chat-view/shared/composerState"
import { VoiceVisualizer } from "./VoiceVisualizer"

interface ChatInputActionsProps {
	onContextClick: () => void
	onAttachClick: () => void
	attachDisabled: boolean
	modelDisplayName: string
	onModelClick: () => void
	composerMode: ComposerMode
	isListening?: boolean
	isSpeechSupported?: boolean
	onVoiceClick?: () => void
}

const ACTION_CLASS =
	"lumi-icon-action flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#272730] bg-[#1a1a22] text-[#faf9f7]/70 transition-all duration-150 hover:bg-[#20202a]/60 hover:text-[#faf9f7] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lumi disabled:cursor-not-allowed disabled:opacity-40"

/** Composer utilities share one bottom-aligned control row with the send action. */
export const ChatInputActions = memo(
	({
		onContextClick,
		onAttachClick,
		attachDisabled,
		modelDisplayName,
		onModelClick,
		composerMode,
		isListening = false,
		isSpeechSupported = true,
		onVoiceClick,
	}: ChatInputActionsProps) => {
		const shortcutHint = isMac() ? "⌘⇧V" : "Ctrl+Shift+V"

		return (
			<div className="flex min-w-0 flex-1 items-center gap-1.5 select-none">
				<button
					aria-label="Mention workspace context"
					className={ACTION_CLASS}
					data-testid="context-button"
					onClick={onContextClick}
					title="Mention workspace context"
					type="button">
					<AtSign aria-hidden className="size-3.5" strokeWidth={2} />
				</button>

				<button
					aria-label="Attach a file or image"
					className={ACTION_CLASS}
					data-testid="files-button"
					disabled={attachDisabled}
					onClick={onAttachClick}
					title={attachDisabled ? "Attachment limit reached" : "Attach a file or image"}
					type="button">
					<Paperclip aria-hidden className="size-3.5" strokeWidth={2} />
				</button>

				<button
					aria-label={`Change model. Current model: ${modelDisplayName}`}
					className="lumi-composer-model flex items-center justify-between gap-1.5 ml-1 min-w-0 max-w-full truncate rounded-lg border border-[#272730] bg-[#1a1a22] px-2.5 py-1 text-left text-[11px] font-semibold text-[#faf9f7]/70 transition-all duration-150 hover:bg-[#20202a]/60 hover:border-lumi/50 hover:text-[#faf9f7] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lumi"
					onClick={onModelClick}
					title={`Change model · ${modelDisplayName}`}
					type="button">
					<span className="truncate">{modelDisplayName}</span>
					<ChevronDown className="size-3 text-description/50 shrink-0" />
				</button>

				{onVoiceClick && (
					<button
						aria-keyshortcuts="Cmd+Shift+V"
						aria-label={isListening ? "Stop voice dictation" : "Voice dictation (Speak to type)"}
						className={cn(
							"lumi-icon-action ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-[#272730] bg-[#1a1a22] px-2 text-[11px] font-medium text-[#faf9f7]/70 transition-all duration-150 hover:bg-[#20202a]/60 hover:text-[#faf9f7] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lumi disabled:cursor-not-allowed disabled:opacity-40 select-none",
							isListening &&
								"border-red-500/60 bg-red-500/15 text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.3)] hover:bg-red-500/25",
						)}
						data-testid="voice-button"
						disabled={!isSpeechSupported}
						onClick={onVoiceClick}
						title={
							!isSpeechSupported
								? "Voice input not supported in this environment"
								: isListening
									? `Listening... Click to stop (${shortcutHint})`
									: `Speak to type (Voice dictation · ${shortcutHint})`
						}
						type="button">
						{isListening ? (
							<>
								<span className="relative flex size-2 items-center justify-center">
									<span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
									<span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
								</span>
								<VoiceVisualizer className="px-0 py-0" isActive />
								<MicOff aria-hidden className="size-3.5 text-red-300 shrink-0" strokeWidth={2} />
							</>
						) : (
							<Mic aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
						)}
						<span className="shrink-0 font-semibold">{isListening ? "Listening" : "Voice"}</span>
						{isListening && (
							<kbd className="hidden shrink-0 rounded border border-red-500/30 bg-red-500/20 px-1 font-sans text-[8px] font-semibold text-red-200 min-[400px]:inline-block">
								{shortcutHint}
							</kbd>
						)}
					</button>
				)}

				{composerMode === "steering" ? (
					<span className="hidden shrink-0 items-center gap-1 text-[9px] text-[#faf9f7]/60 min-[420px]:inline-flex bg-lumi/20 border border-lumi/30 px-1.5 py-0.5 rounded">
						<span aria-hidden className="size-1.5 rounded-full bg-lumi animate-pulse" />
						Steer
					</span>
				) : null}
			</div>
		)
	},
)

ChatInputActions.displayName = "ChatInputActions"
