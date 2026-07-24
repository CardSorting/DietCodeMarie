import {
	ClassifiedProductProblem,
	DesignDebtCategory,
	DesignDebtItem,
	DesignIntelligenceEdge,
	DesignIntelligenceGraph,
	DesignIntelligenceNode,
	DesignLens,
	DesignToken,
	ProductDesignIntent,
	ProductProblemDimension,
	UXHealthIndex,
} from "./types"

/**
 * Builds the durable product model used by the Designer-in-Residence. The
 * graph intentionally records product relationships rather than a file index:
 * it is a model of the experience the code implements.
 */
export class DesignIntelligenceGraphBuilder {
	public build(input: {
		intent: ProductDesignIntent
		problems: ClassifiedProductProblem[]
		lenses: DesignLens[]
		tokens?: DesignToken[]
		previous?: DesignIntelligenceGraph
	}): DesignIntelligenceGraph {
		const now = new Date().toISOString()
		const nodes = new Map<string, DesignIntelligenceNode>()
		const edges = new Map<string, DesignIntelligenceEdge>()

		for (const node of input.previous?.nodes || []) {
			nodes.set(node.id, node)
		}
		for (const edge of input.previous?.edges || []) {
			edges.set(`${edge.from}:${edge.relation}:${edge.to}`, edge)
		}

		const addNode = (node: DesignIntelligenceNode) => nodes.set(node.id, node)
		const addEdge = (edge: DesignIntelligenceEdge) => edges.set(`${edge.from}:${edge.relation}:${edge.to}`, edge)

		for (const [index, workflow] of input.intent.currentExperience.workflow.entries()) {
			const workflowId = `workflow:${this.slug(workflow, index)}`
			addNode({ id: workflowId, type: "workflow", label: workflow, references: [] })
		}

		for (const [index, job] of input.intent.product.primaryJobs.entries()) {
			const jobId = `goal:${this.slug(job, index)}`
			addNode({ id: jobId, type: "user-goal", label: job, references: [] })
		}

		for (const problem of input.problems) {
			const targetId = `screen:${this.slug(problem.target, 0)}`
			const goal = [...nodes.values()].find((node) => node.type === "user-goal")
			addNode({
				id: targetId,
				type: this.isLikelyComponent(problem.target) ? "component" : "screen",
				label: problem.target,
				references: problem.evidence,
			})
			if (goal) {
				addEdge({ from: targetId, relation: "solves", to: goal.id })
			}
		}

		for (const [index, pattern] of input.intent.currentExperience.existingPatterns.entries()) {
			addNode({ id: `pattern:${this.slug(pattern, index)}`, type: "pattern", label: pattern, references: [] })
		}

		const currentDebt = input.problems.map((problem) => ({
			id: `debt:${problem.id}`,
			category: this.mapDimensionToCategory(problem.dimension),
			dimension: problem.dimension,
			target: problem.target,
			description: problem.observation,
			severity: problem.severity,
			status: "open" as const,
			lastAuditedAt: now,
		}))
		const priorDebt = new Map((input.previous?.designDebt || []).map((item) => [item.id, item]))
		for (const debt of currentDebt) {
			priorDebt.set(debt.id, { ...priorDebt.get(debt.id), ...debt })
		}
		const allDebt = [...priorDebt.values()]
		const mergedTokens = [...(input.previous?.designTokens || []), ...(input.tokens || [])]
		const healthIndex = this.calculateUXHealthIndex(allDebt, input.previous?.healthIndex)

		return {
			version: 1,
			productSummary: input.intent.request.interpretedGoal,
			users: input.intent.product.targetUsers,
			primaryJobs: input.intent.product.primaryJobs,
			nodes: [...nodes.values()],
			edges: [...edges.values()],
			knownPatterns: [
				...new Set([...(input.previous?.knownPatterns || []), ...input.intent.currentExperience.existingPatterns]),
			],
			designTokens: mergedTokens,
			healthIndex,
			designDebt: allDebt,
			auditedLenses: [...new Set([...(input.previous?.auditedLenses || []), ...input.lenses])],
			lastAuditedAt: now,
		}
	}

