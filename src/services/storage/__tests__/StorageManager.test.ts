import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { setVscodeHostProviderMock } from "@/test/host-provider-test-utils"
import { StorageManager } from "../StorageManager"

describe("StorageManager", () => {
	let tempDir: string
	let globalStoragePath: string

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-mgr-test-"))
		globalStoragePath = path.join(tempDir, "globalstorage")
		await fs.mkdir(globalStoragePath, { recursive: true })

		setVscodeHostProviderMock({
			extensionFsPath: path.join(tempDir, "extension"),
			globalStorageFsPath: globalStoragePath,
		})
	})

	afterEach(async () => {
		StorageManager.getInstance().stopBackgroundMaintenance()
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("calculates storage breakdown correctly", async () => {
		const tasksDir = path.join(globalStoragePath, "tasks")
		const cacheDir = path.join(globalStoragePath, "cache")
		await fs.mkdir(tasksDir, { recursive: true })
		await fs.mkdir(cacheDir, { recursive: true })

		await fs.writeFile(path.join(tasksDir, "sample.txt"), "hello world tasks")
		await fs.writeFile(path.join(cacheDir, "sample.cache"), "cached data payload")

		const mgr = StorageManager.getInstance()
		const breakdown = await mgr.getStorageBreakdown()

		expect(breakdown.tasksBytes).to.be.greaterThan(0)
		expect(breakdown.cacheBytes).to.be.greaterThan(0)
		expect(breakdown.totalBytes).to.be.greaterThan(0)
	})

	it("cleans orphan tasks when active tasks list is provided", async () => {
		const tasksDir = path.join(globalStoragePath, "tasks")
		await fs.mkdir(path.join(tasksDir, "task-active"), { recursive: true })
		await fs.mkdir(path.join(tasksDir, "task-orphan"), { recursive: true })

		await fs.writeFile(path.join(tasksDir, "task-active", "data.json"), "{}")
		await fs.writeFile(path.join(tasksDir, "task-orphan", "data.json"), "{}")

		const mgr = StorageManager.getInstance()
		const freed = await mgr.cleanOrphanTasksAndCheckpoints(["task-active"])

		expect(freed).to.be.greaterThan(0)
		const remaining = await fs.readdir(tasksDir)
		expect(remaining).to.deep.equal(["task-active"])
	})
})
