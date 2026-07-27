import * as fs from "node:fs"
import * as path from "node:path"

/**
 * ADR Auditor - Validates that all Architectural Decision Records in .wiki/adr/
 * adhere to industry standards (Michael Nygard / MADR doctrine: The What, The How, and The Why).
 */

const WIKI_ADR_DIR = path.resolve(process.cwd(), ".wiki", "adr")
const README_PATH = path.join(WIKI_ADR_DIR, "README.md")

interface AuditResult {
	file: string
	hasStatus: boolean
	hasWhy: boolean
	hasWhat: boolean
	hasHow: boolean
	indexedInReadme: boolean
	missingPaths: string[]
	errors: string[]
}

async function auditAdr(): Promise<void> {
	console.log("🔍 Auditing Architecture Decision Records (.wiki/adr/)...")

	if (!fs.existsSync(WIKI_ADR_DIR)) {
		console.error(`❌ ADR directory not found: ${WIKI_ADR_DIR}`)
		process.exit(1)
	}

	const readmeContent = fs.existsSync(README_PATH) ? fs.readFileSync(README_PATH, "utf8") : ""
	const files = fs
		.readdirSync(WIKI_ADR_DIR)
		.filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "MASTER_ADR_INDEX.md")

	const results: AuditResult[] = []
	let totalErrors = 0

	for (const file of files) {
		const fullPath = path.join(WIKI_ADR_DIR, file)
		const content = fs.readFileSync(fullPath, "utf8")

		const result: AuditResult = {
			file,
			hasStatus: false,
			hasWhy: false,
			hasWhat: false,
			hasHow: false,
			indexedInReadme: false,
			missingPaths: [],
			errors: [],
		}

		// 1. Check Status
		if (/(status|Status):/i.test(content)) {
			result.hasStatus = true
		} else {
			result.errors.push("Missing Status header (e.g. Status: ACCEPTED)")
		}

		// 2. Check Context (The Why)
		if (/(context|motivation|problem|why)/i.test(content)) {
			result.hasWhy = true
		} else {
			result.errors.push("Missing Context / Motivation section (The Why)")
		}

		// 3. Check Decision (The What)
		if (/(decision|architecture|what)/i.test(content)) {
			result.hasWhat = true
		} else {
			result.errors.push("Missing Decision / Architecture section (The What)")
		}

		// 4. Check Implementation (The How)
		if (/(implementation|surfaces|how|code)/i.test(content)) {
			result.hasHow = true
		} else {
			result.errors.push("Missing Technical Implementation section (The How)")
		}

		// 5. Check index in README.md
		if (readmeContent.includes(file)) {
			result.indexedInReadme = true
		} else {
			result.errors.push(`Not indexed in .wiki/adr/README.md`)
		}

		// 6. Extract file links and check physical existence
		const fileLinkRegex = /file:\/\/\/([^\s)"'>]+)/g
		let match: RegExpExecArray | null
		while ((match = fileLinkRegex.exec(content)) !== null) {
			const targetPath = "/" + match[1]
			if (!fs.existsSync(targetPath)) {
				result.missingPaths.push(targetPath)
				result.errors.push(`Referenced file does not exist: ${targetPath}`)
			}
		}

		if (result.errors.length > 0) {
			totalErrors += result.errors.length
		}

		results.push(result)
	}

	console.log(`\n📋 Audit Summary (${results.length} ADRs checked):`)
	for (const r of results) {
		if (r.errors.length === 0) {
			console.log(`  ✅ ${r.file}: Compliant (What, How, Why verified)`)
		} else {
			console.log(`  ❌ ${r.file}:`)
			for (const err of r.errors) {
				console.log(`     - ${err}`)
			}
		}
	}

	if (totalErrors > 0) {
		console.error(`\n❌ ADR Audit Failed: ${totalErrors} violation(s) found.`)
		process.exit(1)
	} else {
		console.log(`\n🎉 All ${results.length} ADRs pass industry standard validation!`)
	}
}

auditAdr().catch((err) => {
	console.error("Fatal error during ADR audit:", err)
	process.exit(1)
})
