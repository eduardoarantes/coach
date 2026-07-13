import { deduplicateWorkoutsTask } from '../../trigger/deduplicate-workouts'
import { shouldAutoDeduplicateWorkoutsAfterIngestion } from './ingestion-settings'
import { isTaskRunning } from './trigger-check'

export async function triggerWorkoutDeduplicationIfEnabled(userId: string): Promise<boolean> {
  if (!(await shouldAutoDeduplicateWorkoutsAfterIngestion(userId))) {
    return false
  }

  const dedupAlreadyRunning = await isTaskRunning('deduplicate-workouts', userId)
  if (dedupAlreadyRunning) {
    return false
  }

  await deduplicateWorkoutsTask.trigger(
    { userId, dryRun: false },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  return true
}
