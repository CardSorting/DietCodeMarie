import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSpeechToText } from "./useSpeechToText"

describe("useSpeechToText hook", () => {
	let mockRecognitionInstance: any
	let originalSpeechRecognition: any
	let originalWebkitSpeechRecognition: any
	let originalMediaDevices: any

	beforeEach(() => {
		originalSpeechRecognition = window.SpeechRecognition
		originalWebkitSpeechRecognition = window.webkitSpeechRecognition
		originalMediaDevices = navigator.mediaDevices

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
		Object.defineProperty(navigator, "mediaDevices", {
			value: originalMediaDevices,
			writable: true,
			configurable: true,
		})
		vi.restoreAllMocks()
	})

	it("reports isSupported = true when SpeechRecognition is present", () => {
		const { result } = renderHook(() => useSpeechToText())
		expect(result.current.isSupported).toBe(true)
		expect(result.current.isListening).toBe(false)
		expect(result.current.isPermissionBlocked).toBe(false)
	})

	it("reports isSupported = false when SpeechRecognition API and mediaDevices are missing", () => {
		delete (window as any).SpeechRecognition
		delete (window as any).webkitSpeechRecognition
		Object.defineProperty(navigator, "mediaDevices", {
			value: undefined,
			writable: true,
			configurable: true,
		})

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

	it("handles SpeechRecognition error and sets isPermissionBlocked when not-allowed without getUserMedia", () => {
		Object.defineProperty(navigator, "mediaDevices", {
			value: undefined,
			writable: true,
			configurable: true,
		})
		const { result } = renderHook(() => useSpeechToText())

		act(() => {
			result.current.startListening()
		})

		act(() => {
			mockRecognitionInstance.onerror({ error: "not-allowed" })
		})

		expect(result.current.isListening).toBe(false)
		expect(result.current.isPermissionBlocked).toBe(true)
		expect(result.current.error).toContain("Microphone access was denied")
	})

	it("falls back to getUserMedia when SpeechRecognition fails with service-not-allowed", async () => {
		const mockTrack = { stop: vi.fn() }
		const mockStream = { getTracks: () => [mockTrack] }
		const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream)

		Object.defineProperty(navigator, "mediaDevices", {
			value: { getUserMedia: mockGetUserMedia },
			writable: true,
			configurable: true,
		})

		const { result } = renderHook(() => useSpeechToText())

		act(() => {
			result.current.startListening()
		})

		await act(async () => {
			mockRecognitionInstance.onerror({ error: "service-not-allowed" })
		})

		expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
		expect(result.current.isListening).toBe(true)
		expect(result.current.error).toBeNull()
		expect(result.current.isPermissionBlocked).toBe(false)
	})

	it("handles requestPermission method successfully", async () => {
		const mockTrack = { stop: vi.fn() }
		const mockStream = { getTracks: () => [mockTrack] }
		const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream)

		Object.defineProperty(navigator, "mediaDevices", {
			value: { getUserMedia: mockGetUserMedia },
			writable: true,
			configurable: true,
		})

		const { result } = renderHook(() => useSpeechToText())

		let granted = false
		await act(async () => {
			granted = await result.current.requestPermission()
		})

		expect(granted).toBe(true)
		expect(mockTrack.stop).toHaveBeenCalled()
		expect(result.current.isPermissionBlocked).toBe(false)
		expect(result.current.error).toBeNull()
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
