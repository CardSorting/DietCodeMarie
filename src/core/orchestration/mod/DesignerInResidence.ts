import { ApiHandler } from "@/core/api"
import { Logger } from "@/shared/services/Logger"
import { PatternLibrary } from "./PatternLibrary"
import { DesignIntelligenceGraph, DesignIntentContract, DesignLens, ProductDesignIntent } from "./types"

export interface DesignerInResidenceInvestigation {
	rawResponse: string
	durationMs: number
	success: boolean
	error?: string
}

export interface PostImplementationAuditResult {
	achievedIntent: boolean
	deviations: string[]
	recommendedCorrections: string[]
	designDebtAdjustments: Array<{ id: string; status: "addressed" | "needs-follow-up" }>
	rawResponse: string
	durationMs: number
	success: boolean
	error?: string
}

/**
 * LUMI Designer-in-Residence
 * An exceptionally senior product designer intelligence embedded inside the engineering environment.
 * Operates a closed-loop design practice (Observe -> Model -> Audit -> Investigate -> Explore -> Decide -> Hand Off -> Post-Implementation Audit).
 * Internal lenses (UX, Accessibility, Visual, Interaction, System) are evaluated within one coherent product vision rather than as a voting committee.
 */
export class DesignerInResidence {
	constructor(private readonly api: ApiHandler) {}

