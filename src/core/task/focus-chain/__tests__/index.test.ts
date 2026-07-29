import { isCompletedFocusChainItem, isFocusChainItem, parseFocusChainItem } from "@shared/focus-chain-utils"
import { expect } from "chai"
import { FocusChainPrompts } from "../prompts"
import { createFocusChainProgressGuidance, mergeFocusChainChecklists, parseFocusChainListCounts } from "../utils"

describe("focus-chain progress guidance", () => {
	it("uses completion guidance when every progress item is done", () => {
		const instructions = createFocusChainProgressGuidance({
			totalItems: 2,
			completedItems: 2,
			currentFocusChainChecklist: "- [x] Audit the current behavior\n- [x] Validate the finished change",
		})

		expect(instructions).to.contain("All 2 items have been completed")
		expect(instructions).not.to.contain("Focus on finishing the remaining items")
	})

	it("keeps plan-mode checklist guidance optional", () => {
		expect(FocusChainPrompts.planModeReminder).to.contain("Optional - Plan Mode")
		expect(FocusChainPrompts.planModeReminder).to.contain("you may include a preliminary todo list")
	})
})

describe("mergeFocusChainChecklists", () => {
	it("merges proposed list checked items into user updated list", () => {
		const currentList = "- [ ] Implement collision handling\n- [ ] Add new kart models\n- [ ] User added item"
		const proposedList = "- [x] Implement collision handling\n- [ ] Add new kart models"
		const result = mergeFocusChainChecklists(currentList, proposedList)

		expect(result).to.equal("- [x] Implement collision handling\n- [ ] Add new kart models\n- [ ] User added item")
	})

	it("keeps user checklist updates intact if proposed list does not check anything", () => {
		const currentList = "- [ ] Implement collision handling\n- [ ] Add new kart models\n- [ ] User added item"
		const proposedList = "- [ ] Implement collision handling\n- [ ] Add new kart models"
		const result = mergeFocusChainChecklists(currentList, proposedList)

		expect(result).to.equal(currentList)
	})

	it("appends newly proposed items that are not in current list", () => {
		const currentList = "- [ ] Implement collision handling\n- [ ] User added item"
		const proposedList = "- [x] Implement collision handling\n- [ ] Newly proposed item"
		const result = mergeFocusChainChecklists(currentList, proposedList)

		expect(result).to.equal("- [x] Implement collision handling\n- [ ] User added item\n- [ ] Newly proposed item")
	})

	it("merges correctly with whitespace/case variation in matching", () => {
		const currentList = "- [ ]  Implement   collision handling \n- [ ] User added item"
		const proposedList = "- [x] implement collision handling"
		const result = mergeFocusChainChecklists(currentList, proposedList)

		expect(result).to.equal("- [x]  Implement   collision handling \n- [ ] User added item")
	})

	it("handles indented sub-items and alternative GFM bullet styles (*, +, 1.)", () => {
		const currentList = "  * [ ] Indented asterisk subtask\n  1. [ ] Numbered item\n  + [ ] Plus bullet"
		const proposedList = "  * [x] Indented asterisk subtask\n  1. [x] Numbered item"
		const result = mergeFocusChainChecklists(currentList, proposedList)

		expect(result).to.contain("  * [x] Indented asterisk subtask")
		expect(result).to.contain("  1. [x] Numbered item")
		expect(result).to.contain("  + [ ] Plus bullet")
	})
})

describe("GFM Standard Focus Chain Pattern Matching", () => {
	it("parses all standard GFM list markers and leading indentation", () => {
		const items = [
			"- [ ] Hyphen incomplete",
			"- [x] Hyphen complete",
			"* [ ] Asterisk incomplete",
			"* [X] Asterisk complete uppercase",
			"+ [ ] Plus incomplete",
			"+ [x] Plus complete",
			"1. [ ] Numbered dot incomplete",
			"1) [x] Numbered paren complete",
			"  - [x] Indented item",
		]

		for (const item of items) {
			expect(isFocusChainItem(item)).to.equal(true, `Failed for item: ${item}`)
		}

		expect(isCompletedFocusChainItem("- [x] Done")).to.equal(true)
		expect(isCompletedFocusChainItem("* [X] Done")).to.equal(true)
		expect(isCompletedFocusChainItem("  + [x] Done")).to.equal(true)
		expect(isCompletedFocusChainItem("1. [ ] Not Done")).to.equal(false)

		const parsedIndented = parseFocusChainItem("  - [x] Indented task")
		expect(parsedIndented).to.deep.equal({ checked: true, text: "Indented task" })
	})

	it("accurately counts list progress with mixed GFM markers and indentation", () => {
		const list = `
# Progress Checklist
- [x] Setup environment
  * [x] Install dependencies
  * [ ] Configure linter
+ [x] Implement features
1. [ ] Run verification tests
`
		const counts = parseFocusChainListCounts(list)
		expect(counts.totalItems).to.equal(5)
		expect(counts.completedItems).to.equal(3)
	})
})
