import fs from "node:fs"
import path from "node:path"

export interface BannedPattern {
	pattern: RegExp
	reason: string
}

export const BANNED_PATTERNS: BannedPattern[] = [
	{
		pattern: /\brounded-(2xl|3xl)\b/g,
		reason: "MoD Violation: Surface radii cap is rounded-md max. Avoid rounded-2xl or rounded-3xl.",
	},
	{
		pattern: /\bbg-black\b/g,
		reason: "MoD Violation: Pure #000000 base prohibited. Use warm slate darks (#0B0C0E).",
	},
	{
		pattern: /\bborder-purple-500\b/g,
		reason: "MoD Violation: Default AI slop neon gradients/borders prohibited.",
	},
	{
		pattern: /\bshadow-2xl\b/g,
		reason: "MoD Violation: Structural division must use 1px hairline borders instead of diffuse shadows.",
	},
]

export function verifyMoDCompliance(filePath: string): string[] {
	if (!fs.existsSync(filePath)) {
		return [`File not found: ${filePath}`]
	}

	const code = fs.readFileSync(filePath, "utf-8")
	const errors: string[] = []

	for (const { pattern, reason } of BANNED_PATTERNS) {
		const matches = code.match(pattern)
		if (matches) {
			errors.push(`[${path.basename(filePath)}] ${reason} (Found: ${Array.from(new Set(matches)).join(", ")})`)
		}
	}

	return errors
}

export function runMoDComplianceCheck(targetDir: string): { totalFilesScanned: number; totalErrors: number; errorLog: string[] } {
	const errorLog: string[] = []
	let totalFilesScanned = 0

	function walkDir(currentPath: string) {
		if (!fs.existsSync(currentPath)) return

		const stats = fs.statSync(currentPath)
		if (stats.isDirectory()) {
			if (currentPath.includes("node_modules") || currentPath.includes("dist") || currentPath.includes(".git")) return
			const entries = fs.readdirSync(currentPath)
			for (const entry of entries) {
				walkDir(path.join(currentPath, entry))
			}
		} else if (stats.isFile()) {
			const ext = path.extname(currentPath)
			if ([".tsx", ".jsx", ".ts", ".css"].includes(ext) && !currentPath.includes("lint-mod-compliance")) {
				totalFilesScanned++
				const fileErrors = verifyMoDCompliance(currentPath)
				if (fileErrors.length > 0) {
					errorLog.push(...fileErrors.map((err) => `${currentPath}: ${err}`))
				}
			}
		}
	}

	walkDir(targetDir)
	return { totalFilesScanned, totalErrors: errorLog.length, errorLog }
}

// CLI Execution Entry Point
if (require.main === module || process.argv[1]?.endsWith("lint-mod-compliance.ts")) {
	const targetDirs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["webview-ui/src"]
	console.log(`🔍 [MoD Compliance Linter] Scanning directories: ${targetDirs.join(", ")}...`)

	let totalScanned = 0
	let totalErrors = 0

	for (const dir of targetDirs) {
		const resolvedPath = path.resolve(process.cwd(), dir)
		const { totalFilesScanned, totalErrors: errCount, errorLog } = runMoDComplianceCheck(resolvedPath)
		totalScanned += totalFilesScanned
		totalErrors += errCount

		if (errorLog.length > 0) {
			console.error(`\n❌ MoD Compliance Violations in ${dir}:`)
			for (const err of errorLog) {
				console.error(`  - ${err}`)
			}
		}
	}

	console.log(`\n📊 [MoD Audit Summary] Scanned ${totalScanned} files. Total violations found: ${totalErrors}`)
	if (totalErrors > 0) {
		process.exit(1)
	} else {
		console.log("✅ [MoD Audit Passed] 100% Studio-Grade Compliance Verified!")
		process.exit(0)
	}
}
