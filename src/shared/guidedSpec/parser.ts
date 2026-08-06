import type { BreadboardSpec, DecisionOption, GuidedSpecState, Milestone } from "./types"

/**
 * Output Stream Parser for Guided Spec Mode (AUTO mode).
 * Extracts GuidedSpecState from raw model text streams.
 */
export function parseGuidedSpecOutput(rawText: string): GuidedSpecState {
	const defaultOptionA: DecisionOption = {
		id: "option_a",
		label: "Option A (Recommended)",
		description: "Proceed with default visual configuration and implementation.",
		isDefault: true,
		payload: { choice: "option_a" },
	}

	const defaultOptionB: DecisionOption = {
		id: "option_b",
		label: "Option B (Alternative)",
		description: "Select alternative configuration.",
		isDefault: false,
		payload: { choice: "option_b" },
	}

	const defaultState: GuidedSpecState = {
		active: true,
		currentPhase: "DISCOVERY",
		breadboard: {
			place: "Main Workspace Surface",
			affordances: ["View active layout & components"],
			wiring: ["Interactions update visual state"],
		},
		milestones: [
			{ id: 1, title: "Core Surface & Layout", userValue: "Initial layout rendering", status: "in_progress" },
			{ id: 2, title: "Interactive Controls & Triggers", userValue: "Interactivity and affordances", status: "pending" },
			{ id: 3, title: "Polish & Edge Case Armor", userValue: "Visual hardening & accessibility", status: "pending" },
		],
		activeProbingCard: {
			question: "Review specification map and choose execution pathway:",
			options: [defaultOptionA, defaultOptionB],
		},
	}

	if (!rawText || typeof rawText !== "string") {
		return defaultState
	}

	// 1. Try JSON extraction first
	const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*"breadboard"[\s\S]*\})/)
	if (jsonMatch) {
		try {
			const parsed = JSON.parse(jsonMatch[1])
			if (parsed && typeof parsed === "object" && parsed.breadboard) {
				return {
					active: true,
					currentPhase: parsed.currentPhase || "DISCOVERY",
					breadboard: {
						place: parsed.breadboard.place || defaultState.breadboard.place,
						affordances: Array.isArray(parsed.breadboard.affordances)
							? parsed.breadboard.affordances
							: defaultState.breadboard.affordances,
						wiring: Array.isArray(parsed.breadboard.wiring)
							? parsed.breadboard.wiring
							: defaultState.breadboard.wiring,
					},
					milestones: Array.isArray(parsed.milestones) ? parsed.milestones : defaultState.milestones,
					activeProbingCard: parsed.activeProbingCard || defaultState.activeProbingCard,
				}
			}
		} catch {
			// Fallthrough to text block parsing
		}
	}

	// 2. Parse 4-Block Visual Layout
	const breadboard: BreadboardSpec = { ...defaultState.breadboard }
	const milestones: Milestone[] = []
	let options: [DecisionOption, DecisionOption] = [defaultOptionA, defaultOptionB]
	let question = "How would you like to proceed with this milestone?"

	// --- Block 1: Breadboard Spec ---
	const placeMatch =
		rawText.match(/(?:📍\s*)?(?:SCREEN\s*\/\s*PLACE|Main Screen|Place|Screen):\s*([^\n\r]+)/iu) ||
		rawText.match(/Visual Layout Map[^:\n]*:\s*([^\n\r]+)/i)
	if (placeMatch?.[1]) {
		breadboard.place = placeMatch[1].trim()
	}

	const affordancesMatch = rawText.match(
		/(?:🔘\s*)?(?:WHAT YOU CAN DO \(AFFORDANCES\)|What You See & Do|Affordances):([\s\S]*?)(?=(?:⚡|✈️|🎛️|###|\[DONE\]|\[IN PROGRESS\]|\[ACTIVE\]|\[PENDING\]|Option A|$))/iu,
	)
	if (affordancesMatch?.[1]) {
		const items = affordancesMatch[1]
			.split("\n")
			.map((line) => line.replace(/^(?:[\s•\-*]|📍|🔘|⚡)+/iu, "").trim())
			.filter((line) => line.length > 0)
		if (items.length > 0) {
			breadboard.affordances = items
		}
	}

	const wiringMatch = rawText.match(
		/(?:⚡\s*)?(?:WHAT HAPPENS \(WIRING\)|What Happens|Wiring):([\s\S]*?)(?=(?:✈️|🎛️|###|\[DONE\]|\[IN PROGRESS\]|\[ACTIVE\]|\[PENDING\]|Option A|$))/iu,
	)
	if (wiringMatch?.[1]) {
		const items = wiringMatch[1]
			.split("\n")
			.map((line) => line.replace(/^(?:[\s•\-*]|📍|🔘|⚡)+/iu, "").trim())
			.filter((line) => line.length > 0)
		if (items.length > 0) {
			breadboard.wiring = items
		}
	}

	// --- Block 2: Milestone Stepper ---
	const milestoneRegex =
		/(?:[•\-*]\s*)?\[(DONE|IN PROGRESS|ACTIVE|PENDING|COMPLETED)\]\s*(?:Milestone\s*(\d+):?\s*)?([^\n\r]+)/gi
	let milestoneMatch: RegExpExecArray | null = milestoneRegex.exec(rawText)
	let idCounter = 1

	while (milestoneMatch !== null) {
		const rawStatus = (milestoneMatch[1] || "").toUpperCase()
		const parsedId = milestoneMatch[2] ? Number.parseInt(milestoneMatch[2], 10) : idCounter
		const titleText = (milestoneMatch[3] || "").trim()

		let status: "pending" | "in_progress" | "completed" = "pending"
		if (rawStatus === "DONE" || rawStatus === "COMPLETED") {
			status = "completed"
		} else if (rawStatus === "IN PROGRESS" || rawStatus === "ACTIVE") {
			status = "in_progress"
		}

		milestones.push({
			id: parsedId,
			title: titleText || `Milestone ${parsedId}`,
			userValue: titleText,
			status,
		})

		idCounter++
		milestoneMatch = milestoneRegex.exec(rawText)
	}

	// --- Block 3: Decision Waypoint ---
	const questionMatch = rawText.match(
		/(?:🎛️\s*)?(?:DECISION WAYPOINT|WAYPOINT CHECK-IN)[^\n\r]*[\r\n]+([\s\S]*?)(?=Option A|\[\s*\[A\]|$)/iu,
	)
	if (questionMatch?.[1]) {
		const cleanedQ = questionMatch[1]
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
			.join(" ")
		if (cleanedQ) {
			question = cleanedQ
		}
	}

	const optAMatch =
		rawText.match(/(?:-\s*)?Option A\s*(?:\(Recommended Default\)|\(Recommended\))?:?\s*([^\n\r]+)/i) ||
		rawText.match(/\[\s*\[A\]\s*([^\]]+)\]/i)
	const optBMatch =
		rawText.match(/(?:-\s*)?Option B\s*(?:\(Alternative\))?:?\s*([^\n\r]+)/i) || rawText.match(/\[\s*\[B\]\s*([^\]]+)\]/i)

	if (optAMatch || optBMatch) {
		const optAText = optAMatch ? optAMatch[1].trim() : "Proceed with Defaults (Recommended)"
		const optBText = optBMatch ? optBMatch[1].trim() : "Select Alternative Options"

		options = [
			{
				id: "option_a",
				label: "Option A (Recommended Default)",
				description: optAText,
				isDefault: true,
				payload: { choice: "option_a", text: optAText },
			},
			{
				id: "option_b",
				label: "Option B (Alternative)",
				description: optBText,
				isDefault: false,
				payload: { choice: "option_b", text: optBText },
			},
		]
	}

	// Phase determination
	let currentPhase: "DISCOVERY" | "SPEC_LOCK" | "MILESTONE_EXEC" | "HANDOFF" = "DISCOVERY"

	if (rawText.includes("STATE 4: HANDOFF") || rawText.includes("HANDOFF")) {
		currentPhase = "HANDOFF"
	} else if (rawText.includes("STATE 3: MILESTONE EXEC") || rawText.includes("MILESTONE EXEC")) {
		currentPhase = "MILESTONE_EXEC"
	} else if (rawText.includes("STATE 2: SPEC LOCK") || rawText.includes("SPEC LOCK")) {
		currentPhase = "SPEC_LOCK"
	} else if (rawText.includes("STATE 1: DISCOVERY") || rawText.includes("DISCOVERY")) {
		currentPhase = "DISCOVERY"
	} else if (milestones.length > 0) {
		const allDone = milestones.every((m) => m.status === "completed")
		const anyActive = milestones.some((m) => m.status === "in_progress")
		if (allDone) {
			currentPhase = "HANDOFF"
		} else if (anyActive) {
			currentPhase = "MILESTONE_EXEC"
		} else {
			currentPhase = "SPEC_LOCK"
		}
	}

	return {
		active: true,
		currentPhase,
		breadboard,
		milestones: milestones.length > 0 ? milestones : defaultState.milestones,
		activeProbingCard: {
			question,
			options,
		},
	}
}
