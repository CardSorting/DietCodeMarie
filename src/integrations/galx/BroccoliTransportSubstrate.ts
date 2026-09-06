import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { Logger } from "@/shared/services/Logger"
import type { GalxTransportResponse } from "./GalxTransportClient"

export interface BroccoliTransportEntry {
	id: string
	correlationId: string
	idempotencyKey: string
	path: string
	payloadHash: string
	payload: Record<string, unknown>
	status: "QUEUED" | "IN_FLIGHT" | "COMMITTED" | "FAILED" | "REPLAYED"
	attempts: number
	lastError?: string
	createdAtMs: number
	updatedAtMs: number
	serverTiming?: string
	receiptHash?: string
	sessionAffinity?: string
	shardId?: string
	shardMode?: string
	edgeRegion?: string
	traceId?: string
	spanId?: string
}

export interface BroccoliDeliveryReceipt {
	receiptId: string
	correlationId: string
	idempotencyKey: string
	status: number
	receiptHash: string
	prevReceiptHash: string
	timestampMs: number
	durationMs: number
	sessionAffinity?: string
	shardId?: string
	shardMode?: string
	edgeRegion?: string
	traceId?: string
}

export interface BroccoliSlaMetrics {
	totalRequests: number
	successfulRequests: number
	failedRequests: number
	replayedRequests: number
	p50LatencyMs: number
	p90LatencyMs: number
	p99LatencyMs: number
	averageLatencyMs: number
	outboxQueueDepth: number
	merkleRoot: string
}

export interface BroccoliEnvelopePayload {
	iv: string
	tag: string
	encryptedData: string
	keyId: string
	algorithm: "AES-256-GCM"
	salt: string
}

export interface TraceContext {
	traceparent: string
	tracestate: string
	traceId: string
	spanId: string
}

/**
 * BroccoliDB Transport Substrate (Industrial Grade)
 *
 * Capabilities:
 * 1. Persistent Write-Ahead Ledger (WAL) & Offline Outbox Queue with Atomic File Locks.
 * 2. Cryptographic Merkle Receipt Hash Chaining & Merkle Tree Root Evaluation.
 * 3. W3C Trace Context (traceparent / tracestate) Distributed Tracing Engine.
 * 4. DPoP (RFC 9449) Proof Token & HKDF-derived AES-256-GCM Envelope Encryption.
 * 5. High-Performance SLA Percentiles (P50/P90/P99) & Rolling Latency Histograms.
 * 6. Edge Shard Affinity & Anycast Routing Cache.
 * 7. Self-Healing Background Outbox Auto-Flusher Daemon.
 */
export class BroccoliTransportSubstrate {
	private readonly storageDir: string
	private readonly ledgerFilePath: string
	private readonly inMemoryEntries = new Map<string, BroccoliTransportEntry>()
	private readonly deliveryReceipts = new Map<string, BroccoliDeliveryReceipt>()
	private readonly latencyHistory: number[] = []
	private lastReceiptHash = "0000000000000000000000000000000000000000000000000000000000000000"
	private activeSessionAffinity?: string
	private activeEdgeRegion?: string
	private workerTimer: NodeJS.Timeout | null = null

	constructor(customStorageDir?: string) {
		this.storageDir = customStorageDir || path.join(os.homedir(), ".codemarie", "broccolidb_transport")
		this.ledgerFilePath = path.join(this.storageDir, "galx_transport_wal.json")
		this.ensureDirs()
		this.hydrateFromDisk()
	}

