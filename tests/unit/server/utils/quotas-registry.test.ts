import { describe, expect, it } from 'vitest'
import { QUOTA_REGISTRY } from '../../../../server/utils/quotas/registry'

describe('FREE tier quota registry', () => {
  it('restores activity recommendation, check-in, and workout analysis limits', () => {
    const free = QUOTA_REGISTRY.FREE

    expect(free.activity_recommendation?.limit).toBe(2)
    expect(free.daily_checkin?.limit).toBe(1)
    expect(free.workout_analysis?.limit).toBe(6)
  })
})
