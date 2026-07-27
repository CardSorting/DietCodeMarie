import * as fs from "node:fs"
import * as path from "node:path"

/**
 * ADR Scaffolder CLI - Automatically generates a standardized Architectural Decision Record (MADR 3.0)
 * pre-populated with mandatory The What, The How, and The Why sections.
 */

const WIKI_ADR_DIR = path.resolve(process.cwd(), ".wiki", "adr")

function getNextAdrNumber(): number {
	if (!fs.existsSync(WIKI_ADR_DIR)) {
		fs.mkdirSync(WIKI_ADR_DIR, { recursive: true })
		return 15
	}
	const files = fs.readdirSync(WIKI_ADR_DIR)
	let maxNum = 14
	for (const f of files) {
		const match = f.match(/^MEOW-(\d+)/i)
		if (match) {
			const num = Number.parseInt(match[1], 10)
			if (num > maxNum) maxNum = num
		}
	}
	return maxNum + 1
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
}

async function scaffoldAdr(): Promise<void> {
	const args = process.argv.slice(2)
	const title = args.join(" ").trim() || "New Architectural Decision"
	const num = getNextAdrNumber()
	const padNum = String(num).padStart(3, "0")
	const slug = slugify(title)
	const fileName = `MEOW-${padNum}-${slug}.md`
	const targetPath = path.join(WIKI_ADR_DIR, fileName)

	const dateStr = new Date().toISOString().split("T")[0]

	const template = `# MEOW-${padNum}: ${title}

Status: PROPOSED
Date: ${dateStr}
Author: ACC / MEOW Core Architecture Group
Implementing Surfaces:
  - \`src/core/...\`

---

## 1. Context & Motivation (The Why)

### Problem Statement
Describe the operational problem, failure mode, or scaling bottleneck that motivated this decision.

### Operational Drivers
- Driver 1: Scaling limit or execution bottleneck.
- Driver 2: Safety invariant requirement.

---

## 2. Decision & Architecture (The What)

### Architectural Invariants
Describe the guaranteed invariants, state boundaries, and operational contracts.

### Decision Outcome
We decided to implement:
1. Feature 1: Mechanism description.
2. Feature 2: Contract guarantee.

---

## 3. Technical Implementation (The How)

### File Mappings & Class Monoliths
- Monolith: \`src/core/...\`
- Adapters: \`src/core/...\`

### Code Signature / Schema
\`\`\`typescript
// Insert primary interface or method signature
\`\`\`

---

## 4. Consequences & Verification

### Trade-offs & Guarantees
- Positive: Operational benefit.
- Negative: Additional overhead or complexity.

### Automated Validation Commands
\`\`\`bash
npm test
npm run audit:adr
npm run test:guardrails && npm run build
\`\`\`
`

	fs.writeFileSync(targetPath, template, "utf8")
	console.log(`\n🎉 Successfully scaffolded new ADR: ${fileName}`)
	console.log(`📁 Saved at: ${targetPath}`)
	console.log(`💡 Next step: Populate the sections and index in .wiki/adr/README.md!`)
}

scaffoldAdr().catch((err) => {
	console.error("Fatal error during ADR scaffolding:", err)
	process.exit(1)
})
