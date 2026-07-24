import { ProductProblemDimension } from "./types"

export interface IndustryPatternDefinition {
	id: string
	name: string
	category: "navigation" | "data-density" | "interaction" | "feedback" | "accessibility"
	benchmarkProducts: string[]
	problemSolved: string
	userMentalModel: string
	familiarityReason: string
	keyUXRules: string[]
	applicableDimensions: ProductProblemDimension[]
}

/**
 * Industry Pattern Library Registry
 * Curated repository of established software conventions from world-class product design teams
 * (Linear, VS Code, Figma, Notion, GitHub, Stripe, Apple, Vercel).
 */
export class PatternLibrary {
	private static readonly PATTERNS: IndustryPatternDefinition[] = [
		{
			id: "command-palette",
			name: "Command Palette / Action Launcher",
			category: "navigation",
			benchmarkProducts: ["VS Code", "Linear", "Raycast"],
			problemSolved: "Action discoverability and keyboard-first navigation without cluttering the UI.",
			userMentalModel: "Users press Cmd+K / Ctrl+K expecting instant searchable access to all system commands.",
			familiarityReason: "Ubiquitous pattern across modern developer and productivity tools.",
			keyUXRules: [
				"Global keyboard shortcut (Cmd+K / Ctrl+K)",
				"Instant fuzzy filtering with highlighted matches",
				"Categorized grouping (Recent, Navigation, Actions)",
				"Clear keyboard shortcuts displayed alongside commands",
			],
			applicableDimensions: ["information-architecture", "workflow", "interaction"],
		},
		{
			id: "master-detail-pane",
			name: "Master-Detail Split Workspace",
			category: "data-density",
			benchmarkProducts: ["Figma", "Notion", "Slack"],
			problemSolved: "Navigating dense data sets while preserving selection context.",
			userMentalModel:
				"Select item on the left list panel to view/edit detail on the main right panel without full page context switches.",
			familiarityReason: "Standard spatial model for desktop and professional web applications.",
			keyUXRules: [
				"Resizable splitter handle",
				"Clear visual selection highlight in master list",
				"Sticky header in detail panel with primary actions",
				"Smooth pane collapse/expand toggles",
			],
			applicableDimensions: ["information-architecture", "visual-hierarchy", "workflow"],
		},
		{
			id: "progressive-toolbar",
			name: "Contextual Action Toolbar",
			category: "interaction",
			benchmarkProducts: ["Stripe", "GitHub", "Vercel"],
			problemSolved: "Reducing visual noise by revealing secondary actions only when relevant.",
			userMentalModel: "Selecting content elevates contextual tools relevant to that specific selection.",
			familiarityReason: "Reduces interface density while prioritizing high-frequency actions.",
			keyUXRules: [
				"Primary action stands out with semantic accent fill",
				"Secondary actions grouped in dropdown overflow menu",
				"Immediate tooltips on hover",
				"Disabled states accompanied by explanatory tooltips",
			],
			applicableDimensions: ["interaction", "visual-hierarchy", "design-system"],
		},
		{
			id: "optimistic-undo-toast",
			name: "Optimistic Update with Toast Undo",
			category: "feedback",
			benchmarkProducts: ["Apple", "Gmail", "Vercel"],
			problemSolved: "Eliminating blocking loading spinners for reversible user operations.",
			userMentalModel: "UI updates immediately; a unobtrusive toast notification allows instant Undo within 5 seconds.",
			familiarityReason: "Creates feeling of high velocity and confidence.",
			keyUXRules: [
				"UI mutates immediately in local state",
				"Floating toast notification appears in bottom corner",
				"Prominent 'Undo' action button with timer bar",
				"Automatic fallback and alert if server request fails",
			],
			applicableDimensions: ["system-status", "workflow", "interaction"],
		},
		{
			id: "empty-state-cta",
			name: "Guided Empty State",
			category: "feedback",
			benchmarkProducts: ["Linear", "GitHub", "Figma"],
			problemSolved: "Preventing user confusion when a view or list contains zero items.",
			userMentalModel: "An empty container explains why it's empty and provides a direct button to create or import items.",
			familiarityReason: "Turns dead ends into active onboarding moments.",
			keyUXRules: [
				"Simple monochrome icon or subtle illustration",
				"Clear 1-sentence explanation of what will live here",
				"Single high-contrast primary call-to-action (CTA) button",
				"Secondary link to documentation or templates if relevant",
			],
			applicableDimensions: ["content", "visual-hierarchy", "workflow"],
		},
		{
			id: "keyboard-focus-trap-modal",
			name: "Accessible Modal Container",
			category: "accessibility",
			benchmarkProducts: ["Apple", "VS Code", "Stripe"],
			problemSolved: "Ensuring dialogs are screen-reader accessible and keyboard navigable.",
			userMentalModel: "Opening a modal traps keyboard focus inside until closed via ESC or explicit button.",
			familiarityReason: "Non-negotiable accessibility and UX standard.",
			keyUXRules: [
				"Focus automatically set to first interactive element or close button",
				"Tab key cycles within modal bounds only",
				"Escape key dismisses dialog instantly",
				"Background overlay dims with smooth backdrop-filter blur",
			],
			applicableDimensions: ["accessibility", "interaction", "design-system"],
		},
		{
			id: "filter-pill-bar",
			name: "Interactive Filter Chip Bar",
			category: "navigation",
			benchmarkProducts: ["Notion", "GitHub", "Stripe"],
			problemSolved: "Multi-parameter data filtering without complex SQL-style filter builders.",
			userMentalModel: "Clicking chips toggles active filter state, displaying current count and clear button.",
			familiarityReason: "Highly scannable and touch/pointer friendly.",
			keyUXRules: [
				"Horizontal scrollable row of rounded pills",
				"Active pills highlighted with subtle tint and count badge",
				"Clear All button appears dynamically when >=1 filter active",
				"Keyboard arrow-key navigation between pills",
			],
			applicableDimensions: ["information-architecture", "interaction", "responsive-design"],
		},
	]

	public static getPatterns(): IndustryPatternDefinition[] {
		return [...PatternLibrary.PATTERNS]
	}

	public static findPatternsForDimension(dimension: ProductProblemDimension): IndustryPatternDefinition[] {
		return PatternLibrary.PATTERNS.filter((pattern) => pattern.applicableDimensions.includes(dimension))
	}

	public static getPatternById(id: string): IndustryPatternDefinition | undefined {
		return PatternLibrary.PATTERNS.find((pattern) => pattern.id === id)
	}
}
