import { describe, expect, it } from 'vitest'

import { assessWorkoutSettingsStaleness } from '../../../shared/workout-settings-staleness'

describe('workout settings staleness', () => {
  it('detects FTP drift against the generation snapshot', () => {
    const result = assessWorkoutSettingsStaleness({
      workoutType: 'Ride',
      lastGenerationSettingsSnapshot: {
        profile: { id: 'profile-1' },
        thresholds: { ftp: 250, lthr: 170 },
        zones: { power: [{ min: 100, max: 150, name: 'Z2' }] }
      },
      liveSportSettings: {
        id: 'profile-1',
        ftp: 275,
        lthr: 170,
        powerZones: [{ min: 100, max: 150, name: 'Z2' }]
      }
    })

    expect(result.stale).toBe(true)
    expect(result.reasons).toContain('ftp_changed')
  })
})
