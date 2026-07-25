import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import type { ApiProviderInfo } from "@/core/api"
import { getModDesignerSteeringSection } from "@/core/prompts/system-prompt/components/mod_designer_steering"
import { getSystemPrompt } from "@/core/prompts/system-prompt/index"
import type { PromptVariant, SystemPromptContext } from "@/core/prompts/system-prompt/types"
import { ApiFormat } from "@/shared/proto/dietcode/models"

describe("MoD Prompt Steering Toggle Architecture", () => {
	const dummyProviderInfo: ApiProviderInfo = {
		providerId: "anthropic",
		mode: "act",
		model: {
			id: "claude-3-5-sonnet-20241022",
			info: {
				apiFormat: ApiFormat.ANTHROPIC_CHAT,
				supportsPromptCache: true,
			},
		},
	}

	const dummyVariant = {} as PromptVariant

	it("should return empty string when modEnabled is false", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: false,
		}
		const section = await getModDesignerSteeringSection(dummyVariant, context)
		assert.equal(section, "")
	})

	it("should inject senior designer instincts steering when modEnabled is true", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: true,
		}
		const section = await getModDesignerSteeringSection(dummyVariant, context)
		assert.ok(section.includes("DESIGNER INSTINCTS (MoD MODE STEERING)"))
		assert.ok(section.includes("Design Token Sensing & System Hierarchy"))
		assert.ok(section.includes("Complete 7-State UI Matrix"))
		assert.ok(section.includes("WCAG 2.1 AA Accessibility & Motion Standards"))
		assert.ok(section.includes("Visual Aesthetics & Spatial Harmony"))
		assert.ok(section.includes("Responsive Layouts & Grid Ergonomics"))
		assert.ok(section.includes("5-Whys Cognitive Ergonomics"))
	})

	it("should include MoD steering section in getSystemPrompt when modEnabled is true", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: true,
			cwd: "/workspace",
		}
		const { systemPrompt } = await getSystemPrompt(context)
		assert.ok(systemPrompt.includes("DESIGNER INSTINCTS (MoD MODE STEERING)"))
		assert.ok(systemPrompt.includes("Design Token Sensing"))
	})

	it("should NOT include MoD steering section in getSystemPrompt when modEnabled is false", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: false,
			cwd: "/workspace",
		}
		const { systemPrompt } = await getSystemPrompt(context)
		assert.equal(systemPrompt.includes("DESIGNER INSTINCTS (MoD MODE STEERING)"), false)
	})

	it("should inherit modEnabled prompt steering in subagent prompt context", async () => {
		const subagentContext: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			isSubagentRun: true,
			modEnabled: true,
			cwd: "/workspace",
		}
		const { systemPrompt } = await getSystemPrompt(subagentContext)
		assert.ok(systemPrompt.includes("DESIGNER INSTINCTS (MoD MODE STEERING)"))
		assert.ok(systemPrompt.includes("Responsive Layouts & Grid Ergonomics"))
	})
})
