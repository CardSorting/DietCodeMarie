import { DietCodeMessage } from "./ExtensionMessage"

/**
 * Consolidates error_retry messages in a retry sequence, keeping only the latest one,
 * and removes successful retry messages entirely.
 *
 * When an API request fails and auto-retry is enabled, multiple error_retry messages are created
 * (e.g., "Attempt 1 of 3", "Attempt 2 of 3", "Attempt 3 of 3"), interleaved with api_req_retried
 * messages. This function:
 * 1. Filters out earlier retry messages, showing only the most recent one
 * 2. Removes error_retry messages entirely when followed by a successful api_req_started
 *    (indicating the retry succeeded)
 *
 * @param messages - An array of DietCodeMessage objects to process.
 * @returns A new array of DietCodeMessage objects with error_retry sequences consolidated.
 *
 * @example
 * // During retry sequence - shows only latest attempt:
 * const messages: DietCodeMessage[] = [
 *   { type: 'say', say: 'error_retry', text: '{"attempt":1,"maxAttempts":3}', ts: 1000 },
 *   { type: 'say', say: 'api_req_retried', ts: 1001 },
 *   { type: 'say', say: 'error_retry', text: '{"attempt":2,"maxAttempts":3}', ts: 1002 },
 *   { type: 'say', say: 'api_req_retried', ts: 1003 },
 *   { type: 'say', say: 'error_retry', text: '{"attempt":3,"maxAttempts":3}', ts: 1004 },
 * ];
 * const result = combineErrorRetryMessages(messages);
 * // Result: [{ type: 'say', say: 'error_retry', text: '{"attempt":3,"maxAttempts":3}', ts: 1004 }]
 *
 * @example
 * // After successful retry - removes error_retry entirely:
 * const messages: DietCodeMessage[] = [
 *   { type: 'say', say: 'error_retry', text: '{"attempt":1,"maxAttempts":3}', ts: 1000 },
 *   { type: 'say', say: 'api_req_retried', ts: 1001 },
 *   { type: 'say', say: 'api_req_started', text: '{}', ts: 1002 },
 * ];
 * const result = combineErrorRetryMessages(messages);
 * // Result: [{ type: 'say', say: 'api_req_started', text: '{}', ts: 1002 }]
 */
export function combineErrorRetryMessages(messages: DietCodeMessage[]): DietCodeMessage[] {
	const result: DietCodeMessage[] = []
	let nextRetryOrApi: "error_retry" | "api_req_started" | undefined

	// Walking backwards makes the first retry/API boundary after each retry
	// available in O(1), instead of rescanning the remainder of the conversation.
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		let keep = true

		if (message.say === "error_retry") {
			if (nextRetryOrApi === "error_retry") {
				keep = false
			} else if (nextRetryOrApi === "api_req_started") {
				try {
					const retryInfo = JSON.parse(message.text || "{}") as { failed?: boolean }
					// Only keep a retry if it represents a final failure.
					keep = retryInfo.failed === true
				} catch {
					// Match the previous safe behavior for malformed retry metadata.
					keep = false
				}
			}
		}

		if (keep) result.push(message)
		if (message.say === "error_retry" || message.say === "api_req_started") {
			nextRetryOrApi = message.say
		}
	}

	return result.reverse()
}
