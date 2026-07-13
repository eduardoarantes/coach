import { beforeEach, describe, expect, it, vi } from 'vitest'
import { triggerWorkoutDeduplicationIfEnabled } from '../../../../server/utils/trigger-workout-deduplication'
import { deduplicateWorkoutsTask } from '../../../../trigger/deduplicate-workouts'
import { shouldAutoDeduplicateWorkoutsAfterIngestion } from '../../../../server/utils/ingestion-settings'
import { isTaskRunning } from '../../../../server/utils/trigger-check'

vi.mock('../../../../trigger/deduplicate-workouts', () => ({
  deduplicateWorkoutsTask: {
    trigger: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('../../../../server/utils/ingestion-settings', () => ({
  shouldAutoDeduplicateWorkoutsAfterIngestion: vi.fn().mockResolvedValue(true)
}))

vi.mock('../../../../server/utils/trigger-check', () => ({
  isTaskRunning: vi.fn().mockResolvedValue(false)
}))

describe('triggerWorkoutDeduplicationIfEnabled', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shouldAutoDeduplicateWorkoutsAfterIngestion).mockResolvedValue(true)
    vi.mocked(isTaskRunning).mockResolvedValue(false)
  })

  it('triggers deduplicate-workouts when enabled and no run is active', async () => {
    const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)

    expect(triggered).toBe(true)
    expect(deduplicateWorkoutsTask.trigger).toHaveBeenCalledWith(
      { userId, dryRun: false },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )
  })

  it('returns false when auto deduplication is disabled', async () => {
    vi.mocked(shouldAutoDeduplicateWorkoutsAfterIngestion).mockResolvedValue(false)

    const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)

    expect(triggered).toBe(false)
    expect(deduplicateWorkoutsTask.trigger).not.toHaveBeenCalled()
  })

  it('returns false when a deduplication run is already active', async () => {
    vi.mocked(isTaskRunning).mockResolvedValue(true)

    const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)

    expect(triggered).toBe(false)
    expect(deduplicateWorkoutsTask.trigger).not.toHaveBeenCalled()
  })
})
