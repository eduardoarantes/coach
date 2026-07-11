import { describe, expect, it, vi } from 'vitest'

import { serializeCanonicalForProvider } from '../../../../server/utils/canonical-workout-serializer'

vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).data = err.data
  return error
})

describe('canonical provider export adapter', () => {
  const structure = {
    schemaVersion: 1,
    source: 'AI_GENERATION',
    targetUnits: { pace: 'm/s', duration: 'seconds', distance: 'meters' },
    zoneProfileSnapshot: {
      pace: { unit: 'm/s', ranges: [{ min: 2.2, max: 2.4, name: 'Z2' }] }
    },
    steps: [
      {
        duration: 3600,
        power: { value: 0.7, units: '%' }
      }
    ]
  }

  it('routes ride power workouts to intervals and zwo through one adapter', () => {
    const intervals = serializeCanonicalForProvider({
      destination: 'intervals',
      title: 'Endurance',
      description: 'Steady',
      type: 'Ride',
      ftp: 250,
      structure
    })
    const zwo = serializeCanonicalForProvider({
      destination: 'zwo',
      title: 'Endurance',
      description: 'Steady',
      type: 'Ride',
      ftp: 250,
      structure
    })

    expect(typeof intervals).toBe('string')
    expect(intervals).toContain('70%')
    expect(typeof zwo).toBe('string')
    expect(zwo).toContain('<workout')
  })

  it('rejects unsupported destination/target combinations', () => {
    expect(() =>
      serializeCanonicalForProvider({
        destination: 'zwo',
        title: 'Run',
        description: 'Tempo',
        type: 'Run',
        structure: {
          ...structure,
          steps: [
            {
              duration: 1800,
              pace: {
                metric: 'pace',
                kind: 'zone',
                zone: 3,
                rangeMps: { min: 3.1, max: 3.3 },
                units: 'm/s'
              }
            }
          ]
        }
      })
    ).toThrow(/pace targets are rejected/)
  })
})
