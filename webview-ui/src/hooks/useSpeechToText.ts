import { useCallback, useEffect, useRef, useState } from "react"
import { playDictationStartSound, playDictationStopSound } from "@/utils/audioCues"

export interface ISpeechRecognitionResult {
	readonly length: number
	readonly isFinal: boolean
	[index: number]: { readonly transcript: string }
}

export interface ISpeechRecognitionEvent {
	readonly resultIndex: number
	readonly results: {
		readonly length: number
		[index: number]: ISpeechRecognitionResult
	}
}

export interface ISpeechRecognitionErrorEvent {
	readonly error: string
	readonly message?: string
}

export interface ISpeechRecognition {
	continuous: boolean
	interimResults: boolean
	lang: string
	onstart: (() => void) | null
	onresult: ((event: ISpeechRecognitionEvent) => void) | null
	onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null
	onend: (() => void) | null
	start(): void
	stop(): void
	abort(): void
}

declare global {
	interface Window {
		SpeechRecognition?: new () => ISpeechRecognition
		webkitSpeechRecognition?: new () => ISpeechRecognition
	}
}

export interface UseSpeechToTextOptions {
	/** Callback invoked when speech recognition returns transcribed text */
	onTranscript?: (transcript: string, isFinal: boolean) => void
	/** Recognition language (default: system locale) */
	language?: string
	/** Continuous listening mode (default: true) */
	continuous?: boolean
	/** Return interim results as user speaks (default: true) */
	interimResults?: boolean
	/** Milliseconds of quiet pause before hands-free auto-commit (default: 3000ms, set to 0 to disable) */
	silenceTimeoutMs?: number
}

export interface UseSpeechToTextReturn {
	/** Whether speech recognition is currently active and listening */
	isListening: boolean
	/** Whether speech recognition is supported in this browser/webview environment */
	isSupported: boolean
	/** Real-time interim transcript for active utterance */
	interimTranscript: string
	/** Active language code (auto-sensed from system or provided) */
	language: string
	/** Error message if speech recognition failed */
	error: string | null
	/** Start listening for speech */
	startListening: () => void
	/** Stop listening for speech */
	stopListening: () => void
	/** Toggle listening state */
	toggleListening: () => void
	/** Clear any active error state */
	resetError: () => void
}

/**
 * Hook to manage Voice-to-Text speech recognition via Web Speech API.
 */
export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
	const defaultLanguage = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US"
	const {
		onTranscript,
		language = defaultLanguage,
		continuous = true,
		interimResults = true,
		silenceTimeoutMs = 3000,
	} = options

	const [isListening, setIsListening] = useState(false)
	const [interimTranscript, setInterimTranscript] = useState("")
	const [error, setError] = useState<string | null>(null)

	const recognitionRef = useRef<ISpeechRecognition | null>(null)
	const onTranscriptRef = useRef(onTranscript)
	const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		onTranscriptRef.current = onTranscript
	}, [onTranscript])

	const SpeechRecognitionConstructor =
		typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null

	const isSupported = Boolean(SpeechRecognitionConstructor)

	const clearSilenceTimer = useCallback(() => {
		if (silenceTimerRef.current) {
			clearTimeout(silenceTimerRef.current)
			silenceTimerRef.current = null
		}
	}, [])

	const stopListening = useCallback(() => {
		clearSilenceTimer()
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop()
			} catch (_err) {
				// Ignore if already stopped
			}
			recognitionRef.current = null
		}
		if (isListening) {
			playDictationStopSound()
		}
		setIsListening(false)
		setInterimTranscript("")
	}, [clearSilenceTimer, isListening])

	const resetSilenceTimer = useCallback(() => {
		clearSilenceTimer()
		if (silenceTimeoutMs > 0) {
			silenceTimerRef.current = setTimeout(() => {
				stopListening()
			}, silenceTimeoutMs)
		}
	}, [clearSilenceTimer, silenceTimeoutMs, stopListening])

	const startListening = useCallback(() => {
		if (!SpeechRecognitionConstructor) {
			setError("Speech recognition is not supported in this environment.")
			return
		}

		setError(null)

		// Stop any existing instance
		if (recognitionRef.current) {
			try {
				recognitionRef.current.abort()
			} catch (_e) {
				// Ignore
			}
		}

		try {
			const recognition = new SpeechRecognitionConstructor()
			recognition.continuous = continuous
			recognition.interimResults = interimResults
			recognition.lang = language

			recognition.onstart = () => {
				setIsListening(true)
				setError(null)
				playDictationStartSound()
				resetSilenceTimer()
			}

			recognition.onresult = (event: ISpeechRecognitionEvent) => {
				resetSilenceTimer()
				let finalTranscript = ""
				let currentInterim = ""

				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i]
					const text = result[0]?.transcript || ""
					if (result.isFinal) {
						finalTranscript += text
					} else {
						currentInterim += text
					}
				}

				setInterimTranscript(currentInterim)

				if (finalTranscript && onTranscriptRef.current) {
					onTranscriptRef.current(finalTranscript, true)
				} else if (currentInterim && onTranscriptRef.current) {
					onTranscriptRef.current(currentInterim, false)
				}
			}

			recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
				const errorCode = event.error || "unknown"
				let errorMsg = `Voice error: ${errorCode}`

				if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
					errorMsg = "Microphone access was denied or is blocked by system settings."
				} else if (errorCode === "no-speech") {
					errorMsg = "No speech detected. Please speak clearly into your microphone."
				} else if (errorCode === "network") {
					errorMsg = "Speech recognition network connection error."
				} else if (errorCode === "audio-capture") {
					errorMsg = "No microphone hardware detected."
				}

				setError(errorMsg)
				setIsListening(false)
				setInterimTranscript("")
			}

			recognition.onend = () => {
				clearSilenceTimer()
				setIsListening(false)
				setInterimTranscript("")
			}

			recognitionRef.current = recognition
			recognition.start()
		} catch (err: unknown) {
			clearSilenceTimer()
			const errorMessage = err instanceof Error ? err.message : "Failed to start speech recognition."
			setError(errorMessage)
			setIsListening(false)
		}
	}, [SpeechRecognitionConstructor, clearSilenceTimer, continuous, interimResults, language, resetSilenceTimer])

	const toggleListening = useCallback(() => {
		if (isListening) {
			stopListening()
		} else {
			startListening()
		}
	}, [isListening, startListening, stopListening])

	const resetError = useCallback(() => {
		setError(null)
	}, [])

	useEffect(() => {
		return () => {
			clearSilenceTimer()
			if (recognitionRef.current) {
				try {
					recognitionRef.current.abort()
				} catch (_e) {
					// Ignore
				}
				recognitionRef.current = null
			}
		}
	}, [clearSilenceTimer])

	return {
		isListening,
		isSupported,
		interimTranscript,
		language,
		error,
		startListening,
		stopListening,
		toggleListening,
		resetError,
	}
}
