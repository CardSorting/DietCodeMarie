import { strict as assert } from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "mocha"
import type { ApiProviderInfo } from "@/core/api"
import { getModDesignerSteeringSection } from "@/core/prompts/system-prompt/components/mod_designer_steering"
import { getModLayoutSpecialistSection } from "@/core/prompts/system-prompt/components/mod_layout_specialist"
import { getModMotionSpecialistSection } from "@/core/prompts/system-prompt/components/mod_motion_specialist"
import { getModTokensSpecialistSection, modThemeTokens } from "@/core/prompts/system-prompt/components/mod_tokens_specialist"
import { getSystemPrompt } from "@/core/prompts/system-prompt/index"
import type { PromptVariant, SystemPromptContext } from "@/core/prompts/system-prompt/types"
import { ApiFormat } from "@/shared/proto/dietcode/models"
import { verifyMoDCompliance } from "../../../../../../scripts/lint-mod-compliance"

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

	it("should inject principal frontend architect steering when modEnabled is true", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: true,
		}
		const section = await getModDesignerSteeringSection(dummyVariant, context)
		assert.ok(section.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"))
		assert.ok(section.includes("STRICT SYSTEM CONSTRAINTS: STUDIO-GRADE FRONTEND ARCHITECTURE"))
		assert.ok(section.includes("BANNED PATTERNS"))
		assert.ok(section.includes("REQUIRED TOKENS & DENSITY"))
		assert.ok(section.includes("MANDATORY 7-STATE UI COVERAGE"))
		assert.ok(section.includes("CODE PATTERN TRANSFORMATION MATRIX"))
	})

	it("should include MoD steering section in getSystemPrompt when modEnabled is true", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: true,
			cwd: "/workspace",
		}
		const { systemPrompt } = await getSystemPrompt(context)
		assert.ok(systemPrompt.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"))
		assert.ok(systemPrompt.includes("STRICT SYSTEM CONSTRAINTS"))
	})

	it("should NOT include MoD steering section in getSystemPrompt when modEnabled is false", async () => {
		const context: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: false,
			cwd: "/workspace",
		}
		const { systemPrompt } = await getSystemPrompt(context)
		assert.equal(systemPrompt.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"), false)
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
		assert.ok(systemPrompt.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"))
		assert.ok(systemPrompt.includes("CODE PATTERN TRANSFORMATION MATRIX"))
	})

	describe("Specialized Subagent Swarm Inheritance & Single-Duty Schema", () => {
		const enabledContext: SystemPromptContext = {
			providerInfo: dummyProviderInfo,
			ide: "vscode",
			modEnabled: true,
		}

		it("Layout Architect specialist should inherit primary steering and enforce single-duty layout schema", async () => {
			const section = await getModLayoutSpecialistSection(dummyVariant, enabledContext)
			assert.ok(section.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"))
			assert.ok(section.includes("MOD LAYOUT ARCHITECT"))
			assert.ok(section.includes("SINGLE-DUTY EXECUTION CONTRACT"))
			assert.ok(section.includes("ASYM_GRIDS") || section.includes("ASYMMETRICAL_GRIDS"))
		})

		it("Token & Theme Specialist should inherit primary steering and enforce single-duty token schema", async () => {
			const section = await getModTokensSpecialistSection(dummyVariant, enabledContext)
			assert.ok(section.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"))
			assert.ok(section.includes("MOD TOKEN & THEME SPECIALIST"))
			assert.ok(section.includes("SINGLE-DUTY EXECUTION CONTRACT"))
			assert.ok(section.includes("COLOR_MAPPING"))
		})

		it("Micro-Motion & State Specialist should inherit primary steering and enforce single-duty motion schema", async () => {
			const section = await getModMotionSpecialistSection(dummyVariant, enabledContext)
			assert.ok(section.includes("PRINCIPAL FRONTEND ARCHITECT & DESIGN SYSTEM LINTER"))
			assert.ok(section.includes("MOD MICRO-MOTION & STATE SPECIALIST"))
			assert.ok(section.includes("SINGLE-DUTY EXECUTION CONTRACT"))
			assert.ok(section.includes("CUBIC_BEZIER"))
		})

		it("Specialists should return empty string when modEnabled is false", async () => {
			const disabledContext: SystemPromptContext = { providerInfo: dummyProviderInfo, ide: "vscode", modEnabled: false }
			assert.equal(await getModLayoutSpecialistSection(dummyVariant, disabledContext), "")
			assert.equal(await getModTokensSpecialistSection(dummyVariant, disabledContext), "")
			assert.equal(await getModMotionSpecialistSection(dummyVariant, disabledContext), "")
		})

		it("should export compliant modThemeTokens contract", () => {
			assert.equal(modThemeTokens.surface.base, "bg-[#0B0C0E]")
			assert.equal(modThemeTokens.border.hairline, "border-white/10")
			assert.equal(modThemeTokens.text.heading, "text-white tracking-[-0.03em]")
			assert.equal(modThemeTokens.text.meta, "font-mono text-[11px] tracking-widest text-neutral-500 uppercase")
		})
	})

	describe("MoD AST & Regex Compliance Linter", () => {
		it("should flag non-compliant AI slop patterns", () => {
			const tempFile = path.join(os.tmpdir(), "bad-component.tsx")
			fs.writeFileSync(
				tempFile,
				`<div className="bg-black border border-purple-500 rounded-2xl shadow-2xl">Slop</div>`,
				"utf-8",
			)

			try {
				const errors = verifyMoDCompliance(tempFile)
				assert.equal(errors.length, 4)
				assert.ok(errors.some((e) => e.includes("rounded-md max")))
				assert.ok(errors.some((e) => e.includes("Pure #000000")))
				assert.ok(errors.some((e) => e.includes("Default AI slop neon gradients")))
				assert.ok(errors.some((e) => e.includes("1px hairline borders")))
			} finally {
				fs.unlinkSync(tempFile)
			}
		})

		it("should approve compliant studio-grade UI code", () => {
			const tempFile = path.join(os.tmpdir(), "good-component.tsx")
			fs.writeFileSync(
				tempFile,
				`<div className="bg-[#0B0C0E] border border-white/10 rounded-sm hover:border-white/25 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
					<span className="font-mono text-[11px] tracking-widest text-neutral-500 uppercase">[SYS.01 // READY]</span>
				</div>`,
				"utf-8",
			)

			try {
				const errors = verifyMoDCompliance(tempFile)
				assert.equal(errors.length, 0)
			} finally {
				fs.unlinkSync(tempFile)
			}
		})
	})
})
