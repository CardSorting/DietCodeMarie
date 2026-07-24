import { MoDRunState } from "./types"

/**
 * Zero-Latency In-Memory State Cache
 * Serves state reads instantly during fast-path pipeline transitions, eliminating disk I/O latency.
 */
export class DesignStateCache {
	private static readonly cache = new Map<string, { state: MoDRunState; cachedAt: number }>()
	private static readonly TTL_MS = 300_000 // 5 minutes TTL

	public static get(taskId: string): MoDRunState | undefined {
		const entry = DesignStateCache.cache.get(taskId)
		if (!entry) return undefined
		if (Date.now() - entry.cachedAt > DesignStateCache.TTL_MS) {
			DesignStateCache.cache.delete(taskId)
			return undefined
		}
		return entry.state
	}

	public static set(taskId: string, state: MoDRunState): void {
		DesignStateCache.cache.set(taskId, { state, cachedAt: Date.now() })
	}

	public static clear(): void {
		DesignStateCache.cache.clear()
	}
}
