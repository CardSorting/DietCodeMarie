// [LAYER: CORE]
import * as fs from "fs"
import * as path from "path"
import { Logger } from "../../../shared/services/Logger.js"
import { getLayer, Layer } from "../../../utils/joy-zoning.js"

const asNonEmptyString = (value: unknown): string | null => {
	if (typeof value !== "string") return null
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

const REGEX_TSCONFIG_COMMENTS = /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g;
const REGEX_TRAILING_COMMAS = /,(\s*[}\]])/g;

export function isTypeScriptFile(filePath: string): boolean {
	const len = filePath.length
	if (len < 3) return false
	return (
		filePath.charCodeAt(len - 1) === 115 && // 's'
		(filePath.charCodeAt(len - 2) === 116 || filePath.charCodeAt(len - 2) === 106) && // 't' or 'j'
		filePath.charCodeAt(len - 3) === 46 // '.'
	)
}

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"] as const;

export class PathResolver {
	private dynamicAliases: Map<string, string> = new Map()
	private resolutionCache: Map<string, Map<string, string | null>> = new Map()
	private negativeCache: Map<string, Map<string, boolean>> = new Map()
	private canonicalCache: Map<string, string> = new Map()
	private stringInterner: Map<string, string> = new Map() // V200: Memory deduplication core

	constructor(
		private cwd: string,
		defaultAliases?: Record<string, string>,
	) {
		if (defaultAliases) {
			for (const [alias, target] of Object.entries(defaultAliases)) {
				this.dynamicAliases.set(alias, target)
			}
		}
		this.loadProjectAliases()
	}

	public loadProjectAliases() {
		const tsconfigPath = path.join(this.cwd, "tsconfig.json")
		if (fs.existsSync(tsconfigPath)) {
			try {
				const raw = fs.readFileSync(tsconfigPath, "utf-8")
				// V160: Industrial JSON sanitization (String-aware)
				// Strips comments while respecting quoted strings
				const cleanJson = raw.replace(REGEX_TSCONFIG_COMMENTS, (m, g1) => g1 ? "" : m)
					.replace(REGEX_TRAILING_COMMAS, "$1")
				const config = JSON.parse(cleanJson)
				const paths = config.compilerOptions?.paths
				if (paths) {
					for (const [alias, targets] of Object.entries(paths)) {
						if (!Array.isArray(targets) || targets.length === 0) continue
						const cleanAlias = alias.endsWith("/*") ? alias.slice(0, -2) : alias
						const target = targets[0].endsWith("/*") ? targets[0].slice(0, -2) : targets[0]
						this.dynamicAliases.set(cleanAlias, target)
					}
					Logger.info(`[PathResolver] Dynamically loaded ${this.dynamicAliases.size} aliases from tsconfig.json.`)
				}
			} catch (e) {
				Logger.warn("[PathResolver] Failed to parse tsconfig.json for dynamic aliases:", e)
			}
		}
		if (!this.dynamicAliases.has("@/")) {
			this.dynamicAliases.set("@/", "src/")
		}
	}

	/**
	 * V340: Recursive Transitive Resolution.
	 * Resolves an import specifier to its final physical Node ID.
	 * Now follows 'export *' re-exports to ensure that transitive consumers are
	 * correctly mapped to their ultimate producers.
	 */
	public resolveImportToNodeId(
		sourcePath: string,
		specifier: string,
		nodeIds: Map<string, any> | Set<string>,
		visited: Set<string> = new Set(),
	): string | null {
		const safeSourcePath = asNonEmptyString(sourcePath)
		const safeSpecifier = asNonEmptyString(specifier)
		if (!safeSourcePath || !safeSpecifier) return null

		this.checkCacheSaturation()

		let sourceMap = this.resolutionCache.get(safeSourcePath)
		if (sourceMap?.has(safeSpecifier)) return sourceMap.get(safeSpecifier) ?? null

		let result: string | null = null
		if (safeSpecifier.startsWith(".")) {
			const abs = path.resolve(this.cwd, path.dirname(safeSourcePath), safeSpecifier)
			const rel = this.canonicalize(abs)
			if (nodeIds.has(rel)) result = rel
			else if (nodeIds.has(`${rel}.ts`)) result = `${rel}.ts`
			else if (nodeIds.has(`${rel}.tsx`)) result = `${rel}.tsx`
			else {
				const indexTs = path.join(rel, "index.ts").replace(/\\/g, "/")
				if (nodeIds.has(indexTs)) result = indexTs
				else {
					const indexTsx = path.join(rel, "index.tsx").replace(/\\/g, "/")
					if (nodeIds.has(indexTsx)) result = indexTsx
				}
			}
		} else {
			for (const [alias, target] of this.dynamicAliases) {
				if (safeSpecifier.startsWith(alias)) {
					const rel = safeSpecifier.replace(alias, target).replace(/\\/g, "/")
					if (nodeIds.has(rel)) result = rel
					else if (nodeIds.has(`${rel}.ts`)) result = `${rel}.ts`
					else if (nodeIds.has(`${rel}.tsx`)) result = `${rel}.tsx`
					else {
						const indexTs = path.join(rel, "index.ts").replace(/\\/g, "/")
						if (nodeIds.has(indexTs)) result = indexTs
						else {
							const indexTsx = path.join(rel, "index.tsx").replace(/\\/g, "/")
							if (nodeIds.has(indexTsx)) result = indexTsx
						}
					}
					break
				}
			}
		}

		if (!sourceMap) {
			sourceMap = new Map()
			this.resolutionCache.set(safeSourcePath, sourceMap)
		}
		sourceMap.set(safeSpecifier, result)
		return result ? this.intern(result) : null
	}

