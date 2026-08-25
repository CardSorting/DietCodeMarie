import "should"
import { galxDefaultModelId, galxDefaultModelInfo } from "@shared/api"
import type OpenAI from "openai"
import sinon from "sinon"
import { GalxHandler } from "../galx"

describe("GalxHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	const createAsyncIterable = <T>(data: T[] = []) => ({
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	})

	it("should return default model if none specified", () => {
		const handler = new GalxHandler({
			galxApiKey: "galx_live_test_key",
		})
		const model = handler.getModel()
		model.id.should.equal(galxDefaultModelId)
		model.info.should.deepEqual(galxDefaultModelInfo)
	})

	it("should yield text and calculate usage correctly with prompt caching discount", async () => {
		const handler = new GalxHandler({
			galxApiKey: "galx_live_test_key",
			galxModelId: "gpt-5.6-sol",
		})

		const fakeClient = {
			chat: {
				completions: {
					create: sinon.stub().resolves(
						createAsyncIterable([
							{
								choices: [
									{
										delta: {
											content: "Hello from GALXAI",
										},
									},
								],
							},
							{
								choices: [{}],
								usage: {
									prompt_tokens: 1000,
									completion_tokens: 200,
									prompt_tokens_details: {
										cached_tokens: 800,
									},
								},
							},
						]),
					),
				},
			},
		}

		sinon.stub(handler as unknown as { ensureClient: () => OpenAI }, "ensureClient").returns(fakeClient as unknown as OpenAI)

		const chunks = []
		for await (const chunk of handler.createMessage("system prompt", [{ role: "user", content: "Hi" }])) {
			chunks.push(chunk)
		}

		chunks.length.should.equal(2)
		const textChunk = chunks[0]
		const usageChunk = chunks[1]

		should(textChunk).deepEqual({
			type: "text",
			text: "Hello from GALXAI",
		})

		// 1000 prompt tokens total, 800 cached tokens (75% cache discount), 200 uncached input tokens, 200 output tokens
		// gpt-5.6-sol: inputPrice = 3.75, outputPrice = 15.0, cacheReadsPrice = 1.25
		// inputCost: (200 / 1e6) * 3.75 = 0.00075
		// outputCost: (200 / 1e6) * 15.0 = 0.003
		// cacheCost: (800 / 1e6) * 1.25 = 0.001
		// total: 0.00075 + 0.003 + 0.001 = 0.00475
		should(usageChunk).be.ok()
		if (usageChunk && usageChunk.type === "usage") {
			should(usageChunk.inputTokens).equal(200)
			should(usageChunk.cacheReadTokens).equal(800)
			should(usageChunk.outputTokens).equal(200)
			if (usageChunk.totalCost !== undefined) {
				Math.abs(usageChunk.totalCost - 0.00475).should.be.below(0.00001)
			}
		}
	})
})
