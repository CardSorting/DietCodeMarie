export interface DecisionOption {
	id: string
	label: string
	description: string
	isDefault: boolean
	payload: Record<string, unknown>
}

export interface BreadboardSpec {
	place: string
	affordances: string[]
	wiring: string[]
}

export interface Milestone {
	id: number
	title: string
	userValue: string
	status: "pending" | "in_progress" | "completed"
}

export interface GuidedSpecState {
	active: boolean
	currentPhase: "DISCOVERY" | "SPEC_LOCK" | "MILESTONE_EXEC" | "HANDOFF"
	breadboard: BreadboardSpec
	milestones: Milestone[]
	activeProbingCard: {
		question: string
		options: [DecisionOption, DecisionOption]
	}
}
