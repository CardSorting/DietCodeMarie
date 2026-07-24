import { DesignToken } from "./types"

export interface CodemodPatch {
	originalSnippet: string
	patchedSnippet: string
	tokensApplied: string[]
}

/**
 * Design Token Sync & Codemod Engine
 * Automatically transforms raw CSS values and hardcoded styles into canonical design token usages.
 */
export class TokenSyncEngine {
	public generateCodemodPatch(snippet: string, availableTokens: DesignToken[]): CodemodPatch {
		let patched = snippet
		const appliedTokens: string[] = []

		for (const token of availableTokens) {
			if (!token.value) continue

			const escapedValue = token.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			const regex = new RegExp(`(?<=^|\\s|:|;|,)${escapedValue}(?=\\s|;|\\)|,|$)`, "gi")
			const prev = patched
			patched = patched.replace(regex, `var(${token.name}, ${token.value})`)
			if (patched !== prev) {
				appliedTokens.push(token.name)
			}
		}

		return {
			originalSnippet: snippet,
			patchedSnippet: patched,
			tokensApplied: [...new Set(appliedTokens)],
		}
	}
}
