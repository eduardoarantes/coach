import { describe, expect, it } from 'vitest'
import { hasRenderableStructure } from '../../../../server/utils/structured-workout-persistence'

describe('hasRenderableStructure', () => {
  it('detects blocks-only strength structures', () => {
    expect(
      hasRenderableStructure({
        blocks: [{ name: 'Main', steps: [{ name: 'Squat' }] }]
      })
    ).toBe(true)
  })

  it('returns false for empty structures', () => {
    expect(hasRenderableStructure(null)).toBe(false)
    expect(hasRenderableStructure({ steps: [] })).toBe(false)
  })
})
