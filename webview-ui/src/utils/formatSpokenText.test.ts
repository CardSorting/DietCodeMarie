import { describe, expect, it } from "vitest"
import { appendSpokenText, formatSpokenText } from "./formatSpokenText"

describe("formatSpokenText utility", () => {
	it("capitalizes the first character of spoken text", () => {
		expect(formatSpokenText("hello world")).toBe("Hello world")
		expect(formatSpokenText("  create a react component  ")).toBe("Create a react component")
	})

	it("returns empty string for empty input", () => {
		expect(formatSpokenText("")).toBe("")
		expect(formatSpokenText("   ")).toBe("")
	})

	it("appends formatted spoken text to existing input string with proper spacing", () => {
		expect(appendSpokenText("Fix the bug", "in the login screen")).toBe("Fix the bug In the login screen")
		expect(appendSpokenText("", "add a test")).toBe("Add a test")
	})
})
