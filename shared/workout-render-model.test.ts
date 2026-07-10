import { describe, expect, it } from 'vitest'
import {
  formatStepTargetLabel,
  resolveCanonicalPaceMps,
  resolveStepChartIntensity
} from './workout-render-model'
import { createZoneProfileSnapshot } from './structured-workout-contract'

describe('workout render model', () => {
  const snapshot = createZoneProfileSnapshot({
    thresholdPace: 2.75,
    paceZones: [
      { min: 3.6, max: 3.9, name: 'Z4' },
      { min: 2.2, max: 2.4, name: 'Z2' },
      { min: 3.6, max: 3.9, name: 'Z4' }
    ]
  })

  it('resolves canonical pace zones from the captured snapshot', () => {
    const step = {
      pace: { metric: 'pace', kind: 'zone', zone: 2, rangeMps: { min: 2.2, max: 2.4 } }
    }
    expect(resolveCanonicalPaceMps(step.pace, snapshot)).toBeCloseTo(2.3, 5)
    expect(formatStepTargetLabel(step, 'pace', snapshot)).toBe('Z2')
  })

  it('returns zero chart intensity for unresolved targets', () => {
    const step = {
      pace: { metric: 'pace', kind: 'freeform', unresolved: true, raw: { value: 240 } }
    }
    expect(
      resolveStepChartIntensity(
        step,
        'pace',
        { ftp: 250, lthr: 170, maxHr: 190, thresholdPace: 2.75 },
        snapshot
      )
    ).toBe(0)
    expect(formatStepTargetLabel(step, 'pace', snapshot)).toBe('Unresolved pace')
  })

  it('does not infer pace from undeclared legacy magnitudes', () => {
    expect(resolveCanonicalPaceMps({ value: 240 }, snapshot)).toBeNull()
  })
})
