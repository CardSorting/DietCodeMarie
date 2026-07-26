// [LAYER: CORE]
import * as crypto from "crypto"
import * as v8 from "v8"
import * as zlib from "zlib"
import { MetricsEngine } from "./MetricsEngine.js"
import { SpiderNode, SpiderRegistryPayload, SpiderSnapshot } from "./types.js"

const isSpiderSnapshot = (value: unknown): value is SpiderSnapshot => {
	if (!value || typeof value !== "object") return false
	const snapshot = value as Partial<SpiderSnapshot>
	return typeof snapshot.timestamp === "string" && typeof snapshot.entropyScore === "number" && Array.isArray(snapshot.nodes)
}

export class PersistenceManager {
	private snapshots: Buffer[] = [] // V190: Hyper-Compressed Binary Snapshot Buffer (zlib + V8)
	private cachedHistory: SpiderSnapshot[] | null = null

	constructor(private metrics: MetricsEngine) {}

	/**
	 * V200: Industrial Hygiene (Disposal).
	 */
	public dispose() {
		this.snapshots = [] // Clear binary residual
		this.cachedHistory = null
	}

	public getSnapshots(): Buffer[] {
		return this.snapshots.slice()
	}

	public getSnapshotHistory(): SpiderSnapshot[] {
		if (this.cachedHistory !== null) {
			return this.cachedHistory
		}

		const history: SpiderSnapshot[] = []
		const healthySnapshots: Buffer[] = []

		for (const snapshot of this.snapshots) {
			try {
				let binary = snapshot
				try {
					binary = zlib.inflateSync(snapshot)
				} catch {
					// Uncompressed legacy buffer fallback
				}
				const decoded = v8.deserialize(binary)
				if (!isSpiderSnapshot(decoded)) continue
				history.push(decoded)
				healthySnapshots.push(snapshot)
			} catch {
				// Drop corrupt binary snapshots instead of letting audit paths fail closed.
			}
		}

		if (healthySnapshots.length !== this.snapshots.length) {
			this.snapshots = healthySnapshots
		}

		this.cachedHistory = history
		return history
	}

	public serialize(nodes: Map<string, SpiderNode>, metadata: Record<string, unknown> = {}): Buffer {
		const payload: SpiderRegistryPayload = {
			layerFingerprints: this.computeAllLayerFingerprints(nodes),
			nodes: Array.from(nodes.entries()),
			...metadata,
		}
		const binary = v8.serialize(payload)
		return zlib.deflateSync(binary)
	}

	public deserialize(data: Buffer): SpiderRegistryPayload {
		let binary = data
		try {
			binary = zlib.inflateSync(data)
		} catch {
			// Uncompressed legacy buffer fallback
		}
		const result = v8.deserialize(binary)
		if (!result || !result.nodes) {
			throw new Error("Invalid or corrupted structural payload.")
		}
		return result
	}

	/**
	 * V190: High-Fidelity Snapshotting.
	 * Preserves the entire structural state in a hyper-compressed zlib + V8 binary format.
	 */
	public async takeSnapshot(nodes: Map<string, SpiderNode>): Promise<SpiderSnapshot> {
		const report = this.metrics.computeEntropy(nodes)
		const snapshot: SpiderSnapshot = {
			timestamp: new Date().toISOString(),
			entropyScore: report.score,
			nodes: Array.from(nodes.values()),
			components: report.components,
		}

		// Preserve hyper-compressed binary state for high-fidelity restoration if needed
		const binary = zlib.deflateSync(v8.serialize(snapshot))
		this.snapshots.push(binary)

		// V215: Buffer Saturation Guard (Max 5 snapshots)
		// Prevents indefinite memory growth in long-running metabolic sessions.
		if (this.snapshots.length > 5) {
			this.snapshots.shift()
		}

		// Invalidate decoded object graph history to release uncompressed RAM footprint
		this.cachedHistory = null

		return snapshot
	}

	/**
	 * V200: Single-Pass Industrial Fingerprinting.
	 * Eliminates O(N) temporary array allocations during the hashing turn.
	 */
	public computeAllLayerFingerprints(nodes: Map<string, SpiderNode>): Record<string, string> {
		const layers = ["domain", "core", "infrastructure", "ui", "plumbing"]
		const results: Record<string, string> = {}

		const hashers: Record<string, import("crypto").Hash> = {}
		for (const layer of layers) {
			hashers[layer] = crypto.createHash("sha256")
		}

		// Single-Pass iteration over the node map
		for (const node of nodes.values()) {
			const hasher = hashers[node.layer]
			if (hasher) {
				hasher.update(node.id)
				hasher.update(node.hash)
				// Imports are unique and pre-vetted during indexing
				for (const imp of node.imports) {
					hasher.update(imp)
				}
			}
		}

		for (const layer of layers) {
			results[layer] = hashers[layer].digest("hex")
		}

		return results
	}

	public async getLatestSnapshot(): Promise<SpiderSnapshot | null> {
		return this.getSnapshotHistory().at(-1) ?? null
	}

	/**
	 * V215: Industrial Checkpointing.
	 * Creates a long-lived binary checkpoint of the current substrate.
	 */
	public createCheckpoint(nodes: Map<string, SpiderNode>): Buffer {
		return this.serialize(nodes, { checkpoint: true, timestamp: Date.now() })
	}

	/**
	 * V215: Silent Drift Detection.
	 * Compares the live graph against a binary checkpoint to find non-session changes.
	 */
	public compareToCheckpoint(current: Map<string, SpiderNode>, checkpoint: Buffer): string[] {
		const baseline = this.deserialize(checkpoint)
		const drifts: string[] = []

		const oldNodes = new Map<string, SpiderNode>(baseline.nodes)
		for (const [id, node] of current) {
			const oldNode = oldNodes.get(id)
			if (!oldNode) {
				drifts.push(`[DRIFT] NEW MODULE DETECTED: ${id}`)
				continue
			}

			if (node.hash !== (oldNode as any).hash) {
				drifts.push(`[DRIFT] CONTENT MUTATION: ${id}`)
			}

			if (node.layer !== (oldNode as any).layer) {
				drifts.push(`[DRIFT] LAYER DISPLACEMENT: ${id} (${(oldNode as any).layer} -> ${node.layer})`)
			}
		}

		oldNodes.clear()
		return drifts
	}

	public getHistory(): number[] {
		return this.getSnapshotHistory().map((snapshot) => snapshot.entropyScore)
	}

	/**
	 * V215: Substrate Checksumming.
	 * Generates a single sha256 hash representing the entire structural graph.
	 */
	public computeSubstrateChecksum(nodes: Map<string, SpiderNode>): string {
		const hasher = crypto.createHash("sha256")
		const ids: string[] = new Array(nodes.size)
		let i = 0
		for (const id of nodes.keys()) {
			ids[i++] = id
		}
		ids.sort()
		for (let j = 0; j < ids.length; j++) {
			const id = ids[j]
			const node = nodes.get(id)
			if (node) {
				hasher.update(id)
				hasher.update(node.hash)
			}
		}
		ids.length = 0
		return hasher.digest("hex")
	}
}
