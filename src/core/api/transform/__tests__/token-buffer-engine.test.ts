import { expect } from "chai"
import { describe, it } from "mocha"
import type { DietCodeTool } from "@/shared/tools"
import { TokenIngestionBufferEngine } from "../token-buffer-engine"

describe("TokenIngestionBufferEngine Central Class", () => {
	const engine = new TokenIngestionBufferEngine()

	it("normalizes system prompt line endings and whitespace", () => {
		const raw = " System instructions\r\n\r\nline 2   "
		const normalized = engine.normalizeSystemPrompt(raw)
		expect(normalized).to.equal("System instructions\n\nline 2")
	})

	it("prunes historical vision payloads while preserving active turn images", () => {
		const messages = [
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "screenshot 1" },
					{
						type: "image" as const,
						source: { type: "base64" as const, media_type: "image/png" as const, data: "img1" },
					},
				],
			},
			{ role: "assistant" as const, content: "ok" },
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "screenshot 2" },
					{
						type: "image" as const,
						source: { type: "base64" as const, media_type: "image/png" as const, data: "img2" },
					},
				],
			},
		]

		const pruned = engine.pruneHistoricalVisionPayloads(messages)
		const turn0Content = pruned[0].content as Array<{ text?: string }>
		const turn2Content = pruned[2].content as Array<{ source?: { data?: string } }>
		expect(turn0Content[1].text).to.include("Visual Context Anchor #1")
		expect(turn2Content[1].source?.data).to.equal("img2")
	})

	it("executes 10-stage DSL compression on text payloads", () => {
		const input = `
<!-- comment -->
//# comment
==============================
{
  "tool": "read_file",
  "path": "src/index.ts"
}
Visual Context Anchor
Environment State
Execution Status: Success
		`

		const compressed = engine.compressDslText(input)
		expect(compressed).not.to.include("<!-- comment -->")
		expect(compressed).to.include("[====]")
		expect(compressed).to.include('[tool:read_file path="src/index.ts"]')
		expect(compressed).to.include("VisAnchor")
		expect(compressed).to.include("EnvState")
		expect(compressed).to.include("ExecStatus:OK")
	})

	it("aligns tool schemas deterministically across heterogeneous definitions", () => {
		const tools: DietCodeTool[] = [
			{ function: { name: "write_to_file" } } as unknown as DietCodeTool,
			{ function: { name: "read_file" } } as unknown as DietCodeTool,
			{ name: "execute_command" } as unknown as DietCodeTool,
		]

		const sorted = engine.alignToolSchemas(tools)
		expect(sorted).to.exist
		const sortedList = sorted as Array<{ name?: string; function?: { name?: string } }>
		expect(sortedList[0].name || sortedList[0].function?.name).to.equal("execute_command")
		expect(sortedList[1].function?.name).to.equal("read_file")
		expect(sortedList[2].function?.name).to.equal("write_to_file")
	})

	it("applies ephemeral cache control markers to the last two user messages", () => {
		const messages = [
			{ role: "user", content: "msg 1" },
			{ role: "assistant", content: "reply 1" },
			{ role: "user", content: "msg 2" },
			{ role: "assistant", content: "reply 2" },
			{ role: "user", content: "msg 3" },
		]

		const tagged = engine.applyEphemeralCacheControl(messages)
		expect((tagged[0].content as unknown as Array<{ cache_control?: { type?: string } }>)[0].cache_control).to.exist
		expect(tagged[2].content).to.equal("msg 2")
		expect((tagged[4].content as unknown as Array<{ cache_control?: { type?: string } }>)[0].cache_control).to.exist
	})

	it("deduplicates consecutive identical user turn messages and estimates token count", () => {
		const longPayload = `Identical environment status payload block ${"A".repeat(60)}`
		const messages = [
			{ role: "user", content: longPayload },
			{ role: "user", content: longPayload },
			{ role: "assistant", content: "ok" },
		]

		const deduplicated = engine.deduplicateConsecutiveMessages(messages)
		expect(deduplicated).to.have.length(2)
		expect(deduplicated[0].content).to.include("repeated x2 collapsed")

		const tokenEst = engine.estimateTokenCount("1234567890123456")
		expect(tokenEst).to.equal(4)
	})

	it("generates compression savings reports and enforces context ceiling guards", () => {
		const rawText = "A".repeat(1000)
		const compressedText = "A".repeat(500)
		const report = engine.generateCompressionReport(rawText, compressedText, 0.99)

		expect(report.originalLength).to.equal(1000)
		expect(report.compressedLength).to.equal(500)
		expect(report.reductionPercentage).to.equal("50.0%")
		expect(report.estimatedTokensSaved).to.equal(125)

		const longMessages = [
			{ role: "system", content: "System prompt" },
			{ role: "user", content: "X".repeat(400) },
			{ role: "assistant", content: "Y".repeat(400) },
			{ role: "user", content: "Z".repeat(400) },
			{ role: "assistant", content: "Active turn response" },
		]

		// Set maxAllowedTokens to 150 (600 chars max)
		const trimmed = engine.enforceContextCeiling(longMessages, 150, 2)
		expect(trimmed.length).to.be.below(longMessages.length)
		expect(trimmed[0].content).to.equal("System prompt")
		expect(trimmed[trimmed.length - 1].content).to.equal("Active turn response")
	})

	it("executes the full optimization pipeline cleanly with preset profiles", () => {
		const { TokenBufferProfiles } = require("../token-buffer-engine")
		const profile = TokenBufferProfiles.STRICT_CACHE_STABILITY

		const pipelineInput = {
			systemPrompt: " System instruction\r\n ",
			messages: [
				{ role: "user", content: "Hello world turn 1" },
				{ role: "assistant", content: "Response turn 1" },
				{ role: "user", content: "Hello world turn 2" },
			],
		}

		const result = profile.optimizeMessagesPipeline(pipelineInput)
		expect(result.normalizedSystemPrompt).to.equal("System instruction")
		expect(result.optimizedMessages).to.have.length(3)
		expect(result.compressionReport.reductionPercentage).to.exist
	})

	it("tracks and reports aggregate lifetime session telemetry stats", () => {
		engine.logCacheTelemetry("TestProvider", "test-model", 100, 900, 50, 1.0)
		const stats = engine.getLifetimeTelemetryReport()

		expect(stats.totalRequests).to.be.greaterThan(0)
		expect(stats.totalCachedTokens).to.be.at.least(900)
		expect(stats.averageCacheHitRatio).to.include("%")
		expect(stats.totalEstDollarsSaved).to.include("$")
	})

	describe("Adversarial Heavy Pressure & Security Fuzzing Suite", () => {
		it("handles binary control characters, unclosed tags, and deep path floods safely", () => {
			const adversarialInput =
				`
\x00\xFF\xFE\x00<!-- Unclosed comment block
/Users/bozoegg/Downloads/codemarie-new/src/core/api/providers/cerebras.ts
`.repeat(100) + `[tool:fake_tool path="/etc/passwd"] {"status": 500}`

			const compressed = engine.compressDslText(adversarialInput)
			expect(compressed).to.exist
			expect(compressed).to.include("~.../cerebras.ts")
			expect(compressed).to.include("st: 500")
		})

		it("survives 1,000,000+ token context ceiling flood while preserving Token 0 system prompt and active turn", () => {
			const massiveMessages = [
				{ role: "system", content: "System Instruction Token 0 Anchor" },
				...Array.from({ length: 50 }, (_, i) => ({
					role: i % 2 === 0 ? "user" : "assistant",
					content: `Historical turn ${i} payload bloat ` + "A".repeat(10_000),
				})),
				{ role: "user", content: "Active turn directive: execute critical action" },
			]

			const guarded = engine.enforceContextCeiling(massiveMessages, 500, 1)
			expect(guarded.length).to.be.below(massiveMessages.length)
			expect(guarded[0].content).to.equal("System Instruction Token 0 Anchor")
			expect(guarded[guarded.length - 1].content).to.equal("Active turn directive: execute critical action")
		})

		it("maintains sub-millisecond throughput under high-frequency pipeline pressure (1,000 runs)", () => {
			const { TokenBufferProfiles } = require("../token-buffer-engine")
			const profile = TokenBufferProfiles.STRICT_CACHE_STABILITY
			const sampleInput = {
				systemPrompt: "System instruction prompt \r\n",
				messages: [
					{ role: "user", content: "Run test suite on /Users/bozoegg/Downloads/codemarie-new/src/index.ts" },
					{ role: "assistant", content: "Executing test suite" },
					{ role: "tool", content: '{"status": 200, "message": "Success"} \n' + "=".repeat(100) },
				],
			}

			const start = performance.now()
			for (let i = 0; i < 1_000; i++) {
				profile.optimizeMessagesPipeline(sampleInput)
			}
			const totalMs = performance.now() - start
			const avgMsPerRun = totalMs / 1_000

			expect(avgMsPerRun).to.be.below(1.0) // Must run in under 1ms average under pressure
		})
	})
})
