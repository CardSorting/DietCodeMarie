import type { DietCodeSaySubagentStatus, SubagentStatusItem } from "@shared/ExtensionMessage"
import { CheckIcon, CircleXIcon, LoaderCircleIcon, Sparkles } from "lucide-react"

interface SubagentExecutionTimelineProps {
	status: DietCodeSaySubagentStatus
}

type TimelinePhase = "spawned" | "running" | "tooling" | "completed" | "failed"

const MOD_TIMELINE_LABELS: Record<string, string> = {
	initializing: "Initializing Council",
	intent: "Analyzing Intent",
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

function resolvePhase(entry: SubagentStatusItem): TimelinePhase {
	if (entry.status === "completed") return "completed"
	if (entry.status === "failed") return "failed"
	if ((entry.toolCalls || 0) > 0 || entry.latestToolCall) return "tooling"
	if (entry.status === "running") return "running"
	return "spawned"
}

const phaseLabel: Record<TimelinePhase, string> = {
	spawned: "Spawned",
	running: "Running",
	tooling: "Tooling",
	completed: "Completed",
	failed: "Failed",
}

const phaseIcon = (phase: TimelinePhase, isMod = false) => {
	if (isMod && (phase === "running" || phase === "tooling")) {
		return <Sparkles className="size-2.5 text-purple-400 animate-pulse shrink-0" />
	}
	switch (phase) {
		case "completed":
			return <CheckIcon className="size-2 text-success shrink-0" />
		case "failed":
			return <CircleXIcon className="size-2 text-error shrink-0" />
		case "running":
		case "tooling":
			return <LoaderCircleIcon className="size-2 text-link shrink-0 animate-spin" />
		default:
			return <span className="size-2 rounded-full bg-foreground/30 shrink-0 inline-block" />
	}
}

export function SubagentExecutionTimeline({ status }: SubagentExecutionTimelineProps) {
	return (
		<div className="mb-2 rounded-xs border border-purple-500/20 bg-[#141220]/60 px-2 py-1.5 text-[11px]">
			<div className="flex flex-wrap items-center gap-2 mb-2 opacity-80">
				<span className="font-medium text-purple-200">Council Timeline</span>
				{status.swarmId && (
					<span className="font-mono opacity-70 text-purple-300">swarm:{status.swarmId.slice(0, 8)}</span>
				)}
				{status.continuityMarker && (
					<span className="font-mono opacity-70">
						{status.continuityMarker.completedAgents}/{status.continuityMarker.totalAgents} agents
					</span>
				)}
			</div>
			<div className="space-y-1">
				{status.items.map((entry) => {
					const phase = resolvePhase(entry)
					const isMod = entry.id?.startsWith("mod-") || entry.name === "Mixture of Designers"
					const label = isMod ? MOD_TIMELINE_LABELS[entry.prompt] || phaseLabel[phase] : phaseLabel[phase]
					return (
						<div className="flex items-center gap-2 min-w-0" key={entry.index}>
							{phaseIcon(phase, isMod)}
							<span className="shrink-0 opacity-70">#{entry.index}</span>
							<span className="truncate opacity-90 font-medium text-purple-200">{label}</span>
							<span className="opacity-70 truncate font-mono text-[10px]">
								{entry.latestToolCall || entry.name}
							</span>
							{entry.evidenceCount !== undefined && entry.evidenceCount > 0 && (
								<span className="ml-auto shrink-0 opacity-60">{entry.evidenceCount} evidence</span>
							)}
						</div>
					)
				})}
			</div>
			{status.invariantViolations && status.invariantViolations.length > 0 && (
				<div className="mt-2 text-error whitespace-pre-wrap break-words">
					Invariant warnings: {status.invariantViolations.join("; ")}
				</div>
			)}
		</div>
	)
}
