import { describe, expect, it } from 'vitest'
import { resolveStepChartIntensity } from '../../../shared/workout-render-model'
import { createZoneProfileSnapshot } from '../../../shared/structured-workout-contract'
import { resolveWorkoutChartSportSettings } from '../../../app/utils/workoutChartContext'

describe('snapshot stability across render surfaces', () => {
  const importSnapshot = createZoneProfileSnapshot({
    thresholdPace: 2.75,
    paceZones: [{ min: 2.2, max: 2.4, name: 'Z2' }]
  })
  const liveSettings = createZoneProfileSnapshot({
    thresholdPace: 3.5,
    paceZones: [{ min: 4.0, max: 4.5, name: 'Z2' }]
  })

  const workout = {
    structuredWorkout: {
      schemaVersion: 1,
      zoneProfileSnapshot: importSnapshot,
      steps: [
        {
          duration: 3600,
          pace: { metric: 'pace', kind: 'zone', zone: 1, rangeMps: { min: 2.2, max: 2.4 } }
        }
      ]
    }
  }

  it('uses the captured envelope snapshot instead of live sport settings', () => {
    const effective = resolveWorkoutChartSportSettings(workout, {
      ftp: 300,
      thresholdPace: liveSettings.pace?.thresholdMps,
      paceZones: liveSettings.pace?.ranges
    })

    expect(effective.thresholdPace).toBe(2.75)
    expect(effective.paceZones[0]).toMatchObject({ min: 2.2, max: 2.4 })
  })

  it('renders the same chart intensity after live settings change', () => {
    const step = workout.structuredWorkout.steps[0]
    const refs = { ftp: 250, lthr: 170, maxHr: 190, thresholdPace: 2.75 }
    const before = resolveStepChartIntensity(step, 'pace', refs, importSnapshot)

    const changedRefs = { ftp: 250, lthr: 170, maxHr: 190, thresholdPace: 3.5 }
    const after = resolveStepChartIntensity(step, 'pace', changedRefs, importSnapshot)

    expect(before).toBeCloseTo(after, 5)
    expect(before).toBeGreaterThan(0)
  })
})
