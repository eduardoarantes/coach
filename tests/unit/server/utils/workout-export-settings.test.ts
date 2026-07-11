import { describe, expect, it } from 'vitest'

import { resolveWorkoutExportContext } from '../../../../server/utils/workout-export-settings'

describe('workout export settings', () => {
  it('prefers generation snapshot FTP over live user FTP', () => {
    const context = resolveWorkoutExportContext({
      workout: {
        lastGenerationSettingsSnapshot: {
          thresholds: { ftp: 260, lthr: 170, thresholdPace: 2.8 },
          zones: { pace: [{ min: 2.2, max: 2.4, name: 'Z2' }] },
          targetPolicy: { fallbackOrder: ['pace', 'heartRate'] }
        },
        user: { ftp: 300 }
      },
      liveUserFtp: 300
    })

    expect(context.ftp).toBe(260)
    expect(context.generationSettingsSnapshot?.thresholds).toMatchObject({ ftp: 260 })
    expect(context.sportSettings?.targetPolicy).toBeTruthy()
  })
})
