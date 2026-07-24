import { DesignDecision, DesignRefinement } from "./types"

export interface DesignDecisionRecord {
	id: string // e.g. "DDR-001"
	title: string
	status: "proposed" | "accepted" | "superseded" | "rejected"
	context: string
	decision: string
	rationale: string
	nonGoals: string[]
	consequences: {
		positive: string[]
		negative: string[]
	}
	benchmarkPattern?: string
	affectedAreas: string[]
	acceptanceCriteria: string[]
	createdAt: string
}

/**
 * Design Decision Record (DDR) Builder
 * Formalizes decision architecture records for team design governance, traceability, and maintenance.
 */
export class DesignDecisionRecordBuilder {
	public static createDDR(index: number, decision: DesignDecision, refinement?: DesignRefinement): DesignDecisionRecord {
		const formattedId = `DDR-${String(index).padStart(3, "0")}`
		return {
			id: formattedId,
			title: decision.decision.length > 60 ? `${decision.decision.slice(0, 57)}...` : decision.decision,
			status: decision.status === "accepted" ? "accepted" : decision.status === "superseded" ? "superseded" : "proposed",
			context: `Problem IDs: ${decision.problemIds.join(", ")}. Evidence: ${decision.evidence.join("; ")}`,
			decision: decision.decision,
			rationale: decision.rationale,
			nonGoals: refinement?.recommendation?.alternativesConsidered || [],
			consequences: {
				positive: decision.acceptanceCriteria,
				negative: decision.tradeoffs,
			},
			benchmarkPattern: refinement?.recommendation?.familiarPattern,
			affectedAreas: decision.affectedAreas,
			acceptanceCriteria: decision.acceptanceCriteria,
			createdAt: new Date().toISOString(),
		}
	}
}
