import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as http from "node:http"
import * as os from "node:os"
import * as path from "node:path"
import { URL } from "node:url"
import { z } from "zod"
import { StateManager } from "@/core/storage/StateManager"
import { broccoliTransportSubstrate } from "@/integrations/galx/BroccoliTransportSubstrate"
import { type GalxIngestPayload, galxTransportClient } from "@/integrations/galx/GalxTransportClient"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"

/**
 * OpenAI Codex OAuth Configuration
 *
 * Based on the OpenAI Codex OAuth implementation:
 * - ISSUER: https://auth.openai.com
 * - Authorization endpoint: https://auth.openai.com/oauth/authorize
 * - Token endpoint: https://auth.openai.com/oauth/token
 * - Fixed callback port: 1455
 * - Codex-specific params: codex_cli_simplified_flow=true, originator=dietcode
 */
export const OPENAI_CODEX_OAUTH_CONFIG = {
	authorizationEndpoint: "https://auth.openai.com/oauth/authorize",
	tokenEndpoint: "https://auth.openai.com/oauth/token",
	clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
	redirectUri: "http://localhost:1455/auth/callback",
	scopes: "openid profile email offline_access",
	callbackPort: 1455,
	callbackHost: "127.0.0.1",
} as const

// Token storage key - must match the key in SECRETS_KEYS (state-keys.ts)
const _OPENAI_CODEX_CREDENTIALS_KEY = "openai-codex-oauth-credentials"

// Credentials schema
const openAiCodexCredentialsSchema = z.object({
	type: z.literal("openai-codex"),
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	// expires is in milliseconds since epoch
	expires: z.number(),
	email: z.string().optional(),
	// ChatGPT account ID extracted from JWT claims (for ChatGPT-Account-Id header)
	accountId: z.string().optional(),
	id_token: z.string().optional(),
})

export type OpenAiCodexCredentials = z.infer<typeof openAiCodexCredentialsSchema>

export interface CodexAuthUrlDetails {
	url: string
	codeVerifier: string
	state: string
}

export interface AuthSourceAudit {
	path: string
	exists: boolean
	mode?: number
	isReadable: boolean
	lastModified?: number
	hasTokens: boolean
	accountId?: string
	expiresAt?: number
}

export interface CodexAuthDiagnostics {
	authenticated: boolean
	accountId?: string
	email?: string
	expiresAt?: number
	expiresInMs?: number
	isExpired: boolean
	hasValidRefreshToken: boolean
	sources: AuthSourceAudit[]
	syncStatus: "SYNCHRONIZED" | "DESYNCHRONIZED" | "UNCONFIGURED"
}

export interface GalxSyncResult {
	success: boolean
	userId?: string
	sessionAffinity?: string
	shardId?: string
	sessionToken?: string
	email?: string
	error?: string
}

export interface GalxSessionConfig {
	baseUrl: string
	userId: string
	sessionAffinity?: string
	shardId?: string
	sessionToken: string
	email?: string
	shardMode?: string
	syncedAt: number
}

export interface CloudSyncLedgerRecord {
	id: string
	status: "PENDING" | "SYNCED" | "FAILED"
	userId?: string
	sessionAffinity?: string
	shardId?: string
	sessionToken?: string
	attempts: number
	lastAttemptAt: number
	error?: string
}

// Token response schema from OpenAI
const tokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().min(1).optional(),
	id_token: z.string().optional(),
	expires_in: z.number(),
	email: z.string().optional(),
	token_type: z.string().optional(),
})

/**
 * JWT claims structure for extracting ChatGPT account ID
 */
interface IdTokenClaims {
	chatgpt_account_id?: string
	organizations?: Array<{ id: string }>
	email?: string
	exp?: number
	iat?: number
	"https://api.openai.com/auth"?: {
		chatgpt_account_id?: string
	}
	"https://api.openai.com/profile"?: {
		email?: string
		name?: string
	}
}

/**
 * Parse JWT claims from a token
 * Returns undefined if the token is invalid or cannot be parsed
 */
export function parseJwtClaims(token: string): IdTokenClaims | undefined {
	const parts = token.split(".")
	if (parts.length !== 3) return undefined
	try {
		// Use base64url decoding (Node.js Buffer handles this)
		const payload = Buffer.from(parts[1], "base64url").toString("utf-8")
		return JSON.parse(payload) as IdTokenClaims
	} catch {
		return undefined
	}
}

/**
 * Extract ChatGPT account ID from JWT claims
 * Checks multiple locations:
 * 1. Root-level chatgpt_account_id
 * 2. Nested under https://api.openai.com/auth
 * 3. First organization ID
 */
export function extractAccountIdFromClaims(claims: IdTokenClaims): string | undefined {
	return claims.chatgpt_account_id || claims["https://api.openai.com/auth"]?.chatgpt_account_id || claims.organizations?.[0]?.id
}

/**
 * Extract ChatGPT account ID from token response
 * Tries id_token first, then access_token
 */
export function extractAccountId(tokens: { id_token?: string; access_token: string }): string | undefined {
	// Try id_token first (more reliable source)
	if (tokens.id_token) {
		const claims = parseJwtClaims(tokens.id_token)
		const accountId = claims && extractAccountIdFromClaims(claims)
		if (accountId) return accountId
	}
	// Fall back to access_token
	if (tokens.access_token) {
		const claims = parseJwtClaims(tokens.access_token)
		return claims ? extractAccountIdFromClaims(claims) : undefined
	}
	return undefined
}

