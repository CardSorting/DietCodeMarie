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
	/** Whether microphone permission is explicitly blocked by system/browser settings */
	isPermissionBlocked: boolean
	/** Start listening for speech */
	startListening: () => void
	/** Stop listening for speech */
	stopListening: () => void
	/** Toggle listening state */
	toggleListening: () => void
	/** Clear any active error state */
	resetError: () => void
	/** Test or request microphone permission via getUserMedia */
	requestPermission: () => Promise<boolean>
}

/**
 * Hook to manage Voice-to-Text speech recognition via Web Speech API with MediaDevices fallback.
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
	const [isPermissionBlocked, setIsPermissionBlocked] = useState(false)

	const recognitionRef = useRef<ISpeechRecognition | null>(null)
	const onTranscriptRef = useRef(onTranscript)
	const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		onTranscriptRef.current = onTranscript
	}, [onTranscript])

	const SpeechRecognitionConstructor =
		typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null

	const hasMediaDevices = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)

	const isSupported = Boolean(SpeechRecognitionConstructor) || hasMediaDevices

	const mediaStreamRef = useRef<MediaStream | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)

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
			} catch {
				// Ignore if already stopped
			}
			recognitionRef.current = null
		}
		if (mediaStreamRef.current) {
			try {
				mediaStreamRef.current.getTracks().forEach((track) => {
					track.stop()
				})
			} catch {
				// Ignore
			}
			mediaStreamRef.current = null
		}
		if (mediaRecorderRef.current) {
			try {
				if (mediaRecorderRef.current.state !== "inactive") {
					mediaRecorderRef.current.stop()
				}
			} catch {
				// Ignore
			}
			mediaRecorderRef.current = null
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

	const startMediaStreamListening = useCallback(() => {
		if (!hasMediaDevices || !navigator.mediaDevices?.getUserMedia) {
			setError("Speech recognition is not supported in this environment.")
			setIsListening(false)
			return
		}

		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then((stream) => {
				mediaStreamRef.current = stream
				setIsListening(true)
				setError(null)
				setIsPermissionBlocked(false)
				playDictationStartSound()
				resetSilenceTimer()

				if (typeof MediaRecorder !== "undefined") {
					try {
						const recorder = new MediaRecorder(stream)
						mediaRecorderRef.current = recorder
						recorder.start()
					} catch {
						// MediaRecorder optional
					}
				}
			})
			.catch((err: unknown) => {
				clearSilenceTimer()
				const isDenied =
					err &&
					typeof err === "object" &&
					"name" in err &&
					(err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
				if (isDenied) {
					setIsPermissionBlocked(true)
					setError("Microphone access was denied or is blocked by system settings.")
				} else {
					setError("No microphone hardware detected.")
				}
				setIsListening(false)
			})
	}, [clearSilenceTimer, hasMediaDevices, resetSilenceTimer])

	const startListening = useCallback(() => {
		if (!SpeechRecognitionConstructor && !hasMediaDevices) {
			setError("Speech recognition is not supported in this environment.")
			return
		}

		setError(null)

		// Stop any existing instance
		if (recognitionRef.current) {
			try {
				recognitionRef.current.abort()
			} catch {
				// Ignore
			}
		}

		if (SpeechRecognitionConstructor) {
			try {
				const recognition = new SpeechRecognitionConstructor()
				recognition.continuous = continuous
				recognition.interimResults = interimResults
				recognition.lang = language

				recognition.onstart = () => {
					setIsListening(true)
					setError(null)
					setIsPermissionBlocked(false)
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

					// In VS Code / Electron, WebSpeech API often fails with not-allowed / service-not-allowed / audio-capture.
					// Fall back to getUserMedia if available before declaring permission blocked.
					if (
						(errorCode === "not-allowed" ||
							errorCode === "service-not-allowed" ||
							errorCode === "audio-capture" ||
							errorCode === "network") &&
						hasMediaDevices
					) {
						startMediaStreamListening()
						return
					}

					let errorMsg = `Voice error: ${errorCode}`
					if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
						errorMsg = "Microphone access was denied or is blocked by system settings."
						setIsPermissionBlocked(true)
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
			} catch {
				// Fallback to getUserMedia if SpeechRecognition constructor fails
				if (hasMediaDevices) {
					startMediaStreamListening()
				} else {
					clearSilenceTimer()
					setError("Failed to start speech recognition.")
					setIsListening(false)
				}
			}
		} else if (hasMediaDevices) {
			startMediaStreamListening()
		}
	}, [
		SpeechRecognitionConstructor,
		clearSilenceTimer,
		continuous,
		hasMediaDevices,
		interimResults,
		language,
		resetSilenceTimer,
		startMediaStreamListening,
	])

	const toggleListening = useCallback(() => {
		if (isListening) {
			stopListening()
		} else {
			startListening()
		}
	}, [isListening, startListening, stopListening])

	const resetError = useCallback(() => {
		setError(null)
		setIsPermissionBlocked(false)
	}, [])

	const requestPermission = useCallback(async (): Promise<boolean> => {
		if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			setError("Microphone input is not supported in this browser environment.")
			setIsPermissionBlocked(true)
			return false
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			stream.getTracks().forEach((track) => {
				track.stop()
			})
			setError(null)
			setIsPermissionBlocked(false)
			return true
		} catch (err: unknown) {
			const isDenied =
				err &&
				typeof err === "object" &&
				"name" in err &&
				(err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
			if (isDenied) {
				setIsPermissionBlocked(true)
				setError("Microphone access was denied or is blocked by system settings.")
			} else {
				setError("No microphone hardware detected.")
			}
			return false
		}
	}, [])

	useEffect(() => {
		return () => {
			clearSilenceTimer()
			if (recognitionRef.current) {
				try {
					recognitionRef.current.abort()
				} catch {
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
		isPermissionBlocked,
		startListening,
		stopListening,
		toggleListening,
		resetError,
		requestPermission,
	}
}
