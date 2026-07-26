import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VoiceVisualizer } from "./VoiceVisualizer"

describe("VoiceVisualizer component", () => {
	it("renders 5 equalizer bars when active", () => {
		render(<VoiceVisualizer isActive={true} />)
		const container = screen.getByTestId("voice-visualizer")
		expect(container).toBeInTheDocument()
		expect(container.children.length).toBe(5)
	})

	it("renders inactive visualizer state when isActive = false", () => {
		render(<VoiceVisualizer isActive={false} />)
		const container = screen.getByTestId("voice-visualizer")
		expect(container).toBeInTheDocument()
	})
})