export function extractEmailFromToken(token: string): string | undefined {
	const claims = parseJwtClaims(token)
	if (!claims) return undefined
	return claims.email || claims["https://api.openai.com/profile"]?.email
}

export function extractExpiryFromToken(token: string): number | undefined {
	const claims = parseJwtClaims(token)
	if (claims && typeof claims.exp === "number" && claims.exp > 0) {
		return claims.exp * 1000
	}
	return undefined
}

/**
 * Writes data atomically to disk with explicit 0o600 file permissions and fsync flushing.
 * Avoids partial writes, race condition corruption, or permission leakage.
 */
export function writeAtomicJsonFile(targetPath: string, data: unknown): void {
	const dir = path.dirname(targetPath)
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
	}

	const tempFile = path.join(dir, `.tmp.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}`)

	const serialized = JSON.stringify(data, null, 2)
	const fd = fs.openSync(tempFile, "w", 0o600)
	try {
		fs.writeFileSync(fd, serialized, "utf-8")
		fs.fsyncSync(fd)
	} finally {
		fs.closeSync(fd)
	}

	try {
		fs.renameSync(tempFile, targetPath)
		try {
			fs.chmodSync(targetPath, 0o600)
		} catch {
			// Best-effort chmod if filesystem permits
		}
	} catch (err) {
		try {
			if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
		} catch {
			// Non-fatal cleanup
		}
		throw err
	}
}

export class OpenAiCodexOAuthTokenError extends Error {
	public readonly status?: number
	public readonly errorCode?: string

	constructor(message: string, opts?: { status?: number; errorCode?: string }) {
		super(message)
		this.name = "OpenAiCodexOAuthTokenError"
		this.status = opts?.status
		this.errorCode = opts?.errorCode
	}

	public isLikelyInvalidGrant(): boolean {
		if (this.errorCode && /invalid_grant/i.test(this.errorCode)) {
			return true
		}
		if (this.status === 400 || this.status === 401 || this.status === 403) {
			return /invalid_grant|revoked|expired|invalid refresh/i.test(this.message)
		}
		return false
	}
}

export function parseOAuthErrorDetails(errorText: string): { errorCode?: string; errorMessage?: string } {
	try {
		const json: unknown = JSON.parse(errorText)
		if (!json || typeof json !== "object") {
			return {}
		}

		const obj = json as Record<string, unknown>
		const errorField = obj.error

		const errorCode: string | undefined =
			typeof errorField === "string"
				? errorField
				: errorField && typeof errorField === "object" && typeof (errorField as Record<string, unknown>).type === "string"
					? ((errorField as Record<string, unknown>).type as string)
					: undefined

		const errorDescription = obj.error_description
		const errorMessageFromError =
			errorField && typeof errorField === "object" ? (errorField as Record<string, unknown>).message : undefined

		const errorMessage: string | undefined =
			typeof errorDescription === "string"
				? errorDescription
				: typeof errorMessageFromError === "string"
					? errorMessageFromError
					: typeof obj.message === "string"
						? obj.message
						: undefined

		return { errorCode, errorMessage }
	} catch {
		return {}
	}
}

/**
 * Generates a cryptographically random PKCE code verifier
 * Must be 43-128 characters long using unreserved characters
 */
export function generateCodeVerifier(): string {
	const buffer = crypto.randomBytes(32)
	return buffer.toString("base64url")
}

/**
 * Generates the PKCE code challenge from the verifier using S256 method
 */
export function generateCodeChallenge(verifier: string): string {
	const hash = crypto.createHash("sha256").update(verifier).digest()
	return hash.toString("base64url")
}

/**
 * Generates a random state parameter for CSRF protection
 */
export function generateState(): string {
	return crypto.randomBytes(16).toString("hex")
}

/**
 * Builds the authorization URL for OpenAI Codex OAuth flow
 * Includes Codex-specific parameters per the implementation guide
 */
export function buildAuthorizationUrl(codeChallenge: string, state: string, originatorOverride?: string): string {
	const params = new URLSearchParams({
		client_id: OPENAI_CODEX_OAUTH_CONFIG.clientId,
		redirect_uri: OPENAI_CODEX_OAUTH_CONFIG.redirectUri,
		scope: OPENAI_CODEX_OAUTH_CONFIG.scopes,
		code_challenge: codeChallenge,
		code_challenge_method: "S256",
		response_type: "code",
		state,
		// Codex-specific parameters
		codex_cli_simplified_flow: "true",
		originator: originatorOverride || "dietcode",
		id_token_add_organizations: "true",
	})

	return `${OPENAI_CODEX_OAUTH_CONFIG.authorizationEndpoint}?${params.toString()}`
}

