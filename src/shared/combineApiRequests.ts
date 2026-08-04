import { DietCodeMessage } from "./ExtensionMessage"

/**
 * Combines API request start and finish messages in an array of DietCodeMessages.
 *
 * This function looks for pairs of 'api_req_started' and 'api_req_finished' messages.
 * When it finds a pair, it combines them into a single 'api_req_combined' message.
 * The JSON data in the text fields of both messages are merged.
 *
 * @param messages - An array of DietCodeMessage objects to process.
 * @returns A new array of DietCodeMessage objects with API requests combined.
 *
 * @example
 * const messages = [
 *   { type: "say", say: "api_req_started", text: '{"request":"GET /api/data"}', ts: 1000 },
 *   { type: "say", say: "api_req_finished", text: '{"cost":0.005}', ts: 1001 }
 * ];
 * const result = combineApiRequests(messages);
 * // Result: [{ type: "say", say: "api_req_started", text: '{"request":"GET /api/data","cost":0.005}', ts: 1000 }]
 */
export function combineApiRequests(messages: DietCodeMessage[]): DietCodeMessage[] {
	const combinedByTimestamp = new Map<number, DietCodeMessage>()
	let pendingStart: { message: DietCodeMessage; request: Record<string, unknown> } | undefined

	// The previous implementation searched from every start message to the next
	// finish, then searched the combined list again for every start. A single
	// pending start reproduces the same first-start/next-finish pairing in linear
	// time while keeping duplicate timestamps deterministic.
	for (const message of messages) {
		if (message.type === "say" && message.say === "api_req_started") {
			if (!pendingStart) {
				pendingStart = {
					message,
					request: JSON.parse(message.text || "{}") as Record<string, unknown>,
				}
			}
			continue
		}

		if (message.type === "say" && message.say === "api_req_finished" && pendingStart) {
			const finishedRequest = JSON.parse(message.text || "{}") as Record<string, unknown>
			if (!combinedByTimestamp.has(pendingStart.message.ts)) {
				combinedByTimestamp.set(pendingStart.message.ts, {
					...pendingStart.message,
					text: JSON.stringify({ ...pendingStart.request, ...finishedRequest }),
				})
			}
			pendingStart = undefined
		}
	}

	// Replace original api_req_started and remove api_req_finished.
	return messages.reduce<DietCodeMessage[]>((result, message) => {
		if (message.type === "say" && message.say === "api_req_finished") return result
		if (message.type === "say" && message.say === "api_req_started") {
			result.push(combinedByTimestamp.get(message.ts) || message)
		} else {
			result.push(message)
		}
		return result
	}, [])
}
