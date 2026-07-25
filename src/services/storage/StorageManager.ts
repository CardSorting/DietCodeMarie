import fs from "fs/promises"
import getFolderSize from "get-folder-size"
import path from "path"
import { HostProvider } from "@/hosts/host-provider"
import { GitOperations } from "@/integrations/checkpoints/CheckpointGitOperations"
import { DietCodeTempManager } from "@/services/temp/DietCodeTempManager"
import { Logger } from "@/shared/services/Logger"
import { fileExistsAtPath } from "@/utils/fs"

export interface StorageBreakdown {
	tasksBytes: number
	checkpointsBytes: number
	cacheBytes: number
	puppeteerBytes: number
	systemTempBytes: number
	totalBytes: number
}

export interface StorageOptimizationResult {
	freedBytes: number
	breakdownBefore: StorageBreakdown
	breakdownAfter: StorageBreakdown
}

/**
 * Singleton service for managing and optimizing LUMI extension storage.
 * Implements multi-tiered cache management, shadow Git vacuuming,
 * orphan task eviction, and background maintenance.
 */
export class StorageManager {
	private static instance: StorageManager
	private maintenanceTimer: NodeJS.Timeout | null = null
	private isOptimizing = false

	private constructor() {}

	public static getInstance(): StorageManager {
		if (!StorageManager.instance) {
			StorageManager.instance = new StorageManager()
		}
		return StorageManager.instance
	}

	/**
	 * Calculates comprehensive storage breakdown across all LUMI storage domains.
	 */
	public async getStorageBreakdown(): Promise<StorageBreakdown> {
		const globalPath = HostProvider.get().globalStorageFsPath
		const tasksDir = path.join(globalPath, "tasks")
		const checkpointsDir = path.join(globalPath, "checkpoints")
		const cacheDir = path.join(globalPath, "cache")
		const puppeteerDir = path.join(globalPath, "puppeteer")
		const systemTempDir = DietCodeTempManager.getTempDir()

		const [tasksBytes, checkpointsBytes, cacheBytes, puppeteerBytes, systemTempBytes] = await Promise.all([
			this.safeFolderSize(tasksDir),
			this.safeFolderSize(checkpointsDir),
			this.safeFolderSize(cacheDir),
			this.safeFolderSize(puppeteerDir),
			this.safeFolderSize(systemTempDir),
		])

		const totalBytes = tasksBytes + checkpointsBytes + cacheBytes + puppeteerBytes + systemTempBytes

		return {
			tasksBytes,
			checkpointsBytes,
			cacheBytes,
			puppeteerBytes,
			systemTempBytes,
			totalBytes,
		}
	}

	private async safeFolderSize(dirPath: string): Promise<number> {
		try {
			if (!(await fileExistsAtPath(dirPath))) return 0
			return await getFolderSize.loose(dirPath)
		} catch (error) {
			Logger.debug(`Failed to calculate size for ${dirPath}:`, error)
			return 0
		}
	}

	/**
	 * Performs shadow Git vacuuming (`git gc --prune=now`) on all workspace shadow repos.
	 */
	public async vacuumCheckpoints(): Promise<void> {
		const checkpointsDir = path.join(HostProvider.get().globalStorageFsPath, "checkpoints")
		if (!(await fileExistsAtPath(checkpointsDir))) return

		try {
			const subdirs = await fs.readdir(checkpointsDir)
			const dummyGitOps = new GitOperations("")

			for (const subdir of subdirs) {
				const gitPath = path.join(checkpointsDir, subdir, ".git")
				if (await fileExistsAtPath(gitPath)) {
					await dummyGitOps.vacuumRepository(gitPath)
				}
			}
		} catch (error) {
			Logger.error("Error vacuuming checkpoints:", error)
		}
	}

	/**
	 * Cleans temporary files, expired cache items, and system temp directory.
	 */
	public async cleanCacheAndTemp(maxAgeMs?: number): Promise<number> {
		let freed = 0
		const globalPath = HostProvider.get().globalStorageFsPath
		const cacheDir = path.join(globalPath, "cache")

		const effectiveMaxAgeMs =
			maxAgeMs ??
			(typeof process !== "undefined" && process.env.JEST_WORKER_ID === undefined
				? (await import("vscode")).workspace.getConfiguration("lumi").get<number>("storage.maxCacheAgeDays", 7) *
					24 *
					60 *
					60 *
					1000
				: 7 * 24 * 60 * 60 * 1000)

		try {
			if (await fileExistsAtPath(cacheDir)) {
				const files = await fs.readdir(cacheDir)
				const now = Date.now()

				for (const file of files) {
					// Skip persistent catalog files unless requested
					if (file.endsWith("Catalog.json")) continue

					const filePath = path.join(cacheDir, file)
					try {
						const stats = await fs.stat(filePath)
						if (now - stats.mtimeMs > effectiveMaxAgeMs) {
							freed += stats.size
							await fs.rm(filePath, { recursive: true, force: true })
						}
					} catch {
						// Ignore unlinks of disappearing files
					}
				}
			}

			const tempResult = await DietCodeTempManager.cleanup()
			freed += tempResult.freedBytes
		} catch (error) {
			Logger.error("Error cleaning cache and temp:", error)
		}

		return freed
	}

