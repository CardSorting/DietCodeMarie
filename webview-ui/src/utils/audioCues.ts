/**
 * Web Audio API Sound Cues for Voice Dictation
 * Synthesizes crisp, gentle audio chimes in real time without external audio files.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null
	if (!audioCtx) {
		const AudioContextClass =
			window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		if (AudioContextClass) {
			audioCtx = new AudioContextClass()
		}
	}
	if (audioCtx && audioCtx.state === "suspended") {
		audioCtx.resume().catch(() => {})
	}
	return audioCtx
}

export function isSoundEnabled(): boolean {
	if (typeof window === "undefined") return true
	return localStorage.getItem("lumi_voice_sound") !== "false"
}

/** Play a gentle high-pitched chime when voice listening starts */
export function playDictationStartSound(): void {
	if (!isSoundEnabled()) return
	try {
		const ctx = getAudioContext()
		if (!ctx) return

		const now = ctx.currentTime
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()

		osc.type = "sine"
		osc.frequency.setValueAtTime(587.33, now) // D5
		osc.frequency.exponentialRampToValueAtTime(880, now + 0.12) // A5

		gain.gain.setValueAtTime(0, now)
		gain.gain.linearRampToValueAtTime(0.08, now + 0.03)
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

		osc.connect(gain)
		gain.connect(ctx.destination)

		osc.start(now)
		osc.stop(now + 0.22)
	} catch (_e) {
		// Ignore if audio playback fails or is blocked
	}
}

/** Play a soft completion chime when voice listening stops/commits */
export function playDictationStopSound(): void {
	if (!isSoundEnabled()) return
	try {
		const ctx = getAudioContext()
		if (!ctx) return

		const now = ctx.currentTime
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()

		osc.type = "sine"
		osc.frequency.setValueAtTime(659.25, now) // E5
		osc.frequency.exponentialRampToValueAtTime(440, now + 0.15) // A4

		gain.gain.setValueAtTime(0, now)
		gain.gain.linearRampToValueAtTime(0.07, now + 0.03)
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

		osc.connect(gain)
		gain.connect(ctx.destination)

		osc.start(now)
		osc.stop(now + 0.24)
	} catch (_e) {
		// Ignore
	}
}
