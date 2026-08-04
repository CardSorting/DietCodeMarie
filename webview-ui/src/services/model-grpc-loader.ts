import type { EmptyRequest } from "@shared/proto/dietcode/common"
import type { OpenRouterCompatibleModelInfo } from "@shared/proto/dietcode/models"
import type { Callbacks } from "./grpc-client-base"
import type { ModelsServiceClient } from "./model-grpc-client"

type ModelServiceMethod = "subscribeToOpenRouterModels" | "subscribeToLiteLlmModels"
type ModelSubscription = (request: EmptyRequest, callbacks: Callbacks<OpenRouterCompatibleModelInfo>) => () => void

let modelsClientPromise: Promise<typeof ModelsServiceClient> | undefined

export function loadModelsServiceClient(): Promise<typeof ModelsServiceClient> {
	if (!modelsClientPromise) {
		modelsClientPromise = import("./model-grpc-client").then(({ ModelsServiceClient }) => ModelsServiceClient)
	}
	return modelsClientPromise
}

export function createLazyModelSubscription(method: ModelServiceMethod): ModelSubscription {
	return (request, callbacks) => {
		let isCancelled = false
		let cancel: (() => void) | undefined

		void loadModelsServiceClient()
			.then((client) => {
				if (!isCancelled) {
					cancel = client[method](request, callbacks)
				}
			})
			.catch((error: unknown) => {
				if (!isCancelled) {
					callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
				}
			})

		return () => {
			isCancelled = true
			cancel?.()
		}
	}
}

export function convertModelResponse(response: OpenRouterCompatibleModelInfo) {
	return import("../../../src/shared/proto-conversions/models/typeConversion").then(({ fromProtobufModels }) =>
		fromProtobufModels(response.models),
	)
}
