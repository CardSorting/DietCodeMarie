import { EmptyRequest } from "@shared/proto/dietcode/common"
import { OpenRouterCompatibleModelInfo } from "@shared/proto/dietcode/models"
import type { Callbacks } from "./grpc-client-base"
import { ProtoBusClient } from "./grpc-client-base"

/** The model catalog bridge is loaded on demand after the shell is interactive. */
export class ModelsServiceClient extends ProtoBusClient {
	static override serviceName = "dietcode.ModelsService"

	static async refreshOpenRouterModelsRpc(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshOpenRouterModelsRpc",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static async refreshDietCodeModelsRpc(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshDietCodeModelsRpc",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static async refreshHicapModels(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshHicapModels",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static async refreshLiteLlmModelsRpc(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshLiteLlmModelsRpc",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static async refreshBasetenModelsRpc(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshBasetenModelsRpc",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static async refreshVercelAiGatewayModelsRpc(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshVercelAiGatewayModelsRpc",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static async refreshNousResearchModelsRpc(request: EmptyRequest): Promise<OpenRouterCompatibleModelInfo> {
		return ModelsServiceClient.makeUnaryRequest(
			"refreshNousResearchModelsRpc",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
		)
	}

	static subscribeToOpenRouterModels(request: EmptyRequest, callbacks: Callbacks<OpenRouterCompatibleModelInfo>): () => void {
		return ModelsServiceClient.makeStreamingRequest(
			"subscribeToOpenRouterModels",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
			callbacks,
		)
	}

	static subscribeToLiteLlmModels(request: EmptyRequest, callbacks: Callbacks<OpenRouterCompatibleModelInfo>): () => void {
		return ModelsServiceClient.makeStreamingRequest(
			"subscribeToLiteLlmModels",
			request,
			EmptyRequest.toJSON,
			OpenRouterCompatibleModelInfo.fromJSON,
			callbacks,
		)
	}
}
