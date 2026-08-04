import { EmptyRequest } from "@shared/proto/dietcode/common"
import { McpMarketplaceCatalog, McpServers } from "@shared/proto/dietcode/mcp"
import type { Callbacks } from "./grpc-client-base"
import { ProtoBusClient } from "./grpc-client-base"

export class McpServiceClient extends ProtoBusClient {
	static override serviceName = "dietcode.McpService"

	static subscribeToMcpMarketplaceCatalog(request: EmptyRequest, callbacks: Callbacks<McpMarketplaceCatalog>): () => void {
		return McpServiceClient.makeStreamingRequest(
			"subscribeToMcpMarketplaceCatalog",
			request,
			EmptyRequest.toJSON,
			McpMarketplaceCatalog.fromJSON,
			callbacks,
		)
	}

	static subscribeToMcpServers(request: EmptyRequest, callbacks: Callbacks<McpServers>): () => void {
		return McpServiceClient.makeStreamingRequest(
			"subscribeToMcpServers",
			request,
			EmptyRequest.toJSON,
			McpServers.fromJSON,
			callbacks,
		)
	}
}
