import { runs } from '@trigger.dev/sdk/v3'

export async function isTaskRunning(taskIdentifier: string, userId: string): Promise<boolean> {
  try {
    // @ts-expect-error - SDK v3 types mismatch for filter params
    const activeRuns = await runs.list({
      filter: {
        taskIdentifier: [taskIdentifier],
        tags: [`user:${userId}`],
        status: ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING']
      },
      limit: 1
    })

    return activeRuns.data.length > 0
  } catch (error) {
    console.warn(`Failed to check running status for task ${taskIdentifier}:`, error)
    return false // Fail open to allow retry if check fails
  }
}

const STRUCTURE_TASK_IDENTIFIERS = ['generate-structured-workout', 'adjust-structured-workout']

export async function isPlannedWorkoutStructureJobInFlight(
  userId: string,
  workoutId: string
): Promise<boolean> {
  try {
    // @ts-expect-error - SDK v3 types mismatch for filter params
    const activeRuns = await runs.list({
      filter: {
        taskIdentifier: STRUCTURE_TASK_IDENTIFIERS,
        tags: [`user:${userId}`, `planned-workout:${workoutId}`],
        status: ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING', 'FROZEN']
      },
      limit: 1
    })

    return activeRuns.data.length > 0
  } catch (error) {
    console.warn(`Failed to check structure job status for workout ${workoutId}:`, error)
    return false
  }
}

export async function isRunIdRunning(runId: string): Promise<boolean> {
  try {
    const run = await runs.retrieve(runId)
    const runningStatuses = ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING', 'FROZEN']
    return runningStatuses.includes(run.status)
  } catch (error) {
    console.warn(`Failed to check running status for run ${runId}:`, error)
    return false
  }
}
