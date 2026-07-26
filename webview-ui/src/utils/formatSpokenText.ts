/**
 * Formats raw spoken speech text for clean input insertion.
 * Capitalizes initial letter and trims redundant whitespace.
 */
export function formatSpokenText(text: string): string {
	if (!text) return ""
	const trimmed = text.trim()
	if (!trimmed) return ""

	// Capitalize first character if letter
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Merges newly formatted spoken text into existing text input.
 */
export function appendSpokenText(existing: string, spoken: string): string {
	const cleanSpoken = formatSpokenText(spoken)
	if (!cleanSpoken) return existing

	const cleanExisting = existing.trim()
	if (!cleanExisting) return cleanSpoken

	return `${cleanExisting} ${cleanSpoken}`
}