/**
 * Exchanges the authorization code for tokens
 * Important: Uses application/x-www-form-urlencoded (not JSON)
 * Important: state must NOT be included in token exchange body
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OpenAiCodexCredentials> {
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		client_id: OPENAI_CODEX_OAUTH_CONFIG.clientId,
		code,
		redirect_uri: OPENAI_CODEX_OAUTH_CONFIG.redirectUri,
		code_verifier: codeVerifier,
	})

	const response = await fetch(OPENAI_CODEX_OAUTH_CONFIG.tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
		signal: AbortSignal.timeout(30000),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`)
	}

	const data = await response.json()
	const tokenResponse = tokenResponseSchema.parse(data)

	if (!tokenResponse.refresh_token) {
		throw new Error("Token exchange did not return a refresh_token")
	}

	const tokenSource = tokenResponse.id_token || tokenResponse.access_token
	const accountId = extractAccountId({
		id_token: tokenResponse.id_token,
		access_token: tokenResponse.access_token,
	})
	const email = tokenResponse.email || extractEmailFromToken(tokenSource)
	const jwtExpiry = extractExpiryFromToken(tokenResponse.access_token)
	const computedExpiry = typeof jwtExpiry === "number" ? jwtExpiry : Date.now() + tokenResponse.expires_in * 1000

	return {
		type: "openai-codex",
		access_token: tokenResponse.access_token,
		refresh_token: tokenResponse.refresh_token,
		expires: computedExpiry,
		email,
		accountId,
		id_token: tokenResponse.id_token || tokenResponse.access_token,
	}
}

/**
 * Refreshes the access token using the refresh token
 * Uses application/x-www-form-urlencoded (not JSON)
 */
export async function refreshAccessToken(credentials: OpenAiCodexCredentials): Promise<OpenAiCodexCredentials> {
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		client_id: OPENAI_CODEX_OAUTH_CONFIG.clientId,
		refresh_token: credentials.refresh_token,
	})

	const response = await fetch(OPENAI_CODEX_OAUTH_CONFIG.tokenEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
		signal: AbortSignal.timeout(30000),
	})

	if (!response.ok) {
		const errorText = await response.text()
		const { errorCode, errorMessage } = parseOAuthErrorDetails(errorText)
		const details = errorMessage ? errorMessage : errorText
		throw new OpenAiCodexOAuthTokenError(
			`Token refresh failed: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`,
			{ status: response.status, errorCode },
		)
	}

	const data = await response.json()
	const tokenResponse = tokenResponseSchema.parse(data)

	const tokenSource = tokenResponse.id_token || tokenResponse.access_token
	const newAccountId = extractAccountId({
		id_token: tokenResponse.id_token,
		access_token: tokenResponse.access_token,
	})
	const newEmail = tokenResponse.email || extractEmailFromToken(tokenSource)
	const jwtExpiry = extractExpiryFromToken(tokenResponse.access_token)
	const computedExpiry = typeof jwtExpiry === "number" ? jwtExpiry : Date.now() + (tokenResponse.expires_in ?? 3600) * 1000

	return {
		type: "openai-codex",
		access_token: tokenResponse.access_token,
		refresh_token: tokenResponse.refresh_token ?? credentials.refresh_token,
		expires: computedExpiry,
		email: newEmail ?? credentials.email,
		accountId: newAccountId ?? credentials.accountId,
		id_token: tokenResponse.id_token ?? credentials.id_token ?? tokenResponse.access_token,
	}
}

/**
 * Checks if the credentials are expired (with 5 minute buffer)
 * Per the implementation guide: expires is in milliseconds since epoch
 */
export function isTokenExpired(credentials: OpenAiCodexCredentials, bufferMs = 5 * 60 * 1000): boolean {
	return Date.now() >= credentials.expires - bufferMs
}

/**
 * OpenAiCodexOAuthManager - Enterprise-Grade OAuth Lifecycle & Ingestion Manager
 */
export class OpenAiCodexOAuthManager {
	private credentials: OpenAiCodexCredentials | null = null
	private refreshPromise: Promise<OpenAiCodexCredentials> | null = null
	private syncFlightPromise: Promise<GalxSyncResult> | null = null
	private isAutoSyncing = false
	private lastSyncCompletedAtMs = 0
	private lastSyncedPayloadHash = ""
	private lastSyncResult: GalxSyncResult | null = null
	private sessionCache = new Map<string, OpenAiCodexCredentials & { savedAt: number }>()
	private cloudSyncLedger = new Map<string, CloudSyncLedgerRecord>()
	private pendingAuth: {
		codeVerifier: string
		state: string
		server?: http.Server
	} | null = null

	/**
	 * Force a refresh using the stored refresh token even if the access token is not expired.
	 * Useful when the server invalidates an access token early.
	 */
	async forceRefreshAccessToken(): Promise<string | null> {
		if (!this.credentials) {
			await this.loadCredentials()
		}

		if (!this.credentials) {
			return null
		}

		try {
			// De-dupe concurrent refreshes
			if (!this.refreshPromise) {
				this.refreshPromise = refreshAccessToken(this.credentials)
			}

			const newCredentials = await this.refreshPromise
			this.refreshPromise = null
			await this.saveCredentials(newCredentials, true, true)
			return newCredentials.access_token
		} catch (error) {
			this.refreshPromise = null
			Logger.error("[openai-codex-oauth] Failed to force refresh token:", error)
			if (error instanceof OpenAiCodexOAuthTokenError && error.isLikelyInvalidGrant()) {
				Logger.log("[openai-codex-oauth] Refresh token appears invalid; clearing stored credentials")
				await this.clearCredentials()
			}
			return null
		}
	}

