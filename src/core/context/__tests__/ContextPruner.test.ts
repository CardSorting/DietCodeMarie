import { createHash } from "node:crypto"
import { expect } from "chai"
import { ContextPruner } from "../ContextPruner"

describe("ContextPruner", () => {
	let pruner: ContextPruner

	beforeEach(() => {
		pruner = new ContextPruner({ maxLines: 20, headRatio: 0.5, tailRatio: 0.3 })
	})

	describe("skeletonizeCode", () => {
		it("returns original code if line count is within maxLines", () => {
			const code = "const a = 1;\nconst b = 2;\n"
			const result = pruner.skeletonizeCode(code, 10)
			expect(result.skeletonText).to.equal(code)
			expect(result.foldedLines).to.equal(0)
			expect(result.sha256).to.have.lengthOf(64)
		})

		it("skeletonizes long code while preserving architectural anchors", () => {
			const lines: string[] = ["import { foo } from 'bar'", "export interface UserData { id: string; name: string }"]
			for (let i = 0; i < 40; i++) {
				lines.push(`function internalHelper${i}() { return ${i}; }`)
			}
			lines.push("export class MainService { run() { return true; } }")
			for (let i = 0; i < 20; i++) {
				lines.push(`const tempVar${i} = ${i};`)
			}
			lines.push("export const finalExport = 100")

			const result = pruner.skeletonizeCode(lines.join("\n"), 15)

			expect(result.foldedLines).to.be.greaterThan(0)
			expect(result.skeletonText).to.include("import { foo } from 'bar'")
			expect(result.skeletonText).to.include("export interface UserData")
			expect(result.skeletonText).to.include("export class MainService")
			expect(result.skeletonText).to.include("export const finalExport")
			expect(result.skeletonText).to.include("NON-AUTHORITATIVE STRUCTURAL PROJECTION")
			expect(result.skeletonText).to.include("syntax may be invalid")
			expect(result.projectedLines).to.be.at.most(15)
		})

		it("enforces its output budget even when nearly every line is an anchor", () => {
			const code = Array.from({ length: 5_000 }, (_, index) => `export interface Contract${index} { value: string }`).join(
				"\n",
			)

			const result = pruner.skeletonizeCode(code, 40)

			expect(result.projectedLines).to.be.at.most(40)
			expect(result.skeletonText.split("\n")).to.have.lengthOf.at.most(40)
			expect(result.foldedLines).to.be.greaterThan(4_900)
			expect(pruner.skeletonizeCode(code, 40).sha256).to.equal(result.sha256)
		})

		it("uses bounded multi-window preprocessing for pathological source payloads", () => {
			const boundedPruner = new ContextPruner({ maxLines: 30, maxSourceCharacters: 4_096 })
			const code = Array.from({ length: 20_000 }, (_, index) =>
				index % 2_500 === 0 ? `export interface Boundary${index} { value: string }` : `filler line ${index}`,
			).join("\n")

			const result = boundedPruner.skeletonizeCode(code, 30)

			expect(result.sourceWasSampled).to.equal(true)
			expect(result.originalCharacters).to.equal(code.length)
			expect(result.originalLines).to.equal(20_000)
			expect(result.sha256).to.equal(createHash("sha256").update(code).digest("hex"))
			expect(result.projectedLines).to.be.at.most(30)
			expect(result.skeletonText).to.include("SOURCE SAMPLE OMITTED")
		})

		it("bounds regex input and materialized lines for minified and newline-dense payloads", () => {
			const boundedPruner = new ContextPruner({
				maxLines: 30,
				maxSourceCharacters: 64_000,
				maxMaterializedLines: 2_000,
				maxPatternCharactersPerLine: 256,
			})
			const minified = `${"public ".repeat(100_000)}method(${")".repeat(100_000)}`
			const minifiedResult = boundedPruner.skeletonizeCode(minified, 30)
			expect(minifiedResult.sha256).to.equal(createHash("sha256").update(minified).digest("hex"))

			const newlineDense = `${"\n".repeat(250_000)}export interface Retained { value: string }`
			const denseResult = boundedPruner.skeletonizeCode(newlineDense, 30)
			expect(denseResult.sourceWasSampled).to.equal(true)
			expect(denseResult.originalLines).to.equal(250_001)
			expect(denseResult.projectedLines).to.be.at.most(30)
		})
	})

	describe("compressCommandOutput", () => {
		it("compresses large command logs while retaining failure assertions and stack frames", () => {
			const lines: string[] = []
			for (let i = 0; i < 50; i++) {
				lines.push(`[LOG] Passing step ${i} executed successfully`)
			}
			lines.push("AssertionError: Expected 200 OK but received 500 Internal Server Error")
			lines.push("    at Context.<anonymous> (src/test/server.test.ts:42:10)")
			for (let i = 50; i < 100; i++) {
				lines.push(`[LOG] Cleanup step ${i}`)
			}

			const result = pruner.compressCommandOutput(lines.join("\n"), 20)

			expect(result.hasError).to.equal(true)
			expect(result.foldedLines).to.be.greaterThan(0)
			expect(result.compressedText).to.include("AssertionError")
			expect(result.compressedText).to.include("COMMAND OUTPUT COMPACTED")
			expect(result.projectedLines).to.be.at.most(20)
		})

		it("bounds error-dense output and detects errors without requiring compaction", () => {
			const denseFailures = Array.from(
				{ length: 10_000 },
				(_, index) => `ERROR failure ${index}\n    at suite (src/test-${index}.ts:1:1)`,
			).join("\n")
			const compressed = pruner.compressCommandOutput(denseFailures, 50)

			expect(compressed.hasError).to.equal(true)
			expect(compressed.projectedLines).to.be.at.most(50)
			expect(compressed.compressedText).to.include("ERROR")

			const shortFailure = pruner.compressCommandOutput("ERROR: short failure", 50)
			expect(shortFailure.hasError).to.equal(true)
			expect(shortFailure.foldedLines).to.equal(0)
		})
	})

	describe("recoverable ledger pointers", () => {
		it("uses a digest instead of interpolating objective text into markup", () => {
			const ledger = {
				primaryObjective: `"><unsafe value="true">`,
				architecturalDiscoveries: [],
				modifiedAndVerifiedFiles: [],
				activeStateAndErrors: [],
				pendingActions: [],
				timestamp: 1,
			}

			const pointer = pruner.createSilentInlineLedgerPointer(ledger)
			expect(pointer).to.match(/^<context_ledger ref="sha256:[a-f0-9]{64}"/)
			expect(pointer).not.to.include("unsafe")
		})
	})
})
