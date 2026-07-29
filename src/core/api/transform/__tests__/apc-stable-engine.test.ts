import { expect } from "chai"
import { describe, it } from "mocha"
import type OpenAI from "openai"
import type { DietCodeTool } from "@/shared/tools"
import { ApcStableIngestionEngine } from "../apc-stable-engine"

describe("ApcStableIngestionEngine Class", () => {
	const engine = new ApcStableIngestionEngine()

	it("normalizes system prompt line endings and whitespace", () => {
		const raw = " System instructions\r\n\r\nline 2   "
		const normalized = engine.normalizeSystemPrompt(raw)
		expect(normalized).to.equal("System instructions\n\nline 2")
	})

	it("sanitizes assistant content by stripping reasoning tags", () => {
		const input = "<think>internal reasoning steps</think>Here is the final response"
		const sanitized = engine.sanitizeAssistantContent(input)
		expect(sanitized).to.equal("Here is the final response")
	})

	it("cleans text cleanly while preserving standard vocabulary tokens", () => {
		const input = "<!-- HTML comment -->\r\nstatus: 200\nmessage: ok\n\n\n\nline4"
		const cleaned = engine.cleanText(input)
		expect(cleaned).not.to.include("<!-- HTML comment -->")
		expect(cleaned).to.include("status: 200")
		expect(cleaned).to.include("message: ok")
		expect(cleaned).not.to.include("\r\n")
		expect(cleaned).not.to.include("\n\n\n")
	})

	it("strips ANSI color escape codes and truncates URL query parameters", () => {
		const ansiInput =
			"\u001b[32mSUCCESS\u001b[0m: https://example.com/api?utm_source=test&utm_medium=email&utm_campaign=super_long_tracking_token_1234567890"
		const cleaned = engine.cleanText(ansiInput)
		expect(cleaned).not.to.include("\u001b[32m")
		expect(cleaned).to.include("SUCCESS:")
		expect(cleaned).to.include("https://example.com/api?[params_compacted]")
	})

	it("unwraps single-text block content arrays to plain strings for APC structure stability", () => {
		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{
				role: "user",
				content: [{ type: "text", text: "Hello APC" }] as unknown as string,
			},
		]

		const processed = engine.processApcStableMessages(messages)
		expect(processed[0].content).to.equal("Hello APC")
	})

	it("deduplicates consecutive identical user messages", () => {
		const dupMessages = [
			{ role: "user" as const, content: "This is a long user instruction that is repeated twice" },
			{ role: "user" as const, content: "This is a long user instruction that is repeated twice" },
		]

		const deduplicated = engine.deduplicateConsecutiveMessages(dupMessages)
		expect(deduplicated.length).to.equal(1)
		expect(deduplicated[0].content).to.include("collapsed")
	})

	it("enforces APC-stable context ceiling truncation starting from oldest turns", () => {
		const messages = [
			{ role: "user", content: "old prompt 1 ".repeat(100) },
			{ role: "assistant", content: "old reply 1 ".repeat(100) },
			{ role: "user", content: "recent prompt 2 ".repeat(10) },
			{ role: "assistant", content: "recent reply 2 ".repeat(10) },
		]

		const trimmed = engine.enforceApcStableContextCeiling(messages, 200, 2)
		expect(trimmed.length).to.be.below(messages.length)
		expect(trimmed[trimmed.length - 1]).to.deep.equal(messages[messages.length - 1])
	})

	it("guarantees prefix invariance across consecutive turn API requests", () => {
		const tool1Content = `Output 1: ${"A".repeat(1000)}`
		const tool2Content = `Output 2: ${"B".repeat(1000)}`

		// Turn 1 messages
		const turn1Input: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "user", content: "do task 1" },
			{ role: "assistant", content: "doing 1" },
			{ role: "tool", tool_call_id: "call_1", content: tool1Content },
		]

		// Turn 2 messages (appended to Turn 1)
		const turn2Input: OpenAI.Chat.ChatCompletionMessageParam[] = [
			...turn1Input,
			{ role: "assistant", content: "doing 2" },
			{ role: "tool", tool_call_id: "call_2", content: tool2Content },
		]

		const processedTurn1 = engine.processApcStableMessages(turn1Input)
		const processedTurn2 = engine.processApcStableMessages(turn2Input)

		// Assert that processedTurn1 is an EXACT prefix match of processedTurn2
		expect(processedTurn2.slice(0, processedTurn1.length)).to.deep.equal(processedTurn1)
	})

	it("aligns tool schemas deterministically by name", () => {
		const tools: DietCodeTool[] = [
			{ type: "function", function: { name: "write_file", description: "write" } },
			{ type: "function", function: { name: "execute_command", description: "exec" } },
			{ type: "function", function: { name: "read_file", description: "read" } },
		]

		const sorted = engine.alignToolSchemas(tools)
		const names: string[] = []
		if (sorted) {
			for (const tool of sorted) {
				if ("function" in tool && tool.function) {
					names.push(tool.function.name)
				}
			}
		}
		expect(names).to.deep.equal(["execute_command", "read_file", "write_file"])
	})
})
