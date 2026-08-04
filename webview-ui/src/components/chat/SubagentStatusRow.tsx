import { formatSubagentParentSignal, isParentGateSignal } from "@shared/audit/auditSubagentRollup"
import {
	DietCodeAskUseSubagents,
	DietCodeMessage,
	DietCodeSaySubagentStatus,
	GovernedReceiptSummary,
	SubagentExecutionStatus,
	SubagentStatusItem,
} from "@shared/ExtensionMessage"
import {
	BotIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CircleSlashIcon,
	CircleXIcon,
	LoaderCircleIcon,
	NetworkIcon,
	Sparkles,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useChatMessages } from "@/context/ExtensionStateContext"
import MarkdownBlock from "../common/MarkdownBlock"
import ExpandHandle from "./ExpandHandle"
import { ParentAuditGateBadge } from "./ParentAuditGateBadge"
import { GovernedReceiptPanel } from "./subagent/GovernedReceiptPanel"
import { SubagentCompactionBoundary } from "./subagent/SubagentCompactionBoundary"
import { SubagentEvidencePanel } from "./subagent/SubagentEvidencePanel"
import { SubagentExecutionDiffViewer } from "./subagent/SubagentExecutionDiffViewer"
import { SubagentExecutionTimeline } from "./subagent/SubagentExecutionTimeline"
import { buildLatestExecutionDiff } from "./subagent/swarmDiffUtils"

const MOD_STAGE_LABELS: Record<string, string> = {
	initializing: "Initializing Council",
	intent: "Analyzing Product Intent",
	classification: "Classifying Problems",
	"specialist-selection": "Routing Personas",
	"specialist-analysis": "Designer Investigation",
	"recommendation-validation": "Validating Recommendations",
	convergence: "Converging Decisions",
	"decision-lock": "Locking Decisions",
	"implementation-planning": "Planning Tasks",
	implementation: "Executing Code Edits",
	validation: "Multi-Gate Audit",
	critique: "Product Critique",
	"post-implementation-audit": "Post-Implementation Audit",
	completed: "Run Completed",
	"completed-with-limitations": "Completed with Limitations",
	failed: "Run Failed",
}

const MOD_PIPELINE_STEPS = [
	{ step: 1, label: "Intent & Routing" },
	{ step: 2, label: "Council Audit" },
	{ step: 3, label: "Decision Lock" },
	{ step: 4, label: "Code Execution" },
	{ step: 5, label: "Quality Audit" },
]

function getModPipelineStep(stage: string): number {
	switch (stage) {
		case "initializing":
		case "intent":
		case "classification":
		case "specialist-selection":
			return 1
		case "specialist-analysis":
		case "explore-design":
		case "recommendation-validation":
			return 2
		case "convergence":
		case "decision-lock":
		case "contract-generation":
			return 3
		case "implementation-planning":
		case "implementation":
			return 4
		case "validation":
		case "critique":
		case "post-implementation-audit":
		case "completed":
		case "completed-with-limitations":
			return 5
		default:
			return 1
	}
}

interface SubagentStatusRowProps {
	message: DietCodeMessage
	isLast: boolean
	lastModifiedMessage?: DietCodeMessage
}

type DisplayStatus = SubagentExecutionStatus | "cancelled"
type SubagentRowStatus = "pending" | "running" | "completed" | "failed"

interface ModGlassboxDetails {
	specialists?: { role: string; focus: string; status?: string }[]
	decisions?: { id: string; title: string; rationale?: string; targetFiles?: string[]; locked?: boolean }[]
	tasks?: { id: string; objective: string; targetFiles?: string[]; status?: string }[]
	gates?: { gate: string; passed: boolean; score?: number }[]
}

interface SubagentRowData {
	status: SubagentRowStatus
	items: SubagentStatusItem[]
	swarmId?: string
	continuityMarker?: DietCodeSaySubagentStatus["continuityMarker"]
	artifactPath?: string
	invariantViolations?: string[]
	governedReceipt?: GovernedReceiptSummary
	modStage?: string
	modProgress?: number
	modGlassbox?: ModGlassboxDetails
}

interface SubagentPromptTextProps {
	prompt: string
	isExpanded: boolean
	onToggle: () => void
}

