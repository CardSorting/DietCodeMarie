import { FocusChainSettings } from "@shared/FocusChainSettings"
import * as chokidar from "chokidar"
import * as fs from "fs/promises"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import { DietCodeSay } from "../../../shared/ExtensionMessage"
import { Mode } from "../../../shared/storage/types"
import { writeFile } from "../../../utils/fs"
import { ensureTaskDirectoryExists } from "../../storage/disk"
import { StateManager } from "../../storage/StateManager"
import { TaskState } from "../TaskState"
import { createFocusChainMarkdownContent, extractFocusChainListFromText, getFocusChainFilePath } from "./file-utils"
import { FocusChainPrompts } from "./prompts"
import { createFocusChainProgressGuidance, mergeFocusChainChecklists, parseFocusChainListCounts } from "./utils"

export enum FocusChainStatus {
	IDLE = "idle",
	ACTIVE = "active",
	COMPLETED = "completed",
	STALE = "stale",
}

export interface FocusChainSnapshot {
	checklist: string | null
	totalItems: number
	completedItems: number
	percentComplete: number
	status: FocusChainStatus
	isComplete: boolean
	userHasModified: boolean
}

export interface FocusChainAuthorityDependencies {
	taskId: string
	taskState: TaskState
	mode: Mode
	stateManager: StateManager
	postStateToWebview: () => Promise<void>
	say: (type: DietCodeSay, text?: string, images?: string[], files?: string[], partial?: boolean) => Promise<number | undefined>
	focusChainSettings: FocusChainSettings
}

export interface FocusChainDependencies extends FocusChainAuthorityDependencies {}

export class FocusChainAuthority {
	private taskId: string
	private taskState: TaskState
	private stateManager: StateManager
	private postStateToWebview: () => Promise<void>
	private say: (
		type: DietCodeSay,
		text?: string,
		images?: string[],
		files?: string[],
		partial?: boolean,
	) => Promise<number | undefined>
	private focusChainFileWatcher?: chokidar.FSWatcher
	private hasTrackedFirstProgress = false
	private focusChainSettings: FocusChainSettings
	private fileUpdateDebounceTimer?: NodeJS.Timeout
	private isWritingFocusChain = false

	constructor(dependencies: FocusChainAuthorityDependencies) {
		this.taskId = dependencies.taskId
		this.taskState = dependencies.taskState
		this.stateManager = dependencies.stateManager
		this.postStateToWebview = dependencies.postStateToWebview
		this.say = dependencies.say
		this.focusChainSettings = dependencies.focusChainSettings
	}

	/**
	 * Derives and returns an immutable domain snapshot of current focus chain state.
	 */
	public getSnapshot(): FocusChainSnapshot {
		const checklist = this.taskState.currentFocusChainChecklist
		if (!checklist?.trim()) {
			return {
				checklist: null,
				totalItems: 0,
				completedItems: 0,
				percentComplete: 0,
				status: FocusChainStatus.IDLE,
				isComplete: false,
				userHasModified: false,
			}
		}

		const { totalItems, completedItems } = parseFocusChainListCounts(checklist)
		const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
		const isComplete = totalItems > 0 && completedItems === totalItems
		const userHasModified = Boolean(this.taskState.todoListWasUpdatedByUser)

		let status: FocusChainStatus = FocusChainStatus.ACTIVE
		if (isComplete) {
			status = FocusChainStatus.COMPLETED
		} else if (userHasModified) {
			status = FocusChainStatus.STALE
		}

		return {
			checklist,
			totalItems,
			completedItems,
			percentComplete,
			status,
			isComplete,
			userHasModified,
		}
	}

