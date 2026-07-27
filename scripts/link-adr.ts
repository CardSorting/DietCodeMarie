import * as fs from "node:fs"
import * as path from "node:path"

/**
 * ADR Graph Dependency Linker - Automatically analyzes cross-references between ADRs in .wiki/adr/
 * and generates a visual Mermaid dependency graph in .wiki/adr/README.md.
 */

const WIKI_ADR_DIR = path.resolve(process.cwd(), ".wiki", "adr")
const README_PATH = path.join(WIKI_ADR_DIR, "README.md")

interface AdrNode {
	id: string
	file: string
	title: string
	links: string[]
}

async function linkAdr(): Promise<void> {
	console.log("🕸️  Generating ADR Dependency Graph (.wiki/adr/)...")

	if (!fs.existsSync(WIKI_ADR_DIR)) {
		console.error(`❌ ADR directory not found: ${WIKI_ADR_DIR}`)
		process.exit(1)
	}

	const files = fs.readdirSync(WIKI_ADR_DIR).filter((f) => f.endsWith(".md") && f !== "README.md")
	const nodes: Map<string, AdrNode> = new Map()

	for (const file of files) {
		const fullPath = path.join(WIKI_ADR_DIR, file)
		const content = fs.readFileSync(fullPath, "utf8")

		const matchId = file.match(/^(MEOW-\d+)/i)
		if (!matchId) continue
		const id = matchId[1].toUpperCase()

		const titleMatch = content.match(/^#\s+(MEOW-\d+:\s*)?([^\n]+)/m)
		const title = titleMatch ? titleMatch[2].trim() : id

		// Extract all MEOW-XXX links from content
		const linkMatches = content.match(/MEOW-\d+/gi) || []
		const uniqueLinks = Array.from(new Set(linkMatches.map((l) => l.toUpperCase()))).filter((l) => l !== id)

		nodes.set(id, {
			id,
			file,
			title,
			links: uniqueLinks,
		})
	}

	// Build Mermaid graph
	let mermaid = "```mermaid\nflowchart LR\n"
	const edgeSet = new Set<string>()

	for (const [id, node] of nodes.entries()) {
		const cleanTitle = node.title.replace(/["()[\]]/g, "")
		mermaid += `  ${id}["${id}: ${cleanTitle}"]\n`
	}

	for (const [id, node] of nodes.entries()) {
		for (const target of node.links) {
			if (nodes.has(target)) {
				const edgeKey = `${id}-->${target}`
				if (!edgeSet.has(edgeKey)) {
					edgeSet.add(edgeKey)
					mermaid += `  ${id} --> ${target}\n`
				}
			}
		}
	}

	mermaid += "```\n"

	if (fs.existsSync(README_PATH)) {
		let readme = fs.readFileSync(README_PATH, "utf8")

		const graphHeader = "## Architectural Decision Dependency Graph"
		const graphBlock = `${graphHeader}\n\n${mermaid}`

		if (readme.includes(graphHeader)) {
			readme = readme.replace(new RegExp(`${graphHeader}[\\s\\S]*?(?=##|$)`), `${graphBlock}\n`)
		} else {
			readme += `\n\n${graphBlock}`
		}

		fs.writeFileSync(README_PATH, readme, "utf8")
		console.log(`\n✅ Successfully generated ADR Mermaid Dependency Graph in .wiki/adr/README.md!`)
		console.log(`📊 Nodes: ${nodes.size} ADRs | Edges: ${edgeSet.size} cross-references`)
	}
}

linkAdr().catch((err) => {
	console.error("Fatal error during ADR graph generation:", err)
	process.exit(1)
})