const MOD_STAGE_DESCRIPTIONS: Record<string, string> = {
	initializing: "Initializing multi-specialist design council...",
	intent: "Analyzing product intent & architectural boundaries...",
	classification: "Classifying problem dimensions across codebase...",
	"specialist-selection": "Routing request to specialized design personas...",
	"specialist-analysis": "Designer-in-Residence investigating codebase architecture...",
	"recommendation-validation": "Validating recommendations against WCAG & design system patterns...",
	convergence: "Converging decisions & resolving design priority lattice...",
	"decision-lock": "Locking converged design decisions & building intent contracts...",
	"implementation-planning": "Planning disjoint mutation tasks & assessing UX regression risk...",
	implementation: "Developer subagents executing code modifications within mutation boundaries...",
	validation: "Running multi-dimension gate audit (Accessibility, Visual, UX, Feasibility)...",
	critique: "Product critic evaluating holistic user experience coherence...",
	"post-implementation-audit": "Post-implementation audit verifying intent fulfillment...",
	completed: "Mixture of Designers pass completed successfully.",
	"completed-with-limitations": "Mixture of Designers pass completed with limitations.",
	failed: "Mixture of Designers run failed.",
	blocked: "Implementation blocked: workspace target resolution failure.",
}

const statusIcon = (status: DisplayStatus, isMod = false) => {
	if (isMod && (status === "running" || status === "pending")) {
		return <Sparkles className="size-3.5 text-purple-400 animate-pulse shrink-0 mt-[1px]" />
	}
	switch (status) {
		case "running":
			return <LoaderCircleIcon className="size-2 animate-spin text-link shrink-0 mt-[1px]" />
		case "completed":
			return <CheckIcon className="size-2 text-success shrink-0 mt-[1px]" />
		case "failed":
			return <CircleXIcon className="size-2 text-error shrink-0 mt-[1px]" />
		case "cancelled":
			return <CircleSlashIcon className="size-2 text-foreground shrink-0 mt-[1px]" />
		default:
			return <BotIcon className="size-2 text-foreground/70 shrink-0 mt-[1px]" />
	}
}

const confidenceBadgeClass = (confidence?: string): string => {
	switch (confidence) {
		case "high":
			return "bg-success/15 text-success border-success/25"
		case "medium":
			return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
		case "low":
			return "bg-error/15 text-error border-error/25"
		default:
			return "bg-foreground/10 text-foreground/70 border-foreground/20"
	}
}

function ExecutionStateBadge({ label, className }: { label: string; className: string }) {
	return <span className={`px-1 py-0 rounded-[2px] font-mono text-[9px] border ${className}`}>{label}</span>
}

const formatCount = (value: number | undefined): string => {
	if (!Number.isFinite(value)) {
		return "0"
	}

	return Intl.NumberFormat("en-US").format(value || 0)
}

const formatCost = (value: number | undefined): string => {
	const normalized = Number.isFinite(value) ? Math.max(0, value || 0) : 0
	const maximumFractionDigits = normalized >= 0.01 ? 2 : 4
	return Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits,
	}).format(normalized)
}

