import { expect } from "chai"
import { describe, it } from "mocha"
import type OpenAI from "openai"
import { isNativeToolCallingConfig } from "@/utils/model-utils"
import { buildApiHandler } from "../../index"
import { CerebrasHandler, prepareCerebrasMessages } from "../cerebras"

describe("Cerebras provider", () => {
	it("builds a Cerebras handler with mode-specific models", () => {
		const configuration = {
			planModeApiProvider: "cerebras" as const,
			actModeApiProvider: "cerebras" as const,
			planModeApiModelId: "gemma-4-31b",
			actModeApiModelId: "gpt-oss-120b",
			cerebrasApiKey: "csk-test",
		}

		const planHandler = buildApiHandler(configuration, "plan")
		const actHandler = buildApiHandler(configuration, "act")

		expect(planHandler).to.be.instanceOf(CerebrasHandler)
		expect(actHandler).to.be.instanceOf(CerebrasHandler)
		expect(planHandler.getModel().id).to.equal("gemma-4-31b")
		expect(planHandler.getModel().info.supportsImages).to.equal(true)
		expect(actHandler.getModel().id).to.equal("gpt-oss-120b")
	})

	it("uses native tool calling when the setting is enabled", () => {
		const providerInfo = {
			providerId: "cerebras",
			model: new CerebrasHandler({ cerebrasApiKey: "csk-test" }).getModel(),
			mode: "act" as const,
		}

		expect(isNativeToolCallingConfig(providerInfo, true)).to.equal(true)
		expect(isNativeToolCallingConfig(providerInfo, false)).to.equal(false)
	})

	it("strips reasoning history and omits reasoning-only assistant messages", () => {
		const messages = prepareCerebrasMessages([
			{ role: "user", content: "hello" },
			{
				role: "assistant",
				content: [
					{ type: "thinking", thinking: "private trace", signature: "signature" },
					{
						type: "text",
						text: "Hello from LUMI",
						reasoning_details: [
							{
								type: "reasoning.text",
								text: "private trace",
								signature: "signature",
								format: "anthropic-claude-v1",
								index: 0,
							},
						],
					},
				],
			},
			{
				role: "assistant",
				content: [{ type: "thinking", thinking: "drop me", signature: "signature" }],
			},
			{ role: "user", content: "continue" },
		])

		expect(messages).to.have.length(3)
		expect(messages[0]).to.include({ role: "user", content: "hello" })
		expect(messages[1]).to.include({ role: "assistant", content: "Hello from LUMI" })
		expect(messages[2]).to.include({ role: "user", content: "continue" })
		expect(JSON.stringify(messages)).not.to.include("private trace")
		expect(JSON.stringify(messages)).not.to.include("drop me")
	})

	it("prunes historical vision payloads while preserving the active turn image", () => {
		const { pruneHistoricalVisionPayloads } = require("../cerebras")
		const mockMessages = [
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "Look at screenshot 1" },
					{
						type: "image" as const,
						source: { type: "base64" as const, media_type: "image/png" as const, data: "rawbase64data1" },
					},
				],
			},
			{ role: "assistant" as const, content: "I see screenshot 1" },
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: "Look at screenshot 2" },
					{
						type: "image" as const,
						source: { type: "base64" as const, media_type: "image/png" as const, data: "rawbase64data2" },
					},
				],
			},
		]

		const pruned = pruneHistoricalVisionPayloads(mockMessages, 1)
		expect(pruned[0].content).to.be.an("array")
		const turn0Content = pruned[0].content as Array<{ text?: string }>
		expect(turn0Content[1].text).to.include("Visual Context Anchor #1")
		expect(JSON.stringify(pruned[0])).not.to.include("rawbase64data1")

		// Active turn (index 2) keeps raw image payload
		const turn2Content = pruned[2].content as Array<{ type?: string; source?: { data?: string } }>
		expect(turn2Content[1].type).to.equal("image")
		expect(turn2Content[1].source?.data).to.equal("rawbase64data2")
	})

	it("compacts historical tool outputs while preserving recent tool responses", () => {
		const { compactHistoricalToolOutputs } = require("../cerebras")
		const longOutput = `LINE_START ${"X".repeat(1000)} LINE_END`
		const mockMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "tool", tool_call_id: "call_1", content: longOutput },
			{ role: "user", content: "next turn" },
			{ role: "assistant", content: "doing work" },
			{ role: "tool", tool_call_id: "call_2", content: longOutput },
		]

		const compacted = compactHistoricalToolOutputs(mockMessages, 2)
		// Tool outputs > 700 chars are statically truncated for prefix stability
		expect(compacted[0].content).to.include("HistOutputTruncated")
		expect((compacted[0].content as string).length).to.be.below(longOutput.length)

		expect(compacted[3].content).to.include("HistOutputTruncated")
		expect((compacted[3].content as string).length).to.be.below(longOutput.length)
	})

	it("applies DSL token compression techniques (stripping, shortening, tabular structuring, RLE dividers)", () => {
		const { compressDslText } = require("../cerebras")
		const input = `
<!-- HTML Comment -->
//# Comment Header
=====================================
{
  "key": "value"
}
Visual Context Anchor
Historical Tool Output Truncated for Token Efficiency
Environment State
Execution Status: Success
		`

		const compressed = compressDslText(input)
		expect(compressed).not.to.include("<!-- HTML Comment -->")
		expect(compressed).not.to.include("//# Comment Header")
		expect(compressed).to.include("[====]")
		expect(compressed).to.include('{"key"="value"}')
		expect(compressed).to.include("VisAnchor")
		expect(compressed).to.include("HistOutputTruncated")
		expect(compressed).to.include("EnvState")
		expect(compressed).to.include("ExecStatus:OK")
	})

	it("collapses internal stack trace frames and duplicate log lines", () => {
		const { compressDslText } = require("../cerebras")
		const stackTraceInput = `Error: Something failed
    at Module._compile (node:internal/modules/cjs/loader:1722:5)
    at Object.require.extensions (node:internal/modules/cjs/loader:1905:10)
    at Module.load (node:internal/modules/cjs/loader:1474:32)
    at Function._load (node:internal/modules/cjs/loader:1286:12)`

		const stackCompressed = compressDslText(stackTraceInput)
		expect(stackCompressed).to.include("[... internal stack frames collapsed ...]")

		const duplicateLogInput = "Downloading chunk...\nDownloading chunk...\nDownloading chunk...\nDownloading chunk..."
		const dupCompressed = compressDslText(duplicateLogInput)
		expect(dupCompressed).to.include("Downloading chunk... [x4 repeated]")
	})

	it("compacts deep file paths and transpiles multi-line JSON blocks into inline DSL format", () => {
		const { compressDslText } = require("../cerebras")
		const pathInput = "File updated at /Users/bozoegg/Downloads/codemarie-new/src/core/api/providers/cerebras.ts"
		const pathCompressed = compressDslText(pathInput)
		expect(pathCompressed).to.include("~.../cerebras.ts")

		const jsonInput = `{\n  "tool": "read_file",\n  "path": "src/index.ts"\n}`
		const jsonCompressed = compressDslText(jsonInput)
		expect(jsonCompressed).to.equal('[tool:read_file path="src/index.ts"]')

		const diffInput = "--- a/src/index.ts\n+++ b/src/index.ts\n@@ -10,5 +10,8 @@"
		const diffCompressed = compressDslText(diffInput)
		expect(diffCompressed).to.include("[@diff src/index.ts L10-10]")

		const urlInput = "https://example.com/api/v1/search?utm_source=google&session_token=abcdef1234567890abcdef1234567890"
		const urlCompressed = compressDslText(urlInput)
		expect(urlCompressed).to.include("?[params_compacted]")

		const errJsonInput = '{"status": 500, "message": "Failed", "error": "Timeout"}'
		const errJsonCompressed = compressDslText(errJsonInput)
		expect(errJsonCompressed).to.include("st: 500")
		expect(errJsonCompressed).to.include('msg: "Failed"')
		expect(errJsonCompressed).to.include('err: "Timeout"')
	})
})