	/**
	 * Load credentials from storage via StateManager and fall back to disk reconciliation.
	 */
	async loadCredentials(): Promise<OpenAiCodexCredentials | null> {
		try {
			try {
				const stateManager = StateManager.get()
				const credentialsJson = stateManager.getSecretKey("openai-codex-oauth-credentials")

				if (credentialsJson) {
					const parsed = JSON.parse(credentialsJson)
					this.credentials = openAiCodexCredentialsSchema.parse(parsed)
					this.sessionCache.set("active_lease", {
						...this.credentials,
						savedAt: Date.now(),
					})
					const galxSession = this.getGalxSession()
					if (galxSession?.sessionAffinity) {
						broccoliTransportSubstrate.setActiveSessionAffinity(galxSession.sessionAffinity)
					}
					return this.credentials
				}
			} catch {
				// StateManager might not be initialized in CLI/standalone context
			}

			// Fallback to disk scan
			const loadedFromDisk = this.loadFromDisk()
			if (loadedFromDisk && this.credentials) {
				const galxSession = this.getGalxSession()
				if (galxSession?.sessionAffinity) {
					broccoliTransportSubstrate.setActiveSessionAffinity(galxSession.sessionAffinity)
				}
				return this.credentials
			}

			if (this.credentials) {
				const galxSession = this.getGalxSession()
				if (galxSession?.sessionAffinity) {
					broccoliTransportSubstrate.setActiveSessionAffinity(galxSession.sessionAffinity)
				}
				return this.credentials
			}

			return null
		} catch (error) {
			Logger.error("[openai-codex-oauth] Failed to load credentials:", error)
			return null
		}
	}

	/**
	 * Save credentials to StateManager, in-memory session cache, and synchronize to disk.
	 */
	async saveCredentials(credentials: OpenAiCodexCredentials, syncToDisk = true, triggerAsyncCloudSync = true): Promise<void> {
		this.credentials = credentials
		this.sessionCache.set("active_lease", {
			...credentials,
			savedAt: Date.now(),
		})

		try {
			const stateManager = StateManager.get()
			stateManager.setSecret("openai-codex-oauth-credentials", JSON.stringify(credentials))
			await stateManager.flushPendingState()
		} catch {
			// StateManager optional fallback
		}

		if (syncToDisk) {
			this.syncCredentialsToDisk(credentials)
		}

		if (triggerAsyncCloudSync) {
			this.triggerSilentBackgroundSync()
		}
	}

	/**
	 * Clear credentials from storage and in-memory cache
	 */
	async clearCredentials(): Promise<void> {
		try {
			const stateManager = StateManager.get()
			stateManager.setSecret("openai-codex-oauth-credentials", undefined)
			await stateManager.flushPendingState()
		} catch {
			// StateManager optional fallback
		}
		this.credentials = null
		this.sessionCache.delete("active_lease")
		this.cloudSyncLedger.delete("latest_sync")
		broccoliTransportSubstrate.clearActiveSessionAffinity()
	}

	/**
	 * Sync credentials across local disk targets (~/.codex/auth.json, ~/.dietcode/config.json, ~/.lumi/config.json)
	 */
	syncCredentialsToDisk(credentials: OpenAiCodexCredentials): void {
		try {
			// 1. Sync to ~/.codex/auth.json
			const codexAuthPath = path.join(os.homedir(), ".codex", "auth.json")
			let existingCodex: any = {}
			if (fs.existsSync(codexAuthPath)) {
				try {
					existingCodex = JSON.parse(fs.readFileSync(codexAuthPath, "utf-8"))
				} catch {
					existingCodex = {}
				}
			}
			const idToken = credentials.id_token || existingCodex.tokens?.id_token || credentials.access_token
			const codexData = {
				auth_mode: existingCodex.auth_mode || "chatgpt",
				OPENAI_API_KEY: existingCodex.OPENAI_API_KEY || null,
				tokens: {
					id_token: idToken,
					access_token: credentials.access_token,
					refresh_token: credentials.refresh_token,
					account_id: credentials.accountId || existingCodex.tokens?.account_id,
				},
				last_refresh: new Date().toISOString(),
			}
			writeAtomicJsonFile(codexAuthPath, codexData)

			// 2. Sync to ~/.dietcode/config.json
			const dietcodeConfigPath = path.join(os.homedir(), ".dietcode", "config.json")
			let dietcodeConfig: any = {}
			if (fs.existsSync(dietcodeConfigPath)) {
				try {
					dietcodeConfig = JSON.parse(fs.readFileSync(dietcodeConfigPath, "utf-8"))
				} catch {
					dietcodeConfig = {}
				}
			}
			dietcodeConfig.codexOAuth = credentials
			if (credentials.accountId) {
				dietcodeConfig.codexOAuthPool = dietcodeConfig.codexOAuthPool || {}
				dietcodeConfig.codexOAuthPool[credentials.accountId] = {
					accountId: credentials.accountId,
					access_token: credentials.access_token,
					refresh_token: credentials.refresh_token,
					id_token: idToken,
					email: credentials.email || `${credentials.accountId}@openai.oauth`,
					updatedAt: Date.now(),
					weight: 1,
					priority: 10,
				}
			}
			dietcodeConfig.updatedAt = Date.now()
			writeAtomicJsonFile(dietcodeConfigPath, dietcodeConfig)

			// 3. Sync to ~/.lumi/config.json
			const lumiConfigPath = path.join(os.homedir(), ".lumi", "config.json")
			let lumiConfig: any = {}
			if (fs.existsSync(lumiConfigPath)) {
				try {
					lumiConfig = JSON.parse(fs.readFileSync(lumiConfigPath, "utf-8"))
				} catch {
					lumiConfig = {}
				}
			}
			lumiConfig.codexOAuth = credentials
			if (credentials.accountId) {
				lumiConfig.codexOAuthPool = lumiConfig.codexOAuthPool || {}
				lumiConfig.codexOAuthPool[credentials.accountId] = {
					accountId: credentials.accountId,
					access_token: credentials.access_token,
					refresh_token: credentials.refresh_token,
					id_token: idToken,
					email: credentials.email || `${credentials.accountId}@openai.oauth`,
					updatedAt: Date.now(),
					weight: 1,
					priority: 10,
				}
			}
			lumiConfig.updatedAt = Date.now()
			writeAtomicJsonFile(lumiConfigPath, lumiConfig)
		} catch {
			// Non-fatal disk sync fallback
		}
	}