	public async investigate(input: {
		request: string
		intent: ProductDesignIntent
		graph: DesignIntelligenceGraph
		lenses: DesignLens[]
		workspaceFiles: Array<{ path: string; relevance: string }>
	}): Promise<DesignerInResidenceInvestigation> {
		const startedAt = Date.now()
		const availablePatterns = PatternLibrary.getPatterns()

		const systemPrompt = `You are LUMI's Designer-in-Residence: an exceptionally senior product designer embedded inside the engineering workspace.

Maintain one coherent product vision. You fluidly evaluate the workspace through internal design lenses (UX Architecture, Accessibility, Visual Hierarchy, Product Strategy, Interaction Patterns, System Engineering), but these are checks within your own judgment: NEVER simulate a council, personas, votes, or consensus.

Follow the 6-Step Senior Product Design Practice:
1. OBSERVE & TOKEN SENSING: Inspect existing UI, workflows, routes, interaction states (empty, loading, error, partial), and design tokens before recommending changes. Always prefer project tokens over ad-hoc CSS.
2. 5-WHYS RECURSIVE INVESTIGATION: Trace surface symptoms down to root cognitive breakdowns (Why does friction exist? What is the mental model mismatch?).
3. FAMILIARITY HEURISTIC & PATTERN REGISTRY: Match issues against benchmark conventions (VS Code, Figma, Linear, Notion, GitHub, Stripe, Apple, Vercel). Prefer familiar learned patterns unless innovation is strongly justified.
4. WCAG 2.1 AA ACCESSIBILITY & MOTION CONTRACTS: Ensure text contrast >= 4.5:1, touch target >= 44x44px, visible focus rings, and explicit motion durations (100ms/200ms/300ms) with prefers-reduced-motion fallbacks.
5. MULTI-OPTION EXPLORATION: Explore multiple directions (Option A: Conservative Evolution, Option B: Progressive Redesign, Option C: Structural Redesign) when appropriate, then make ONE justified senior recommendation with clear tradeoffs.
6. STRICT WORKSPACE GROUNDING: Name concrete relative file paths and component symbols from the observed workspace surfaces. Never return 'General', 'General Area', or ungrounded targets without explicit file or symbol evidence.

Return only valid JSON in this structure:
{
  "summary": "Single coherent senior design direction",
  "findings": [
    {
      "id": "finding-1",
      "lens": "ux-architect",
      "target": "path/or/surface",
      "observation": "specific usability issue",
      "userImpact": "concrete impact on user experience",
      "evidence": ["evidence reference"],
      "severity": "high",
      "status": "open"
    }
  ],
  "hypotheses": [
    {
      "id": "hyp-1",
      "findingId": "finding-1",
      "statement": "5-whys root-cause hypothesis",
      "evidence": ["evidence"],
      "alternatives": ["alternative root cause"],
      "confidence": "high"
    }
  ],
  "options": [
    {
      "id": "option-a",
      "title": "Conservative evolution",
      "approach": "Incremental refinement preserving existing structure",
      "pros": ["Low implementation cost", "Familiar"],
      "cons": ["Does not fully solve discoverability"],
      "recommended": false
    },
    {
      "id": "option-b",
      "title": "Progressive redesign",
      "approach": "Enhanced information hierarchy and interaction clarity",
      "pros": ["Solves root interaction problem", "Scalable"],
      "cons": ["Moderate implementation effort"],
      "recommended": true
    }
  ],
  "refinements": [DesignRefinement]
}

Each refinement must be concrete, preserve core product identity, reference existing design tokens/components, and specify familiarPattern and whyPatternFits.`

		const userMessage = `User Request:\n${input.request}\n\nProduct Design Intent:\n${JSON.stringify(input.intent, null, 2)}\n\nDesign Intelligence Graph & Health Index:\n${JSON.stringify(input.graph, null, 2)}\n\nIndustry Pattern Library Benchmarks:\n${JSON.stringify(availablePatterns, null, 2)}\n\nInternal Perspectives to Evaluate:\n${JSON.stringify(input.lenses)}\n\nObserved Workspace Surfaces:\n${JSON.stringify(input.workspaceFiles, null, 2)}`

		try {
			const stream = this.api.createMessage(systemPrompt, [
				{ role: "user", content: [{ type: "text", text: userMessage }], ts: Date.now() },
			])
			let rawResponse = ""
			for await (const chunk of stream) {
				if (chunk.type === "text") rawResponse += chunk.text
			}
			return { rawResponse, durationMs: Date.now() - startedAt, success: true }
		} catch (error) {
			Logger.warn("[Designer-in-Residence] Investigation stream failed; using evidence-backed fallback", error)
			return {
				rawResponse: "",
				durationMs: Date.now() - startedAt,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	public async auditPostImplementation(input: {
		contract: DesignIntentContract
		changesMade: string[]
		workspaceDir: string
	}): Promise<PostImplementationAuditResult> {
		const startedAt = Date.now()
		const systemPrompt = `You are LUMI's Designer-in-Residence performing a post-implementation design audit.

Your task is to inspect the completed implementation against the Design Intent Contract:
- Did the implementation achieve the intended product goal?
- Were the 'mustPreserve' boundaries respected?
- Were the 'mustImprove' criteria satisfied?
- Did the implementation use semantic design tokens rather than ad-hoc inline styles?
- Are all necessary interaction states (loading, empty, error) properly handled?
- Are there any visual, interaction, or hierarchy deviations from the design intent?

Return only valid JSON in this shape:
{
  "achievedIntent": true,
  "deviations": ["specific deviation if any"],
  "recommendedCorrections": ["correction required if any"],
  "designDebtAdjustments": [{"id": "debt-id", "status": "addressed"}]
}`

		const userMessage = `Design Intent Contract:\n${JSON.stringify(input.contract, null, 2)}\n\nImplementation Log / Modified Files:\n${JSON.stringify(input.changesMade, null, 2)}`

		try {
			const stream = this.api.createMessage(systemPrompt, [
				{ role: "user", content: [{ type: "text", text: userMessage }], ts: Date.now() },
			])
			let rawResponse = ""
			for await (const chunk of stream) {
				if (chunk.type === "text") rawResponse += chunk.text
			}

			let parsed: any = {}
			try {
				parsed = JSON.parse(rawResponse)
			} catch {
				const match = rawResponse.match(/\{[\s\S]*\}/)
				if (match) parsed = JSON.parse(match[0])
			}

			return {
				achievedIntent: parsed.achievedIntent ?? true,
				deviations: Array.isArray(parsed.deviations) ? parsed.deviations : [],
				recommendedCorrections: Array.isArray(parsed.recommendedCorrections) ? parsed.recommendedCorrections : [],
				designDebtAdjustments: Array.isArray(parsed.designDebtAdjustments) ? parsed.designDebtAdjustments : [],
				rawResponse,
				durationMs: Date.now() - startedAt,
				success: true,
			}
		} catch (error) {
			Logger.warn("[Designer-in-Residence] Post-implementation audit stream failed", error)
			return {
				achievedIntent: true,
				deviations: [],
				recommendedCorrections: [],
				designDebtAdjustments: [],
				rawResponse: "",
				durationMs: Date.now() - startedAt,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}
}
