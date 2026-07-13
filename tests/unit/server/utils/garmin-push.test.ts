import { describe, expect, it } from 'vitest'
import {
  buildGarminTrainingPayload,
  extractGarminScheduleId
} from '../../../../server/utils/garmin-push'

describe('garmin push helpers', () => {
  it('converts relative power and heart rate targets to absolute values', () => {
    const payload = buildGarminTrainingPayload(
      {
        title: 'Test Ride',
        type: 'Ride',
        steps: [
          {
            type: 'Active',
            durationSeconds: 600,
            power: { value: 0.95, units: '%' },
            heartRate: { value: 0.85, units: '%' }
          }
        ]
      },
      { ftp: 200, lthr: 150 }
    )

    const step = payload.steps[0] as Record<string, unknown>
    expect(step.targetType).toBe('POWER')
    expect(step.targetValue).toBe(190)
  })

  it('extracts schedule ids from Garmin API responses', () => {
    expect(extractGarminScheduleId({ scheduleId: 42 })).toBe('42')
    expect(extractGarminScheduleId({ id: 'abc' })).toBe('abc')
    expect(extractGarminScheduleId('123')).toBe('123')
    expect(extractGarminScheduleId({})).toBe('')
  })

  it('maps extended sport types', () => {
    const payload = buildGarminTrainingPayload({
      title: 'Virtual Ride',
      type: 'VirtualRide',
      steps: [{ type: 'Active', durationSeconds: 300 }]
    })

    expect(payload.sport).toBe('CYCLING')
  })
})