	/**
	 * Evaluates all candidate credential paths, choosing the freshest valid credentials
	 * and synchronizing all stores to prevent cross-process drift.
	 */
	loadFromDisk(authPath?: string, candidatePathsOverride?: string[]): boolean {
		const candidatePaths: string[] =
			candidatePathsOverride ??
			[
				authPath,
				path.join(os.homedir(), ".dietcode", "config.json"),
				path.join(os.homedir(), ".lumi", "config.json"),
				path.join(os.homedir(), ".codex", "auth.json"),
				path.join(os.homedir(), ".pi", "auth.json"),
			].filter((p): p is string => Boolean(p))

		interface ParsedCandidate {
			creds: OpenAiCodexCredentials
			timestamp: number
			sourcePath: string
		}

		const discovered: ParsedCandidate[] = []

		for (const p of candidatePaths) {
			if (fs.existsSync(p)) {
				try {
					const stats = fs.statSync(p)
					const raw = fs.readFileSync(p, "utf-8")
					const data = JSON.parse(raw) as any

					// Candidate format 1: DietCode / LUMI config format
					if (
						data.codexOAuth?.access_token &&
						data.codexOAuth?.refresh_token &&
						typeof data.codexOAuth?.expires === "number"
					) {
						const tokenSource = data.codexOAuth.id_token || data.codexOAuth.access_token
						const accountId =
							data.codexOAuth.accountId ||
							extractAccountId({ id_token: data.codexOAuth.id_token, access_token: data.codexOAuth.access_token })
						const email = data.codexOAuth.email || extractEmailFromToken(tokenSource)
						const jwtExp = extractExpiryFromToken(data.codexOAuth.access_token)
						const expires = typeof jwtExp === "number" ? jwtExp : data.codexOAuth.expires

						discovered.push({
							creds: {
								type: "openai-codex",
								access_token: data.codexOAuth.access_token,
								refresh_token: data.codexOAuth.refresh_token,
								expires,
								email,
								accountId,
								id_token: data.codexOAuth.id_token,
							},
							timestamp: typeof data.updatedAt === "number" ? data.updatedAt : stats.mtimeMs,
							sourcePath: p,
						})
					}

					// Candidate format 2: Codex auth.json format
					if (data.tokens?.access_token && data.tokens?.refresh_token) {
						const tokenSource = data.tokens.id_token || data.tokens.access_token
						const accountId =
							data.tokens.account_id ||
							extractAccountId({ id_token: data.tokens.id_token, access_token: data.tokens.access_token })
						const email = extractEmailFromToken(tokenSource)
						const jwtExp = extractExpiryFromToken(data.tokens.access_token)
						const expires = typeof jwtExp === "number" ? jwtExp : Date.now() + (data.tokens.expires_in ?? 3600) * 1000

						let parsedTimestamp = stats.mtimeMs
						if (data.last_refresh) {
							const dt = Date.parse(data.last_refresh)
							if (!isNaN(dt)) parsedTimestamp = dt
						}

						discovered.push({
							creds: {
								type: "openai-codex",
								access_token: data.tokens.access_token,
								refresh_token: data.tokens.refresh_token,
								expires,
								accountId,
								email,
								id_token: data.tokens.id_token,
							},
							timestamp: parsedTimestamp,
							sourcePath: p,
						})
					}
				} catch {
					// Ignore individual file parse errors
				}
			}
		}

		if (discovered.length === 0) {
			return false
		}

		// Sort by freshest timestamp descending
		discovered.sort((a, b) => b.timestamp - a.timestamp)
		const chosen = discovered[0]

		// Save and re-sync across all disk targets
		this.saveCredentials(chosen.creds, true, false)
		return true
	}

