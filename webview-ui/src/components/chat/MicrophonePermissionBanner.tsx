import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Mic, MicOff, RefreshCw, X } from "lucide-react"
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { isMac, isWindows } from "@/utils/platformUtils"

export interface MicrophonePermissionBannerProps {
	error: string
	isPermissionBlocked?: boolean
	onTryAgain: () => void
	onDismiss: () => void
	onRequestPermission?: () => Promise<boolean>
	className?: string
}

export const MicrophonePermissionBanner: React.FC<MicrophonePermissionBannerProps> = ({
	error,
	isPermissionBlocked = false,
	onTryAgain,
	onDismiss,
	onRequestPermission,
	className,
}) => {
	const [showGuide, setShowGuide] = useState(false)
	const [isTesting, setIsTesting] = useState(false)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)

	const handleTestPermission = async () => {
		setIsTesting(true)
		setSuccessMsg(null)
		try {
			if (onRequestPermission) {
				const granted = await onRequestPermission()
				if (granted) {
					setSuccessMsg("Microphone permission granted! Voice dictation is ready.")
					setTimeout(() => {
						onDismiss()
					}, 2000)
				}
			} else {
				onTryAgain()
			}
		} finally {
			setIsTesting(false)
		}
	}

	return (
		<div
			aria-live="polite"
			className={cn(
				"mx-3 my-2 flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-[#1e1a14]/95 p-3 shadow-md backdrop-blur-md text-amber-200 transition-all animate-in fade-in slide-in-from-bottom-2",
				className,
			)}
			data-testid="microphone-permission-banner">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-2.5 min-w-0">
					<div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/15 p-1.5 text-amber-400 shrink-0">
						{isPermissionBlocked ? <MicOff className="size-4" /> : <AlertTriangle className="size-4" />}
					</div>
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="text-xs font-semibold text-amber-300">
							{isPermissionBlocked ? "Microphone Blocked by System Settings" : "Microphone Access Issue"}
						</span>
						<p className="text-[11px] leading-relaxed text-amber-200/90 font-normal break-words">{error}</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0 select-none">
					<button
						className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-200 transition-all hover:bg-amber-500/30 active:scale-95 disabled:opacity-50"
						disabled={isTesting}
						onClick={handleTestPermission}
						type="button">
						<RefreshCw className={cn("size-3", isTesting && "animate-spin")} />
						<span>{isTesting ? "Testing..." : "Test Again"}</span>
					</button>

					<button
						className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-300/80 transition-all hover:bg-amber-500/20 hover:text-amber-200"
						onClick={() => setShowGuide((prev) => !prev)}
						type="button">
						<span>Fix Guide</span>
						{showGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
					</button>

					<button
						aria-label="Dismiss microphone error"
						className="flex size-6 items-center justify-center rounded-lg text-amber-300/60 transition-all hover:bg-amber-500/15 hover:text-amber-200"
						onClick={onDismiss}
						type="button">
						<X className="size-3.5" />
					</button>
				</div>
			</div>

			{successMsg && (
				<div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 animate-in fade-in">
					<CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
					<span>{successMsg}</span>
				</div>
			)}

			{showGuide && (
				<div className="flex flex-col gap-2 rounded-lg border border-amber-500/25 bg-black/40 p-2.5 text-[11px] leading-relaxed animate-in fade-in slide-in-from-top-1">
					<span className="font-semibold text-amber-300 flex items-center gap-1">
						<Mic className="size-3 text-amber-400" />
						How to enable Microphone access in System Settings:
					</span>

					{isMac() ? (
						<ol className="list-decimal pl-4 space-y-1 text-amber-200/90 font-mono text-[10.5px]">
							<li>
								Open <strong className="font-sans text-amber-200">System Settings</strong> on macOS (Press ⌘ +
								Space and type "System Settings").
							</li>
							<li>
								Go to <strong className="font-sans text-amber-200">Privacy & Security</strong> →{" "}
								<strong className="font-sans text-amber-200">Microphone</strong>.
							</li>
							<li>
								Ensure <strong className="font-sans text-amber-200">Visual Studio Code</strong> (or your host app)
								is toggled <strong className="font-sans text-emerald-300">ON</strong>.
							</li>
							<li>
								<em>Tip:</em> If VS Code is not listed in System Settings, open Terminal and run:
								<div className="my-1 flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-950/60 px-2 py-1 font-mono text-[10px] text-amber-300">
									<code className="select-all">tccutil reset Microphone</code>
									<button
										className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-sans font-semibold text-amber-200 hover:bg-amber-500/30"
										onClick={() => {
											navigator.clipboard.writeText("tccutil reset Microphone")
											setSuccessMsg("Copied 'tccutil reset Microphone' to clipboard!")
											setTimeout(() => setSuccessMsg(null), 3000)
										}}
										type="button">
										Copy Command
									</button>
								</div>
								then restart VS Code.
							</li>
						</ol>
					) : isWindows() ? (
						<ol className="list-decimal pl-4 space-y-1 text-amber-200/90 font-mono text-[10.5px]">
							<li>
								Open <strong className="font-sans text-amber-200">Settings</strong> (Press Win + I).
							</li>
							<li>
								Go to <strong className="font-sans text-amber-200">Privacy & security</strong> →{" "}
								<strong className="font-sans text-amber-200">Microphone</strong>.
							</li>
							<li>
								Ensure both <strong className="font-sans text-amber-200">Microphone access</strong> and{" "}
								<strong className="font-sans text-amber-200">Let apps access your microphone</strong> are toggled{" "}
								<strong className="font-sans text-emerald-300">ON</strong>.
							</li>
						</ol>
					) : (
						<ol className="list-decimal pl-4 space-y-1 text-amber-200/90 font-mono text-[10.5px]">
							<li>
								Open your Linux distribution's Sound Settings or volume control (
								<strong className="font-sans text-amber-200">pavucontrol</strong>).
							</li>
							<li>Verify that your input microphone is unmuted and selected as default.</li>
						</ol>
					)}

					<div className="mt-1 flex items-center justify-between border-t border-amber-500/20 pt-2">
						<span className="text-[10px] text-amber-300/70">
							After updating settings, click Test Again to re-check microphone permission.
						</span>
						<button
							className="rounded border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/30"
							disabled={isTesting}
							onClick={handleTestPermission}
							type="button">
							Test Again Now
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
