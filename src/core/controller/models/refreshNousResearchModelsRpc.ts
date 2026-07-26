import type { IController as Controller } from "@core/controller/types"
import { EmptyRequest } from "@shared/proto/dietcode/common"
import { OpenRouterCompatibleModelInfo } from "@shared/proto/dietcode/models"
import { toProtobufModels } from "../../../shared/proto-conversions/models/typeConversion"
import { refreshNousResearchModels } from "./refreshNousResearchModels"

/**
 * Handles protobuf conversion for gRPC service
 * @param controller The controller instance
 * @param _request Empty request object
 * @returns Response containing NousResearch models (protobuf types)
 */
export async function refreshNousResearchModelsRpc(
	controller: Controller,
	_request: EmptyRequest,
): Promise<OpenRouterCompatibleModelInfo> {
	const models = await refreshNousResearchModels(controller)
	return OpenRouterCompatibleModelInfo.create({ models: toProtobufModels(models) })
}
