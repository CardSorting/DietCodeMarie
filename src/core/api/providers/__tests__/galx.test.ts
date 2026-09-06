import { galxDefaultBaseUrl, galxDefaultModelId, galxDefaultModelInfo } from "@shared/api"
import type OpenAI from "openai"
import should from "should"
import sinon from "sinon"
import * as net from "@/shared/net"
import { GalxHandler } from "../galx"

interface GalxHandlerPrivate {
	ensureClient: () => OpenAI
}

describe("GalxHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	const createAsyncIterable = <T>(data: T[] = []) => ({
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	})

	it("should have https://galx.ai/v1 as default base URL", () => {
		should(galxDefaultBaseUrl).equal("https://galx.ai/v1")
	})

	it("should return default model if none specified", () => {
		const handler = new GalxHandler({
			galxApiKey: "galx_live_test_key",
		})
		const model = handler.getModel()
		should(model.id).equal(galxDefaultModelId)
		should(model.info).deepEqual(galxDefaultModelInfo)
	})

	it("should return all configured galxModels correctly", () => {
		const solHandler = new GalxHandler({ galxApiKey: "galx_live_test_key", galxModelId: "gpt-5.6-sol" })
		should(solHandler.getModel().id).equal("gpt-5.6-sol")
		should(solHandler.getModel().info.name).equal("OpenAI Codex GPT-5.6 Sol (Flagship SOTA)")

		const terraHandler = new GalxHandler({ galxApiKey: "galx_live_test_key", galxModelId: "gpt-5.6-terra" })
		should(terraHandler.getModel().id).equal("gpt-5.6-terra")
		should(terraHandler.getModel().info.name).equal("OpenAI Codex GPT-5.6 Terra (Balanced Frontier)")

		const lunaHandler = new GalxHandler({ galxApiKey: "galx_live_test_key", galxModelId: "gpt-5.6-luna" })
		should(lunaHandler.getModel().id).equal("gpt-5.6-luna")
		should(lunaHandler.getModel().info.name).equal("OpenAI Codex GPT-5.6 Luna (High-Velocity)")
	})

	it("should throw if no API key is provided when creating client", () => {
		const handler = new GalxHandler({})
		should(() => {
			;(handler as unknown as GalxHandlerPrivate).ensureClient()
		}).throw("GALXAI API key is required. Please configure your key in Settings.")
	})

	it("should use galxDefaultBaseUrl when galxBaseUrl is not specified", () => {
		const createClientStub = sinon.stub(net, "createOpenAIClient").returns({} as unknown as OpenAI)
		const handler = new GalxHandler({
			galxApiKey: "galx_live_test_key",
		})
		;(handler as unknown as GalxHandlerPrivate).ensureClient()
		should(createClientStub.calledOnce).be.true()
		should(createClientStub.firstCall?.args[0]?.baseURL).equal("https://galx.ai/v1")
		should(createClientStub.firstCall?.args[0]?.apiKey).equal("galx_live_test_key")
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

		sinon.stub(handler as unknown as GalxHandlerPrivate, "ensureClient").returns(fakeClient as unknown as OpenAI)

		const chunks = []
		for await (const chunk of handler.createMessage("system prompt", [{ role: "user", content: "Hi" }])) {
			chunks.push(chunk)
		}

		should(chunks.length).equal(2)
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