	/**
	 * Get deep diagnostic telemetry on authentication sources and synchronization posture.
	 */
	getAuthDiagnostics(): CodexAuthDiagnostics {
		const candidatePaths: string[] = [
			path.join(os.homedir(), ".dietcode", "config.json"),
			path.join(os.homedir(), ".lumi", "config.json"),
			path.join(os.homedir(), ".codex", "auth.json"),
			path.join(os.homedir(), ".pi", "auth.json"),
		]

		const sources: AuthSourceAudit[] = candidatePaths.map((p) => {
			const exists = fs.existsSync(p)
			let mode: number | undefined
			let isReadable = false
			let lastModified: number | undefined
			let hasTokens = false
			let accountId: string | undefined
			let expiresAt: number | undefined

			if (exists) {
				try {
					const stat = fs.statSync(p)
					mode = stat.mode & 0o777
					lastModified = stat.mtimeMs
					const raw = fs.readFileSync(p, "utf-8")
					isReadable = true
					const data = JSON.parse(raw)
					if (data.codexOAuth?.access_token) {
						hasTokens = true
						accountId = data.codexOAuth.accountId
						expiresAt = data.codexOAuth.expires
					} else if (data.tokens?.access_token) {
						hasTokens = true
						accountId = data.tokens.account_id
					}
				} catch {
					isReadable = false
				}
			}

			return {
				path: p,
				exists,
				mode,
				isReadable,
				lastModified,
				hasTokens,
				accountId,
				expiresAt,
			}
		})

		const hasCreds = this.credentials !== null
		const isExpired = this.credentials ? isTokenExpired(this.credentials) : true
		const tokenSourcesWithAuth = sources.filter((s) => s.hasTokens)

		let syncStatus: CodexAuthDiagnostics["syncStatus"] = "UNCONFIGURED"
		if (tokenSourcesWithAuth.length >= 2) {
			syncStatus = "SYNCHRONIZED"
		} else if (tokenSourcesWithAuth.length === 1) {
			syncStatus = "DESYNCHRONIZED"
		}

		return {
			authenticated: hasCreds && !isExpired,
			accountId: this.credentials?.accountId,
			email: this.credentials?.email,
			expiresAt: this.credentials?.expires,
			expiresInMs: this.credentials ? Math.max(0, this.credentials.expires - Date.now()) : undefined,
			isExpired,
			hasValidRefreshToken: Boolean(this.credentials?.refresh_token),
			sources,
			syncStatus,
		}
	}

	/**
	 * Get a valid access token, refreshing if necessary (with 5-minute pre-emptive buffer)
	 */
	async getAccessToken(): Promise<string | null> {
		if (!this.credentials) {
			await this.loadCredentials()
		}

		if (!this.credentials) {
			return null
		}

		if (isTokenExpired(this.credentials)) {
			try {
				if (!this.refreshPromise) {
					this.refreshPromise = refreshAccessToken(this.credentials)
				}

				const newCredentials = await this.refreshPromise
				this.refreshPromise = null
				await this.saveCredentials(newCredentials, true, true)
			} catch (error) {
				this.refreshPromise = null
				Logger.error("[openai-codex-oauth] Failed to refresh token:", error)

				if (error instanceof OpenAiCodexOAuthTokenError && error.isLikelyInvalidGrant()) {
					Logger.log("[openai-codex-oauth] Refresh token appears invalid; clearing stored credentials")
					await this.clearCredentials()
				}
				return null
			}
		}

		return this.credentials?.access_token ?? null
	}

	/**
	 * Alias for getAccessToken with automatic loading from disk/cache
	 */
	async getValidAccessToken(): Promise<string | null> {
		return this.getAccessToken()
	}

	/**
	 * Get the user's email from credentials
	 */
	async getEmail(): Promise<string | null> {
		if (!this.credentials) {
			await this.loadCredentials()
		}
		return this.credentials?.email || null
	}

	/**
	 * Get the ChatGPT account ID from credentials
	 * Used for the ChatGPT-Account-Id header required by the Codex API
	 */
	async getAccountId(): Promise<string | null> {
		if (!this.credentials) {
			await this.loadCredentials()
		}
		return this.credentials?.accountId || null
	}

	/**
	 * Alias for getAccountId
	 */
	getChatGPTAccountId(): string | undefined {
		return this.credentials?.accountId
	}

	/**
	 * Check if the user has stored credentials (i.e. has completed auth).
	 */
	async isAuthenticated(): Promise<boolean> {
		if (!this.credentials) {
			await this.loadCredentials()
		}
		return this.credentials !== null
	}

	/**
	 * Triggers a non-blocking, resilient background cloud synchronization.
	 */
	triggerSilentBackgroundSync(
		galxBaseUrl: string = process.env.GALX_URL || process.env.NEXT_PUBLIC_APP_URL || "https://galx.ai",
		mode: "pooled" | "private" = "pooled",
	): void {
		if (this.isAutoSyncing) return
		this.isAutoSyncing = true
		Promise.resolve().then(async () => {
			try {
				await this.syncToGalx(galxBaseUrl, mode)
			} catch {
				// Silently handled in background
			} finally {
				this.isAutoSyncing = false
			}
		})
	}

