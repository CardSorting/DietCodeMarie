import { StorageManager } from "@/services/storage/StorageManager"
import { Logger } from "@/shared/services/Logger"

/**
 * Gets the total size of tasks and checkpoints directories
 * @returns The total size in bytes, or null if calculation fails
 */
export async function getTotalTasksSize(): Promise<number | null> {
	try {
		const breakdown = await StorageManager.getInstance().getStorageBreakdown()
		return breakdown.tasksBytes + breakdown.checkpointsBytes
	} catch (error) {
		Logger.error("Failed to calculate total task size:", error)
		return null
	}
}
