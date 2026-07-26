import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { VoiceDictationCapsule } from "./VoiceDictationCapsule"

describe("VoiceDictationCapsule component", () => {
	it("renders listening title, equalizer, and interim transcript text", () => {
		render(<VoiceDictationCapsule interimTranscript="create a new react component" onCancel={vi.fn()} onStop={vi.fn()} />)

		expect(screen.getByText("Dictating")).toBeInTheDocument()
		expect(screen.getByText(/"create a new react component"/)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Finish voice dictation" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Cancel voice dictation" })).toBeInTheDocument()
	})

	it("triggers onStop when Done button is clicked", async () => {
		const user = userEvent.setup()
		const onStop = vi.fn()

		render(<VoiceDictationCapsule onStop={onStop} />)

		await user.click(screen.getByRole("button", { name: "Finish voice dictation" }))
		expect(onStop).toHaveBeenCalledOnce()
	})

	it("triggers onCancel when Cancel button is clicked", async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()

		render(<VoiceDictationCapsule onCancel={onCancel} onStop={vi.fn()} />)

		await user.click(screen.getByRole("button", { name: "Cancel voice dictation" }))
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it("renders auto-sensing locale badge with detected language", () => {
		render(<VoiceDictationCapsule detectedLanguage="es-ES" onStop={vi.fn()} />)

		expect(screen.getByText("Auto (es-ES)")).toBeInTheDocument()
	})

	it("renders Auto-Send toggle button and triggers callback on click", async () => {
		const user = userEvent.setup()
		const onAutoSendToggle = vi.fn()

		render(<VoiceDictationCapsule autoSend={false} onAutoSendToggle={onAutoSendToggle} onStop={vi.fn()} />)

		const toggleButton = screen.getByRole("button", { name: "Auto-Send Disabled" })
		expect(toggleButton).toBeInTheDocument()
		await user.click(toggleButton)
		expect(onAutoSendToggle).toHaveBeenCalledOnce()
	})

	it("renders Sound Mute button and triggers callback on click", async () => {
		const user = userEvent.setup()
		const onSoundToggle = vi.fn()

		render(<VoiceDictationCapsule onSoundToggle={onSoundToggle} onStop={vi.fn()} soundEnabled={true} />)

		const soundButton = screen.getByRole("button", { name: "Mute dictation sound chimes" })
		expect(soundButton).toBeInTheDocument()
		await user.click(soundButton)
		expect(onSoundToggle).toHaveBeenCalledOnce()
	})

	it("renders live word count badge when speech is active", () => {
		render(<VoiceDictationCapsule interimTranscript="hello world react testing" onStop={vi.fn()} />)

		expect(screen.getByText("4 words")).toBeInTheDocument()
	})
})
