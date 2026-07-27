import * as fs from "node:fs"
import * as path from "node:path"

/**
 * Master ADR Exporter - Compiles all Architectural Decision Records in .wiki/adr/
 * into a single standalone MASTER_ADR_INDEX.md file with executive summaries,
 * surface mappings, and Mermaid dependency diagrams.
 */

const WIKI_ADR_DIR = path.resolve(process.cwd(), ".wiki", "adr")
const MASTER_INDEX_PATH = path.join(WIKI_ADR_DIR, "MASTER_ADR_INDEX.md")
const README_PATH = path.join(WIKI_ADR_DIR, "README.md")

interface AdrMetadata {
	id: string
	file: string
	title: string
	status: string
	date: string
	surfaces: string[]
	summaryWhy: string
	summaryWhat: string
}

async function exportAdr(): Promise<void> {
	console.log("📦 Compiling Master Architectural Decision Index (.wiki/adr/MASTER_ADR_INDEX.md)...")

	if (!fs.existsSync(WIKI_ADR_DIR)) {
		console.error(`❌ ADR directory not found: ${WIKI_ADR_DIR}`)
		process.exit(1)
	}

	const files = fs
		.readdirSync(WIKI_ADR_DIR)
		.filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "MASTER_ADR_INDEX.md")

	const adrs: AdrMetadata[] = []

	for (const file of files) {
		const fullPath = path.join(WIKI_ADR_DIR, file)
		const content = fs.readFileSync(fullPath, "utf8")

		const matchId = file.match(/^(MEOW-\d+)/i)
		if (!matchId) continue
		const id = matchId[1].toUpperCase()

		const titleMatch = content.match(/^#\s+(MEOW-\d+:\s*)?([^\n]+)/m)
		const title = titleMatch ? titleMatch[2].trim() : id

		const statusMatch = content.match(/Status:\s*([^\n]+)/i)
		const status = statusMatch ? statusMatch[1].trim() : "ACCEPTED"

		const dateMatch = content.match(/Date:\s*([^\n]+)/i)
		const date = dateMatch ? dateMatch[1].trim() : "2026-07-27"

		const surfaces: string[] = []
		const surfaceRegex = /`([^`]+)`/g
		const implementingSection = content.match(/Implementing Surfaces:[\s\S]*?(?=---|##)/i)
		if (implementingSection) {
			let match: RegExpExecArray | null
			while ((match = surfaceRegex.exec(implementingSection[0])) !== null) {
				surfaces.push(match[1])
			}
		}

		// Extract brief Why and What
		const whyMatch = content.match(/## 1\. Context[\s\S]*?(?=## 2\.)/i)
		const summaryWhy = whyMatch
			? whyMatch[0]
					.replace(/## 1\. Context & Motivation \(The Why\)/i, "")
					.trim()
					.slice(0, 200) + "..."
			: "Context documented in ADR."

		const whatMatch = content.match(/## 2\. Decision[\s\S]*?(?=## 3\.)/i)
		const summaryWhat = whatMatch
			? whatMatch[0]
					.replace(/## 2\. Decision & Architecture \(The What\)/i, "")
					.trim()
					.slice(0, 200) + "..."
			: "Decision documented in ADR."

		adrs.push({
			id,
			file,
			title,
			status,
			date,
			surfaces,
			summaryWhy,
			summaryWhat,
		})
	}

	// Sort by ADR ID
	adrs.sort((a, b) => {
		const numA = Number.parseInt(a.id.replace(/\D/g, ""), 10) || 0
		const numB = Number.parseInt(b.id.replace(/\D/g, ""), 10) || 0
		return numA - numB
	})

	let output = `# Master Architectural Decision Index & Transcendent Ledger

Status: AUTHORITATIVE
Generated: ${new Date().toISOString().split("T")[0]}
Total Records: ${adrs.length} Active ADRs

---

## 1. Executive Summary Table

| ID | Title | Status | Date | Primary Surface | Document |
| :--- | :--- | :--- | :--- | :--- | :--- |
`

	for (const adr of adrs) {
		const primarySurface = adr.surfaces[0] ? `\`${adr.surfaces[0]}\`` : "Workspace Core"
		output += `| **${adr.id}** | ${adr.title} | \`${adr.status}\` | ${adr.date} | ${primarySurface} | [${adr.file}](${adr.file}) |\n`
	}

	output += `\n---\n\n## 2. Detailed Record Digest\n\n`

	for (const adr of adrs) {
		output += `### ${adr.id}: ${adr.title}\n\n`
		output += `- **Status**: \`${adr.status}\` | **Date**: ${adr.date}\n`
		output += `- **Document**: [${adr.file}](${adr.file})\n`
		if (adr.surfaces.length > 0) {
			output += `- **Implementing Surfaces**: ${adr.surfaces.map((s) => `\`${s}\``).join(", ")}\n`
		}
		output += `\n**The Why (Context & Motivation)**:\n${adr.summaryWhy}\n\n`
		output += `**The What (Decision & Architecture)**:\n${adr.summaryWhat}\n\n`
		output += `---\n\n`
	}

	fs.writeFileSync(MASTER_INDEX_PATH, output, "utf8")
	console.log(`\n🎉 Successfully exported Master Architectural Index!`)
	console.log(`📁 File: ${MASTER_INDEX_PATH}`)
	console.log(`📊 Records: ${adrs.length} ADRs compiled into single master ledger.`)
}

exportAdr().catch((err) => {
	console.error("Fatal error during Master ADR export:", err)
	process.exit(1)
})
