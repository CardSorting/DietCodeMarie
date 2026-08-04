/**
 * The small set of services required to render and hydrate the shell.
 *
 * Keep this separate from the generated all-services client. Importing that
 * barrel eagerly pulls every protobuf schema into the first webview chunk.
 */
import { Boolean, Empty, EmptyRequest, StringArrayRequest, StringRequest } from "@shared/proto/dietcode/common"
import { State, TerminalProfiles } from "@shared/proto/dietcode/state"
import { TaskFavoriteRequest, TaskResponse } from "@shared/proto/dietcode/task"
import { DietCodeMessage } from "@shared/proto/dietcode/ui"
import type { Callbacks } from "./grpc-client-base"
import { ProtoBusClient } from "./grpc-client-base"

export class StateServiceClient extends ProtoBusClient {
	static override serviceName = "dietcode.StateService"

	static async getAvailableTerminalProfiles(request: EmptyRequest): Promise<TerminalProfiles> {
		return StateServiceClient.makeUnaryRequest(
			"getAvailableTerminalProfiles",
			request,
			EmptyRequest.toJSON,
			TerminalProfiles.fromJSON,
		)
	}

	static subscribeToState(request: EmptyRequest, callbacks: Callbacks<State>): () => void {
		return StateServiceClient.makeStreamingRequest(
			"subscribeToState",
			request,
			EmptyRequest.toJSON,
			State.fromJSON,
			callbacks,
		)
	}
}

export class TaskServiceClient extends ProtoBusClient {
	static override serviceName = "dietcode.TaskService"

	static async clearTask(request: EmptyRequest): Promise<Empty> {
		return TaskServiceClient.makeUnaryRequest("clearTask", request, EmptyRequest.toJSON, Empty.fromJSON)
	}

	static async deleteTasksWithIds(request: StringArrayRequest): Promise<Empty> {
		return TaskServiceClient.makeUnaryRequest("deleteTasksWithIds", request, StringArrayRequest.toJSON, Empty.fromJSON)
	}

	static async showTaskWithId(request: StringRequest): Promise<TaskResponse> {
		return TaskServiceClient.makeUnaryRequest("showTaskWithId", request, StringRequest.toJSON, TaskResponse.fromJSON)
	}

	static async toggleTaskFavorite(request: TaskFavoriteRequest): Promise<Empty> {
		return TaskServiceClient.makeUnaryRequest("toggleTaskFavorite", request, TaskFavoriteRequest.toJSON, Empty.fromJSON)
	}
}

export class UiServiceClient extends ProtoBusClient {
	static override serviceName = "dietcode.UiService"

	static async initializeWebview(request: EmptyRequest): Promise<Empty> {
		return UiServiceClient.makeUnaryRequest("initializeWebview", request, EmptyRequest.toJSON, Empty.fromJSON)
	}

	static async onDidShowAnnouncement(request: EmptyRequest): Promise<Boolean> {
		return UiServiceClient.makeUnaryRequest("onDidShowAnnouncement", request, EmptyRequest.toJSON, Boolean.fromJSON)
	}

	static subscribeToChatButtonClicked(request: EmptyRequest, callbacks: Callbacks<Empty>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToChatButtonClicked",
			request,
			EmptyRequest.toJSON,
			Empty.fromJSON,
			callbacks,
		)
	}

	static subscribeToHistoryButtonClicked(request: EmptyRequest, callbacks: Callbacks<Empty>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToHistoryButtonClicked",
			request,
			EmptyRequest.toJSON,
			Empty.fromJSON,
			callbacks,
		)
	}

	static subscribeToMcpButtonClicked(request: EmptyRequest, callbacks: Callbacks<Empty>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToMcpButtonClicked",
			request,
			EmptyRequest.toJSON,
			Empty.fromJSON,
			callbacks,
		)
	}

	static subscribeToPartialMessage(request: EmptyRequest, callbacks: Callbacks<DietCodeMessage>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToPartialMessage",
			request,
			EmptyRequest.toJSON,
			DietCodeMessage.fromJSON,
			callbacks,
		)
	}

	static subscribeToRelinquishControl(request: EmptyRequest, callbacks: Callbacks<Empty>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToRelinquishControl",
			request,
			EmptyRequest.toJSON,
			Empty.fromJSON,
			callbacks,
		)
	}

	static subscribeToSettingsButtonClicked(request: EmptyRequest, callbacks: Callbacks<Empty>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToSettingsButtonClicked",
			request,
			EmptyRequest.toJSON,
			Empty.fromJSON,
			callbacks,
		)
	}

	static subscribeToWorktreesButtonClicked(request: EmptyRequest, callbacks: Callbacks<Empty>): () => void {
		return UiServiceClient.makeStreamingRequest(
			"subscribeToWorktreesButtonClicked",
			request,
			EmptyRequest.toJSON,
			Empty.fromJSON,
			callbacks,
		)
	}
}
