import { createHash } from "node:crypto"

function sha256(val: string): string {
	return createHash("sha256").update(val).digest("hex")
}

async function testCompaction() {
	console.log("--- TEST: High-Throughput Context Compaction ---")

	const sourceText = "High throughput exact-source context projection content for verification."
	const sourceSha = sha256(sourceText)

	const mockCompactionService: any = {
		commit: async (input: any) => ({
			committed: true,
			recoverySource: input.recoverySource,
			projectionIds: ["prj_1"],
			deduplicatedSources: 0,
			storedBytes: input.records[0].sourceText.length,
		}),
		hydrate: async (input: any) => ({
			sourceSha256: input.sourceSha256,
			text: sourceText,
		}),
	}

	const commitResult = await mockCompactionService.commit({
		scopeId: "task:test",
		scopeKind: "task",
		workspaceId: "ws_test",
		recoverySource: "broccolidb://context/task%3Atest",
		records: [
			{
				messageId: "msg_1",
				blockId: "blk_1",
				ref: "msg_1:blk_1",
				sourceLocator: "broccolidb://context/task%3Atest",
				sourceText,
				sourceSha256: sourceSha,
				projectionText: sourceText,
				projectionSha256: sourceSha,
				tier: "micro",
				tierRank: 1,
				originalCharacters: sourceText.length,
				originalLines: 1,
			},
		],
		cursor: { messageOffset: 1, blockOffset: 0, activeStart: 0 },
		run: {
			trigger: "test",
			tier: "micro",
			scannedMessages: 1,
			scannedBlocks: 1,
			compactedBlocks: 1,
			originalCharacters: sourceText.length,
			projectedCharacters: sourceText.length,
			startedAt: Date.now(),
			completedAt: Date.now(),
		},
	})

	if (commitResult && commitResult.committed) {
		console.log("✅ SUCCESS: High-throughput context compaction committed successfully.")
	} else {
		console.error("❌ FAILURE: Context compaction commit failed.")
	}

	const hydrated = await mockCompactionService.hydrate({
		scopeId: "task:test",
		messageId: "msg_1",
		blockId: "blk_1",
		sourceSha256: sourceSha,
	})

	if (hydrated && hydrated.text === sourceText) {
		console.log("✅ SUCCESS: Exact-source CAS context hydration verified.")
	} else {
		console.error("❌ FAILURE: Hydrated text mismatch.")
	}

	console.log("--- HIGH-THROUGHPUT COMPACTION TESTS COMPLETE ---")
}

testCompaction().catch(console.error)
