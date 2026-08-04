import { DietCodeMessage } from "./ExtensionMessage"

/**
 * Combines sequences of command and command_output messages in an array of DietCodeMessages.
 *
 * This function processes an array of DietCodeMessages objects, looking for sequences
 * where a 'command' message is followed by one or more 'command_output' messages.
 * When such a sequence is found, it combines them into a single message, merging
 * their text contents.
 *
 * @param messages - An array of DietCodeMessage objects to process.
 * @returns A new array of DietCodeMessage objects with command sequences combined.
 *
 * @example
 * const messages: DietCodeMessage[] = [
 *   { type: 'ask', ask: 'command', text: 'ls', ts: 1625097600000 },
 *   { type: 'ask', ask: 'command_output', text: 'file1.txt', ts: 1625097601000 },
 *   { type: 'ask', ask: 'command_output', text: 'file2.txt', ts: 1625097602000 }
 * ];
 * const result = simpleCombineCommandSequences(messages);
 * // Result: [{ type: 'ask', ask: 'command', text: 'ls\nfile1.txt\nfile2.txt', ts: 1625097600000 }]
 */
export function combineCommandSequences(messages: DietCodeMessage[]): DietCodeMessage[] {
	const combinedByTimestamp = new Map<number, DietCodeMessage>()
	let activeCommand:
		| {
				message: DietCodeMessage
				text: string
				didAddOutput: boolean
		  }
		| undefined

	const finalizeCommand = () => {
		if (!activeCommand) return
		if (!combinedByTimestamp.has(activeCommand.message.ts)) {
			combinedByTimestamp.set(activeCommand.message.ts, {
				...activeCommand.message,
				text: activeCommand.text,
			})
		}
		activeCommand = undefined
	}

	// Keep one active command while walking the stream. Command outputs belong
	// to it until the next command, so this replaces the old nested tail scan.
	for (const message of messages) {
		if (message.ask === "command" || message.say === "command") {
			finalizeCommand()
			activeCommand = {
				message,
				text: message.text || "",
				didAddOutput: false,
			}
			continue
		}

		if (activeCommand && (message.ask === "command_output" || message.say === "command_output")) {
			if (!activeCommand.didAddOutput) {
				activeCommand.text += `\n${COMMAND_OUTPUT_STRING}`
				activeCommand.didAddOutput = true
			}
			const output = message.text || ""
			if (output.length > 0) {
				activeCommand.text += `\n${output}`
			}
		}
	}
	finalizeCommand()

	// Remove command outputs and replace original commands with their combined
	// representation in one final pass.
	return messages.reduce<DietCodeMessage[]>((result, message) => {
		if (message.ask === "command_output" || message.say === "command_output") return result
		if (message.ask === "command" || message.say === "command") {
			result.push(combinedByTimestamp.get(message.ts) || message)
		} else {
			result.push(message)
		}
		return result
	}, [])
}
export const COMMAND_OUTPUT_STRING = "Output:"
export const COMMAND_REQ_APP_STRING = "REQ_APP"
