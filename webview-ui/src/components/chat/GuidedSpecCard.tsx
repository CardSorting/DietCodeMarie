import type { DecisionOption, GuidedSpecState } from "@shared/guidedSpec/types"
import {
	ArrowRight,
	Camera,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Compass,
	Eye,
	HelpCircle,
	Info,
	Layers,
	MapPin,
	PlayCircle,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react"
import React, { memo, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface GuidedSpecCardProps {
	specState: GuidedSpecState
	onSelectOption?: (option: DecisionOption) => void
	isLast?: boolean
	className?: string
}

const PHASES: Array<{ id: GuidedSpecState["currentPhase"]; label: string; step: number }> = [
	{ id: "DISCOVERY", label: "Discovery", step: 1 },
	{ id: "SPEC_LOCK", label: "Spec Lock", step: 2 },
	{ id: "MILESTONE_EXEC", label: "Execution", step: 3 },
	{ id: "HANDOFF", label: "Handoff", step: 4 },
]

export const GuidedSpecCard: React.FC<GuidedSpecCardProps> = memo(({ specState, onSelectOption, isLast = true, className }) => {
	const { currentPhase, breadboard, milestones, activeProbingCard } = specState
	const { question, options } = activeProbingCard
	const [optionA, optionB] = options
	const [showCanvasDrawer, setShowCanvasDrawer] = useState(false)
	const [expandedMilestoneId, setExpandedMilestoneId] = useState<number | null>(null)
	const [showRationaleA, setShowRationaleA] = useState(false)
	const [showRationaleB, setShowRationaleB] = useState(false)

	const completedCount = milestones.filter((m) => m.status === "completed").length
	const totalCount = milestones.length
	const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

	const currentStepNum = PHASES.find((p) => p.id === currentPhase)?.step || 1

	// Superhuman & Linear style single-key keyboard shortcuts (A / B) for rapid approval
	useEffect(() => {
		if (!isLast || !onSelectOption) return

		const handleKeyDown = (e: KeyboardEvent) => {
			const activeElement = document.activeElement
			const isTyping =
				activeElement?.tagName === "INPUT" ||
				activeElement?.tagName === "TEXTAREA" ||
				activeElement?.getAttribute("contenteditable") === "true"

			if (isTyping) return

			if (e.key === "a" || e.key === "A") {
				if (optionA) {
					e.preventDefault()
					onSelectOption(optionA)
				}
			} else if (e.key === "b" || e.key === "B") {
				if (optionB) {
					e.preventDefault()
					onSelectOption(optionB)
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isLast, onSelectOption, optionA, optionB])

	return (
		<div
			className={cn(
				"lumi-guided-spec-card my-4 overflow-hidden rounded-2xl border border-purple-500/30 bg-[#12121a] p-4 text-[#faf9f7] shadow-2xl space-y-4 select-none backdrop-blur-md transition-all duration-200 hover:border-purple-500/40",
				className,
			)}>
			{/* Header with Phase Stepper Bar & Canvas Drawer Trigger */}
			<div className="space-y-3 border-b border-[#242435] pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/30 text-amber-300 border border-amber-500/30 shadow-xs">
							<Sparkles className="size-3.5 animate-pulse text-amber-300" />
						</div>
						<div>
							<div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-purple-200">
								<span>Guided Spec Engine</span>
								<span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/25">
									v1.0.0-spec
								</span>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/30 transition-all cursor-pointer"
							onClick={() => setShowCanvasDrawer((prev) => !prev)}
							type="button">
							<Eye className="size-3 text-purple-300" />
							<span>{showCanvasDrawer ? "Hide Canvas" : "🎨 Live Canvas"}</span>
						</button>
						{currentPhase === "HANDOFF" ? (
							<span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
								<Camera className="size-3 text-emerald-400" />
								Snapshot Ready
							</span>
						) : (
							<span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
								State: {currentPhase}
							</span>
						)}
					</div>
				</div>

				{/* 4-State Pipeline Stepper Visualizer */}
				<div className="grid grid-cols-4 gap-1 pt-1">
					{PHASES.map((p) => {
						const isDone = p.step < currentStepNum
						const isCurrent = p.step === currentStepNum
						return (
							<div className="flex flex-col items-center gap-1 text-center" key={p.id}>
								<div
									className={cn(
										"h-1.5 w-full rounded-full transition-all duration-300",
										isDone && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
										isCurrent &&
											"bg-gradient-to-r from-purple-500 to-amber-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.6)]",
										!isDone && !isCurrent && "bg-[#252535]",
									)}
								/>
								<span
									className={cn(
										"text-[9px] font-semibold uppercase tracking-wider transition-colors",
										isDone && "text-emerald-400",
										isCurrent && "text-amber-300 font-bold",
										!isDone && !isCurrent && "text-description/40",
									)}>
									{p.label}
								</span>
							</div>
						)
					})}
				</div>
			</div>

			{/* Beyond-the-Beyond Live Canvas Spec Drawer */}
			{showCanvasDrawer && (
				<div className="space-y-3 rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1d172b] to-[#141221] p-3.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
					<div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
						<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-300">
							<Eye className="size-3.5 text-amber-400" />
							<span>Interactive Product Architecture Canvas</span>
						</div>
						<span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
							Figma / Linear View
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
						<div className="p-2 rounded-lg bg-[#161424] border border-[#2a273e]">
							<span className="text-[10px] font-bold uppercase text-amber-400 block mb-1">📍 Target Surface</span>
							<span className="text-purple-200 font-semibold">{breadboard.place}</span>
						</div>
						<div className="p-2 rounded-lg bg-[#161424] border border-[#2a273e]">
							<span className="text-[10px] font-bold uppercase text-sky-400 block mb-1">🔘 Active Controls</span>
							<span className="text-sky-200 font-medium">
								{breadboard.affordances.length} Affordances Wireframed
							</span>
						</div>
						<div className="p-2 rounded-lg bg-[#161424] border border-[#2a273e]">
							<span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
								🛡️ Automated Verification
							</span>
							<span className="text-emerald-200 font-medium">{progressPercent}% Verified & Locked</span>
						</div>
					</div>
				</div>
			)}

			{/* Block 1: Breadboard Spec Map */}
			<div className="space-y-2.5 rounded-xl border border-[#27273a] bg-gradient-to-br from-[#171725] to-[#13131f] p-3.5 shadow-inner">
				<div className="flex items-center justify-between border-b border-[#232336] pb-2">
					<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
						<MapPin className="size-3.5 text-amber-400" />
						<span>Visual Layout Map (Breadboard)</span>
					</div>
					<span className="text-[9px] font-mono uppercase tracking-wider text-description/50">Surface Spec</span>
				</div>

				<div className="space-y-2 text-xs text-description/90">
					{/* Screen / Place */}
					<div className="flex items-start gap-2 rounded-lg bg-[#1a1a29] p-2 border border-[#2a2a3e]">
						<Layers className="size-3.5 text-purple-400 shrink-0 mt-0.5" />
						<div>
							<span className="text-[10px] uppercase tracking-wider font-bold text-description/60 block">
								Screen / Place
							</span>
							<span className="text-purple-200 font-semibold text-xs">{breadboard.place}</span>
						</div>
					</div>

					{/* Affordances & Wiring Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
						{/* Affordances */}
						{breadboard.affordances.length > 0 && (
							<div className="space-y-1 rounded-lg bg-[#181827] p-2 border border-[#262638]">
								<div className="flex items-center gap-1 text-[10.5px] font-bold text-sky-300">
									<Compass className="size-3 text-sky-400" />
									<span>Affordances (Actions)</span>
								</div>
								<ul className="space-y-1 pt-1">
									{breadboard.affordances.map((item, idx) => (
										<li
											className="flex items-center gap-1.5 text-[11px] text-[#e5e5f0] bg-[#1d1d30] px-2 py-1 rounded border border-[#2e2e46]"
											key={`affordance-${idx}-${item.slice(0, 15)}`}>
											<span className="size-1.5 rounded-full bg-sky-400 shrink-0" />
											<span className="truncate">{item}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Wiring */}
						{breadboard.wiring.length > 0 && (
							<div className="space-y-1 rounded-lg bg-[#181827] p-2 border border-[#262638]">
								<div className="flex items-center gap-1 text-[10.5px] font-bold text-amber-300">
									<Zap className="size-3 text-amber-400" />
									<span>Wiring (Behaviors)</span>
								</div>
								<ul className="space-y-1 pt-1">
									{breadboard.wiring.map((item, idx) => (
										<li
											className="flex items-center gap-1.5 text-[11px] text-[#e5e5f0] bg-[#1d1d30] px-2 py-1 rounded border border-[#2e2e46]"
											key={`wiring-${idx}-${item.slice(0, 15)}`}>
											<span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
											<span className="truncate">{item}</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Block 2: Milestone Stepper */}
			<div className="space-y-2.5 rounded-xl border border-[#27273a] bg-[#161623] p-3.5">
				<div className="flex items-center justify-between border-b border-[#232336] pb-2">
					<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-400">
						<PlayCircle className="size-3.5 text-sky-400" />
						<span>Progress Waypoint (Milestones)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="h-1.5 w-16 bg-[#252538] rounded-full overflow-hidden">
							<div
								className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
						<span className="text-[10px] font-bold font-mono text-emerald-400">
							{completedCount}/{totalCount} ({progressPercent}%)
						</span>
					</div>
				</div>

				<div className="space-y-2 pt-1">
					{milestones.map((m) => {
						const isCompleted = m.status === "completed"
						const isInProgress = m.status === "in_progress"
						const isExpanded = expandedMilestoneId === m.id

						return (
							<div
								className={cn(
									"space-y-2 p-2.5 rounded-lg transition-all duration-150 border cursor-pointer",
									isCompleted &&
										"bg-emerald-950/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-950/30",
									isInProgress &&
										"bg-purple-950/40 border-purple-500/50 text-purple-100 font-medium shadow-[0_0_12px_rgba(168,85,247,0.15)]",
									m.status === "pending" &&
										"bg-[#141420] border-[#252536] text-description/60 hover:bg-[#181827]",
								)}
								key={m.id}
								onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}>
								<div className="flex items-start gap-2.5 text-xs">
									<div className="shrink-0 pt-0.5">
										{isCompleted && <CheckCircle2 className="size-4 text-emerald-400" />}
										{isInProgress && <PlayCircle className="size-4 text-purple-400 animate-spin" />}
										{m.status === "pending" && <Clock className="size-4 text-description/30" />}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between">
											<span className="font-bold text-xs truncate">
												Milestone {m.id}: {m.title}
											</span>
											<div className="flex items-center gap-1.5">
												<span
													className={cn(
														"text-[8.5px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded font-mono border",
														isCompleted && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
														isInProgress &&
															"bg-purple-500/30 text-purple-200 border-purple-400/40 animate-pulse",
														m.status === "pending" &&
															"bg-[#202030] text-description/50 border-[#2f2f44]",
													)}>
													{m.status.replace("_", " ")}
												</span>
												{isExpanded ? (
													<ChevronUp className="size-3.5 text-description/50" />
												) : (
													<ChevronDown className="size-3.5 text-description/50" />
												)}
											</div>
										</div>
										{m.userValue && <p className="text-[11px] opacity-80 mt-0.5">{m.userValue}</p>}
									</div>
								</div>

								{/* Interactive Detail Expansion Drawer */}
								{isExpanded && (
									<div className="pt-2 border-t border-white/10 text-[11px] text-description/80 space-y-1 pl-6">
										<div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
											<ShieldCheck className="size-3.5 text-emerald-400" />
											<span>Acceptance Criteria: Verified against visual spec</span>
										</div>
										<p className="text-[10.5px] text-description/70">
											Status:{" "}
											{isCompleted
												? "Completed and locked."
												: isInProgress
													? "Currently being executed by LUMI."
													: "Queued for next phase execution."}
										</p>
									</div>
								)}
							</div>
						)
					})}
				</div>
			</div>

			{/* Block 3 & 4: Decision Waypoint & Interactive Decision Chips */}
			{isLast && (
				<div className="space-y-3 rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#1c162e] via-[#161424] to-[#12111d] p-4 shadow-xl">
					<div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
						<div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-purple-300">
							<Sparkles className="size-3.5 text-purple-300" />
							<span>Waypoint Check-In (Decision Gateway)</span>
						</div>
						<span className="text-[9px] font-mono uppercase tracking-wider text-purple-300/60">
							1-Tap Select or Key A / B
						</span>
					</div>

					{question && <p className="text-xs text-[#faf9f7] font-semibold leading-relaxed pl-0.5">{question}</p>}

					{/* Interactive Decision Option Cards (Chips) */}
					<div className="grid grid-cols-1 gap-2.5 text-xs pt-1">
						{optionA && (
							<div className="space-y-1.5">
								<button
									className="w-full text-left relative overflow-hidden rounded-xl border border-purple-500/50 bg-purple-950/30 p-3 text-purple-100 transition-all duration-150 hover:border-purple-400 hover:bg-purple-900/40 shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer group"
									onClick={() => onSelectOption?.(optionA)}
									type="button">
									<div className="flex items-center justify-between font-bold text-purple-200">
										<div className="flex items-center gap-1.5">
											<Check className="size-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
											<span>Option A (Recommended Default)</span>
										</div>
										<div className="flex items-center gap-1">
											<button
												className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 border border-purple-400/40 transition-colors"
												onClick={(e) => {
													e.stopPropagation()
													setShowRationaleA((prev) => !prev)
												}}
												type="button">
												<Info className="size-2.5 inline mr-0.5" />
												Rationale
											</button>
											<kbd className="px-1 py-0.2 rounded text-[8px] font-mono bg-purple-500/40 text-purple-200 border border-purple-400/50">
												Press A
											</kbd>
											<span className="text-[8.5px] px-1.5 py-0.2 rounded font-mono uppercase bg-purple-500/30 text-purple-200 border border-purple-400/40">
												DEFAULT
											</span>
										</div>
									</div>
									<p className="text-[11.5px] text-description/90 mt-1.5 leading-normal pl-5">
										{optionA.description}
									</p>
								</button>
								{showRationaleA && (
									<div className="p-2.5 rounded-lg border border-purple-500/30 bg-[#161326] text-[10.5px] text-purple-200 space-y-1 font-mono">
										<div className="font-bold text-amber-300">💡 Why Option A is Recommended:</div>
										<p className="text-description/80">
											Provides the fastest path to completion with zero breaking changes, aligned with
											existing visual specs.
										</p>
									</div>
								)}
							</div>
						)}

						{optionB && (
							<div className="space-y-1.5">
								<button
									className="w-full text-left rounded-xl border border-[#303046] bg-[#161624] p-3 text-description/90 transition-all duration-150 hover:border-[#505075] hover:bg-[#1d1d2e] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 cursor-pointer group"
									onClick={() => onSelectOption?.(optionB)}
									type="button">
									<div className="flex items-center justify-between font-semibold text-description">
										<div className="flex items-center gap-1.5">
											<Compass className="size-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
											<span>Option B (Alternative Pathway)</span>
										</div>
										<div className="flex items-center gap-1">
											<button
												className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-[#252538] hover:bg-[#303048] text-description/70 border border-[#35354e] transition-colors"
												onClick={(e) => {
													e.stopPropagation()
													setShowRationaleB((prev) => !prev)
												}}
												type="button">
												<HelpCircle className="size-2.5 inline mr-0.5" />
												Rationale
											</button>
											<kbd className="px-1 py-0.2 rounded text-[8px] font-mono bg-[#252538] text-description/60 border border-[#35354e]">
												Press B
											</kbd>
											<span className="text-[8.5px] px-1.5 py-0.2 rounded font-mono uppercase bg-[#252538] text-description/60 border border-[#35354e]">
												ALT
											</span>
										</div>
									</div>
									<p className="text-[11.5px] text-description/80 mt-1.5 leading-normal pl-5">
										{optionB.description}
									</p>
								</button>
								{showRationaleB && (
									<div className="p-2.5 rounded-lg border border-[#303048] bg-[#141422] text-[10.5px] text-sky-200 space-y-1 font-mono">
										<div className="font-bold text-sky-300">💡 Alternative Pathway Impact:</div>
										<p className="text-description/80">
											Allows custom visual configuration and alternate layout ordering for specialized
											workflows.
										</p>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Block 4: Action Chips (Buttons) */}
					{onSelectOption && (
						<div className="pt-2 flex flex-wrap gap-2.5">
							{optionA && (
								<button
									className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 border border-purple-400/40 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
									onClick={() => onSelectOption(optionA)}
									type="button">
									<span>Proceed with Defaults</span>
									<ArrowRight className="size-4 shrink-0" />
								</button>
							)}

							{optionB && (
								<button
									className="flex-1 min-w-[150px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#212133] hover:bg-[#2c2c42] text-[#faf9f7] border border-[#383854] transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 cursor-pointer"
									onClick={() => onSelectOption(optionB)}
									type="button">
									<span>Select Option B</span>
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
})

GuidedSpecCard.displayName = "GuidedSpecCard"