	/**
	 * Synchronizes active OpenAI Codex OAuth credentials with cloud backend (GALXAI).
	 * Features:
	 * - Single-Flight Coalescing: Consolidates concurrent sync requests into 1 execution.
	 * - Exponential Backoff: Retries up to 3 times with jitter on transient failures.
	 * - RFC 9530 SHA-256 Digest header & 24h Idempotency-Key.
	 */
	async syncToGalx(
		galxBaseUrl: string = process.env.GALX_URL || process.env.NEXT_PUBLIC_APP_URL || "https://galx.ai",
		mode: "pooled" | "private" = "pooled",
	): Promise<GalxSyncResult> {
		if (this.syncFlightPromise) {
			return this.syncFlightPromise
		}

		this.syncFlightPromise = (async () => {
			try {
				if (!this.credentials) {
					await this.loadCredentials()
				}
				if (!this.credentials) {
					return { success: false, error: "No active OpenAI Codex credentials found to synchronize." }
				}

				const payloadStr = `${this.credentials.access_token}:${this.credentials.refresh_token}:${this.credentials.expires}:${mode}`
				const currentHash = crypto.createHash("sha256").update(payloadStr).digest("hex")

				// Anti-stampede debounce: Coalesce rapid duplicate syncs within 5s if payload unchanged
				if (
					this.lastSyncResult &&
					this.lastSyncResult.success &&
					this.lastSyncedPayloadHash === currentHash &&
					Date.now() - this.lastSyncCompletedAtMs < 5000
				) {
					return this.lastSyncResult
				}

				const cleanBaseUrl = galxBaseUrl.replace(/\/$/, "")
				const payload: GalxIngestPayload = {
					provider: "openai",
					accessToken: this.credentials.access_token,
					refreshToken: this.credentials.refresh_token,
					accountId: this.credentials.accountId,
					idToken: this.credentials.id_token,
					expiresAtMs: this.credentials.expires,
					email: this.credentials.email,
					displayName: this.credentials.email?.split("@")[0] || "CodeMarie Local Agent",
					mode,
					authType: "oauth",
					workspaceId: "codemarie-local",
					scopes: ["*"],
				}

				const transportRes = await galxTransportClient.ingestCredentials(payload, {
					overrideBaseUrl: cleanBaseUrl,
				})

				if (!transportRes.success || !transportRes.data?.user) {
					const errorMsg = transportRes.error || "Failed to reach cloud authentication gateway"
					this.cloudSyncLedger.set("latest_sync", {
						id: "latest_sync",
						status: "FAILED",
						attempts: transportRes.attempts,
						lastAttemptAt: Date.now(),
						error: errorMsg,
					})
					return { success: false, error: errorMsg }
				}

				const user = transportRes.data.user
				if (user.sessionAffinity) {
					broccoliTransportSubstrate.setActiveSessionAffinity(user.sessionAffinity)
				}

				this.cloudSyncLedger.set("latest_sync", {
					id: "latest_sync",
					status: "SYNCED",
					userId: user.id,
					sessionAffinity: user.sessionAffinity,
					sessionToken: user.token,
					attempts: transportRes.attempts,
					lastAttemptAt: Date.now(),
				})

				const configRecord: GalxSessionConfig = {
					baseUrl: cleanBaseUrl,
					userId: user.id,
					sessionAffinity: user.sessionAffinity,
					sessionToken: user.token,
					email: user.email || this.credentials.email,
					syncedAt: Date.now(),
				}
				this.saveGalxSessionToDisk(configRecord)

				const syncResult: GalxSyncResult = {
					success: true,
					userId: user.id,
					sessionAffinity: user.sessionAffinity,
					sessionToken: user.token,
					email: user.email || this.credentials.email,
				}

				this.lastSyncCompletedAtMs = Date.now()
				this.lastSyncedPayloadHash = currentHash
				this.lastSyncResult = syncResult

				return syncResult
			} finally {
				this.syncFlightPromise = null
			}
		})()

		return this.syncFlightPromise
	}

	saveGalxSessionToDisk(galxConfig: GalxSessionConfig): void {
		try {
			// 1. Save to ~/.dietcode/config.json
			const dietcodeConfigPath = path.join(os.homedir(), ".dietcode", "config.json")
			let dietcodeConfig: any = {}
			if (fs.existsSync(dietcodeConfigPath)) {
				try {
					dietcodeConfig = JSON.parse(fs.readFileSync(dietcodeConfigPath, "utf-8"))
				} catch {
					dietcodeConfig = {}
				}
			}
			dietcodeConfig.galx = galxConfig
			dietcodeConfig.updatedAt = Date.now()
			writeAtomicJsonFile(dietcodeConfigPath, dietcodeConfig)

			// 2. Save to ~/.lumi/config.json
			const lumiConfigPath = path.join(os.homedir(), ".lumi", "config.json")
			let lumiConfig: any = {}
			if (fs.existsSync(lumiConfigPath)) {
				try {
					lumiConfig = JSON.parse(fs.readFileSync(lumiConfigPath, "utf-8"))
				} catch {
					lumiConfig = {}
				}
			}
			lumiConfig.galx = galxConfig
			lumiConfig.updatedAt = Date.now()
			writeAtomicJsonFile(lumiConfigPath, lumiConfig)
		} catch {
			// Non-fatal disk sync fallback
		}
	}

	getGalxSession(): GalxSessionConfig | null {
		const memRecord = this.cloudSyncLedger.get("latest_sync")
		if (memRecord?.status === "SYNCED" && memRecord?.sessionToken) {
			return {
				baseUrl: process.env.GALX_URL || process.env.NEXT_PUBLIC_APP_URL || "https://galx.ai",
				userId: memRecord.userId || "usr_synced",
				sessionAffinity: memRecord.sessionAffinity,
				shardId: memRecord.shardId,
				sessionToken: memRecord.sessionToken,
				email: this.credentials?.email || memRecord.userId,
				syncedAt: memRecord.lastAttemptAt,
			}
		}

		try {
			const dietcodeConfigPath = path.join(os.homedir(), ".dietcode", "config.json")
			if (fs.existsSync(dietcodeConfigPath)) {
				const raw = fs.readFileSync(dietcodeConfigPath, "utf-8")
				const data = JSON.parse(raw)
				if (data.galx?.sessionToken) {
					return data.galx as GalxSessionConfig
				}
			}
		} catch {}

		try {
			const lumiConfigPath = path.join(os.homedir(), ".lumi", "config.json")
			if (fs.existsSync(lumiConfigPath)) {
				const raw = fs.readFileSync(lumiConfigPath, "utf-8")
				const data = JSON.parse(raw)
				if (data.galx?.sessionToken) {
					return data.galx as GalxSessionConfig
				}
			}
		} catch {}

		return null
	}