function parseSubagentRowData(message: DietCodeMessage): SubagentRowData | null {
	if (!message.text) {
		return null
	}

	try {
		if (message.ask === "use_subagents" || message.say === "use_subagents") {
			const parsed = JSON.parse(message.text) as DietCodeAskUseSubagents
			if (!Array.isArray(parsed.prompts)) {
				return null
			}
			const prompts = parsed.prompts.map((prompt) => prompt?.trim()).filter((prompt): prompt is string => !!prompt)
			if (prompts.length === 0) {
				return null
			}

			return {
				status: "pending",
				items: prompts.map((prompt, index) => ({
					id: `pending-${index}`,
					name: `Agent ${index + 1}`,
					index: index + 1,
					prompt,
					status: "pending",
					toolCalls: 0,
					inputTokens: 0,
					outputTokens: 0,
					totalCost: 0,
					contextTokens: 0,
					contextWindow: 0,
					contextUsagePercentage: 0,
				})),
			}
		}

		const parsed = JSON.parse(message.text)
		if (parsed && typeof parsed === "object" && parsed.stage && (parsed.runId || parsed.progress !== undefined)) {
			const stageStr = String(parsed.stage)
			const progressNum = typeof parsed.progress === "number" ? parsed.progress : 0
			const rowStatus: SubagentRowStatus =
				stageStr === "completed" || stageStr === "completed-with-limitations"
					? "completed"
					: stageStr === "failed"
						? "failed"
						: "running"
			const items: SubagentStatusItem[] =
				Array.isArray(parsed.items) && parsed.items.length > 0
					? parsed.items
					: [
							{
								id: parsed.runId || "mod-stage",
								name: "Mixture of Designers",
								index: 1,
								prompt: MOD_STAGE_DESCRIPTIONS[stageStr] || `MoD Council evaluating ${stageStr}`,
								status: rowStatus === "completed" ? "completed" : rowStatus === "failed" ? "failed" : "running",
								toolCalls: 0,
								inputTokens: 0,
								outputTokens: 0,
								totalCost: 0,
								contextTokens: 0,
								contextWindow: 0,
								contextUsagePercentage: 0,
							},
						]

			return {
				status: rowStatus,
				items,
				swarmId: parsed.swarmId,
				continuityMarker: parsed.continuityMarker,
				artifactPath: parsed.artifactPath,
				invariantViolations: parsed.invariantViolations,
				governedReceipt: parsed.governedReceipt,
				modStage: stageStr,
				modProgress: progressNum,
				modGlassbox: parsed.glassbox || parsed.modGlassbox,
			}
		}

		if (!Array.isArray(parsed.items)) {
			return null
		}

		return {
			status: parsed.status,
			items: parsed.items,
			swarmId: parsed.swarmId,
			continuityMarker: parsed.continuityMarker,
			artifactPath: parsed.artifactPath,
			invariantViolations: parsed.invariantViolations,
			governedReceipt: parsed.governedReceipt,
		}
	} catch {
		return null
	}
}

function SubagentPromptText({ prompt, isExpanded, onToggle }: SubagentPromptTextProps) {
	const promptRef = useRef<HTMLDivElement | null>(null)
	const [showMoreVisible, setShowMoreVisible] = useState(false)

	useEffect(() => {
		if (isExpanded) {
			setShowMoreVisible(false)
			return
		}

		const element = promptRef.current
		if (!element) {
			setShowMoreVisible(false)
			return
		}

		const checkOverflow = () => {
			setShowMoreVisible(element.scrollHeight - element.clientHeight > 1)
		}

		checkOverflow()

		if (typeof ResizeObserver === "undefined") {
			return
		}

		const observer = new ResizeObserver(() => checkOverflow())
		observer.observe(element)

		return () => observer.disconnect()
	}, [isExpanded])

	return (
		<div>
			<div
				className={`text-xs font-medium text-foreground whitespace-pre-wrap break-words ${!isExpanded ? "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" : ""}`}
				ref={promptRef}>
				"{prompt}"
			</div>
			{((!isExpanded && showMoreVisible) || isExpanded) && <ExpandHandle isExpanded={isExpanded} onToggle={onToggle} />}
		</div>
	)
}

