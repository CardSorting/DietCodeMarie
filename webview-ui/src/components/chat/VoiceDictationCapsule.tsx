import { Check, SendHorizontal, Sparkles, Volume2, VolumeX, X } from "lucide-react"
import React from "react"
import { cn } from "@/lib/utils"
import { isMac } from "@/utils/platformUtils"
import { VoiceVisualizer } from "./VoiceVisualizer"

interface VoiceDictationCapsuleProps {
	/** Real-time interim transcript for active dictation */
	interimTranscript?: string
	/** Auto-sensed system language code */
	detectedLanguage?: string
	/** Whether auto-send after dictation is enabled */
	autoSend?: boolean
	/** Callback to toggle auto-send setting */
	onAutoSendToggle?: () => void
	/** Whether sound audio chimes are enabled */
	soundEnabled?: boolean
	/** Callback to toggle sound audio chimes */
	onSoundToggle?: () => void
	/** Callback to stop listening and keep transcribed text */
	onStop: () => void
	/** Callback to cancel dictation */
	onCancel?: () => void
	/** Custom class names */
	className?: string
}

/**
 * World-Class Voice Dictation Capsule overlay.
 * Renders an animated equalizer, live speech stream, automatic language sensing badge, actions, and hotkey hints.
 */
export const VoiceDictationCapsule: React.FC<VoiceDictationCapsuleProps> = ({
	interimTranscript,
	detectedLanguage,
	autoSend = false,
	onAutoSendToggle,
	soundEnabled = true,
	onSoundToggle,
	onStop,
	onCancel,
	className,
}) => {
	const shortcutLabel = isMac() ? "⌘⇧V" : "Ctrl+Shift+V"
	const activeLocale = detectedLanguage || (typeof navigator !== "undefined" ? navigator.language : "en-US")
	const wordCount = interimTranscript ? interimTranscript.trim().split(/\s+/).filter(Boolean).length : 0

	return (
		<div
			aria-live="polite"
			className={cn(
				"mx-3 my-2 flex flex-col gap-1.5 rounded-xl border border-red-500/30 bg-[#16161e]/95 p-2.5 shadow-md backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2",
				className,
			)}
			data-testid="voice-dictation-capsule">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<VoiceVisualizer isActive />
					<span className="text-xs font-semibold text-red-300 tracking-wide select-none">Dictating</span>
					<span className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-200/90 select-none">
						<Sparkles className="size-2.5 text-red-300 animate-pulse" />
						<span>Auto ({activeLocale})</span>
					</span>
					{wordCount > 0 && (
						<span className="rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-200/80 select-none">
							{wordCount} {wordCount === 1 ? "word" : "words"}
						</span>
					)}
					<kbd className="hidden sm:inline-block rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 font-sans text-[9px] text-red-200/80">
						{shortcutLabel}
					</kbd>
				</div>

				<div className="flex items-center gap-1 shrink-0 select-none">
					{onSoundToggle && (
						<button
							aria-label={soundEnabled ? "Mute dictation sound chimes" : "Unmute dictation sound chimes"}
							className="flex size-6 items-center justify-center rounded-lg border border-border/40 bg-foreground/5 text-description transition-all duration-150 hover:bg-foreground/10 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							onClick={onSoundToggle}
							title={soundEnabled ? "Mute dictation sound chimes" : "Unmute dictation sound chimes"}
							type="button">
							{soundEnabled ? <Volume2 className="size-3" /> : <VolumeX className="size-3 text-red-400" />}
						</button>
					)}
					{onAutoSendToggle && (
						<button
							aria-label={autoSend ? "Auto-Send Enabled" : "Auto-Send Disabled"}
							className={cn(
								"flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
								autoSend
									? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
									: "border-border/40 bg-foreground/5 text-description hover:bg-foreground/10 hover:text-foreground",
							)}
							onClick={onAutoSendToggle}
							title={autoSend ? "Auto-Send on dictation complete (Active)" : "Enable Auto-Send after dictation"}
							type="button">
							<SendHorizontal className="size-3" strokeWidth={1.75} />
							<span>{autoSend ? "Auto-Send ON" : "Auto-Send"}</span>
						</button>
					)}
					{onCancel && (
						<button
							aria-keyshortcuts="Escape"
							aria-label="Cancel voice dictation"
							className="flex items-center gap-1 rounded-lg border border-border/40 bg-foreground/5 px-2 py-1 text-[11px] font-medium text-description transition-all duration-150 hover:bg-foreground/10 hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							onClick={onCancel}
							title="Cancel voice dictation (Esc)"
							type="button">
							<X className="size-3" strokeWidth={2} />
							<span>Cancel</span>
						</button>
					)}
					<button
						aria-keyshortcuts="Enter"
						aria-label="Finish voice dictation"
						className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-200 transition-all duration-150 hover:bg-red-500/30 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
						onClick={onStop}
						title="Done · Commit voice input (Enter)"
						type="button">
						<Check className="size-3" strokeWidth={2.5} />
						<span>Done</span>
					</button>
				</div>
			</div>

			<div className="min-h-5 px-0.5 text-xs text-foreground/90 leading-relaxed font-normal">
				{interimTranscript ? (
					<span className="inline-flex items-center gap-1 italic text-red-200/90 font-mono text-[11px]">
						<span>"{interimTranscript}"</span>
						<span className="inline-block size-1.5 rounded-full bg-red-400 animate-pulse" />
					</span>
				) : (
					<span className="text-description/70 italic text-[11px]">
						Listening... Speak your request naturally (LUMI will type what you say)
					</span>
				)}
			</div>
		</div>
	)
}
