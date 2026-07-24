export interface DesignDriftItem {
	id: string
	type: "hardcoded-color" | "unaligned-spacing" | "ad-hoc-typography" | "inline-style-leak"
	file: string
	line?: number
	snippet: string
	recommendation: string
	severity: "high" | "medium" | "low"
}

/**
 * Design System Drift Guard
 * Automated scanner detecting code patterns that bypass the design system or introduce visual/interaction debt.
 */
export class DesignDriftDetector {
	public scanFileContent(filePath: string, content: string): DesignDriftItem[] {
		const driftItems: DesignDriftItem[] = []
		const lines = content.split("\n")

		// Rule 1: Detect inline style attributes in JSX/TSX
		if (/\.(tsx|jsx|vue|html|svelte)$/.test(filePath)) {
			for (let i = 0; i < lines.length; i++) {
				const lineContent = lines[i]
				if (/style\s*=\s*\{\{/i.test(lineContent)) {
					driftItems.push({
						id: `drift-inline-${i + 1}`,
						type: "inline-style-leak",
						file: filePath,
						line: i + 1,
						snippet: lineContent.trim(),
						recommendation: "Replace inline style object with design token classes or CSS custom properties.",
						severity: "medium",
					})
				}
			}
		}

		// Rule 2: Detect hardcoded HEX colors in component/style files
		const hexColorRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g
		for (let i = 0; i < lines.length; i++) {
			const lineContent = lines[i]
			// Ignore CSS variable definition lines like --color-primary: #007acc;
			if (/--[a-z0-9-]+\s*:/i.test(lineContent)) continue

			let match: RegExpExecArray | null
			while (true) {
				match = hexColorRegex.exec(lineContent)
				if (!match) break
				driftItems.push({
					id: `drift-hex-${i + 1}-${match.index}`,
					type: "hardcoded-color",
					file: filePath,
					line: i + 1,
					snippet: lineContent.trim(),
					recommendation: `Replace hardcoded hex ${match[0]} with semantic color design token.`,
					severity: "high",
				})
			}
		}

		// Rule 3: Detect unaligned pixel spacing (outside 4px/8px scale)
		const pxSpacingRegex = /(?:margin|padding|gap|top|bottom|left|right)\s*:\s*(\d+)px/g
		for (let i = 0; i < lines.length; i++) {
			const lineContent = lines[i]
			let match: RegExpExecArray | null
			while (true) {
				match = pxSpacingRegex.exec(lineContent)
				if (!match) break
				const value = Number.parseInt(match[1], 10)
				if (value > 0 && value % 4 !== 0) {
					driftItems.push({
						id: `drift-spacing-${i + 1}-${match.index}`,
						type: "unaligned-spacing",
						file: filePath,
						line: i + 1,
						snippet: lineContent.trim(),
						recommendation: `Replace ${value}px with standard 4px/8px spacing grid token (e.g. 4px, 8px, 12px, 16px, 24px).`,
						severity: "low",
					})
				}
			}
		}

		return driftItems
	}
}