	/**
	 * Sets up a file watcher to monitor changes to the focus chain list markdown file.
	 */
	public async setupFocusChainFileWatcher() {
		try {
			const taskDir = await ensureTaskDirectoryExists(this.taskId)
			const focusChainFilePath = getFocusChainFilePath(taskDir, this.taskId)

			this.focusChainFileWatcher = chokidar.watch(focusChainFilePath, {
				persistent: true,
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 300,
					pollInterval: 100,
				},
			})

			this.focusChainFileWatcher
				.on("add", async () => {
					await this.updateFCListFromMarkdownFileAndNotifyUI()
				})
				.on("change", async () => {
					await this.updateFCListFromMarkdownFileAndNotifyUI()
				})
				.on("unlink", async () => {
					this.taskState.currentFocusChainChecklist = null
					await this.postStateToWebview()
				})
				.on("error", (error) => {
					Logger.error(`[Task ${this.taskId}] Failed to watch focus chain file:`, error)
				})

			Logger.log(`[Task ${this.taskId}] Todo file watcher initialized`)
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] Failed to setup todo file watcher:`, error)
		}
	}

	private async updateFCListFromMarkdownFileAndNotifyUI() {
		if (this.isWritingFocusChain) {
			Logger.log(`[Task ${this.taskId}] Focus Chain List: Skipping file watcher update because write is in progress`)
			return
		}

		if (this.fileUpdateDebounceTimer) {
			clearTimeout(this.fileUpdateDebounceTimer)
		}

		this.fileUpdateDebounceTimer = setTimeout(async () => {
			try {
				const markdownTodoList = await this.readFocusChainFromDisk()
				if (markdownTodoList) {
					const previousList = this.taskState.currentFocusChainChecklist

					if (previousList !== markdownTodoList) {
						this.taskState.currentFocusChainChecklist = markdownTodoList
						this.taskState.todoListWasUpdatedByUser = true

						await this.postStateToWebview()
						telemetryService.captureFocusChainListWritten(this.taskId)
					}
				}
			} catch (error) {
				Logger.error(`[Task ${this.taskId}] Error updating focus chain list from markdown file:`, error)
			}
		}, 300)
	}

	/**
	 * Generates contextual instructions for focus chain list creation and management.
	 */
	public generateFocusChainInstructions(): string {
		const snapshot = this.getSnapshot()
		if (snapshot.checklist) {
			if (snapshot.isComplete) {
				return `\n\n# TASK_PROGRESS COMPLETE\n**Current Progress: ${snapshot.completedItems}/${snapshot.totalItems} items completed (100%)**\n\n${snapshot.checklist}\n\nAll checklist items in the focus chain are complete. You are ready to call attempt_completion.\n`
			}

			const introUpdateRequired =
				"# TASK_PROGRESS UPDATE REQUIRED - You MUST include the task_progress parameter in your NEXT tool call."
			const listCurrentProgress = `**Current Progress: ${snapshot.completedItems}/${snapshot.totalItems} items completed (${snapshot.percentComplete}%)**`
			const userHasUpdatedList =
				"**CRITICAL INFORMATION:** The user has modified this todo list - review ALL changes carefully"

			if (snapshot.userHasModified) {
				return `\n\n
				${introUpdateRequired}\n
				${listCurrentProgress}\n
				\n
				${snapshot.checklist}\n
				${userHasUpdatedList}\n
				${FocusChainPrompts.reminder}\n
			`
			}
			const progressGuidance = createFocusChainProgressGuidance({
				totalItems: snapshot.totalItems,
				completedItems: snapshot.completedItems,
				currentFocusChainChecklist: snapshot.checklist,
			})

			return `\n
				${introUpdateRequired}\n
				${listCurrentProgress}\n
				${snapshot.checklist}\n
				\n
				${FocusChainPrompts.reminder}\n
				${progressGuidance}\n
				`
		}

		if (this.taskState.didRespondToPlanAskBySwitchingMode) {
			this.taskState.didRespondToPlanAskBySwitchingMode = false
			return `${FocusChainPrompts.initial}`
		}

		if (this.stateManager.getGlobalSettingsKey("mode") === "plan") {
			return FocusChainPrompts.planModeReminder
		}

		const isEarlyInTask = this.taskState.apiRequestCount < 10
		if (isEarlyInTask) {
			return FocusChainPrompts.recommended
		}
		return FocusChainPrompts.apiRequestCount.replace("{{apiRequestCount}}", this.taskState.apiRequestCount.toString())
	}

	private async readFocusChainFromDisk(): Promise<string | null> {
		try {
			const taskDir = await ensureTaskDirectoryExists(this.taskId)
			const todoFilePath = getFocusChainFilePath(taskDir, this.taskId)
			const markdownContent = await fs.readFile(todoFilePath, "utf8")
			const todoList = extractFocusChainListFromText(markdownContent)

			return todoList || null
		} catch {
			return null
		}
	}

	private async writeFocusChainToDisk(markdownTodoList: string): Promise<void> {
		this.isWritingFocusChain = true
		try {
			const taskDir = await ensureTaskDirectoryExists(this.taskId)
			const todoFilePath = getFocusChainFilePath(taskDir, this.taskId)
			const markdownContent = createFocusChainMarkdownContent(this.taskId, markdownTodoList)

			await writeFile(todoFilePath, markdownContent, "utf8")
			await this.postStateToWebview()
		} finally {
			setTimeout(() => {
				this.isWritingFocusChain = false
			}, 500)
		}
	}

	public async updateFCListFromToolResponse(taskProgress: string | undefined): Promise<void> {
		await this.syncToolResponse(taskProgress)
	}

	/**
	 * Monolithic atomic update method for handling tool responses with task_progress.
	 */
	public async syncToolResponse(taskProgress: string | undefined): Promise<string | null> {
		try {
			if (taskProgress?.trim()) {
				this.taskState.apiRequestsSinceLastTodoUpdate = 0
				const previousList = this.taskState.currentFocusChainChecklist
				let finalProgress = taskProgress.trim()

				if (this.taskState.todoListWasUpdatedByUser && previousList) {
					finalProgress = mergeFocusChainChecklists(previousList, finalProgress)
				}
				this.taskState.todoListWasUpdatedByUser = false
				this.taskState.currentFocusChainChecklist = finalProgress

				const { totalItems, completedItems } = parseFocusChainListCounts(finalProgress)

				if (!this.hasTrackedFirstProgress && totalItems > 0) {
					telemetryService.captureFocusChainProgressFirst(this.taskId, totalItems)
					this.hasTrackedFirstProgress = true
				} else if (this.hasTrackedFirstProgress && totalItems > 0) {
					telemetryService.captureFocusChainProgressUpdate(this.taskId, totalItems, completedItems)
				}

				try {
					await this.writeFocusChainToDisk(finalProgress)
					await this.say("task_progress", finalProgress)
				} catch (error) {
					Logger.error(`[Task ${this.taskId}] focus chain list: Failed to write to markdown file:`, error)
					await this.say("task_progress", finalProgress)
				}

				return finalProgress
			}

			if (!this.taskState.currentFocusChainChecklist) {
				const existingList = await this.readFocusChainFromDisk()
				if (existingList) {
					this.taskState.currentFocusChainChecklist = existingList
					await this.postStateToWebview()
					return existingList
				}
			}

			return this.taskState.currentFocusChainChecklist
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] Error syncing focus chain list from tool response:`, error)
			return this.taskState.currentFocusChainChecklist
		}
	}

	public shouldIncludeFocusChainInstructions(): boolean {
		if (!this.focusChainSettings.enabled) {
			return false
		}

		const justSwitchedFromPlanMode = this.taskState.didRespondToPlanAskBySwitchingMode
		const inPlanMode = this.stateManager.getGlobalSettingsKey("mode") === "plan"
		const userUpdatedList = this.taskState.todoListWasUpdatedByUser
		const reachedReminderInterval =
			this.taskState.apiRequestsSinceLastTodoUpdate >= this.focusChainSettings.remindDietcodeInterval
		const isFirstApiRequest = this.taskState.apiRequestCount === 1 && !this.taskState.currentFocusChainChecklist
		const hasNoTodoListAfterMultipleRequests =
			!this.taskState.currentFocusChainChecklist && this.taskState.apiRequestCount >= 2

		return (
			reachedReminderInterval ||
			justSwitchedFromPlanMode ||
			userUpdatedList ||
			inPlanMode ||
			isFirstApiRequest ||
			hasNoTodoListAfterMultipleRequests
		)
	}

	public checkIncompleteProgressOnCompletion(modelId: string, provider: string) {
		if (this.focusChainSettings.enabled && this.taskState.currentFocusChainChecklist) {
			const { totalItems, completedItems } = parseFocusChainListCounts(this.taskState.currentFocusChainChecklist)

			if (totalItems > 0 && completedItems < totalItems) {
				const incompleteItems = totalItems - completedItems
				telemetryService.captureFocusChainIncompleteOnCompletion(
					this.taskId,
					totalItems,
					completedItems,
					incompleteItems,
					modelId,
					provider,
				)
			}
		}
	}

	/**
	 * Monolithic state reset method. Purges focus chain state to prevent leakage across tasks.
	 */
	public resetState() {
		this.taskState.currentFocusChainChecklist = null
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
	}

	public dispose() {
		if (this.fileUpdateDebounceTimer) {
			clearTimeout(this.fileUpdateDebounceTimer)
			this.fileUpdateDebounceTimer = undefined
		}

		if (this.focusChainFileWatcher) {
			this.focusChainFileWatcher.close()
			this.focusChainFileWatcher = undefined
		}

		this.resetState()
	}
}

export class FocusChainManager extends FocusChainAuthority {}
