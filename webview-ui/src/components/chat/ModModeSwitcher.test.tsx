import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ModModeSwitcher } from "./ModModeSwitcher"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		modEnabled: false,
		modOutcome: "plan-and-implement",
	}),
}))

describe("ModModeSwitcher", () => {
	it("renders nothing when mode switching tabs are removed", () => {
		const { container } = render(<ModModeSwitcher />)
		expect(container.firstChild).toBeNull()
	})
})
