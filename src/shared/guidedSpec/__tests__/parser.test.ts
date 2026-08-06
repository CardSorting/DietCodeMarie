import assert from "assert"
import { describe, it } from "mocha"
import { parseGuidedSpecOutput } from "../parser"

describe("parseGuidedSpecOutput", () => {
	it("parses end-to-end guided spec markdown output into GuidedSpecState", () => {
		const sampleOutput = `
# GUIDED SPEC MODE OVERLAY

📍 VISUAL LAYOUT MAP (BREADBOARD)
• Main Screen: Personal Coffee Budget Tracker
• What You See & Do: A large "Log Coffee ($5)" button, a monthly spent counter, and a progress bar toward a $50/week budget.
• What Happens: Tapping the button updates your total instantly and alerts you if you exceed your weekly limit.

✈️ PROGRESS WAYPOINT
• [ACTIVE] Milestone 1: Dashboard Surface & Single-Tap Logging Button
• [PENDING] Milestone 2: Price Customization & Custom Weekly Budget
• [PENDING] Milestone 3: Weekly History Log & Category Breakdown

🎛️ WAYPOINT CHECK-IN (Before We Build Milestone 1)
To keep logging fast while you're at the shop:
• Option A (Recommended Default): Button defaults to $5.00 (Standard Drink). Edit later.
• Option B (Alternative): Button prompts a quick choice between $3 (Drip), $5 (Latte), or $7 (Cold Brew).

[ [A] Proceed with Defaults (Recommended) ]  [ [B] Select Multi-Price Menu ]
`

		const state = parseGuidedSpecOutput(sampleOutput)

		assert.strictEqual(state.active, true)
		assert.strictEqual(state.breadboard.place, "Personal Coffee Budget Tracker")
		assert.ok(state.breadboard.affordances.length > 0)
		assert.ok(state.breadboard.wiring.length > 0)

		assert.strictEqual(state.milestones.length, 3)
		assert.strictEqual(state.milestones[0].status, "in_progress")
		assert.strictEqual(state.milestones[1].status, "pending")

		assert.strictEqual(state.activeProbingCard.options[0].isDefault, true)
		assert.ok(state.activeProbingCard.options[0].description.includes("defaults to $5.00"))
		assert.strictEqual(state.activeProbingCard.options[1].isDefault, false)
	})

	it("falls back to default DISCOVERY state for empty text", () => {
		const state = parseGuidedSpecOutput("")
		assert.strictEqual(state.active, true)
		assert.strictEqual(state.currentPhase, "DISCOVERY")
		assert.strictEqual(state.activeProbingCard.options.length, 2)
	})
})