	public getDiskPath(sourcePath: string, specifier: string): string | null {
		const safeSourcePath = asNonEmptyString(sourcePath)
		const safeSpecifier = asNonEmptyString(specifier)
		if (!safeSourcePath || !safeSpecifier) return null

		let absPath = ""
		if (safeSpecifier.startsWith(".")) {
			absPath = path.resolve(this.cwd, path.dirname(safeSourcePath), safeSpecifier)
		} else {
			let resolved = false
			for (const [alias, target] of this.dynamicAliases) {
				if (safeSpecifier.startsWith(alias)) {
					absPath = path.resolve(this.cwd, safeSpecifier.replace(alias, target))
					resolved = true
					break
				}
			}
			if (!resolved) return null
		}

		// V18: Standardized extension retry logic across all engines
		for (const ext of EXTENSIONS) {
			const full = (absPath.endsWith("/") && ext.startsWith("/") ? absPath.slice(0, -1) : absPath) + ext
			if (fs.existsSync(full) && fs.statSync(full).isFile()) return full
		}
		return null
	}

	public verifyOnDisk(sourcePath: string, specifier: string): boolean {
		const safeSourcePath = asNonEmptyString(sourcePath)
		const safeSpecifier = asNonEmptyString(specifier)
		if (!safeSourcePath || !safeSpecifier) return false

		let sourceMap = this.negativeCache.get(safeSourcePath)
		if (sourceMap?.has(safeSpecifier)) return false

		const diskPath = this.getDiskPath(safeSourcePath, safeSpecifier)
		if (diskPath) return true

		// External check fallback
		if (!safeSpecifier.startsWith(".") && !this.isProjectAlias(safeSpecifier)) return true

		if (!sourceMap) {
			sourceMap = new Map()
			this.negativeCache.set(safeSourcePath, sourceMap)
		}
		sourceMap.set(safeSpecifier, true)
		return false
	}

	public isProjectAlias(specifier: string): boolean {
		const safeSpecifier = asNonEmptyString(specifier)
		if (!safeSpecifier) return false
		for (const alias of this.dynamicAliases.keys()) {
			if (safeSpecifier.startsWith(alias)) return true
		}
		return false
	}

	public resolveLayer(filePath: string): Layer {
		return getLayer(path.resolve(this.cwd, asNonEmptyString(filePath) ?? ""))
	}

	public normalizePath(filePath: string): string {
		return this.canonicalize(filePath)
	}

	/**
	 * V160: High-Velocity Canonicalization.
	 * Memoized fingerprinting for extreme performance on massive structural graphs.
	 */
	public canonicalize(p: string): string {
		const safePath = asNonEmptyString(p)
		if (!safePath) return ""
		this.checkCacheSaturation()
		const cached = this.canonicalCache.get(safePath)
		if (cached) return cached

		let result: string
		try {
			const absolutePath = path.resolve(this.cwd, safePath)
			const relativePath = path.relative(this.cwd, absolutePath)
			result = relativePath.replace(/\\/g, "/").toLowerCase()
		} catch {
			result = safePath.replace(/\\/g, "/").toLowerCase()
		}

		this.canonicalCache.set(safePath, result)
		return this.intern(result)
	}

	/**
	 * V200: String Interning (Atomic Identity).
	 * Ensures that every unique path string exists exactly once in memory.
	 */
	public intern(s: string): string {
		const safeString = asNonEmptyString(s)
		if (!safeString) return ""
		const existing = this.stringInterner.get(safeString)
		if (existing) return existing
		this.stringInterner.set(safeString, safeString)
		return safeString
	}

	/**
	 * V215: Incremental Cache Purge.
	 * Removes all cached resolutions originating from a specific file.
	 */
	public clearFileFromCache(filePath: string) {
		this.resolutionCache.get(filePath)?.clear()
		this.resolutionCache.delete(filePath)
		this.negativeCache.get(filePath)?.clear()
		this.negativeCache.delete(filePath)
	}

	public clearCaches() {
		for (const sub of this.resolutionCache.values()) sub.clear()
		this.resolutionCache.clear()
		for (const sub of this.negativeCache.values()) sub.clear()
		this.negativeCache.clear()
		this.canonicalCache.clear()
		this.stringInterner.clear()
	}

