import { describe, expect, it } from "vitest"
import { playDictationStartSound, playDictationStopSound } from "./audioCues"

describe("audioCues utility", () => {
	it("executes playDictationStartSound without throwing error", () => {
		expect(() => playDictationStartSound()).not.toThrow()
	})

	it("executes playDictationStopSound without throwing error", () => {
		expect(() => playDictationStopSound()).not.toThrow()
	})
})
