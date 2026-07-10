import { describe, expect, it } from 'vitest'
import { compareStructuredWorkouts } from './workout-structure-diff'
import { createZoneProfileSnapshot } from './structured-workout-contract'

describe('workout structure diff', () => {
  const snapshot = createZoneProfileSnapshot({
    thresholdPace: 2.75,
    paceZones: [{ min: 2.2, max: 2.4, name: 'Z2' }]
  })

  it('reports step-level target differences between local and remote structures', () => {
    const local = {
      schemaVersion: 1,
      zoneProfileSnapshot: snapshot,
      steps: [
        {
          name: 'Warmup',
          duration: 600,
          pace: { metric: 'pace', kind: 'zone', zone: 1, rangeMps: { min: 3.6, max: 3.9 } }
        },
        {
          name: 'Main',
          duration: 2400,
          pace: { metric: 'pace', kind: 'zone', zone: 2, rangeMps: { min: 2.2, max: 2.4 } }
        }
      ]
    }
    const remote = {
      schemaVersion: 1,
      zoneProfileSnapshot: snapshot,
      steps: [
        {
          name: 'Warmup',
          duration: 600,
          pace: { metric: 'pace', kind: 'zone', zone: 1, rangeMps: { min: 3.6, max: 3.9 } }
        },
        {
          name: 'Main',
          duration: 3000,
          pace: { metric: 'pace', kind: 'zone', zone: 2, rangeMps: { min: 2.2, max: 2.4 } }
        }
      ]
    }

    const diff = compareStructuredWorkouts(local, remote)
    expect(diff.steps).toHaveLength(1)
    expect(diff.steps[0]).toMatchObject({
      name: 'Main',
      changedFields: ['duration']
    })
  })

  it('flags missing remote steps', () => {
    const diff = compareStructuredWorkouts(
      { steps: [{ name: 'A', duration: 60, power: { value: 0.7, units: '%' } }] },
      { steps: [] }
    )
    expect(diff.remoteOnlyCount).toBe(0)
    expect(diff.localOnlyCount).toBe(1)
    expect(diff.steps[0]?.changedFields).toContain('missing_remote')
  })
})
