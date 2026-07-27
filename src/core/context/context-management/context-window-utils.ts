import { ApiHandler } from "@core/api"
import { OpenAiHandler } from "@core/api/providers/openai"
import type { CompactionTier, ContextWindowSafetyProfile, TokenSafetyProfile } from "./ContextCompactionTypes"

const DEFAULT_CONTEXT_WINDOW = 128_000
const SYSTEM_PROMPT_RESERVATION = 10_000
const DEFAULT_OUTPUT_RESERVATION = 8_192

/**
 * Returns the provider context window and monotonic compaction thresholds.
 *
 * The legacy hard allowance remains the outer fence. Progressive work begins
 * substantially earlier so large tool results can be folded at safe turn
 * boundaries instead of forcing an emergency summarization turn.
 */
export function getContextWindowInfo(api: ApiHandler): ContextWindowSafetyProfile {
	let contextWindow = Math.max(1, Math.floor(api.getModel().info.contextWindow || DEFAULT_CONTEXT_WINDOW))

	// OpenAI-compatible DeepSeek configurations have historically reported the
	// generic default rather than the provider's effective window.
	if (api instanceof OpenAiHandler && api.getModel().id.toLowerCase().includes("deepseek")) {
		contextWindow = 128_000
	}

	let maxAllowedSize: number
	switch (contextWindow) {
		case 64_000:
			maxAllowedSize = contextWindow - 27_000
			break
		case 128_000:
			maxAllowedSize = contextWindow - 30_000
			break
		case 200_000:
			maxAllowedSize = contextWindow - 40_000
			break
		default:
			maxAllowedSize = Math.max(contextWindow - 40_000, Math.floor(contextWindow * 0.8))
	}

	maxAllowedSize = Math.max(1, Math.min(contextWindow, Math.floor(maxAllowedSize)))

	const microCompactThreshold = Math.max(1, Math.floor(maxAllowedSize * 0.55))
	const astPruneThreshold = Math.min(maxAllowedSize, Math.max(microCompactThreshold, Math.floor(maxAllowedSize * 0.68)))
	const ledgerCompactThreshold = Math.min(maxAllowedSize, Math.max(astPruneThreshold, Math.floor(maxAllowedSize * 0.78)))
	const emergencyCompactThreshold = Math.min(
		maxAllowedSize,
		Math.max(ledgerCompactThreshold, Math.floor(maxAllowedSize * 0.86)),
	)

	return {
		contextWindow,
		maxAllowedSize,
		microCompactThreshold,
		astPruneThreshold,
		ledgerCompactThreshold,
		emergencyCompactThreshold,
	}
}

/**
 * Adds explicit request reservations to the threshold profile for diagnostics.
 */
export function getTokenSafetyProfile(api: ApiHandler): TokenSafetyProfile {
	const base = getContextWindowInfo(api)
	const outputTokenReservation = Math.max(1, Math.floor(api.getModel().info.maxTokens || DEFAULT_OUTPUT_RESERVATION))
	const safetyMarginReservation = Math.max(4_096, Math.floor(base.contextWindow * 0.06))
	const totalReservedTokens = Math.min(
		base.contextWindow - 1,
		SYSTEM_PROMPT_RESERVATION + outputTokenReservation + safetyMarginReservation,
	)

	return {
		...base,
		systemPromptReservation: SYSTEM_PROMPT_RESERVATION,
		outputTokenReservation,
		safetyMarginReservation,
		totalReservedTokens,
		safeHighWaterMark: base.ledgerCompactThreshold,
	}
}

/**
 * Single authority for tier selection. Callers should not duplicate threshold
 * comparisons because even small ordering differences create dead zones.
 */
export function getCompactionTierFromTokens(totalTokens: number, api: ApiHandler): CompactionTier {
	const profile = getContextWindowInfo(api)
	const normalizedTokens = Number.isFinite(totalTokens) ? Math.max(0, totalTokens) : 0

	if (normalizedTokens >= profile.emergencyCompactThreshold) {
		return "emergency"
	}
	if (normalizedTokens >= profile.ledgerCompactThreshold) {
		return "zero_loss_ledger"
	}
	if (normalizedTokens >= profile.astPruneThreshold) {
		return "ast_prune"
	}
	if (normalizedTokens >= profile.microCompactThreshold) {
		return "micro"
	}
	return "normal"
}
