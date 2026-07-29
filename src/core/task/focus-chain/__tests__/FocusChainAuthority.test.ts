import { expect } from "chai"
import sinon from "sinon"
import { TaskState } from "../../TaskState"
import { FocusChainAuthority, FocusChainAuthorityDependencies, FocusChainStatus } from "../FocusChainAuthority"
import { sanitizeChecklistLabel } from "../utils"

describe("FocusChainAuthority Monolithic Engine", () => {
	let authority: FocusChainAuthority
	let taskState: TaskState
	let mockDependencies: any

	beforeEach(() => {
		taskState = new TaskState()
		mockDependencies = {
			taskId: "test-task-123",
			taskState,
			mode: "act",
			stateManager: {
				getGlobalSettingsKey: sinon.stub().returns("act"),
			},
			postStateToWebview: sinon.stub().resolves(),
			say: sinon.stub().resolves(1),
			focusChainSettings: {
				enabled: true,
				remindDietcodeInterval: 6,
			},
		}
		authority = new FocusChainAuthority(mockDependencies as FocusChainAuthorityDependencies)
	})

	afterEach(() => {
		authority.dispose()
	})

	it("synchronizes tool response task_progress and mutates state atomically", async () => {
		const taskProgress = "- [x] Setup monolithic authority\n- [ ] Run validation tests"
		const result = await authority.syncToolResponse(taskProgress)

		expect(result).to.equal(taskProgress)
		expect(taskState.currentFocusChainChecklist).to.equal(taskProgress)
		expect(mockDependencies.say.calledWith("task_progress", taskProgress)).to.equal(true)
	})

	it("generates completed instructions without update nag when all items are 100% finished", () => {
		taskState.currentFocusChainChecklist = "- [x] Step 1\n- [x] Step 2"
		const instructions = authority.generateFocusChainInstructions()

		expect(instructions).to.contain("# TASK_PROGRESS COMPLETE")
		expect(instructions).not.to.contain("TASK_PROGRESS UPDATE REQUIRED")
	})

	it("resets focus chain state completely on resetState to prevent leakage", () => {
		taskState.currentFocusChainChecklist = "- [x] Finished item"
		taskState.todoListWasUpdatedByUser = true
		taskState.apiRequestsSinceLastTodoUpdate = 5

		authority.resetState()

		expect(taskState.currentFocusChainChecklist).to.be.null
		expect(taskState.todoListWasUpdatedByUser).to.equal(false)
		expect(taskState.apiRequestsSinceLastTodoUpdate).to.equal(0)
	})

	it("provides an immutable domain snapshot with correct FocusChainStatus state machine transitions", () => {
		// Idle state
		let snapshot = authority.getSnapshot()
		expect(snapshot.status).to.equal(FocusChainStatus.IDLE)
		expect(snapshot.isComplete).to.equal(false)

		// Active state
		taskState.currentFocusChainChecklist = "- [x] Task 1\n- [ ] Task 2"
		snapshot = authority.getSnapshot()
		expect(snapshot.status).to.equal(FocusChainStatus.ACTIVE)
		expect(snapshot.totalItems).to.equal(2)
		expect(snapshot.completedItems).to.equal(1)
		expect(snapshot.percentComplete).to.equal(50)
		expect(snapshot.isComplete).to.equal(false)

		// Completed state
		taskState.currentFocusChainChecklist = "- [x] Task 1\n- [x] Task 2"
		snapshot = authority.getSnapshot()
		expect(snapshot.status).to.equal(FocusChainStatus.COMPLETED)
		expect(snapshot.isComplete).to.equal(true)

		// Stale state
		taskState.currentFocusChainChecklist = "- [x] Task 1\n- [ ] Task 2"
		taskState.todoListWasUpdatedByUser = true
		snapshot = authority.getSnapshot()
		expect(snapshot.status).to.equal(FocusChainStatus.STALE)
	})

	it("sanitizes Markdown checklist item labels cleanly for fuzzy alignment", () => {
		const rawLabel = "<!-- comment --> Check [auth module](https://auth.org) and `tests` with **bold**"
		const sanitized = sanitizeChecklistLabel(rawLabel)
		expect(sanitized).to.equal("Check auth module and tests with bold")
	})
})
