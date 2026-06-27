import { describe, expect, it } from 'vitest'
import {
  getStructuredWorkoutDescription,
  getStructuredWorkoutObject,
  hasStructuredWorkoutPreviewData
} from '../../../app/utils/structuredWorkout'

describe('structuredWorkout helpers', () => {
  it('unwraps structuredWorkout from a planned activity row', () => {
    const activity = {
      structuredWorkout: {
        description: 'Easy spin',
        steps: [{ type: 'Active', durationSeconds: 3600 }]
      }
    }

    expect(getStructuredWorkoutObject(activity)).toEqual(activity.structuredWorkout)
    expect(hasStructuredWorkoutPreviewData(activity)).toBe(true)
  })

  it('treats description-only structures as non-previewable', () => {
    const activity = {
      structuredWorkout: {
        description: 'Text-only workout guidance',
        steps: []
      }
    }

    expect(hasStructuredWorkoutPreviewData(activity)).toBe(false)
    expect(getStructuredWorkoutDescription(activity)).toBe('Text-only workout guidance')
  })

  it('accepts strength blocks and exercises as previewable', () => {
    expect(
      hasStructuredWorkoutPreviewData({
        structuredWorkout: {
          blocks: [{ id: 'warmup', steps: [] }]
        }
      })
    ).toBe(true)

    expect(
      hasStructuredWorkoutPreviewData({
        structuredWorkout: {
          exercises: [{ id: 'squat', name: 'Back Squat' }]
        }
      })
    ).toBe(true)
  })

  it('parses JSON strings and ignores invalid payloads safely', () => {
    expect(
      getStructuredWorkoutObject('{"steps":[{"type":"Warmup","durationSeconds":600}]}')
    ).toEqual({
      steps: [{ type: 'Warmup', durationSeconds: 600 }]
    })
    expect(getStructuredWorkoutObject('{not-json')).toBeNull()
    expect(hasStructuredWorkoutPreviewData(null)).toBe(false)
  })
})