	/**
	 * Cleans stale puppeteer profiles, screenshots, and temporary browser downloads.
	 */
	public async cleanPuppeteerStorage(maxAgeMs = 3 * 24 * 60 * 60 * 1000): Promise<number> {
		let freed = 0
		const puppeteerDir = path.join(HostProvider.get().globalStorageFsPath, "puppeteer")

		try {
			if (await fileExistsAtPath(puppeteerDir)) {
				const items = await fs.readdir(puppeteerDir)
				const now = Date.now()

				for (const item of items) {
					// Preserve main browser binaries if present, clean temporary screenshot / profile sessions
					if (item.startsWith(".chromium-browser-snapshots")) continue

					const itemPath = path.join(puppeteerDir, item)
					try {
						const stats = await fs.stat(itemPath)
						if (now - stats.mtimeMs > maxAgeMs) {
							freed += stats.size || 0
							await fs.rm(itemPath, { recursive: true, force: true })
						}
					} catch {
						// Ignore
					}
				}
			}
		} catch (error) {
			Logger.error("Error cleaning puppeteer storage:", error)
		}

		return freed
	}

	/**
	 * Scans for orphaned task directories and orphaned shadow checkpoint directories.
	 */
	public async cleanOrphanTasksAndCheckpoints(validTaskIds?: string[]): Promise<number> {
		let freed = 0
		const globalPath = HostProvider.get().globalStorageFsPath
		const tasksDir = path.join(globalPath, "tasks")
		const checkpointsDir = path.join(globalPath, "checkpoints")

		if (validTaskIds && (await fileExistsAtPath(tasksDir))) {
			try {
				const existingDirs = await fs.readdir(tasksDir)
				for (const dir of existingDirs) {
					if (!validTaskIds.includes(dir)) {
						const dirPath = path.join(tasksDir, dir)
						const size = await this.safeFolderSize(dirPath)
						await fs.rm(dirPath, { recursive: true, force: true })
						freed += size
					}
				}
			} catch (error) {
				Logger.error("Error cleaning orphan tasks:", error)
			}
		}

		// Prune shadow Git repos whose worktrees point to non-existent folders
		if (await fileExistsAtPath(checkpointsDir)) {
			try {
				const hashDirs = await fs.readdir(checkpointsDir)
				const dummyGitOps = new GitOperations("")

				for (const hashDir of hashDirs) {
					const repoDir = path.join(checkpointsDir, hashDir)
					const gitPath = path.join(repoDir, ".git")

					if (await fileExistsAtPath(gitPath)) {
						const worktree = await dummyGitOps.getShadowGitConfigWorkTree(gitPath)
						if (worktree && !(await fileExistsAtPath(worktree))) {
							const size = await this.safeFolderSize(repoDir)
							Logger.info(`Removing shadow Git repo for non-existent workspace: ${worktree}`)
							await fs.rm(repoDir, { recursive: true, force: true })
							freed += size
						}
					}
				}
			} catch (error) {
				Logger.error("Error cleaning orphan shadow checkpoints:", error)
			}
		}

		return freed
	}

	/**
	 * Full multi-stage storage optimization pipeline.
	 */
	public async optimizeStorage(validTaskIds?: string[]): Promise<StorageOptimizationResult> {
		if (this.isOptimizing) {
			const current = await this.getStorageBreakdown()
			return { freedBytes: 0, breakdownBefore: current, breakdownAfter: current }
		}

		this.isOptimizing = true
		try {
			const breakdownBefore = await this.getStorageBreakdown()

			await this.cleanOrphanTasksAndCheckpoints(validTaskIds)
			await this.cleanCacheAndTemp()
			await this.cleanPuppeteerStorage()
			await this.vacuumCheckpoints()

			// Run SQLite database maintenance (freelist vacuuming & WAL checkpoint truncation)
			try {
				const { SQLiteMaintenanceEngine } = await import("@/infrastructure/db/SQLiteMaintenanceEngine")
				const sqliteEngine = new SQLiteMaintenanceEngine()
				await sqliteEngine.runMaintenance({ forceTruncateWal: true })
			} catch (sqliteErr) {
				Logger.debug("SQLite maintenance skipped or unavailable during storage optimization:", sqliteErr)
			}

			const breakdownAfter = await this.getStorageBreakdown()
			const freedBytes = Math.max(0, breakdownBefore.totalBytes - breakdownAfter.totalBytes)

			Logger.info(
				`Storage Optimization completed. Freed ${Math.round(freedBytes / 1024 / 1024)}MB. Total size: ${Math.round(breakdownAfter.totalBytes / 1024 / 1024)}MB.`,
			)

			return {
				freedBytes,
				breakdownBefore,
				breakdownAfter,
			}
		} finally {
			this.isOptimizing = false
		}
	}

	/**
	 * Starts background maintenance timer (every 12 hours).
	 */
	public startBackgroundMaintenance(validTaskIds?: string[]): void {
		if (this.maintenanceTimer) return

		// Run immediate non-blocking maintenance after activation delay
		setTimeout(() => {
			this.optimizeStorage(validTaskIds).catch((err) => Logger.error("Startup storage maintenance failed:", err))
		}, 30000)

		const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
		this.maintenanceTimer = setInterval(() => {
			this.optimizeStorage(validTaskIds).catch((err) => Logger.error("Background storage maintenance failed:", err))
		}, TWELVE_HOURS_MS)

		this.maintenanceTimer.unref()
	}

	public stopBackgroundMaintenance(): void {
		if (this.maintenanceTimer) {
			clearInterval(this.maintenanceTimer)
			this.maintenanceTimer = null
		}
	}
}
