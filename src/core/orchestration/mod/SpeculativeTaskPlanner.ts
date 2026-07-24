import { DesignImplementationTask } from "./types"

export interface TaskExecutionWave {
	waveIndex: number
	tasks: DesignImplementationTask[]
	affectedFiles: string[]
}

/**
 * Speculative Task Wave Planner
 * Analyzes mutation boundaries across tasks and partitions them into concurrent execution waves.
 * Tasks in the same wave have disjoint file targets and can safely run in parallel.
 */
export class SpeculativeTaskPlanner {
	public partitionIntoWaves(tasks: DesignImplementationTask[]): TaskExecutionWave[] {
		const waves: TaskExecutionWave[] = []

		for (const task of tasks) {
			const taskFiles = new Set(task.affectedFiles || [])
			let placedInWave = false

			for (const wave of waves) {
				const waveFiles = new Set(wave.affectedFiles)
				const hasOverlap = [...taskFiles].some((file) => waveFiles.has(file))

				if (!hasOverlap) {
					wave.tasks.push(task)
					wave.affectedFiles.push(...task.affectedFiles)
					placedInWave = true
					break
				}
			}

			if (!placedInWave) {
				waves.push({
					waveIndex: waves.length + 1,
					tasks: [task],
					affectedFiles: [...task.affectedFiles],
				})
			}
		}

		return waves
	}
}
