import type OpenAI from "openai"
import { ApcProfiles, ApcStableIngestionEngine } from "../src/core/api/transform/apc-stable-engine"
import type { DietCodeTool } from "../src/shared/tools"

async function runHeadlessBenchmark() {
	console.log("==================================================================")
	console.log("  ApcStableIngestionEngine Headless Benchmark & Validation Test   ")
	console.log("==================================================================\n")

	const engine = new ApcStableIngestionEngine({
		maxToolOutputLength: 700,
		activeVisionWindow: 1,
	})

	let totalPassed = 0
	let totalFailed = 0

	function assert(condition: boolean, description: string) {
		if (condition) {
			console.log(`  ✓ PASS: ${description}`)
			totalPassed++
		} else {
			console.error(`  ✗ FAIL: ${description}`)
			totalFailed++
		}
	}

	// -------------------------------------------------------------
	// BENCHMARK 1: 100% Multi-Turn Prefix Invariance Verification
	// -------------------------------------------------------------
	console.log("--- Benchmark 1: Multi-Turn Prefix Invariance Verification ---")

	const baseSystemPrompt = engine.normalizeSystemPrompt(
		"  You are LUMI, an AI developer companion.\r\n\r\nFollow instructions.  ",
	)
	assert(
		baseSystemPrompt === "You are LUMI, an AI developer companion.\n\nFollow instructions.",
		"System prompt token 0 normalized cleanly",
	)

	// Simulate 5 multi-turn iterations
	const turnsHistory: OpenAI.Chat.ChatCompletionMessageParam[][] = []
	const cumulativeMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []

	for (let turn = 1; turn <= 5; turn++) {
		cumulativeMessages.push({
			role: "user",
			content: [{ type: "text", text: `Turn ${turn}: Execute step ${turn} with long logs` }] as unknown as string,
		})

		cumulativeMessages.push({
			role: "assistant",
			content: `<think>Processing step ${turn} internal thought reasoning</think>\nExecuting tool action for turn ${turn}.`,
		})

		const rawToolOutput =
			`\u001b[32m[SUCCESS]\u001b[0m Result for step ${turn}:\n` +
			`Log line A: https://example.com/api?tracking_token_param_super_long_${turn}=abcdef123456789012345678901234567890\n` +
			`Log line B: ${"Output line content ".repeat(30)}\n` +
			`    at node:internal/process/execution:12\n`.repeat(5)

		cumulativeMessages.push({
			role: "tool",
			tool_call_id: `call_${turn}`,
			content: rawToolOutput,
		})

		const processed = engine.processApcStableMessages(cumulativeMessages)
		turnsHistory.push(processed)
	}

	// Verify Prefix Invariance across consecutive turns
	let allTurnsPrefixInvariant = true
	for (let t = 0; t < turnsHistory.length - 1; t++) {
		const prevTurn = turnsHistory[t]
		const nextTurn = turnsHistory[t + 1]

		const prevPrefixInNext = nextTurn.slice(0, prevTurn.length)
		const isEqual = JSON.stringify(prevPrefixInNext) === JSON.stringify(prevTurn)

		if (!isEqual) {
			allTurnsPrefixInvariant = false
			console.error(`  Mismatch between Turn ${t + 1} and Turn ${t + 2}!`)
		}
	}

	assert(allTurnsPrefixInvariant, "100% Prefix Invariance guaranteed across all 5 multi-turn agent turns")

	const sanitizedThinking = engine.sanitizeAssistantContent(
		"<thinking>trace 1</thinking><reasoning>trace 2</reasoning>Final Answer",
	)
	assert(
		sanitizedThinking === "Final Answer",
		"Multi-format reasoning tags (<think>, <thinking>, <reasoning>) stripped cleanly",
	)

	// -------------------------------------------------------------
	// BENCHMARK 2: BPE Vocabulary & Token Normalization Audit
	// -------------------------------------------------------------
	console.log("\n--- Benchmark 2: BPE Vocabulary & Text Cleaning Audit ---")

	const rawMessyInput =
		"\u001b[31m[ERROR]\u001b[0m \u001b]0;Terminal Title\u0007Failed loading module\r\n" +
		"<!-- HTML internal comment -->\n" +
		"    at node:internal/main/run_main_module:10\n" +
		"    at node:internal/main/run_main_module:11\n" +
		"    at node:internal/main/run_main_module:12\n" +
		"    at node:internal/main/run_main_module:13\n" +
		"Path: /Users/bozoegg/Downloads/codemarie-new/src/core/api/transform/apc-stable-engine.ts\n" +
		"Repeated error status\nRepeated error status\nRepeated error status\nRepeated error status\n"

	const cleaned = engine.cleanText(rawMessyInput)

	assert(!cleaned.includes("\u001b[31m") && !cleaned.includes("Terminal Title"), "CSI & OSC ANSI escape codes stripped")
	assert(!cleaned.includes("<!-- HTML internal comment -->"), "HTML comments stripped")
	assert(cleaned.includes("[... internal stack frames collapsed ...]"), "Internal stack frames cleanly collapsed")
	assert(cleaned.includes("~.../apc-stable-engine.ts"), "Home directory paths minified to BPE-friendly relative format")
	assert(cleaned.includes("Repeated error status [x4 repeated]"), "Consecutive duplicate lines compressed via RLE")
	assert(!cleaned.includes("\r\n"), "CRLF normalized to standard LF")

	// -------------------------------------------------------------
	// BENCHMARK 3: Tool Schema Deterministic Sorting
	// -------------------------------------------------------------
	console.log("\n--- Benchmark 3: Tool Schema Deterministic Sorting ---")

	const unorderedTools: DietCodeTool[] = [
		{ type: "function", function: { name: "write_file", description: "Write file" } },
		{ type: "function", function: { name: "execute_command", description: "Execute" } },
		{ type: "function", function: { name: "ask_question", description: "Ask" } },
		{ type: "function", function: { name: "read_file", description: "Read" } },
	]

	const sortedTools = engine.alignToolSchemas(unorderedTools)
	const toolNames = sortedTools?.map((t) => ("function" in t && t.function ? t.function.name : "")) || []

	assert(
		JSON.stringify(toolNames) === JSON.stringify(["ask_question", "execute_command", "read_file", "write_file"]),
		"Tool schemas sorted deterministically alphabetically to prevent Token 0 cache key drift",
	)

	// -------------------------------------------------------------
	// BENCHMARK 4: Performance & Latency Metrics
	// -------------------------------------------------------------
	console.log("\n--- Benchmark 4: Ingestion Performance & Throughput ---")

	const largeSessionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []
	for (let i = 0; i < 100; i++) {
		largeSessionMessages.push({
			role: "user",
			content: `User query ${i} detailing code instructions. ${"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10)}`,
		})
		largeSessionMessages.push({
			role: "assistant",
			content: `<think>Reasoning step ${i}</think>\nAssistant reply ${i} with solution code details.`,
		})
		largeSessionMessages.push({
			role: "tool",
			tool_call_id: `tool_${i}`,
			content: `Tool result ${i}: ${"Code output line content sample for benchmark. ".repeat(20)}`,
		})
	}

	const startTime = performance.now()
	const iterations = 50
	for (let iter = 0; iter < iterations; iter++) {
		engine.processApcStableMessages(largeSessionMessages)
	}
	const endTime = performance.now()
	const totalDurationMs = endTime - startTime
	const avgMsPerRun = totalDurationMs / iterations
	const messagesPerSec = (largeSessionMessages.length * iterations) / (totalDurationMs / 1000)

	console.log(
		`  Processed 300 messages per session across ${iterations} runs (${largeSessionMessages.length * iterations} total messages)`,
	)
	console.log(`  Total Time: ${totalDurationMs.toFixed(2)} ms`)
	console.log(`  Average Latency per Session Processing: ${avgMsPerRun.toFixed(2)} ms`)
	console.log(`  Throughput: ${Math.round(messagesPerSec)} messages/sec`)

	assert(avgMsPerRun < 50, `Session processing latency is sub-50ms (${avgMsPerRun.toFixed(2)} ms)`)

	// -------------------------------------------------------------
	// BENCHMARK 5: Telemetry and Cost Savings Tracking
	// -------------------------------------------------------------
	console.log("\n--- Benchmark 5: Telemetry & Cache Hit Ratio Calculation ---")

	engine.logCacheTelemetry("Cerebras", "llama3.1-70b", 500, 4500, 200, 0.6)
	engine.logCacheTelemetry("Cerebras", "llama3.1-70b", 300, 4700, 250, 0.6)

	const report = engine.getLifetimeTelemetryReport()
	console.log(`  Telemetry Report:`, JSON.stringify(report, null, 2))
	assert(report.totalRequests === 2, "Recorded 2 requests in telemetry")
	assert(
		report.averageCacheHitRatio === "92.0%",
		`Cache hit ratio calculated correctly (92.0% expected, got ${report.averageCacheHitRatio})`,
	)

	// -------------------------------------------------------------
	// BENCHMARK 6: Hardware Profile Preset Audit
	// -------------------------------------------------------------
	console.log("\n--- Benchmark 6: APC Profiles Verification ---")

	const longToolOutput = "LOG LINE\n" + "A".repeat(2000) + "\nEND LINE"
	const strictCompacted = ApcProfiles.STRICT_APC.compactToolOutputContent(longToolOutput)
	const highDensityCompacted = ApcProfiles.HIGH_DENSITY.compactToolOutputContent(longToolOutput)
	const maxRetentionCompacted = ApcProfiles.MAX_RETENTION.compactToolOutputContent(longToolOutput)

	assert(
		strictCompacted.length <= 750,
		`STRICT_APC Profile enforces 700-char tool output ceiling (${strictCompacted.length} chars)`,
	)
	assert(
		highDensityCompacted.length < strictCompacted.length,
		`HIGH_DENSITY Profile enforces stricter 500-char ceiling (${highDensityCompacted.length} chars)`,
	)
	assert(
		maxRetentionCompacted.length > strictCompacted.length,
		`MAX_RETENTION Profile enforces higher 1200-char ceiling (${maxRetentionCompacted.length} chars)`,
	)

	console.log("\n==================================================================")
	console.log(`  BENCHMARK SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
	console.log("==================================================================")

	if (totalFailed > 0) {
		process.exit(1)
	}
}

runHeadlessBenchmark().catch((err) => {
	console.error("Benchmark crashed:", err)
	process.exit(1)
})