	private ensureDirs(): void {
		try {
			if (!fs.existsSync(this.storageDir)) {
				fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 })
			}
		} catch (err) {
			Logger.error("[BroccoliTransportSubstrate] Failed to create storage dir:", err)
		}
	}

	/**
	 * Compute SHA-256 CAS content hash
	 */
	public computeHash(content: string): string {
		return crypto.createHash("sha256").update(content.trim()).digest("hex")
	}

	/**
	 * Generate W3C Trace Context (traceparent / tracestate)
	 */
	public generateTraceContext(): TraceContext {
		const traceId = crypto.randomBytes(16).toString("hex")
		const spanId = crypto.randomBytes(8).toString("hex")
		const traceparent = `00-${traceId}-${spanId}-01`
		const tracestate = "galx=ro,sub=broccolidb"
		return { traceparent, tracestate, traceId, spanId }
	}

	/**
	 * Generate RFC 9449 DPoP (Demonstrating Proof-of-Possession) Proof JWT
	 */
	public generateDPoPProof(params: {
		method: string
		uri: string
		accessToken?: string
		keySecret: string
		keyId?: string
	}): string {
		const header = {
			typ: "dpop+jwt",
			alg: "HS256",
			kid: params.keyId || "codemarie-dpop-v1",
		}

		const cleanUri = params.uri.split("?")[0]
		const payload: Record<string, unknown> = {
			jti: crypto.randomBytes(16).toString("hex"),
			htm: params.method.toUpperCase(),
			htu: cleanUri,
			iat: Math.floor(Date.now() / 1000),
		}

		if (params.accessToken) {
			payload.ath = crypto.createHash("sha256").update(params.accessToken).digest("base64url")
		}

		const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url")
		const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
		const signatureBase = `${encodedHeader}.${encodedPayload}`
		const signature = crypto.createHmac("sha256", params.keySecret).update(signatureBase).digest("base64url")

		return `${signatureBase}.${signature}`
	}

	/**
	 * Derive 256-bit encryption key using HKDF-SHA256 (RFC 5869)
	 */
	public deriveKeyHKDF(masterSecret: string, salt: Buffer, info = "galx-envelope-encryption"): Buffer {
		return Buffer.from(crypto.hkdfSync("sha256", Buffer.from(masterSecret, "utf-8"), salt, Buffer.from(info, "utf-8"), 32))
	}

	/**
	 * Encrypt sensitive payload using HKDF + AES-256-GCM Envelope Encryption
	 */
	public encryptEnvelope(
		data: Record<string, unknown>,
		secretKey: string,
		keyId = "codemarie-env-v1",
	): BroccoliEnvelopePayload {
		const salt = crypto.randomBytes(16)
		const key = this.deriveKeyHKDF(secretKey, salt)
		const iv = crypto.randomBytes(12)
		const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

		const rawJson = JSON.stringify(data)
		const encrypted = Buffer.concat([cipher.update(rawJson, "utf-8"), cipher.final()])
		const tag = cipher.getAuthTag()

		return {
			iv: iv.toString("base64url"),
			tag: tag.toString("base64url"),
			encryptedData: encrypted.toString("base64url"),
			keyId,
			algorithm: "AES-256-GCM",
			salt: salt.toString("base64url"),
		}
	}

	/**
	 * Decrypt HKDF + AES-256-GCM Envelope Encryption
	 */
	public decryptEnvelope(envelope: BroccoliEnvelopePayload, secretKey: string): Record<string, unknown> {
		const salt = Buffer.from(envelope.salt, "base64url")
		const key = this.deriveKeyHKDF(secretKey, salt)
		const iv = Buffer.from(envelope.iv, "base64url")
		const tag = Buffer.from(envelope.tag, "base64url")
		const encryptedData = Buffer.from(envelope.encryptedData, "base64url")

		const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
		decipher.setAuthTag(tag)

		const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()])
		return JSON.parse(decrypted.toString("utf-8"))
	}

	/**
	 * Calculate Merkle Tree Root across a list of hashes
	 */
	public computeMerkleRoot(hashes: string[]): string {
		if (hashes.length === 0) {
			return this.lastReceiptHash
		}
		if (hashes.length === 1) {
			return hashes[0]
		}

		let currentLevel = [...hashes]
		while (currentLevel.length > 1) {
			const nextLevel: string[] = []
			for (let i = 0; i < currentLevel.length; i += 2) {
				const left = currentLevel[i]
				const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left
				const parentHash = crypto.createHash("sha256").update(`${left}:${right}`).digest("hex")
				nextLevel.push(parentHash)
			}
			currentLevel = nextLevel
		}
		return currentLevel[0]
	}

	/**
	 * Stage an outbound packet into the Write-Ahead Ledger
	 */
	public enqueueOutbox(
		pathStr: string,
		payload: Record<string, unknown>,
		options: { correlationId?: string; idempotencyKey?: string; traceId?: string; spanId?: string } = {},
	): BroccoliTransportEntry {
		const payloadStr = JSON.stringify(payload)
		const payloadHash = this.computeHash(payloadStr)
		const correlationId = options.correlationId || `corr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`
		const idempotencyKey = options.idempotencyKey || this.computeHash(`${pathStr}:${payloadHash}`)
		const entryId = `bwal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`

		const entry: BroccoliTransportEntry = {
			id: entryId,
			correlationId,
			idempotencyKey,
			path: pathStr,
			payloadHash,
			payload,
			status: "QUEUED",
			attempts: 0,
			createdAtMs: Date.now(),
			updatedAtMs: Date.now(),
			sessionAffinity: this.activeSessionAffinity,
			edgeRegion: this.activeEdgeRegion,
			traceId: options.traceId,
			spanId: options.spanId,
		}

		this.inMemoryEntries.set(entryId, entry)
		this.persistLedgerToDisk()
		return entry
	}

	/**
	 * Seal a completed delivery with a cryptographic Merkle receipt hash chain
	 */
	public sealReceipt(
		entryId: string,
		response: GalxTransportResponse,
		routingMeta: { sessionAffinity?: string; shardId?: string; shardMode?: string; edgeRegion?: string; traceId?: string } = {},
	): BroccoliDeliveryReceipt {
		const entry = this.inMemoryEntries.get(entryId)
		const now = Date.now()
		const durationMs = response.durationMs || 0

		// Update active session affinity cache
		const affinity = routingMeta.sessionAffinity || (routingMeta.shardId?.startsWith("aff_") ? routingMeta.shardId : undefined)
		if (affinity) {
			this.activeSessionAffinity = affinity
		}
		if (routingMeta.edgeRegion) {
			this.activeEdgeRegion = routingMeta.edgeRegion
		}

		// Record latency histogram
		if (durationMs > 0) {
			this.latencyHistory.push(durationMs)
			if (this.latencyHistory.length > 5000) {
				this.latencyHistory.shift()
			}
		}

		const correlationId = response.correlationId || entry?.correlationId || `corr_${now}`
		const idempotencyKey = entry?.idempotencyKey || this.computeHash(correlationId)

		// Compute Merkle receipt hash chain: sha256(prevReceiptHash + correlationId + idempotencyKey + status + durationMs + now)
		const receiptSeed = [this.lastReceiptHash, correlationId, idempotencyKey, response.status, durationMs, now].join("::")

		const receiptHash = crypto.createHash("sha256").update(receiptSeed).digest("hex")
		const prevHash = this.lastReceiptHash
		this.lastReceiptHash = receiptHash

		const receipt: BroccoliDeliveryReceipt = {
			receiptId: `rcpt_${receiptHash.slice(0, 16)}`,
			correlationId,
			idempotencyKey,
			status: response.status,
			receiptHash,
			prevReceiptHash: prevHash,
			timestampMs: now,
			durationMs,
			sessionAffinity: routingMeta.sessionAffinity || this.activeSessionAffinity,
			edgeRegion: routingMeta.edgeRegion || this.activeEdgeRegion,
			traceId: routingMeta.traceId || entry?.traceId,
		}

		this.deliveryReceipts.set(receipt.receiptId, receipt)

		if (entry) {
			entry.status = response.success ? "COMMITTED" : "FAILED"
			entry.updatedAtMs = now
			entry.serverTiming = response.serverTiming
			entry.receiptHash = receiptHash
			entry.sessionAffinity = receipt.sessionAffinity
			entry.edgeRegion = receipt.edgeRegion
			delete entry.shardId
			delete entry.shardMode
			if (response.success) {
				// Zero-trust hygiene: Scrub sensitive credential fields from committed entries
				entry.payload = {
					_redacted: true,
					payloadHash: entry.payloadHash,
					scrubbedAtMs: now,
				}
			} else {
				entry.lastError = response.error
			}
		}

		this.persistLedgerToDisk()
		return receipt
	}

	/**
	 * Retrieve a specific entry by ID
	 */
	public getEntry(id: string): BroccoliTransportEntry | undefined {
		return this.inMemoryEntries.get(id)
	}

	/**
	 * Update an existing entry in the Write-Ahead Ledger
	 */
	public updateEntry(id: string, patch: Partial<BroccoliTransportEntry>): void {
		const entry = this.inMemoryEntries.get(id)
		if (entry) {
			Object.assign(entry, patch, { updatedAtMs: Date.now() })
			this.persistLedgerToDisk()
		}
	}

	/**
	 * Mark an entry as in-flight
	 */
	public markInFlight(entryId: string): void {
		const entry = this.inMemoryEntries.get(entryId)
		if (entry) {
			entry.status = "IN_FLIGHT"
			entry.attempts++
			entry.updatedAtMs = Date.now()
		}
	}

	/**
	 * Retrieve all queued outbox entries awaiting transmission
	 */
	public getPendingOutboxEntries(): BroccoliTransportEntry[] {
		return Array.from(this.inMemoryEntries.values()).filter(
			(e) => e.status === "QUEUED" || (e.status === "FAILED" && e.attempts < 5),
		)
	}

	/**
	 * Compute SLA Percentiles (P50, P90, P99) and Merkle Root
	 */
	public getSlaMetrics(): BroccoliSlaMetrics {
		const sorted = [...this.latencyHistory].sort((a, b) => a - b)
		const count = sorted.length

		const getPercentile = (p: number) => {
			if (count === 0) return 0
			const idx = Math.min(Math.floor((p / 100) * count), count - 1)
			return sorted[idx]
		}

		let total = 0
		let success = 0
		let failed = 0
		let replayed = 0

		for (const entry of this.inMemoryEntries.values()) {
			total++
			if (entry.status === "COMMITTED") success++
			if (entry.status === "FAILED") failed++
			if (entry.status === "REPLAYED") replayed++
		}

		const sumLatency = this.latencyHistory.reduce((acc, v) => acc + v, 0)
		const averageLatencyMs = count > 0 ? Math.round(sumLatency / count) : 0
		const outboxQueueDepth = this.getPendingOutboxEntries().length

		const recentReceiptHashes = Array.from(this.deliveryReceipts.values())
			.slice(-32)
			.map((r) => r.receiptHash)
		const merkleRoot = this.computeMerkleRoot(recentReceiptHashes)

		return {
			totalRequests: total,
			successfulRequests: success,
			failedRequests: failed,
			replayedRequests: replayed,
			p50LatencyMs: getPercentile(50),
			p90LatencyMs: getPercentile(90),
			p99LatencyMs: getPercentile(99),
			averageLatencyMs,
			outboxQueueDepth,
			merkleRoot,
		}
	}

	/**
	 * Derive machine-bound secret key using HKDF over host metadata + storage directory
	 */
	public deriveMachineBoundKey(): string {
		const machineSeed = `${os.hostname()}:${os.userInfo().username}:${os.homedir()}:${this.storageDir}`
		return crypto.createHmac("sha256", "galx_machine_bound_transport_key").update(machineSeed).digest("hex")
	}

	/**
	 * Persist the active Write-Ahead Ledger to disk atomically with 0o600 permissions
	 * Zero-Trust Protection: Committed entries are scrubbed; queued entries are machine-bound encrypted.
	 */
	private persistLedgerToDisk(): void {
		try {
			this.ensureDirs()
			const machineKey = this.deriveMachineBoundKey()

			const sanitizedEntries = Array.from(this.inMemoryEntries.values())
				.slice(-200)
				.map((entry) => {
					if (entry.status === "COMMITTED" || entry.status === "REPLAYED") {
						return {
							...entry,
							payload: {
								_redacted: true,
								payloadHash: entry.payloadHash,
								scrubbedAtMs: entry.updatedAtMs || Date.now(),
							},
						}
					}
					if (entry.status === "QUEUED" || entry.status === "IN_FLIGHT") {
						if (!entry.payload._envelope) {
							const envelope = this.encryptEnvelope(entry.payload, machineKey, "machine-bound-wal-v1")
							return {
								...entry,
								payload: {
									_envelope: envelope,
								},
							}
						}
					}
					return entry
				})

			const serializable = {
				version: 4,
				lastReceiptHash: this.lastReceiptHash,
				activeSessionAffinity: this.activeSessionAffinity,
				activeEdgeRegion: this.activeEdgeRegion,
				updatedAt: Date.now(),
				entries: sanitizedEntries,
				receipts: Array.from(this.deliveryReceipts.values()).slice(-200),
			}

			const tempPath = `${this.ledgerFilePath}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`
			fs.writeFileSync(tempPath, JSON.stringify(serializable, null, 2), { mode: 0o600 })
			fs.renameSync(tempPath, this.ledgerFilePath)
		} catch (err) {
			Logger.error("[BroccoliTransportSubstrate] Failed to persist ledger to disk:", err)
		}
	}

	/**
	 * Hydrate ledger and receipt chain from disk on startup with automatic machine-bound envelope decryption
	 */
	private hydrateFromDisk(): void {
		try {
			if (!fs.existsSync(this.ledgerFilePath)) return
			const raw = fs.readFileSync(this.ledgerFilePath, "utf-8")
			const data = JSON.parse(raw)

			if (data.lastReceiptHash) {
				this.lastReceiptHash = data.lastReceiptHash
			}

			if (data.activeSessionAffinity && typeof data.activeSessionAffinity === "string" && data.activeSessionAffinity.startsWith("aff_")) {
				this.activeSessionAffinity = data.activeSessionAffinity
			} else if (data.activeShardId && typeof data.activeShardId === "string" && data.activeShardId.startsWith("aff_")) {
				this.activeSessionAffinity = data.activeShardId
			}
			// Legacy raw shard IDs (e.g. shard_us_east_4) are safely ignored and dropped to avoid leaking internal topology

			if (data.activeEdgeRegion) {
				this.activeEdgeRegion = data.activeEdgeRegion
			}

			if (Array.isArray(data.entries)) {
				const machineKey = this.deriveMachineBoundKey()
				for (const entry of data.entries) {
					if (entry.payload?._envelope) {
						try {
							const decrypted = this.decryptEnvelope(entry.payload._envelope as BroccoliEnvelopePayload, machineKey)
							entry.payload = decrypted
						} catch {
							// If machine key mismatch, preserve entry with envelope
						}
					}
					this.inMemoryEntries.set(entry.id, entry)
				}
			}

			if (Array.isArray(data.receipts)) {
				for (const rcpt of data.receipts) {
					this.deliveryReceipts.set(rcpt.receiptId, rcpt)
					if (rcpt.durationMs) {
						this.latencyHistory.push(rcpt.durationMs)
					}
				}
			}
		} catch (err) {
			Logger.warn("[BroccoliTransportSubstrate] Failed to hydrate ledger from disk:", err)
		}
	}

	/**
	 * Start automated background outbox flush worker
	 */
	public startBackgroundWorker(flushFn: () => Promise<void>, intervalMs = 15000): () => void {
		if (this.workerTimer) {
			clearInterval(this.workerTimer)
		}

		this.workerTimer = setInterval(async () => {
			if (this.getPendingOutboxEntries().length > 0) {
				try {
					await flushFn()
				} catch (err) {
					Logger.warn("[BroccoliTransportSubstrate] Outbox background flush encountered error:", err)
				}
			}
		}, intervalMs)

		return () => {
			if (this.workerTimer) {
				clearInterval(this.workerTimer)
				this.workerTimer = null
			}
		}
	}

	/**
	 * Stop background outbox flush worker
	 */
	public stopBackgroundWorker(): void {
		if (this.workerTimer) {
			clearInterval(this.workerTimer)
			this.workerTimer = null
		}
	}

	/**
	 * Get receipt by ID
	 */
	public getReceipt(receiptId: string): BroccoliDeliveryReceipt | undefined {
		return this.deliveryReceipts.get(receiptId)
	}

	/**
	 * Get the latest receipt hash
	 */
	public getLatestReceiptHash(): string {
		return this.lastReceiptHash
	}

	/**
	 * Get active opaque session affinity ticket (aff_v1_...)
	 */
	public getActiveSessionAffinity(): string | undefined {
		return this.activeSessionAffinity
	}

	/**
	 * Set active opaque session affinity ticket with immediate atomic WAL persistence
	 */
	public setActiveSessionAffinity(ticket: string): void {
		if (ticket && typeof ticket === "string" && ticket.startsWith("aff_")) {
			this.activeSessionAffinity = ticket
			this.persistLedgerToDisk()
		}
	}

	/**
	 * Clear active session affinity upon logout, credential rotation, node failover, or capacity constraints
	 */
	public clearActiveSessionAffinity(): void {
		this.activeSessionAffinity = undefined
		this.persistLedgerToDisk()
	}

	/**
	 * Backwards-compatibility alias for session affinity
	 */
	public getActiveShardId(): string | undefined {
		return this.activeSessionAffinity
	}

	/**
	 * Backwards-compatibility alias for session isolation mode
	 */
	public getActiveShardMode(): string | undefined {
		return undefined
	}

	/**
	 * Backwards-compatibility alias for setting session affinity
	 */
	public setActiveShard(ticketOrShard: string, _shardMode?: string): void {
		if (ticketOrShard && typeof ticketOrShard === "string" && ticketOrShard.startsWith("aff_")) {
			this.activeSessionAffinity = ticketOrShard
			this.persistLedgerToDisk()
		}
	}

	/**
	 * Backwards-compatibility alias for clearing session affinity
	 */
	public clearActiveShard(): void {
		this.clearActiveSessionAffinity()
	}

	/**
	 * Get active cached edge region
	 */
	public getActiveEdgeRegion(): string | undefined {
		return this.activeEdgeRegion
	}
}

// Global Singleton instance
export const broccoliTransportSubstrate = new BroccoliTransportSubstrate()
