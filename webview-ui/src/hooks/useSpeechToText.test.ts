import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSpeechToText } from "./useSpeechToText"

describe("useSpeechToText hook", () => {
	let mockRecognitionInstance: any
	let originalSpeechRecognition: any
	let originalWebkitSpeechRecognition: any

	beforeEach(() => {
		originalSpeechRecognition = window.SpeechRecognition
		originalWebkitSpeechRecognition = window.webkitSpeechRecognition

		mockRecognitionInstance = {
			continuous: false,
			interimResults: false,
			lang: "",
			start: vi.fn(function (this: any) {
				if (this.onstart) this.onstart()
			}),
			stop: vi.fn(function (this: any) {
				if (this.onend) this.onend()
			}),
			abort: vi.fn(function (this: any) {
				if (this.onend) this.onend()
			}),
			onstart: null,
			onresult: null,
			onerror: null,
			onend: null,
		}

		window.SpeechRecognition = vi.fn(() => mockRecognitionInstance)
	})

	afterEach(() => {
		window.SpeechRecognition = originalSpeechRecognition
		window.webkitSpeechRecognition = originalWebkitSpeechRecognition
		vi.restoreAllMocks()
	})

	it("reports isSupported = true when SpeechRecognition is present", () => {
		const { result } = renderHook(() => useSpeechToText())
		expect(result.current.isSupported).toBe(true)
		expect(result.current.isListening).toBe(false)
	})

	it("reports isSupported = false when SpeechRecognition API is missing", () => {
		delete (window as any).SpeechRecognition
		delete (window as any).webkitSpeechRecognition

		const { result } = renderHook(() => useSpeechToText())
		expect(result.current.isSupported).toBe(false)
	})

	it("starts listening and triggers callbacks on speech input", () => {
		const onTranscript = vi.fn()
		const { result } = renderHook(() => useSpeechToText({ onTranscript }))

		act(() => {
			result.current.startListening()
		})

		expect(result.current.isListening).toBe(true)
		expect(mockRecognitionInstance.start).toHaveBeenCalled()

		// Simulate speech result event
		act(() => {
			mockRecognitionInstance.onresult({
				resultIndex: 0,
				results: [Object.assign([{ transcript: "hello world" }], { isFinal: true })],
			})
		})

		expect(onTranscript).toHaveBeenCalledWith("hello world", true)
	})

	it("handles errors and updates error state", () => {
		const { result } = renderHook(() => useSpeechToText())

		act(() => {
			result.current.startListening()
		})

		act(() => {
			mockRecognitionInstance.onerror({ error: "not-allowed" })
		})

		expect(result.current.isListening).toBe(false)
		expect(result.current.error).toContain("Microphone access was denied")
	})

	it("stops listening when stopListening is called", () => {
		const { result } = renderHook(() => useSpeechToText())

		act(() => {
			result.current.startListening()
		})
		expect(result.current.isListening).toBe(true)

		act(() => {
			result.current.stopListening()
		})
		expect(result.current.isListening).toBe(false)
	})
})
