import type { EmptyRequest } from "@shared/proto/dietcode/common"
import type { McpMarketplaceCatalog, McpServers } from "@shared/proto/dietcode/mcp"
import type { Callbacks } from "./grpc-client-base"
import type { McpServiceClient } from "./mcp-grpc-client"

type McpSubscription<TResponse> = (request: EmptyRequest, callbacks: Callbacks<TResponse>) => () => void

let mcpClientPromise: Promise<typeof McpServiceClient> | undefined

function loadMcpServiceClient(): Promise<typeof McpServiceClient> {
	if (!mcpClientPromise) {
		mcpClientPromise = import("./mcp-grpc-client").then(({ McpServiceClient }) => McpServiceClient)
	}
	return mcpClientPromise
}

function createLazySubscription<TResponse>(
	subscribe: (client: typeof McpServiceClient, request: EmptyRequest, callbacks: Callbacks<TResponse>) => () => void,
): McpSubscription<TResponse> {
	return (request, callbacks) => {
		let isCancelled = false
		let cancel: (() => void) | undefined

		void loadMcpServiceClient()
			.then((client) => {
				if (!isCancelled) {
					cancel = subscribe(client, request, callbacks)
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

export function createLazyMcpSubscription(method: "subscribeToMcpServers"): McpSubscription<McpServers>
export function createLazyMcpSubscription(method: "subscribeToMcpMarketplaceCatalog"): McpSubscription<McpMarketplaceCatalog>
export function createLazyMcpSubscription(
	method: "subscribeToMcpServers" | "subscribeToMcpMarketplaceCatalog",
): McpSubscription<McpServers> | McpSubscription<McpMarketplaceCatalog> {
	if (method === "subscribeToMcpServers") {
		return createLazySubscription<McpServers>((client, request, callbacks) =>
			client.subscribeToMcpServers(request, callbacks),
		)
	}

	return createLazySubscription<McpMarketplaceCatalog>((client, request, callbacks) =>
		client.subscribeToMcpMarketplaceCatalog(request, callbacks),
	)
}
