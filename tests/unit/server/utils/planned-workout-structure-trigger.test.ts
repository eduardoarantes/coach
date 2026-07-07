import { describe, expect, it } from 'vitest'
import { hasRenderableStructure } from '../../../../server/utils/structured-workout-persistence'
import { buildStructureGenerationMessage } from '../../../../server/utils/planned-workout-structure-trigger'

describe('hasRenderableStructure', () => {
  it('returns false for empty or missing structure', () => {
    expect(hasRenderableStructure(null)).toBe(false)
    expect(hasRenderableStructure({})).toBe(false)
    expect(hasRenderableStructure({ steps: [] })).toBe(false)
  })

  it('detects endurance steps and strength exercises', () => {
    expect(hasRenderableStructure({ steps: [{ durationSeconds: 600 }] })).toBe(true)
    expect(hasRenderableStructure({ exercises: [{ name: 'Squat' }] })).toBe(true)
  })

  it('detects blocks-only strength structures', () => {
    expect(
      hasRenderableStructure({
        blocks: [{ name: 'Main', steps: [{ name: 'Squat' }] }]
      })
    ).toBe(true)
  })
})

describe('buildStructureGenerationMessage', () => {
  it('describes failed enqueue on create', () => {
    expect(
      buildStructureGenerationMessage({
        outcome: 'created',
        requested: true,
        status: 'failed'
      })
    ).toContain('failed to start')
  })

  it('describes idempotent recovery enqueue', () => {
    expect(
      buildStructureGenerationMessage({
        outcome: 'already_exists',
        requested: true,
        status: 'queued'
      })
    ).toContain('structure generation started')
  })
})
