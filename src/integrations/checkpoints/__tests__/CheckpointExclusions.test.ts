import { expect } from "chai"
import { getDefaultExclusions } from "../CheckpointExclusions"

describe("CheckpointExclusions", () => {
	it("includes default package, binary, and build cache exclusions", () => {
		const exclusions = getDefaultExclusions()

		expect(exclusions).to.include("*.vsix")
		expect(exclusions).to.include("*.vsix.sig")
		expect(exclusions).to.include("*.tgz")
		expect(exclusions).to.include("*.apk")
		expect(exclusions).to.include(".cache/")
		expect(exclusions).to.include(".turbo/")
		expect(exclusions).to.include(".wxt/")
		expect(exclusions).to.include(".vscode-test/")
	})

	it("merges custom LFS patterns into exclusions", () => {
		const lfsPatterns = ["*.largefile", "*.psd"]
		const exclusions = getDefaultExclusions(lfsPatterns)

		expect(exclusions).to.include("*.largefile")
		expect(exclusions).to.include("*.psd")
	})
})
