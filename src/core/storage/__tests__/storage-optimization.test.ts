import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { ModelInfo } from "@shared/api"
import { DietCodeFileStorage } from "@shared/storage/DietCodeFileStorage"
import { createStorageContext } from "@shared/storage/storage-context"
import { expect } from "chai"
import { afterEach, beforeEach, describe, it } from "mocha"
import { StateManager } from "../StateManager"
import { writeCoalescer } from "../WriteCoalescer"

describe("Storage & Memory Optimizations", () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "storage-opt-test-"))
	})

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true })
	})

	describe("DietCodeFileStorage Event & Write Deduplication", () => {
		it("should fire change event exactly once per set call and suppress no-op writes", async () => {
			const filePath = path.join(tempDir, "test_storage.json")
			const storage = new DietCodeFileStorage<string>(filePath)

			let changeEventCount = 0
			storage.onDidChange(() => {
				changeEventCount++
			})

			// First set should update data and fire event once
			storage.set("key1", "val1")
			expect(changeEventCount).to.equal(1)
			expect(storage.get("key1")).to.equal("val1")

			// Setting the exact same value should suppress write and change event
			storage.set("key1", "val1")
			expect(changeEventCount).to.equal(1) // Still 1!

			// Updating value should fire event once
			storage.set("key1", "val2")
			expect(changeEventCount).to.equal(2)
			expect(storage.get("key1")).to.equal("val2")
		})
	})

	describe("WriteCoalescer Upfront Hash Pre-Filtering & Closure Binding", () => {
		it("should skip scheduling when content hash is unchanged and nothing is pending", async () => {
			const targetFile = path.join(tempDir, "coalescer_target.json")
			let diskWriteCount = 0

			const writeFn = async (data: string) => {
				diskWriteCount++
				fs.writeFileSync(targetFile, data)
			}

			// First write should schedule and execute
			writeCoalescer.coalesceWriteWithPayload(targetFile, () => '{"hello":"world"}', writeFn, 50)
			expect(writeCoalescer.hasPending(targetFile)).to.equal(true)

			await writeCoalescer.flush(targetFile)
			expect(diskWriteCount).to.equal(1)
			expect(writeCoalescer.hasPending(targetFile)).to.equal(false)

			// Calling coalesceWriteWithPayload with identical payload should immediately return without queuing
			writeCoalescer.coalesceWriteWithPayload(targetFile, () => '{"hello":"world"}', writeFn, 50)
			expect(writeCoalescer.hasPending(targetFile)).to.equal(false)
		})
	})

	describe("StateManager Model Cache Purging", () => {
		it("should purge expired model caches correctly", async () => {
			const storageContext = createStorageContext({ dietcodeDir: tempDir, workspacePath: tempDir })
			const manager = Reflect.construct(StateManager, [storageContext]) as StateManager

			const sampleModelInfo: Record<string, ModelInfo> = {
				"model-a": { name: "Model A" } as ModelInfo,
			}

			manager.setModelsCache("openRouter", sampleModelInfo)
			expect(manager.getModelsCache("openRouter")).to.not.equal(null)

			// Fast-forward timestamp to simulate expiration (> 1 hour)
			const privateState = manager as unknown as { modelInfoCache: Record<string, { timestamp: number } | null> }
			const cacheObj = privateState.modelInfoCache.openRouterModels
			if (cacheObj) {
				cacheObj.timestamp = Date.now() - (60 * 60 * 1000 + 5000)
			}

			manager.purgeExpiredCaches()
			expect(manager.getModelsCache("openRouter")).to.equal(null)
		})
	})

	describe("Disk Temp File Clean Sweeping", () => {
		it("should remove stale .tmp files older than maxAgeMs", async () => {
			const { cleanStaleTempFiles } = await import("../disk")
			const staleTmp = path.join(tempDir, "stale_data.12345.tmp")
			const freshTmp = path.join(tempDir, "fresh_data.67890.tmp")

			fs.writeFileSync(staleTmp, "stale data")
			fs.writeFileSync(freshTmp, "fresh data")

			// Backdate mtime of staleTmp to 15 minutes ago
			const oldTime = new Date(Date.now() - 15 * 60 * 1000)
			fs.utimesSync(staleTmp, oldTime, oldTime)

			const freedBytes = await cleanStaleTempFiles(tempDir, 10 * 60 * 1000)
			expect(freedBytes).to.be.greaterThan(0)
			expect(fs.existsSync(staleTmp)).to.equal(false)
			expect(fs.existsSync(freshTmp)).to.equal(true)
		})
	})
})