	getSessionCache(): Map<string, OpenAiCodexCredentials & { savedAt: number }> {
		return this.sessionCache
	}

	getCloudSyncLedger(): Map<string, CloudSyncLedgerRecord> {
		return this.cloudSyncLedger
	}

	/**
	 * Start the OAuth authorization flow
	 * Returns the authorization URL to open in browser
	 */
	startAuthorizationFlow(originatorOverride?: string): string {
		this.cancelAuthorizationFlow()

		const codeVerifier = generateCodeVerifier()
		const codeChallenge = generateCodeChallenge(codeVerifier)
		const state = generateState()

		this.pendingAuth = {
			codeVerifier,
			state,
		}

		return buildAuthorizationUrl(codeChallenge, state, originatorOverride)
	}

	/**
	 * Start a local server to receive the OAuth callback
	 * Returns a promise that resolves when authentication is complete
	 */
	async waitForCallback(): Promise<OpenAiCodexCredentials> {
		if (!this.pendingAuth) {
			throw new Error("No pending authorization flow")
		}

		if (this.pendingAuth.server) {
			try {
				this.pendingAuth.server.close()
			} catch {
				// Ignore errors when closing
			}
			this.pendingAuth.server = undefined
		}

		return new Promise((resolve, reject) => {
			const server = http.createServer(async (req, res) => {
				try {
					const url = new URL(req.url || "", `http://localhost:${OPENAI_CODEX_OAUTH_CONFIG.callbackPort}`)

					if (url.pathname !== "/auth/callback") {
						res.writeHead(404)
						res.end("Not Found")
						return
					}

					const code = url.searchParams.get("code")
					const state = url.searchParams.get("state")
					const error = url.searchParams.get("error")

					if (error) {
						res.writeHead(400)
						res.end(`Authentication failed: ${error}`)
						reject(new Error(`OAuth error: ${error}`))
						server.close()
						return
					}

					if (!code || !state) {
						res.writeHead(400)
						res.end("Missing code or state parameter")
						reject(new Error("Missing code or state parameter"))
						server.close()
						return
					}

					if (state !== this.pendingAuth?.state) {
						res.writeHead(400)
						res.end("State mismatch - possible CSRF attack")
						reject(new Error("State mismatch"))
						server.close()
						return
					}

					try {
						const credentials = await exchangeCodeForTokens(code, this.pendingAuth.codeVerifier)

						await this.saveCredentials(credentials, true, false)
						// Direct synchronous sync to cloud backend
						await this.syncToGalx().catch(() => ({ success: false }))

						res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
						res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authentication Successful</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
  }
  .container { text-align: center; padding: 48px; max-width: 420px; }
  .icon {
    width: 72px; height: 72px; margin: 0 auto 24px;
    background: linear-gradient(135deg, #10a37f 0%, #1a7f64 100%);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .icon svg { width: 36px; height: 36px; stroke: #fff; stroke-width: 3; fill: none; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 12px; }
  p { font-size: 15px; color: rgba(255,255,255,0.7); line-height: 1.5; }
  .closing { margin-top: 32px; font-size: 13px; color: rgba(255,255,255,0.5); }
</style>
</head>
<body>
<div class="container">
  <div class="icon">
    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
  </div>
  <h1>Authentication Successful</h1>
  <p>You're now signed in to OpenAI Codex. You can close this window and return to your IDE.</p>
  <p class="closing">This window will close automatically...</p>
</div>
<script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>`)

						this.pendingAuth = null
						server.close()
						resolve(credentials)
					} catch (exchangeError) {
						res.writeHead(500)
						res.end(`Token exchange failed: ${exchangeError}`)
						reject(exchangeError)
						server.close()
					}
				} catch (err) {
					res.writeHead(500)
					res.end("Internal server error")
					reject(err)
					server.close()
				}
			})

			server.on("error", (err: NodeJS.ErrnoException) => {
				this.pendingAuth = null
				if (err.code === "EADDRINUSE") {
					reject(
						new Error(
							`Port ${OPENAI_CODEX_OAUTH_CONFIG.callbackPort} is already in use. ` +
								`Please close any other applications using this port and try again.`,
						),
					)
				} else {
					reject(err)
				}
			})

			const timeout = setTimeout(
				() => {
					server.close()
					reject(new Error("Authentication timed out"))
				},
				5 * 60 * 1000,
			)

			server.listen(OPENAI_CODEX_OAUTH_CONFIG.callbackPort, () => {
				if (this.pendingAuth) {
					this.pendingAuth.server = server
				}
			})

			server.on("close", () => {
				clearTimeout(timeout)
			})
		})
	}

	/**
	 * Cancel any pending authorization flow
	 */
	cancelAuthorizationFlow(): void {
		if (this.pendingAuth?.server) {
			this.pendingAuth.server.close()
		}
		this.pendingAuth = null
	}

	/**
	 * Get the current credentials (for display purposes)
	 */
	getCredentials(): OpenAiCodexCredentials | null {
		return this.credentials
	}
}

// Singleton instance
export const openAiCodexOAuthManager = new OpenAiCodexOAuthManager()
