import { describe, expect, it } from 'vitest'
import { serializeCanonicalForIntervals } from '../../../../server/utils/canonical-workout-serializer'
import { WorkoutParser } from '../../../../server/utils/workout-parser'
import { createZoneProfileSnapshot } from '../../../../shared/structured-workout-contract'

describe('canonical export roundtrip', () => {
  it('preserves pace-zone meaning through Intervals export and parse', () => {
    const snapshot = createZoneProfileSnapshot({
      thresholdPace: 2.75,
      paceZones: [
        { min: 3.6, max: 3.9, name: 'Z4' },
        { min: 2.2, max: 2.4, name: 'Z2' }
      ]
    })
    const structure = {
      schemaVersion: 1,
      source: 'INTERVALS_IMPORT',
      zoneProfileSnapshot: snapshot,
      targetUnits: { pace: 'm/s', duration: 'seconds', distance: 'meters' },
      steps: [
        {
          type: 'Warmup',
          duration: 600,
          pace: {
            metric: 'pace',
            kind: 'zone',
            zone: 1,
            rangeMps: { min: 3.6, max: 3.9 },
            units: 'm/s'
          }
        },
        {
          type: 'Active',
          duration: 2400,
          pace: {
            metric: 'pace',
            kind: 'zone',
            zone: 2,
            rangeMps: { min: 2.2, max: 2.4 },
            units: 'm/s'
          }
        }
      ]
    }

    const exported = serializeCanonicalForIntervals({
      title: 'Zone 2 Run',
      description: '',
      type: 'Run',
      ftp: 250,
      structure,
      zoneProfileSnapshot: snapshot
    })

    expect(exported).toContain('Z2 Pace')
    const reparsed = WorkoutParser.parseIntervalsICU(exported, { workoutType: 'Run' })
    expect(reparsed.length).toBeGreaterThanOrEqual(2)
    const totalDuration = reparsed.reduce(
      (sum: number, step: any) => sum + Number(step?.duration || step?.durationSeconds || 0),
      0
    )
    expect(totalDuration).toBeGreaterThanOrEqual(3000)
  })
})
