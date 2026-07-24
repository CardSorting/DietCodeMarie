export type UIComponentState = "default" | "hover" | "focus-visible" | "active" | "disabled" | "loading" | "error" | "empty"

export interface ComponentInteractiveContract {
	componentName: string
	supportedStates: UIComponentState[]
	missingStates: UIComponentState[]
	keyboardBindings: string[]
	ariaAttributes: string[]
	completenessScore: number // 0 - 100
}

/**
 * 8-State Component Interactive Contract Ledger
 * Verifies interactive state completeness and accessibility bindings for UI components.
 */
export class ComponentContractLedger {
	private static readonly ALL_STATES: UIComponentState[] = [
		"default",
		"hover",
		"focus-visible",
		"active",
		"disabled",
		"loading",
		"error",
		"empty",
	]

	public auditComponentContract(
		componentName: string,
		declaredStates: UIComponentState[],
		keyboardBindings: string[] = [],
		ariaAttributes: string[] = [],
	): ComponentInteractiveContract {
		const supportedSet = new Set(declaredStates)
		const missingStates = ComponentContractLedger.ALL_STATES.filter((s) => !supportedSet.has(s))
		const completenessScore = Math.round((supportedSet.size / ComponentContractLedger.ALL_STATES.length) * 100)

		return {
			componentName,
			supportedStates: [...supportedSet],
			missingStates,
			keyboardBindings,
			ariaAttributes,
			completenessScore,
		}
	}
}
