import { DesignDecision, DesignImplementationTask } from "./types"

export interface UXRegressionRiskReport {
	score: number // 0 - 100 (0 = zero risk, 100 = critical risk)
	riskLevel: "low" | "medium" | "high" | "critical"
	riskFactors: string[]
	mitigationRecommendations: string[]
}

/**
 * Predictive UX Regression Risk Calculator
 * Evaluates proposed decisions and tasks to prevent breaking existing user flows or layout regressions.
 */
export class UXRegressionRiskCalculator {
	public calculateRisk(decisions: DesignDecision[], tasks: DesignImplementationTask[]): UXRegressionRiskReport {
		let score = 0
		const riskFactors: string[] = []
		const mitigations: string[] = []

		for (const dec of decisions) {
			const decLower = dec.decision.toLowerCase()
			if (decLower.includes("remove") || decLower.includes("deprecate") || decLower.includes("delete")) {
				score += 30
				riskFactors.push(`Removal of existing feature/flow in decision: ${dec.decision}`)
				mitigations.push("Ensure deprecation path and feature flags are in place before removing component.")
			}
			if (decLower.includes("layout") || decLower.includes("refactor") || decLower.includes("grid")) {
				score += 20
				riskFactors.push(`Structural layout refactor in decision: ${dec.decision}`)
				mitigations.push("Run visual regression checks across viewport breakpoints.")
			}
		}

		for (const task of tasks) {
			if (task.affectedFiles.length > 5) {
				score += 15
				riskFactors.push(`Task ${task.id} affects >5 files (${task.affectedFiles.length} files)`)
				mitigations.push("Split wide task into disjoint micro-tasks.")
			}
			if (!task.rollbackNotes || task.rollbackNotes.length === 0) {
				score += 10
				riskFactors.push(`Task ${task.id} lacks rollback instructions`)
				mitigations.push("Provide explicit rollback procedure notes for task.")
			}
		}

		const boundedScore = Math.min(100, score)
		const riskLevel: UXRegressionRiskReport["riskLevel"] =
			boundedScore >= 65 ? "critical" : boundedScore >= 40 ? "high" : boundedScore >= 20 ? "medium" : "low"

		return {
			score: boundedScore,
			riskLevel,
			riskFactors,
			mitigationRecommendations: mitigations,
		}
	}
}
