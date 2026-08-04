import { AuthState, UserOrganizationsResponse } from "@shared/proto/dietcode/account"
import { Empty, EmptyRequest } from "@shared/proto/dietcode/common"
import type { Callbacks } from "./grpc-client-base"
import { ProtoBusClient } from "./grpc-client-base"

export class AccountServiceClient extends ProtoBusClient {
	static override serviceName = "dietcode.AccountService"

	static async accountLoginClicked(request: EmptyRequest): Promise<Empty> {
		return AccountServiceClient.makeUnaryRequest("accountLoginClicked", request, EmptyRequest.toJSON, Empty.fromJSON)
	}

	static async accountLogoutClicked(request: EmptyRequest): Promise<Empty> {
		return AccountServiceClient.makeUnaryRequest("accountLogoutClicked", request, EmptyRequest.toJSON, Empty.fromJSON)
	}

	static async getUserOrganizations(request: EmptyRequest): Promise<UserOrganizationsResponse> {
		return AccountServiceClient.makeUnaryRequest(
			"getUserOrganizations",
			request,
			EmptyRequest.toJSON,
			UserOrganizationsResponse.fromJSON,
		)
	}

	static subscribeToAuthStatusUpdate(request: EmptyRequest, callbacks: Callbacks<AuthState>): () => void {
		return AccountServiceClient.makeStreamingRequest(
			"subscribeToAuthStatusUpdate",
			request,
			EmptyRequest.toJSON,
			AuthState.fromJSON,
			callbacks,
		)
	}
}