	public reconcileDebt(
		graph: DesignIntelligenceGraph,
		addressedProblemIds: string[],
		needsFollowUpProblemIds: string[],
	): DesignIntelligenceGraph {
		const addressed = new Set(addressedProblemIds)
		const needsFollowUp = new Set(needsFollowUpProblemIds)
		const updatedDebt = graph.designDebt.map((item) => ({
			...item,
			status: needsFollowUp.has(item.id.replace("debt:", ""))
				? ("needs-follow-up" as const)
				: addressed.has(item.id.replace("debt:", ""))
					? ("addressed" as const)
					: item.status,
			lastAuditedAt: new Date().toISOString(),
		}))

		const healthIndex = this.calculateUXHealthIndex(updatedDebt, graph.healthIndex)

		return {
			...graph,
			designDebt: updatedDebt,
			healthIndex,
			lastAuditedAt: new Date().toISOString(),
		}
	}

	private slug(value: string, fallbackIndex: number): string {
		const slug = value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 80)
		return slug || `${fallbackIndex + 1}`
	}

	private isLikelyComponent(target: string): boolean {
		return /\.(tsx|jsx|vue|svelte)$/.test(target) || /component/i.test(target)
	}

	private mapDimensionToCategory(dimension: ProductProblemDimension): DesignDebtCategory {
		switch (dimension) {
			case "accessibility":
				return "Accessibility Debt"
			case "visual-hierarchy":
			case "design-system":
				return "Visual Debt"
			case "interaction":
			case "workflow":
			case "system-status":
				return "Interaction Debt"
			case "information-architecture":
			case "product-strategy":
				return "Information Architecture Debt"
			case "cross-surface-consistency":
			case "content":
				return "Consistency Debt"
			case "agentic-control":
			case "generative-workflow":
			case "implementation-quality":
			case "responsive-design":
				return "UX Debt"
			default:
				return "Pattern Debt"
		}
	}

	public calculateUXHealthIndex(debtItems: DesignDebtItem[], previous?: UXHealthIndex): UXHealthIndex {
		const openItems = debtItems.filter((item) => item.status === "open" || item.status === "needs-follow-up")
		const addressedItems = debtItems.filter((item) => item.status === "addressed")

		let penalty = 0
		const breakdown: Record<DesignDebtCategory, number> = {
			"UX Debt": 0,
			"Visual Debt": 0,
			"Interaction Debt": 0,
			"Accessibility Debt": 0,
			"Consistency Debt": 0,
			"Information Architecture Debt": 0,
			"Pattern Debt": 0,
		}

		for (const item of openItems) {
			const cat = item.category || this.mapDimensionToCategory(item.dimension)
			const weight = item.severity === "critical" ? 15 : item.severity === "high" ? 10 : item.severity === "medium" ? 5 : 2
			penalty += weight
			breakdown[cat] = (breakdown[cat] || 0) + weight
		}

		const rawScore = Math.max(0, Math.min(100, 100 - penalty))
		const score = Number.parseFloat(rawScore.toFixed(1))

		let grade: "A+" | "A" | "B" | "C" | "D" | "F" = "A+"
		if (score < 40) grade = "F"
		else if (score < 55) grade = "D"
		else if (score < 70) grade = "C"
		else if (score < 85) grade = "B"
		else if (score < 95) grade = "A"

		let trend: "improving" | "stable" | "degrading" = "stable"
		if (previous) {
			if (score > previous.score) trend = "improving"
			else if (score < previous.score) trend = "degrading"
		}

		return {
			score,
			grade,
			trend,
			breakdown,
			openDebtCount: openItems.length,
			addressedDebtCount: addressedItems.length,
			lastCalculatedAt: new Date().toISOString(),
		}
	}
}
