import { createHash } from "node:crypto"
import * as path from "node:path"
import type {
	AgentContext,
	ContextCompactionCommitInput,
	ContextCompactionCommitResult,
	ContextCompactionHydrateInput,
	ContextCompactionHydrateResult,
	ContextCompactionLoadInput,
	ContextCompactionLoadResult,
} from "@noorm/broccolidb"
import { getDbPath } from "@/infrastructure/db/Config"
import { isSqlitePersistenceBypassed } from "@/infrastructure/db/sqlitePersistence"
import type { ContextCompactionStore } from "./ContextCompactionStore"

const sharedContexts = new Map<string, Promise<AgentContext>>()

function stableId(prefix: string, value: string): string {
	return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 32)}`
}

async function createSharedContext(workspacePath: string, databasePath: string): Promise<AgentContext> {
	const { AgentContext, Connection, Workspace } = await import("@noorm/broccolidb")
	const workspaceId = stableId("lumi_ws", workspacePath)
	const userId = stableId("lumi_user", databasePath)
	const connection = new Connection({ dbPath: databasePath })
	const workspace = new Workspace(connection, userId, workspaceId)
	workspace.setPhysicalPath(workspacePath)
	const context = new AgentContext(workspace, connection.getPool(), userId)
	await context.start()
	return context
}

/**
 * Lazy BroccoliDB adapter. The native database module and AgentContext
 * lifecycle are initialized only when central recovery or compaction is first
 * requested. One lifecycle-owned context is shared by every task in a workspace.
 */
export class BroccoliContextCompactionStore implements ContextCompactionStore {
	public readonly workspaceId: string
	private readonly workspacePath: string
	private readonly databasePath: string

	constructor(workspacePath: string) {
		this.workspacePath = path.resolve(workspacePath)
		const configuredDatabasePath = getDbPath()
		this.databasePath = configuredDatabasePath === ":memory:" ? configuredDatabasePath : path.resolve(configuredDatabasePath)
		this.workspaceId = stableId("lumi_ws", this.workspacePath)
	}

	getRecoverySource(scopeId: string): string {
		return `broccolidb://context/${encodeURIComponent(scopeId)}`
	}

	async commit(input: ContextCompactionCommitInput): Promise<ContextCompactionCommitResult> {
		return (await this.getContext()).compaction.commit(input)
	}

	async load(input: ContextCompactionLoadInput): Promise<ContextCompactionLoadResult> {
		return (await this.getContext()).compaction.load(input)
	}

	async hydrate(input: ContextCompactionHydrateInput): Promise<ContextCompactionHydrateResult> {
		return (await this.getContext()).compaction.hydrate(input)
	}

	private async getContext(): Promise<AgentContext> {
		if (isSqlitePersistenceBypassed() || this.databasePath === ":memory:") {
			throw new Error("BroccoliDB context compaction is unavailable while SQLite persistence is bypassed")
		}
		const key = `${this.databasePath}\0${this.workspacePath}`
		let context = sharedContexts.get(key)
		if (!context) {
			context = createSharedContext(this.workspacePath, this.databasePath)
			sharedContexts.set(key, context)
			context.catch(() => {
				if (sharedContexts.get(key) === context) sharedContexts.delete(key)
			})
		}
		return context
	}
}

export async function shutdownBroccoliContextCompactionStores(): Promise<void> {
	const pendingContexts = [...sharedContexts.values()]
	sharedContexts.clear()
	const settled = await Promise.allSettled(pendingContexts)
	const contexts = settled
		.filter((result): result is PromiseFulfilledResult<AgentContext> => result.status === "fulfilled")
		.map((result) => result.value)
	await Promise.allSettled(contexts.map((context) => context.stop()))
}
