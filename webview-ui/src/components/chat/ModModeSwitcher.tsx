import { Compass, Eye, HelpCircle, Layers, Layout, Palette, Sparkles, Terminal } from "lucide-react"
import React, { memo, useCallback, useState } from "react"
import { updateSetting } from "@/components/settings/utils/settingsHandlers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { cn } from "@/lib/utils"

export interface ModModeSwitcherProps {
	className?: string
}

/**
 * Ultra-compressed & minimalistic MoD mode switcher bar.
 * Provides a clean, subtle toggle between Coding Mode and Design (MoD) Mode.
 */
export const ModModeSwitcher: React.FC<ModModeSwitcherProps> = memo(({ className }) => {
	const { modEnabled } = useExtensionState()
	const [infoOpen, setInfoOpen] = useState(false)

	const isDesignMode = Boolean(modEnabled)

	const handleSetCodingMode = useCallback(() => {
		updateSetting("modEnabled", false)
	}, [])

	const handleSetDesignMode = useCallback(() => {
		updateSetting("modEnabled", true)
	}, [])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault()
				handleSetCodingMode()
			} else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault()
				handleSetDesignMode()
			}
		},
		[handleSetCodingMode, handleSetDesignMode],
	)

	return (
		<div
			className={cn(
				"lumi-mod-switcher-bar flex min-w-0 items-center justify-between gap-1 select-none py-0 text-[10px]",
				className,
			)}>
			{/* Segmented Control Pill */}
			<div
				aria-label="Execution mode switcher"
				className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-[#272730]/70 bg-[#14141d] shadow-xs"
				onKeyDown={handleKeyDown}
				role="tablist"
				tabIndex={0}>
				{/* Coding Button */}
				<button
					aria-controls="coding-mode-panel"
					aria-selected={!isDesignMode}
					className={cn(
						"relative flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50",
						!isDesignMode
							? "bg-[#1b2624] text-[#e6f7f3] shadow-xs font-semibold border border-emerald-500/35"
							: "text-description/60 hover:text-[#faf9f7] hover:bg-[#1a1a24]",
					)}
					data-testid="coding-mode-button"
					onClick={handleSetCodingMode}
					role="tab"
					title="Coding Mode: Direct code edits & terminal execution"
					type="button">
					<Terminal
						className={cn(
							"size-2.5 shrink-0 transition-colors",
							!isDesignMode ? "text-emerald-400" : "text-description/40",
						)}
						strokeWidth={2}
					/>
					<span>Coding</span>
					{!isDesignMode && (
						<span className="relative flex size-1 shrink-0 ml-0.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
							<span className="relative inline-flex size-1 rounded-full bg-emerald-500" />
						</span>
					)}
				</button>

				{/* Design Button (MoD) */}
				<button
					aria-controls="design-mode-panel"
					aria-selected={isDesignMode}
					className={cn(
						"relative flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50",
						isDesignMode
							? "bg-gradient-to-r from-purple-950/60 to-lumi/20 text-[#f5edff] shadow-xs border border-purple-500/40 font-semibold"
							: "text-description/60 hover:text-[#faf9f7] hover:bg-[#1a1a24]",
					)}
					data-testid="design-mode-button"
					onClick={handleSetDesignMode}
					role="tab"
					title="Design Mode (MoD): Direct coding steered by senior design instincts (tokens, WCAG, UI states, visual polish)"
					type="button">
					<Palette
						className={cn(
							"size-2.5 shrink-0 transition-colors",
							isDesignMode ? "text-purple-300" : "text-description/40",
						)}
						strokeWidth={2}
					/>
					<span>Design</span>
					{isDesignMode && (
						<span className="inline-flex items-center gap-0.5 px-0.5 py-0.1 rounded text-[7px] font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
							<Sparkles className="size-1.5 text-purple-300 animate-pulse" />
							MoD
						</span>
					)}
				</button>
			</div>

			{/* Minimal Info Tools */}
			<div className="flex items-center gap-1 shrink-0 text-[9.5px]">
				<Popover onOpenChange={setInfoOpen} open={infoOpen}>
					<PopoverTrigger asChild>
						<button
							aria-label="Mode guide"
							className="flex size-4.5 items-center justify-center rounded border border-[#272730]/60 bg-[#16161e] text-description/50 hover:bg-[#20202a] hover:text-[#faf9f7] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lumi transition-colors"
							title="Learn about Coding vs Design modes"
							type="button">
							<HelpCircle className="size-2.5 text-description/60" strokeWidth={1.75} />
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="end"
						className="w-76 border-[#272730] bg-[#14141e] p-2.5 text-[#faf9f7] shadow-xl"
						side="top"
						sideOffset={6}>
						<div className="space-y-2 text-[11px]">
							<div className="flex items-center justify-between border-b border-[#272730] pb-1 font-semibold">
								<span className="flex items-center gap-1">
									<Layers className="size-3 text-lumi" />
									<span>Execution Mode Guide</span>
								</span>
								<span className="text-[8.5px] uppercase tracking-wider text-description/50 font-mono">
									LUMI MoD
								</span>
							</div>

							<div className="space-y-1.5 text-[9.5px] leading-snug">
								<div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-1.5 space-y-0.5">
									<div className="flex items-center justify-between font-semibold text-emerald-300">
										<span className="flex items-center gap-1">
											<Terminal className="size-2.5 text-emerald-400" /> Coding Mode
										</span>
										<span className="text-[8px] px-1 py-0.1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
											TECHNICAL
										</span>
									</div>
									<p className="text-description/80">
										Standard developer loop for direct code edits & terminal execution.
									</p>
								</div>

								<div className="rounded border border-purple-500/40 bg-purple-950/25 p-1.5 space-y-1">
									<div className="flex items-center justify-between font-semibold text-purple-200">
										<span className="flex items-center gap-1">
											<Palette className="size-2.5 text-purple-300" /> Design Mode (MoD)
										</span>
										<span className="text-[8px] px-1 py-0.1 rounded bg-purple-500/30 text-purple-200 font-mono">
											STEERED
										</span>
									</div>
									<p className="text-description/80">
										<strong className="text-purple-200">Design Instincts Steering:</strong> Direct coding
										using the exact same tools and loop, guided by senior product designer standards (tokens,
										accessibility, UI state matrix, visual polish).
									</p>
									<div className="flex items-center gap-1.5 pt-1 border-t border-purple-500/20 text-[8.5px] text-purple-300/80">
										<span className="flex items-center gap-0.5">
											<Compass className="size-2 text-amber-400" /> System Tokens
										</span>
										<span className="flex items-center gap-0.5">
											<Layout className="size-2 text-sky-400" /> 7 UI States
										</span>
										<span className="flex items-center gap-0.5">
											<Eye className="size-2 text-emerald-400" /> WCAG AA
										</span>
										<span className="flex items-center gap-0.5">
											<Palette className="size-2 text-purple-400" /> Polish
										</span>
									</div>
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	)
})

ModModeSwitcher.displayName = "ModModeSwitcher"
