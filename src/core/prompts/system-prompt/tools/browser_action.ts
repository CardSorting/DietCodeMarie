import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"

const id = DietCodeDefaultTool.BROWSER

const GENERIC: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "browser_action",
	description: `[BROWSER_ACTION_CONTRACT]
- SEQUENCE: Launch (first) -> click/type/scroll -> close (final).
- EXCLUSIVITY: While active, no other tools may be called.
- VIEWPORT: {{BROWSER_VIEWPORT_WIDTH}}x{{BROWSER_VIEWPORT_HEIGHT}} px. Click center of target element derived from screenshot.`,
	contextRequirements: (context) => context.supportsBrowserUse === true,
	parameters: [
		{
			name: "action",
			required: true,
			instruction: `Action: launch (requires url) | click (requires coordinate x,y) | type (requires text) | scroll_down | scroll_up | close (final action).`,
			usage: "e.g. launch, click, type, scroll_down, scroll_up, close",
		},
		{
			name: "url",
			required: false,
			instruction: `URL for launch action.`,
			usage: "URL here",
		},
		{
			name: "coordinate",
			required: false,
			instruction: `x,y coordinates for click within {{BROWSER_VIEWPORT_WIDTH}}x{{BROWSER_VIEWPORT_HEIGHT}}.`,
			usage: "450,300",
		},
		{
			name: "text",
			required: false,
			instruction: `Text string for type action.`,
			usage: "Text here",
		},
	],
}

const NATIVE_NEXT_GEN: DietCodeToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id,
	name: "browser_action",
	description: `[BROWSER_ACTION_CONTRACT]
- SEQUENCE: Launch (first) -> interact -> close (final).
- VIEWPORT: {{BROWSER_VIEWPORT_WIDTH}}x{{BROWSER_VIEWPORT_HEIGHT}} px.`,
	contextRequirements: (context) => context.supportsBrowserUse === true,
	parameters: [
		{
			name: "action",
			required: true,
			instruction: `Action: launch | click | type | scroll_down | scroll_up | close.`,
		},
		{
			name: "url",
			required: false,
			instruction: `URL for launch action.`,
		},
		{
			name: "coordinate",
			required: false,
			instruction: `x,y coordinates within {{BROWSER_VIEWPORT_WIDTH}}x{{BROWSER_VIEWPORT_HEIGHT}}.`,
		},
		{
			name: "text",
			required: false,
			instruction: `Text string for type action.`,
		},
	],
}

export const browser_action_variants = [GENERIC, NATIVE_NEXT_GEN]