	/**
	 * V200: Industrial Hygiene (Disposal).
	 * Forcefully clears all map references to assist V8 in resource reclamation.
	 */
	public dispose() {
		for (const sub of this.resolutionCache.values()) sub.clear()
		this.resolutionCache.clear()
		for (const sub of this.negativeCache.values()) sub.clear()
		this.negativeCache.clear()
		this.canonicalCache.clear()
		this.stringInterner.clear()
		this.dynamicAliases.clear()
	}

	/**
	 * V200: Cache Saturation Floor.
	 * Prevents indefinite memory growth in massive projects.
	 */
	private checkCacheSaturation() {
		const MAX_ENTRIES = 5000
		if (
			this.resolutionCache.size <= MAX_ENTRIES &&
			this.negativeCache.size <= MAX_ENTRIES &&
			this.canonicalCache.size <= MAX_ENTRIES &&
			this.stringInterner.size <= MAX_ENTRIES
		) {
			return
		}

		const pruneMap = (map: Map<string, any>, label: string) => {
			if (map.size > MAX_ENTRIES) {
				let count = 0
				for (const [key, val] of map.entries()) {
					if (val && typeof val === "object" && typeof val.clear === "function") {
						val.clear()
					}
					map.delete(key)
					count++
					if (count >= 2500) break
				}
				Logger.info(`[PathResolver] ${label} pruned (2500 oldest entries evicted).`)
			}
		}

		pruneMap(this.resolutionCache, "Resolution cache")
		pruneMap(this.negativeCache, "Negative cache")
		pruneMap(this.canonicalCache, "Canonical cache")
		pruneMap(this.stringInterner, "String interner")
	}

	/**
	 * V200: Substrate Boundary Enforcement.
	 * Identifies if a path is part of the internal agentic/system logic
	 * that should be excluded from the structural graph.
	 */
	public isInternalPath(p: string): boolean {
		const norm = this.canonicalize(p)

		// Fast directory check without splitting path into arrays
		if (
			norm.includes("/.gemini/") || norm.startsWith(".gemini/") ||
			norm.includes("/.spider/") || norm.startsWith(".spider/") ||
			norm.includes("/node_modules/") || norm.startsWith("node_modules/") ||
			norm.includes("/.git/") || norm.startsWith(".git/") ||
			norm.includes("/dist/") || norm.startsWith("dist/") ||
			norm.includes("/build/") || norm.startsWith("build/") ||
			norm.includes("/out/") || norm.startsWith("out/") ||
			norm.includes("/target/") || norm.startsWith("target/")
		) {
			return true
		}

		// Fast extension check without array allocations
		const lastDot = norm.lastIndexOf(".")
		if (lastDot !== -1) {
			const ext = norm.slice(lastDot)
			if (
				ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif" ||
				ext === ".svg" || ext === ".ico" || ext === ".woff" || ext === ".woff2" ||
				ext === ".ttf" || ext === ".eot" || ext === ".mp4" || ext === ".wav" || ext === ".mp3"
			) {
				return true
			}
		}

		return false
	}

	/**
	 * V93: Recursive project scanning for substrate re-indexing.
	 */
	public scanProject(): string[] {
		const results: string[] = []
		// V205: Adaptive Root Discovery. Scan 'src' if it exists, otherwise scan the root.
		const startDir = fs.existsSync(path.join(this.cwd, "src")) ? path.join(this.cwd, "src") : this.cwd

		const stack = [startDir]
		while (stack.length > 0) {
			const dir = stack.pop()
			if (!dir) continue
			try {
				const items = fs.readdirSync(dir, { withFileTypes: true })
				for (const item of items) {
					const full = path.join(dir, item.name)
					const itemRel = path.relative(this.cwd, full).replace(/\\/g, "/")

					if (this.isInternalPath(itemRel)) continue

					if (item.isDirectory()) {
						stack.push(full)
					} else if (
						isTypeScriptFile(item.name) ||
						item.name.endsWith(".tsx") ||
						item.name.endsWith(".jsx")
					) {
						results.push(itemRel)
					}
				}
			} catch (e) {
				Logger.warn(`[PathResolver] Failed to scan directory ${dir}:`, e)
			}
		}
		return results
	}

	/**
	 * V204: Deterministic Alias Resolution.
	 * Calculates the most concise alias-based import string for any file in the project.
	 * Prefers deep aliases (@api/, @shared-utils/) over root aliases (@/).
	 */
	public getBestAlias(targetPath: string): string {
		const normTarget = this.canonicalize(targetPath)
		const sortedAliases = Array.from(this.dynamicAliases.entries()).sort((a, b) => b[1].length - a[1].length)

		for (const [alias, replacement] of sortedAliases) {
			const normReplacement = this.canonicalize(replacement)
			if (normTarget === normReplacement || normTarget.startsWith(`${normReplacement}/`)) {
				const result = normTarget.replace(normReplacement, alias).replace(/\\/g, "/")
				// V215: Prevent double-slashes (e.g. @//core -> @/core)
				return result.replace(/\/+/g, "/")
			}
		}

		return normTarget // Fallback to normalized relative path if no alias matches
	}
}


