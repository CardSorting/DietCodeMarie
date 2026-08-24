import { nanoid } from "nanoid"
import { Logger } from "@/shared/services/Logger"
import { getDb } from "../../infrastructure/db/Config"
export interface EmbeddingProvider {
	embedText(text: string): Promise<number[] | undefined>
}

export interface CognitiveSnapshot {
	id: string
	streamId: string
	content: string
	embedding: number[]
	metadata?: any
	createdAt: number
}

export class MemoryService {
	private static instance: MemoryService | null = null
	private embeddingProvider: EmbeddingProvider

	private constructor(embeddingProvider: EmbeddingProvider) {
		this.embeddingProvider = embeddingProvider
	}

	public static async getInstance(embeddingProvider: EmbeddingProvider): Promise<MemoryService> {
		if (!MemoryService.instance) {
			MemoryService.instance = new MemoryService(embeddingProvider)
		}
		return MemoryService.instance
	}

	/**
	 * Creates a cognitive snapshot of the current state.
	 */
	async createSnapshot(streamId: string, content: string, metadata?: any): Promise<CognitiveSnapshot | null> {
		try {
			const embedding = await this.embeddingProvider.embedText(content)
			if (!embedding) {
				Logger.warn("[MemoryService] Failed to generate embedding for snapshot")
				return null
			}

			const snapshot: CognitiveSnapshot = {
				id: nanoid(),
				streamId,
				content,
				embedding,
				metadata,
				createdAt: Date.now(),
			}

			const db = await getDb()
			await db
				.insertInto("agent_cognitive_snapshots")
				.values({
					id: snapshot.id,
					streamId: snapshot.streamId,
					content: snapshot.content,
					embedding: JSON.stringify(snapshot.embedding),
					metadata: snapshot.metadata ? JSON.stringify(snapshot.metadata) : null,
					createdAt: snapshot.createdAt,
				})
				.execute()

			return snapshot
		} catch (error) {
			Logger.error("[MemoryService] Error creating snapshot:", error)
			return null
		}
	}

	/**
	 * Retrieves relevant snapshots based on the query text.
	 */
	async retrieveRelevantSnapshots(
		streamId: string,
		queryText: string,
		limit = 5,
	): Promise<(CognitiveSnapshot & { similarity: number })[]> {
		try {
			const queryEmbedding = await this.embeddingProvider.embedText(queryText)
			if (!queryEmbedding) return []

			const db = await getDb()
			const snapshots = await db
				.selectFrom("agent_cognitive_snapshots")
				.selectAll()
				.where("streamId", "=", streamId)
				.orderBy("createdAt", "desc")
				.limit(100)
				.execute()

			const rankedSnapshots = snapshots
				.map((s) => {
					let parsedEmbedding: number[] = []
					try {
						parsedEmbedding = (JSON.parse(s.embedding) as number[]) || []
					} catch {}
					return {
						...s,
						embedding: parsedEmbedding,
						metadata: s.metadata ? JSON.parse(s.metadata) : null,
						similarity: this.cosineSimilarity(queryEmbedding, parsedEmbedding),
					}
				})
				.sort((a, b) => b.similarity - a.similarity)
				.slice(0, limit)

			return rankedSnapshots.map((s) => ({
				id: s.id,
				streamId: s.streamId,
				content: s.content,
				embedding: s.embedding,
				metadata: s.metadata,
				createdAt: Number(s.createdAt),
				similarity: s.similarity,
			}))
		} catch (error) {
			Logger.error("[MemoryService] Error retrieving snapshots:", error)
			return []
		}
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		let dotProduct = 0
		let mA = 0
		let mB = 0
		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i]
			mA += a[i] * a[i]
			mB += b[i] * b[i]
		}
		mA = Math.sqrt(mA)
		mB = Math.sqrt(mB)
		if (mA === 0 || mB === 0) return 0
		return dotProduct / (mA * mB)
	}
}
