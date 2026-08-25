import { describe, it } from "mocha"
import "should"
import { filterOpenRouterModelIds, isDietCodeFreeModelException } from "../model-filters"

describe("model-filters", () => {
	const sampleModelIds = [
		"meta-llama/llama-3.3-70b-instruct:free",
		"deepseek/deepseek-r1:free",
		"google/gemini-2.0-flash-exp:free",
		"qwen/qwq-32b:free",
		"anthropic/claude-sonnet-4.5",
		"anthropic/claude-opus-4.6",
		"openai/gpt-4o",
		"dietcode/special-model:free",
		"dietcode/custom-coder",
		"minimax-m2",
		"devstral-2512",
	]

	describe("filterOpenRouterModelIds for openrouter provider", () => {
		it("should only return models ending or containing :free and exclude dietcode/ models", () => {
			const filtered = filterOpenRouterModelIds(sampleModelIds, "openrouter")
			filtered.should.deepEqual([
				"meta-llama/llama-3.3-70b-instruct:free",
				"deepseek/deepseek-r1:free",
				"google/gemini-2.0-flash-exp:free",
				"qwen/qwq-32b:free",
			])
		})

		it("should return empty array if no :free models are present", () => {
			const nonFreeModels = ["anthropic/claude-sonnet-4.5", "openai/gpt-4o"]
			const filtered = filterOpenRouterModelIds(nonFreeModels, "openrouter")
			filtered.should.deepEqual([])
		})
	})

	describe("filterOpenRouterModelIds for dietcode provider", () => {
		it("should exclude :free models except known exceptions or allowed models", () => {
			const filtered = filterOpenRouterModelIds(sampleModelIds, "dietcode", ["google/gemini-2.0-flash-exp:free"])
			filtered.should.containEql("google/gemini-2.0-flash-exp:free")
			filtered.should.containEql("anthropic/claude-sonnet-4.5")
			filtered.should.containEql("minimax-m2")
			filtered.should.not.containEql("meta-llama/llama-3.3-70b-instruct:free")
			filtered.should.not.containEql("deepseek/deepseek-r1:free")
		})
	})

	describe("filterOpenRouterModelIds for other providers", () => {
		it("should exclude dietcode/ models but keep everything else", () => {
			const filtered = filterOpenRouterModelIds(sampleModelIds, "openai-codex")
			filtered.should.containEql("meta-llama/llama-3.3-70b-instruct:free")
			filtered.should.containEql("anthropic/claude-sonnet-4.5")
			filtered.should.not.containEql("dietcode/special-model:free")
			filtered.should.not.containEql("dietcode/custom-coder")
		})
	})

	describe("isDietCodeFreeModelException", () => {
		it("identifies known exception models", () => {
			isDietCodeFreeModelException("minimax-m2").should.be.true()
			isDietCodeFreeModelException("devstral-2512").should.be.true()
			isDietCodeFreeModelException("arcee-ai/trinity-large").should.be.true()
			isDietCodeFreeModelException("unknown-model").should.be.false()
		})
	})
})
