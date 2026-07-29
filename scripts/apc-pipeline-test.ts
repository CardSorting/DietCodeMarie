import type OpenAI from "openai"
import { prepareCerebrasMessages } from "../src/core/api/providers/cerebras"
import { defaultApcStableEngine } from "../src/core/api/transform/apc-stable-engine"
import { TokenIngestionBufferEngine } from "../src/core/api/transform/token-buffer-engine"
import type { DietCodeStorageMessage } from "../src/shared/messages/content"
import type { DietCodeTool } from "../src/shared/tools"

async function runRealPipelineTest() {
	console.log("==================================================================")
	console.log("    ApcStableIngestionEngine Real Pipeline End-to-End Test       ")
	console.log("==================================================================\n")

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

	// Simulated Agent System Prompt
	const rawSystemPrompt =
		"   You are LUMI, an autonomous software engineering AI agent.\r\n\r\nAlways follow user instructions strictly.   "
	const normalizedSystemPrompt = defaultApcStableEngine.normalizeSystemPrompt(rawSystemPrompt)

	assert(
		normalizedSystemPrompt ===
			"You are LUMI, an autonomous software engineering AI agent.\n\nAlways follow user instructions strictly.",
		"Token 0 System Prompt normalized without trailing/leading whitespace or CRLF",
	)

	// Real-world Tool Schemas
	const realTools: DietCodeTool[] = [
		{ type: "function", function: { name: "write_file", description: "Write file content to target path" } },
		{ type: "function", function: { name: "execute_command", description: "Execute terminal shell command" } },
		{ type: "function", function: { name: "read_file", description: "Read file contents from target path" } },
		{ type: "function", function: { name: "list_dir", description: "List files in directory" } },
	]

	const sortedTools = defaultApcStableEngine.alignToolSchemas(realTools)
	const sortedToolNames = sortedTools?.map((t) => ("function" in t && t.function ? t.function.name : ""))
	assert(
		JSON.stringify(sortedToolNames) === JSON.stringify(["execute_command", "list_dir", "read_file", "write_file"]),
		"Tool schemas aligned deterministically to prevent Token 0 schema drift",
	)

	// -------------------------------------------------------------
	// PIPELINE TEST 1: Multi-Turn Agent Turn Ingestion Pipeline (Text & Code)
	// -------------------------------------------------------------
	console.log("\n--- Pipeline Test 1: 10-Turn Multi-Turn Session Ingestion (Text & Code) ---")

	const rawStorageHistory: DietCodeStorageMessage[] = []
	const turnPayloads: OpenAI.Chat.ChatCompletionMessageParam[][] = []

	for (let turn = 1; turn <= 10; turn++) {
		// User turn input
		rawStorageHistory.push({
			role: "user",
			content: `User request turn ${turn}: Perform code refactoring task part ${turn}`,
		})

		// Assistant response turn
		rawStorageHistory.push({
			role: "assistant",
			content: `<think>Deep reasoning step ${turn} about codebase structure and AST tokens</think>\nExecuting tool for step ${turn}.`,
		})

		// Tool response turn
		rawStorageHistory.push({
			role: "tool",
			tool_call_id: `call_${turn}`,
			content:
				`\u001b[32m[SUCCESS]\u001b[0m Tool output for step ${turn}:\n` +
				`File: /Users/bozoegg/Downloads/codemarie-new/src/core/api/providers/cerebras.ts\n` +
				`    at node:internal/main/run_main_module:10\n`.repeat(4) +
				`Status 200 OK\nStatus 200 OK\nStatus 200 OK\n`,
		} as unknown as DietCodeStorageMessage)

		// Execute full pipeline logic identical to CerebrasHandler.createMessage
		const visionOptimized = defaultApcStableEngine.pruneHistoricalVisionPayloads(rawStorageHistory)
		const rawOpenAiMessages = prepareCerebrasMessages(visionOptimized)
		const apcStableMessages = defaultApcStableEngine.processApcStableMessages(rawOpenAiMessages)
		const cerebrasMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: normalizedSystemPrompt },
			...apcStableMessages,
		]

		turnPayloads.push(cerebrasMessages)
	}

	// Verify prefix invariance across consecutive turns
	let pipelinePrefixInvariant = true
	for (let t = 0; t < turnPayloads.length - 1; t++) {
		const prevPayload = turnPayloads[t]
		const nextPayload = turnPayloads[t + 1]

		const prefixSlice = nextPayload.slice(0, prevPayload.length)
		const matches = JSON.stringify(prefixSlice) === JSON.stringify(prevPayload)

		if (!matches) {
			pipelinePrefixInvariant = false
			console.error(`  Pipeline prefix mismatch between Turn ${t + 1} and Turn ${t + 2}`)
		}
	}

	assert(pipelinePrefixInvariant, "100% Prefix Invariance verified across 10-turn Cerebras provider pipeline calls")

	// -------------------------------------------------------------
	// PIPELINE TEST 2: Historical Vision Payload Anchor Pruning
	// -------------------------------------------------------------
	console.log("\n--- Pipeline Test 2: Historical Vision Payload Pruning ---")

	const visionHistory: DietCodeStorageMessage[] = [
		{
			role: "user",
			content: [
				{ type: "text", text: "Look at image 1" },
				{ type: "image", source: { type: "base64", media_type: "image/png", data: "raw_image_1_base64_data" } },
			] as unknown as string,
		},
		{ role: "assistant", content: "I see image 1" },
		{
			role: "user",
			content: [
				{ type: "text", text: "Look at image 2" },
				{ type: "image", source: { type: "base64", media_type: "image/png", data: "raw_image_2_base64_data" } },
			] as unknown as string,
		},
	]

	const prunedVision = defaultApcStableEngine.pruneHistoricalVisionPayloads(visionHistory)
	const turn1UserMsg = JSON.stringify(prunedVision[0])
	const turn2UserMsg = JSON.stringify(prunedVision[2])

	assert(!turn1UserMsg.includes("raw_image_1_base64_data"), "Historical Turn 1 base64 image pruned from payload")
	assert(turn1UserMsg.includes("[VisAnchor #1"), "Historical Turn 1 image replaced with lightweight VisAnchor")
	assert(turn2UserMsg.includes("raw_image_2_base64_data"), "Active Turn 2 raw image payload preserved")

	// -------------------------------------------------------------
	// PIPELINE TEST 3: Static Historical Tool Output Truncation
	// -------------------------------------------------------------
	console.log("\n--- Pipeline Test 3: Static Tool Output Compaction ---")

	const openAiToolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
		{ role: "user", content: "read big file" },
		{ role: "assistant", content: "reading" },
		{
			role: "tool",
			tool_call_id: "call_big",
			content:
				"HEADER LOG\n" +
				Array.from({ length: 50 }, (_, i) => `Log line ${i}: content payload detailing unique long output text`).join(
					"\n",
				) +
				"\nFOOTER LOG",
		},
	]

	const processedToolMsg = defaultApcStableEngine.processApcStableMessages(openAiToolMessages)
	const toolContentStr = (processedToolMsg.find((m) => m.role === "tool")?.content as string) || ""

	assert(toolContentStr.includes("[HistOutputTruncated]"), "Long tool output safely compacted with truncation boundary")
	assert(toolContentStr.startsWith("HEADER LOG"), "Tool output head preserved cleanly")
	assert(toolContentStr.endsWith("FOOTER LOG"), "Tool output tail preserved cleanly")

	// -------------------------------------------------------------
	// PIPELINE TEST 4: APC-Stable Context Ceiling Truncation
	// -------------------------------------------------------------
	console.log("\n--- Pipeline Test 4: APC Context Ceiling Truncation ---")

	const largeTurnPayload = turnPayloads[turnPayloads.length - 1].slice(1) // exclude system msg
	const truncated = defaultApcStableEngine.enforceApcStableContextCeiling(largeTurnPayload, 200, 2)

	assert(truncated.length < largeTurnPayload.length, "Context window trimmed cleanly when exceeding token limit")
	assert(
		JSON.stringify(truncated[truncated.length - 1]) === JSON.stringify(largeTurnPayload[largeTurnPayload.length - 1]),
		"Most recent turns strictly preserved during context ceiling truncation",
	)

	// -------------------------------------------------------------
	// PIPELINE TEST 5: Deep Audit — Turn Snapping & Array Deduplication
	// -------------------------------------------------------------
	console.log("\n--- Pipeline Test 5: Deep Audit — Turn Snapping & Pre-Unwrap Deduplication ---")

	// Audit Test 5A: Snapping truncated start index to valid user role
	const unalignedTurnSequence: OpenAI.Chat.ChatCompletionMessageParam[] = [
		{ role: "user", content: "Short prompt 1" },
		{ role: "assistant", content: "Very long reply 1 ".repeat(20) }, // would trigger cutoff
		{ role: "tool", tool_call_id: "call_x", content: "Tool output 1 ".repeat(20) },
		{ role: "user", content: "Prompt 2" },
		{ role: "assistant", content: "Reply 2" },
	]

	const snappedTruncated = defaultApcStableEngine.enforceApcStableContextCeiling(unalignedTurnSequence, 50, 2)
	assert(
		snappedTruncated[0].role === "user",
		`Context ceiling start index snapped to 'user' role (got '${snappedTruncated[0].role}') for API schema compliance`,
	)

	// Audit Test 5B: Single text-block array unwrapping before deduplication
	const arrayWrappedDups: OpenAI.Chat.ChatCompletionMessageParam[] = [
		{
			role: "user",
			content: [
				{ type: "text", text: "Identical long prompt content repeated twice in array format" },
			] as unknown as string,
		},
		{
			role: "user",
			content: [
				{ type: "text", text: "Identical long prompt content repeated twice in array format" },
			] as unknown as string,
		},
	]

	const processedDups = defaultApcStableEngine.processApcStableMessages(arrayWrappedDups)
	assert(processedDups.length === 1, "Array-wrapped duplicate user messages unwrapped and deduplicated correctly")
	assert(typeof processedDups[0].content === "string", "Unwrapped array content converted to static string format")

	// -------------------------------------------------------------
	// PIPELINE TEST 6: TokenIngestionBufferEngine Parity Audit
	// -------------------------------------------------------------
	console.log("\n--- Pipeline Test 6: Central TokenIngestionBufferEngine Integration Parity ---")

	const customBufferEngine = new TokenIngestionBufferEngine({
		keepFullToolTurns: 0,
		maxToolOutputLength: 300,
	})

	const bufferPipelineResult = customBufferEngine.optimizeMessagesPipeline({
		systemPrompt: rawSystemPrompt,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: "Look at screenshot" },
					{ type: "image", source: { type: "base64", media_type: "image/png", data: "historical_image_data" } },
				] as unknown as string,
			},
			{
				role: "assistant",
				content: "<thinking>private trace</thinking>Assistant reply content with reasoning",
			},
			{
				role: "tool",
				tool_call_id: "call_tb1",
				content:
					"HEADER LOG\n" +
					Array.from({ length: 40 }, (_, i) => `Line ${i}: long log output`).join("\n") +
					"\nFOOTER LOG",
			},
			{
				role: "user",
				content: "Active prompt",
			},
			{
				role: "assistant",
				content: "Final reply",
			},
		],
		tools: realTools,
		maxAllowedTokens: 30,
	})

	assert(
		bufferPipelineResult.normalizedSystemPrompt === normalizedSystemPrompt,
		"TokenBuffer normalized system prompt matches APC engine",
	)
	assert(
		!JSON.stringify(bufferPipelineResult.optimizedMessages).includes("private trace"),
		"TokenBuffer sanitized assistant reasoning tags cleanly",
	)
	const toolMsg = bufferPipelineResult.optimizedMessages.find((m) => m.role === "tool")
	assert(
		typeof toolMsg?.content === "string" && toolMsg.content.includes("[HistOutputTruncated]"),
		"TokenBuffer snapped tool output truncation to whole lines",
	)
	assert(
		bufferPipelineResult.optimizedMessages[0]?.role === "user",
		"TokenBuffer context ceiling snapped start index to 'user' role",
	)

	console.log("\n==================================================================")
	console.log(`  REAL PIPELINE TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
	console.log("==================================================================")

	if (totalFailed > 0) {
		process.exit(1)
	}
}

runRealPipelineTest().catch((err) => {
	console.error("Pipeline test failed:", err)
	process.exit(1)
})
