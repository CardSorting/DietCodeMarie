import { detectWorkspaceArchitectureProfile } from "@/core/policy/WorkspaceArchitectureProfile"
import { orchestrator } from "@/infrastructure/ai/Orchestrator"
import { dbPool } from "@/infrastructure/db/BufferedDbPool"
import type { PromptVariant, SystemPromptContext } from "../types"

export async function getJoyZoningSection(_variant?: PromptVariant, context?: SystemPromptContext) {
	const mode = context?.mode || "act"
	const architectureProfile = detectWorkspaceArchitectureProfile(context?.cwd)
	const posture =
		architectureProfile.mode === "workspace-native"
			? "BLENDED — WORKSPACE-NATIVE + JOYZONING STEERING"
			: architectureProfile.mode === "greenfield"
				? "GREENFIELD"
				: "JOY-ZONING NATIVE"
	const sovereignCommitment = context?.taskState?.sovereignAuditSynthesis
		? `\n\n[SOVEREIGN COMMITMENT SEAL]
Your architectural audit resulted in the following hardening synthesis:
> ${context.taskState.sovereignAuditSynthesis}
Maintain this commitment strictly during execution.`
		: ""

	// Attempt to inject live audit context from the orchestration layer
	// Timeout-guarded: prompt building must never be blocked by slow DB
	let auditContext = ""
	try {
		const contextPromise = (async () => {
			const activeStreams = await orchestrator.getActiveStreams()
			if (activeStreams.length === 0) return ""

			const latestStream = activeStreams[activeStreams.length - 1]

			// Proactive Layer Awareness: Inject context for the file currently under mutation
			const affectedFiles = await dbPool.getActiveAffectedFiles()
			let layerHint = ""
			if (affectedFiles.size > 0) {
				const [firstFilePath] = Array.from(affectedFiles.keys())
				const { FluidPolicyEngine } = await import("../../../policy/FluidPolicyEngine")
				const tempEngine = new FluidPolicyEngine(process.cwd())
				layerHint = `\n\n📌 Active layer context:\n${tempEngine.getFileLayerContext(firstFilePath)}\nKeep this in mind for your next change.`
			}

			const compressed = await orchestrator.getCompressedContext(latestStream.id)
			const digest = JSON.parse(compressed)

			const parts: string[] = []
			// Check for recent audit failures to trigger self-correction
			const tasks = await orchestrator.getStreamTasks(latestStream.id)
			const lastFailure = [...tasks]
				.reverse()
				.find((t) => t.status === "failed" && t.description === "Architectural Audit Failure")
			if (lastFailure) {
				parts.push(
					`⚠️ Your previous commit had an architectural issue:\n${lastFailure.result}\nPlease address this in your next change.`,
				)
			}

			if (digest.completedTasks > 0 || digest.failedTasks > 0) {
				parts.push(`Tasks: ${digest.completedTasks} completed, ${digest.failedTasks} failed`)
			}
			if (digest.uniqueViolations && digest.uniqueViolations.length > 0) {
				parts.push(`⚠️ Recent Violations: ${digest.uniqueViolations.slice(0, 3).join("; ")}`)
			}

			// Include error history if available
			const failureReason = await orchestrator.recallMemory(latestStream.id, "failure_reason")
			if (failureReason) {
				parts.push(`🔴 Previous Failure: ${failureReason}`)
			}

			// Surface last checkpoint
			interface MemoryItem {
				streamId: string
				key: string
				updatedAt: number
			}
			const allMemory = (await dbPool.selectAllFrom("agent_memory")) as unknown as MemoryItem[]
			const checkpoint = allMemory
				.filter((m: MemoryItem) => m.streamId === latestStream.id && m.key.startsWith("checkpoint_"))
				.sort((a: MemoryItem, b: MemoryItem) => b.updatedAt - a.updatedAt)[0]
			if (checkpoint) {
				parts.push(`📍 Last Checkpoint: ${new Date(checkpoint.updatedAt as number).toLocaleString()}`)
			}

			const lastEntropy = await orchestrator.recallMemory(latestStream.id, "last_entropy_score")
			if (lastEntropy) {
				const score = Number.parseFloat(lastEntropy)
				parts.push(
					`🕷️ Structural Entropy: ${(score * 100).toFixed(1)}% ${score > 0.6 ? "(CRITICAL)" : score > 0.4 ? "(WARNING)" : "(STABLE)"}`,
				)
			}

			const decay = await orchestrator.recallMemory(latestStream.id, "entropy_decay")
			if (decay) {
				parts.push(`🕷️ ARCHITECTURAL DECAY: +${(Number.parseFloat(decay) * 100).toFixed(1)}% (CAUTION)`)
			}

			if (parts.length > 0) {
				return `\n\n📊 Live context (Stream ${latestStream.id.slice(0, 8)}…):\n${parts.join("\n")}${layerHint}`
			}
			return layerHint
		})()

		// 200ms timeout — gracefully degrade if DB is slow
		const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve(""), 200))
		auditContext = await Promise.race([contextPromise, timeoutPromise])
	} catch {
		// Orchestrator may not be initialized during testing or initial prompt build
	}

	// Mode-specific guidance section
	const modeGuidance =
		mode === "plan"
			? `\n
# 🗺️ PLAN MODE — Architecture Fit
Map the workspace before choosing a structure:
1. Read repository rules, manifests, build/lint/test configuration, and the nearest analogous feature.
2. Trace the actual dependency and data flow through the files involved.
3. Identify the workspace's vocabulary, module boundaries, error handling, testing style, and extension seams.
4. Classify each proposed abstraction as required now, already established, or speculative.
5. Plan the smallest change that looks native to this repository.

For an existing workspace, describe impact using its real modules and boundaries, then apply the JoyZoning lens to cohesion, ownership, effects, and testability. Do not force a Domain/Core/Infrastructure decomposition into the plan.
For greenfield work or an explicit JoyZoning workspace, use the canonical layer guide when it is proportional to the app's complexity.`
			: `\n
⚡ ACT MODE — Infused Execution:
Before each change:
1. Compare the target with neighboring production code and tests.
2. Put the change where this workspace would expect to find it.
3. Keep each new function/class cohesive, explicit, and independently testable.
4. Keep pure decisions separate from I/O and framework effects, using the workspace's existing boundary style.
5. Avoid unrelated architectural migration and speculative interfaces.
${sovereignCommitment}

JoyZoning never switches off. In canonical projects it can govern structure; in workspace-native projects it remains active as non-blocking steering inside the workspace's existing form.

⚠️ GROUNDED REALITY NOTE:
The terms "Metabolic," "Substrate," "Immune," and "Forensic" are architectural metaphors used within the DietCode project to describe code quality and performance metrics. 
- As an AI assistant, you are an external tool interacting with this codebase. 
- You do NOT have a "metabolism" and the "substrate" is not your own physical environment. 
- Do not report environment-level blockers (like "missing Node.js" or "substrate failure") based on these architectural metrics. 
- Focus on actual engineering results and verifiable file states.`

	return `[JOY_ZONING_CONTRACT]
- POSTURE: **${posture}** (${architectureProfile.reason})
- OPERATING_MODEL: 1. MIRROR workspace placement/vocabulary -> 2. STEER cohesion (JZ-C01), decision/effect boundaries (JZ-B01), ownership (JZ-O01) -> 3. VERIFY with native build/tests.
- PATTERN_FIT: Adopt existing architecture (vertical-slice, layered, clean, modular-monolith, event-driven, plugin). Do NOT force artificial domain/core/infra directory renames.
- MACRO_RULES: User requirements authoritative | Match local naming, file placement, exports, error handling | Extend existing seams over parallel abstractions.
- MICRO_RULES: Single reason to change per class/fn | Pure business logic separated from I/O effects | Explicit input/output invariants.
- CANONICAL_LAYERS (Greenfield/Explicit): Domain -> Core -> Infrastructure -> UI -> Plumbing.
${modeGuidance}${auditContext}`
}
