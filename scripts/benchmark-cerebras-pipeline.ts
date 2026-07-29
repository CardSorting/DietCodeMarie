import { defaultTokenBufferEngine, TokenBufferProfiles } from "../src/core/api/transform/token-buffer-engine"

function runCerebrasPipelineBenchmark() {
	console.log("================================================================================")
	console.log("  CEREBRAS & GEMMA 4 31B: REAL TOKEN INGESTION BUFFER PIPELINE BENCHMARK")
	console.log("================================================================================")

	const systemPrompt = `
You are LUMI, an expert autonomous AI software engineer.
Follow user directives precisely and maintain extreme code quality standards.
    `.trim()

	// Realistic 8-turn historical agent session payload
	const rawMessages: any[] = [
		{
			role: "user",
			content: [
				{ type: "text", text: "Look at screenshot 1 of UI bug in /Users/bozoegg/Downloads/codemarie-new/src/index.ts" },
				{
					type: "image",
					source: {
						type: "base64",
						media_type: "image/png",
						data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" + "A".repeat(4000),
					},
				},
			],
		},
		{
			role: "assistant",
			content: "I analyze screenshot 1. Inspecting /Users/bozoegg/Downloads/codemarie-new/src/index.ts",
		},
		{
			role: "user",
			content: [
				{ type: "text", text: "Look at screenshot 2 of fixed UI" },
				{
					type: "image",
					source: {
						type: "base64",
						media_type: "image/png",
						data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" + "B".repeat(4000),
					},
				},
			],
		},
		{
			role: "tool",
			tool_call_id: "call_1",
			content:
				`
<!-- HTML Comment Header -->
//# Comment line 1
==================================================
{\n  "tool": "read_file",\n  "path": "/Users/bozoegg/Downloads/codemarie-new/src/index.ts"\n}
Visual Context Anchor
Environment State
Execution Status: Success
Downloading chunk...
Downloading chunk...
Downloading chunk...
Downloading chunk...
Downloading chunk...
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,5 +10,8 @@
Error: Pipeline crash during load
    at Module._compile (node:internal/modules/cjs/loader:1722:5)
    at Object.require.extensions (node:internal/modules/cjs/loader:1905:10)
    at Module.load (node:internal/modules/cjs/loader:1474:32)
    at Function._load (node:internal/modules/cjs/loader:1286:12)
    at Module.require (node:internal/modules/cjs/loader:1300:10)
https://example.com/api/v1/search?utm_source=google&session_token=abcdef1234567890abcdef1234567890&tracking_id=999
{"status": 500, "message": "Failed", "error": "Timeout"}
` + "X".repeat(2000),
		},
		{
			role: "user",
			content: "Continue debugging /Users/bozoegg/Downloads/codemarie-new/src/core/api/providers/cerebras.ts",
		},
		{
			role: "assistant",
			content: "Updating Cerebras handler implementation.",
		},
		{
			role: "user",
			content: "Active turn: Run build and verify tests",
		},
	]

	const startTime = performance.now()

	// Run optimization pipeline
	const profile = TokenBufferProfiles.STRICT_CACHE_STABILITY
	const pipelineResult = profile.optimizeMessagesPipeline({
		systemPrompt,
		messages: rawMessages,
		maxAllowedTokens: 100_000,
	})

	const endTime = performance.now()
	const pipelineLatencyMs = (endTime - startTime).toFixed(3)

	// Baseline stats
	const rawPayloadStr = systemPrompt + JSON.stringify(rawMessages)
	const rawChars = rawPayloadStr.length
	const rawEstimatedTokens = defaultTokenBufferEngine.estimateTokenCount(rawPayloadStr)

	// Optimized stats
	const optPayloadStr = pipelineResult.normalizedSystemPrompt + JSON.stringify(pipelineResult.optimizedMessages)
	const optChars = optPayloadStr.length
	const optEstimatedTokens = defaultTokenBufferEngine.estimateTokenCount(optPayloadStr)

	const tokensSaved = Math.max(0, rawEstimatedTokens - optEstimatedTokens)
	const reductionPercentage = ((tokensSaved / rawEstimatedTokens) * 100).toFixed(1)

	// Financial pricing calculations (Cerebras Gemma 4 31B: $0.99/1M uncached input, $0.00 cached reads)
	const baselineTurn10Cost = (rawEstimatedTokens * 10 * 0.99) / 1_000_000 // 0% cache hit
	const optimizedTurn10Cost = (optEstimatedTokens * 0.99 + optEstimatedTokens * 9 * 0.0) / 1_000_000 // 90% APC cache hit
	const dollarSavings = baselineTurn10Cost - optimizedTurn10Cost

	console.log("\n--- BENCHMARK RESULTS SUMMARY ---")
	console.log(`Pipeline Execution Latency:     ${pipelineLatencyMs} ms`)
	console.log(
		`Baseline Payload Size:          ${rawChars.toLocaleString()} chars (~${rawEstimatedTokens.toLocaleString()} tokens)`,
	)
	console.log(
		`Optimized Payload Size:         ${optChars.toLocaleString()} chars (~${optEstimatedTokens.toLocaleString()} tokens)`,
	)
	console.log(`Tokens Saved per Turn:          ${tokensSaved.toLocaleString()} tokens (${reductionPercentage}% reduction)`)
	console.log(`Estimated 10-Turn Baseline Cost: $${baselineTurn10Cost.toFixed(4)} (0% Cache Hit)`)
	console.log(`Estimated 10-Turn APC Optimized:$${optimizedTurn10Cost.toFixed(4)} (90% Cerebras APC Hit)`)
	console.log(
		`Total 10-Turn Financial Savings: $${dollarSavings.toFixed(4)} (${((dollarSavings / baselineTurn10Cost) * 100).toFixed(1)}% Cost Reduction)`,
	)
	console.log("================================================================================")
}

runCerebrasPipelineBenchmark()
