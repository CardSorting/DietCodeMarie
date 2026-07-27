import type {
	ContextCompactionCommitInput,
	ContextCompactionCommitResult,
	ContextCompactionHydrateInput,
	ContextCompactionHydrateResult,
	ContextCompactionLoadInput,
	ContextCompactionLoadResult,
	ContextCompactionScopeKind,
} from "@noorm/broccolidb"

export interface ContextCompactionScope {
	id: string
	kind: ContextCompactionScopeKind
	workspaceId: string
}

/**
 * Narrow adapter used by ContextManager. Keeping the manager dependent on this
 * contract makes durability failure behavior directly testable without opening
 * SQLite or loading a native module.
 */
export interface ContextCompactionStore {
	getRecoverySource(scopeId: string): string
	commit(input: ContextCompactionCommitInput): Promise<ContextCompactionCommitResult>
	load(input: ContextCompactionLoadInput): Promise<ContextCompactionLoadResult>
	hydrate(input: ContextCompactionHydrateInput): Promise<ContextCompactionHydrateResult>
}

export interface ContextManagerOptions {
	centralStore?: ContextCompactionStore
	scope?: ContextCompactionScope
}