export default function SubagentStatusRow({ message, isLast, lastModifiedMessage }: SubagentStatusRowProps) {
	const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({})
	const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({})
	const dietcodeMessages = useChatMessages()
	const data = useMemo(() => parseSubagentRowData(message), [message])
	const executionDiff = useMemo(() => buildLatestExecutionDiff(dietcodeMessages), [dietcodeMessages])

	if (!data) {
		return <div className="text-foreground opacity-80">Couldn't show helper status just now.</div>
	}

	const resumedBeforeNextVisibleMessage =
		isLast && lastModifiedMessage?.say === "api_req_started" && (lastModifiedMessage.ts ?? 0) > message.ts

	const wasCancelled =
		data.status === "running" &&
		(!isLast ||
			lastModifiedMessage?.ask === "resume_task" ||
			lastModifiedMessage?.ask === "resume_completed_task" ||
			resumedBeforeNextVisibleMessage)

	const singular = data.items.length === 1
	const title = data.modStage
		? "Mixture of Designers:"
		: singular
			? "I could use a little extra help here:"
			: "A few helpers could explore this together:"
	const isPromptConstructionRow = message.ask === "use_subagents" || message.say === "use_subagents"
	const toggleItem = (index: number) => {
		setExpandedItems((prev) => ({
			...prev,
			[index]: !prev[index],
		}))
	}
	const togglePrompt = (index: number) => {
		setExpandedPrompts((prev) => ({
			...prev,
			[index]: !prev[index],
		}))
	}

	const timelineStatus: DietCodeSaySubagentStatus | undefined =
		message.say === "subagent" && data.swarmId
			? {
					status: data.status === "pending" ? "running" : data.status,
					total: data.items.length,
					completed: data.items.filter((item) => item.status === "completed" || item.status === "failed").length,
					successes: data.items.filter((item) => item.status === "completed").length,
					failures: data.items.filter((item) => item.status === "failed").length,
					toolCalls: data.items.reduce((acc, item) => acc + (item.toolCalls || 0), 0),
					inputTokens: data.items.reduce((acc, item) => acc + (item.inputTokens || 0), 0),
					outputTokens: data.items.reduce((acc, item) => acc + (item.outputTokens || 0), 0),
					contextWindow: data.items.reduce((acc, item) => Math.max(acc, item.contextWindow || 0), 0),
					maxContextTokens: data.items.reduce((acc, item) => Math.max(acc, item.contextTokens || 0), 0),
					maxContextUsagePercentage: data.items.reduce(
						(acc, item) => Math.max(acc, item.contextUsagePercentage || 0),
						0,
					),
					items: data.items,
					swarmId: data.swarmId,
					continuityMarker: data.continuityMarker,
					artifactPath: data.artifactPath,
					invariantViolations: data.invariantViolations,
				}
			: undefined

	return (
		<div className="mb-2">
			<div className="flex items-center gap-2.5 mb-3 flex-wrap">
				<NetworkIcon className="size-2 text-foreground" />
				<span className="font-medium text-foreground">{title}</span>
				<ParentAuditGateBadge />
				{data.modStage && (
					<ExecutionStateBadge
						className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25"
						label={`${MOD_STAGE_LABELS[data.modStage] || data.modStage} (${data.modProgress ?? 0}%)`}
					/>
				)}
				{data.continuityMarker && (
					<ExecutionStateBadge
						className="bg-foreground/10 text-foreground/80 border-foreground/20"
						label={`continuity ${data.continuityMarker.completedAgents}/${data.continuityMarker.totalAgents}`}
					/>
				)}
				{data.artifactPath && (
					<ExecutionStateBadge className="bg-link/10 text-link border-link/20" label="replay artifact" />
				)}
			</div>
			{timelineStatus && <SubagentExecutionTimeline status={timelineStatus} />}
			{data.governedReceipt && <GovernedReceiptPanel receipt={data.governedReceipt} />}
			{isLast && executionDiff && data.swarmId === executionDiff.diff.rightArtifactId && (
				<SubagentExecutionDiffViewer
					diff={executionDiff.diff}
					leftLabel={executionDiff.leftLabel}
					rightLabel={executionDiff.rightLabel}
				/>
			)}
			<div className="space-y-2">
				{data.items.map((entry, index) => {
					const displayStatus: DisplayStatus =
						wasCancelled && (entry.status === "running" || entry.status === "pending") ? "cancelled" : entry.status
					const hasDetails = Boolean(
						(entry.result && entry.status === "completed") ||
							(entry.error && entry.status === "failed") ||
							(entry.toolSteps?.length || 0) > 0 ||
							(entry.blockers?.length || 0) > 0,
					)
					const isExpanded = expandedItems[entry.index] === true
					const isStreamingPromptUnderConstruction =
						isPromptConstructionRow && message.partial === true && index === data.items.length - 1
					const shouldShowStats = !isStreamingPromptUnderConstruction && !data.modStage
					const statsText = `${formatCount(entry.toolCalls)} steps · ${formatCount(entry.contextTokens)} tokens · ${formatCost(entry.totalCost)}`
					const latestToolCallText = entry.latestToolCall?.trim() || ""
					return (
						<div
							className="rounded-xs border border-editor-group-border px-2 py-1.5"
							key={entry.index}
							style={{ backgroundColor: "var(--vscode-editor-background)" }}>
							<div className="flex items-start gap-2">
								{statusIcon(displayStatus, Boolean(data.modStage))}
								<div className="min-w-0 flex-1">
									<SubagentPromptText
										isExpanded={expandedPrompts[entry.index] === true}
										onToggle={() => togglePrompt(entry.index)}
										prompt={entry.prompt}
									/>
								</div>
							</div>
							{shouldShowStats && (
								<div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] min-w-0">
									<span className="opacity-70 whitespace-pre-wrap break-words">{statsText}</span>
									{entry.confidence && (
										<ExecutionStateBadge
											className={confidenceBadgeClass(entry.confidence)}
											label={`confidence ${entry.confidence}`}
										/>
									)}
									{(entry.blockers?.length || 0) > 0 && (
										<ExecutionStateBadge
											className="bg-error/15 text-error border-error/25"
											label={`${entry.blockers?.length} blocker${entry.blockers!.length === 1 ? "" : "s"}`}
										/>
									)}
									{(entry.evidenceCount || 0) > 0 && (
										<ExecutionStateBadge
											className="bg-link/10 text-link border-link/20"
											label={`${entry.evidenceCount} evidence`}
										/>
									)}
									{entry.criticalSignals && entry.criticalSignals.length > 0 && (
										<div className="flex flex-wrap gap-1">
											{entry.criticalSignals.map((signal) => {
												const isParent = isParentGateSignal(signal)
												const label = isParent ? formatSubagentParentSignal(signal) : signal
												return (
													<span
														className={
															isParent
																? "px-1 py-0 rounded-[2px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-[9px] border border-amber-500/25"
																: "px-1 py-0 rounded-[2px] bg-foreground/10 text-foreground/80 font-mono text-[9px]"
														}
														key={signal}
														title={isParent ? "Parent audit handoff signal" : undefined}>
														{label}
													</span>
												)
											})}
										</div>
									)}
								</div>
							)}
							{shouldShowStats && hasDetails && (
								<button
									aria-label={isExpanded ? "Hide subagent output" : "Show subagent output"}
									className="mt-1 text-[11px] opacity-80 flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer text-left text-foreground w-full"
									onClick={() => toggleItem(entry.index)}
									type="button">
									{isExpanded ? (
										<ChevronDownIcon className="size-2 shrink-0" />
									) : (
										<ChevronRightIcon className="size-2 shrink-0" />
									)}
									<span className="shrink-0">{isExpanded ? "Hide output" : "Show output"}</span>
								</button>
							)}
							{data.modStage && (
								<div className="mt-2.5 space-y-2 border-t border-purple-500/20 pt-2">
									<div className="flex items-center justify-between text-[10.5px]">
										<span className="font-semibold text-purple-200 flex items-center gap-1.5">
											<Sparkles className="size-3 text-purple-400 animate-pulse shrink-0" />
											<span>{MOD_STAGE_LABELS[data.modStage] || data.modStage}</span>
										</span>
										<span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
											{data.modProgress ?? 0}%
										</span>
									</div>
									{/* Visual Stepper */}
									<div className="grid grid-cols-5 gap-1 py-1">
										{MOD_PIPELINE_STEPS.map((s) => {
											const currentStep = getModPipelineStep(data.modStage!)
											const isCurrent = s.step === currentStep
											const isPassed =
												s.step < currentStep ||
												data.modStage === "completed" ||
												data.modStage === "completed-with-limitations"
											return (
												<div className="space-y-1" key={s.step}>
													<div
														className={`h-1 rounded-full transition-all duration-300 ${
															isPassed
																? "bg-emerald-400"
																: isCurrent
																	? "bg-gradient-to-r from-purple-400 to-lumi animate-pulse"
																	: "bg-purple-950/40 border border-purple-900/30"
														}`}
													/>
													<span
														className={`block text-[7.5px] truncate font-medium text-center ${
															isCurrent
																? "text-purple-200 font-semibold"
																: isPassed
																	? "text-emerald-400/80"
																	: "text-description/40"
														}`}>
														{s.label}
													</span>
												</div>
											)
										})}
									</div>
									{latestToolCallText && (
										<div className="text-[10px] opacity-90 text-description flex items-center gap-1 font-mono min-w-0 bg-[#161424] p-1.5 rounded border border-purple-500/20">
											<ChevronRightIcon className="size-3 text-purple-400 shrink-0" />
											<span className="truncate">{latestToolCallText}</span>
										</div>
									)}

									{/* Glassbox Council Lenses */}
									{data.modGlassbox?.specialists && data.modGlassbox.specialists.length > 0 && (
										<div className="flex flex-wrap gap-1 pt-1">
											{data.modGlassbox.specialists.map((sp) => (
												<span
													className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-medium bg-purple-950/60 text-purple-200 border border-purple-500/30"
													key={sp.role}
													title={sp.focus}>
													<Sparkles className="size-2 text-purple-400 shrink-0" />
													<span>{sp.role}</span>
												</span>
											))}
										</div>
									)}

									{/* Glassbox Locked Decisions */}
									{data.modGlassbox?.decisions && data.modGlassbox.decisions.length > 0 && (
										<div className="rounded border border-purple-500/30 bg-[#141220] p-1.5 space-y-1 text-[9px]">
											<div className="font-semibold text-purple-200 flex items-center justify-between">
												<span>🔒 Locked Design Decisions ({data.modGlassbox.decisions.length})</span>
											</div>
											<div className="space-y-1">
												{data.modGlassbox.decisions.map((dec) => (
													<div
														className="flex items-start justify-between gap-1 text-description/90 border-b border-purple-500/10 pb-0.5"
														key={dec.id}>
														<span className="font-medium text-purple-300 truncate">{dec.title}</span>
														{dec.targetFiles && dec.targetFiles.length > 0 && (
															<span className="text-[8px] font-mono px-1 rounded bg-purple-950/80 text-purple-300 shrink-0">
																{dec.targetFiles.slice(0, 2).join(", ")}
															</span>
														)}
													</div>
												))}
											</div>
										</div>
									)}

									{/* Glassbox Mutation Tasks */}
									{data.modGlassbox?.tasks && data.modGlassbox.tasks.length > 0 && (
										<div className="rounded border border-emerald-500/30 bg-[#121c1a] p-1.5 space-y-1 text-[9px]">
											<div className="font-semibold text-emerald-300 flex items-center justify-between">
												<span>⚡ Governed Code Mutations ({data.modGlassbox.tasks.length})</span>
											</div>
											<div className="space-y-1">
												{data.modGlassbox.tasks.map((task) => (
													<div
														className="flex items-center justify-between gap-1 text-emerald-200/90"
														key={task.id}>
														<span className="truncate">{task.objective}</span>
														<span
															className={`text-[8px] font-mono px-1 rounded uppercase shrink-0 ${task.status === "completed" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
															{task.status}
														</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Glassbox Quality Gates Matrix */}
									{data.modGlassbox?.gates && data.modGlassbox.gates.length > 0 && (
										<div className="rounded border border-sky-500/30 bg-[#101a24] p-1.5 space-y-1 text-[9px]">
											<div className="font-semibold text-sky-300 flex items-center justify-between">
												<span>
													🛡️ Gate Audit Matrix ({data.modGlassbox.gates.filter((g) => g.passed).length}/
													{data.modGlassbox.gates.length} Passed)
												</span>
											</div>
											<div className="grid grid-cols-2 gap-1">
												{data.modGlassbox.gates.map((g) => (
													<div
														className="flex items-center justify-between gap-1 text-[8.5px] px-1 py-0.5 rounded bg-sky-950/40"
														key={g.gate}>
														<span className="truncate text-sky-200">{g.gate}</span>
														<span
															className={
																g.passed ? "text-emerald-400 font-bold" : "text-amber-400"
															}>
															{g.passed ? "✓" : "⏳"}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}
							{shouldShowStats && !hasDetails && latestToolCallText && (
								<div className="mt-1 text-[10px] opacity-70 min-w-0 truncate font-mono">{latestToolCallText}</div>
							)}
							{isExpanded && <SubagentEvidencePanel entry={entry} />}
							<SubagentCompactionBoundary entry={entry} />
							{isExpanded && !entry.toolSteps?.length && entry.result && entry.status === "completed" && (
								<div className="mt-2 text-xs opacity-80 wrap-anywhere overflow-hidden">
									<MarkdownBlock markdown={entry.result} />
								</div>
							)}
							{isExpanded && !entry.toolSteps?.length && entry.error && entry.status === "failed" && (
								<div className="mt-2 text-xs text-error whitespace-pre-wrap break-words">{entry.error}</div>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
