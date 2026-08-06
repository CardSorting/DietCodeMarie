import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MicrophonePermissionBanner } from "./MicrophonePermissionBanner"

describe("MicrophonePermissionBanner component", () => {
	it("renders the error message and title when permission is blocked", () => {
		render(
			<MicrophonePermissionBanner
				error="Microphone access was denied or is blocked by system settings."
				isPermissionBlocked={true}
				onDismiss={vi.fn()}
				onTryAgain={vi.fn()}
			/>,
		)

		expect(screen.getByText("Microphone Blocked by System Settings")).toBeDefined()
		expect(screen.getByText("Microphone access was denied or is blocked by system settings.")).toBeDefined()
	})

	it("toggles the OS system settings fix guide", () => {
		render(
			<MicrophonePermissionBanner
				error="Microphone access was denied"
				isPermissionBlocked={true}
				onDismiss={vi.fn()}
				onTryAgain={vi.fn()}
			/>,
		)

		expect(screen.queryByText("How to enable Microphone access in System Settings:")).toBeNull()

		const fixGuideBtn = screen.getByText("Fix Guide")
		fireEvent.click(fixGuideBtn)

		expect(screen.getByText("How to enable Microphone access in System Settings:")).toBeDefined()
		expect(screen.getAllByText(/System Settings/i).length).toBeGreaterThan(0)
	})

	it("calls onDismiss when dismiss button is clicked", () => {
		const onDismiss = vi.fn()
		render(<MicrophonePermissionBanner error="Microphone access error" onDismiss={onDismiss} onTryAgain={vi.fn()} />)

		const dismissBtn = screen.getByLabelText("Dismiss microphone error")
		fireEvent.click(dismissBtn)

		expect(onDismiss).toHaveBeenCalled()
	})

	it("triggers requestPermission when Test Again is clicked", async () => {
		const onRequestPermission = vi.fn().mockResolvedValue(true)
		const onDismiss = vi.fn()

		render(
			<MicrophonePermissionBanner
				error="Microphone access error"
				onDismiss={onDismiss}
				onRequestPermission={onRequestPermission}
				onTryAgain={vi.fn()}
			/>,
		)

		const testBtn = screen.getByText("Test Again")
		await act(async () => {
			fireEvent.click(testBtn)
		})

		expect(onRequestPermission).toHaveBeenCalled()
	})
})
