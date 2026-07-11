import { describe, expect, it } from 'vitest'

import { validateCanonicalSemantics } from '../../../shared/workout-canonical-validation'

describe('canonical semantic validation', () => {
  it('rejects implausibly fast pace targets', () => {
    const issues = validateCanonicalSemantics({
      steps: [
        {
          duration: 600,
          pace: {
            metric: 'pace',
            rangeMps: { min: 20, max: 22 },
            units: 'm/s'
          }
        }
      ]
    })
    expect(issues.some((issue) => issue.path.endsWith('.pace'))).toBe(true)
  })

  it('accepts realistic run pace targets', () => {
    const issues = validateCanonicalSemantics({
      steps: [
        {
          duration: 3600,
          pace: {
            metric: 'pace',
            rangeMps: { min: 2.2, max: 2.4 },
            units: 'm/s'
          }
        }
      ]
    })
    expect(issues).toHaveLength(0)
  })
})
