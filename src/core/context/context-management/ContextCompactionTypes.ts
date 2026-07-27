/**
 * Shared contracts for deterministic, turn-boundary context compaction.
 *
 * "Recoverable" means the prompt projection is compacted while the original
 * message remains in the durable API conversation history. It does not claim
 * that a compressed projection contains every semantic detail.
 */

export type CompactionTier =
	| "normal"
	| "micro"
	| "ast_prune"
	| "semantic_compact"
	| "zero_loss_ledger"
	| "hyper_compressed"
	| "emergency"

export type ASTFoldingGranularity = "raw" | "method_skeleton" | "type_outline" | "symbol_index"

export interface GranularASTFilterOptions {
	granularity: ASTFoldingGranularity
	preserveExportsOnly?: boolean
	foldDocstrings?: boolean
	maxLinesOverride?: number
}

export interface HyperCompressionSummary {
	tier: CompactionTier
	granularity: ASTFoldingGranularity
	originalTokenCount: number
	compressedTokenCount: number
	ratioSaved: number
	foldedLinesCount: number
	foldedToolsCount: number
	timestamp: number
}

export interface QuantizedToolResultOptions {
	maxHistoricalTurnsToKeepRaw: number
	maxLogLinesBeforeFold: number
	preserveFailures: boolean
	preserveFileMutations: boolean
}

export interface HierarchicalLedger {
	primaryObjective: string
	architecturalDiscoveries: string[]
	modifiedAndVerifiedFiles: string[]
	activeStateAndErrors: string[]
	pendingActions: string[]
	timestamp: number
}

export interface ContextCheckpointLedger extends HierarchicalLedger {
	fileHashRegistry: Record<string, string>
	turnCount: number
}

export interface ContextWindowSafetyProfile {
	contextWindow: number
	maxAllowedSize: number
	microCompactThreshold: number
	astPruneThreshold: number
	ledgerCompactThreshold: number
	emergencyCompactThreshold: number
}

export interface TokenSafetyProfile extends ContextWindowSafetyProfile {
	systemPromptReservation: number
	outputTokenReservation: number
	safetyMarginReservation: number
	totalReservedTokens: number
	safeHighWaterMark: number
}

export interface SilentCompactionConfig {
	suppressTruncationNotices: boolean
	preserveActiveStream: boolean
	enableHashPointers: boolean
	silentTelemetry: boolean
}

export interface RecoverableContextReference {
	source: string
	ref: string
	messageId: string
	blockId: string
	sha256: string
	originalCharacters: number
	originalLines: number
}

export interface ProgressiveCompactionCursor {
	messageOffset: number
	blockOffset: number
	activeStart: number
}

export interface ProgressiveCompactionLimits {
	maxMessagesPerPass: number
	maxBlocksPerPass: number
	maxBlocksInspectedPerPass: number
	preserveRecentMessages: number
	minLinesToCompact: number
	maxProjectedLines: number
}

export interface ProgressiveCompactionResult {
	tier: CompactionTier
	scannedMessages: number
	scannedBlocks: number
	compactedBlocks: number
	originalCharacters: number
	projectedCharacters: number
	updatedMessageIndices: Set<number>
	references: RecoverableContextReference[]
}

export interface HashReferenceMap {
	[filePath: string]: {
		sha256: string
		firstTurnIndex: number
		lineCount: number
	}
}

export interface CodeSkeletonResult {
	skeletonText: string
	foldedLines: number
	anchorsPreserved: number
	originalLines: number
	originalCharacters: number
	projectedLines: number
	sourceWasSampled: boolean
	sha256: string
}

export interface CommandOutputCompressionResult {
	compressedText: string
	foldedLines: number
	hasError: boolean
	originalLines: number
	originalCharacters: number
	projectedLines: number
	sourceWasSampled: boolean
	sha256: string
}
