import { DietCodeDefaultTool } from "@shared/tools"
import { expect } from "chai"
import sinon from "sinon"
import {
	bindTaskLifecycleAuthority,
	createInMemoryTaskLifecycleFunnel,
	getTaskLifecycleAuthority,
} from "../../../lifecycle/TaskLifecycleFunnel"
import { TaskState } from "../../../TaskState"
import { AttemptCompletionHandler } from "../AttemptCompletionHandler"

describe("AttemptCompletionHandler - task_progress parameter handling", () => {
	let handler: AttemptCompletionHandler
	let mockConfig: any

	beforeEach(async () => {
		handler = new AttemptCompletionHandler()
		const taskState = new TaskState()
		bindTaskLifecycleAuthority(taskState, createInMemoryTaskLifecycleFunnel())
		const authority = getTaskLifecycleAuthority(taskState)
		await authority.ensureActive(taskState, "test-task-123", {
			source: "test",
			reason: "Active lifecycle for test",
		})
		taskState.currentFocusChainChecklist = "- [x] Step 1"

		mockConfig = {
			taskId: "test-task-123",
			ulid: "01HXXXXXXX",
			cwd: "/workspace",
			mode: "act",
			focusChainSettings: {
				enabled: true,
			},
			auditCompletionGateEnabled: false,
			auditWorkspaceArtifactsEnabled: false,
			taskState,
			callbacks: {
				sayAndCreateMissingParamError: async () => "error",
				say: sinon.stub().resolves(undefined),
				updateFCListFromToolResponse: sinon.stub().resolves(undefined),
				ask: sinon.stub().resolves({ response: "yesButtonTapped" }),
			},
			messageState: {
				getDietCodeMessages: () => [],
			},
			services: {
				stateManager: {
					getApiConfiguration: () => ({
						actModeApiProvider: "test-provider",
					}),
				},
			},
			api: {
				getModel: () => ({ id: "test-model" }),
			},
		}
	})

	it("passes task_progress parameter to completion funnel validation", async () => {
		const block = {
			call_id: "call_123",
			name: DietCodeDefaultTool.ATTEMPT,
			params: {
				result: "Completed all task requirements successfully.",
				task_progress: "- [x] Step 1",
			},
		}

		const result = await handler.execute(mockConfig, block as any)

		// Verification: when task_progress parameter is passed, completion succeeds instead of soft-blocking with missing task_progress
		expect(mockConfig.callbacks.updateFCListFromToolResponse.calledWith("- [x] Step 1")).to.equal(true)
		if (typeof result === "string") {
			expect(result).to.contain("[attempt_completion] Result: Done")
		} else {
			expect(result).to.have.property("kind", "continuation")
		}
	})
})
