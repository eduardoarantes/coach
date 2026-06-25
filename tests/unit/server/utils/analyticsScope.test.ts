import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()
const findUnique = vi.fn()
const findFirst = vi.fn()

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    workout: {
      findMany,
      findUnique,
      findFirst
    }
  }
}))

vi.mock('../../../../server/utils/repositories/coachingRepository', () => ({
  coachingRepository: {
    checkRelationship: vi.fn()
  }
}))

vi.mock('../../../../server/utils/repositories/teamRepository', () => ({
  teamRepository: {
    getTeamsForUser: vi.fn().mockResolvedValue([]),
    checkTeamAccess: vi.fn().mockResolvedValue(false),
    checkGroupOwnership: vi.fn().mockResolvedValue(false)
  }
}))

describe('analyticsScope.getAccessibleWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('re-fetches the resolved workout with owner scope', async () => {
    const { getAccessibleWorkout } = await import('../../../../server/utils/analyticsScope')

    findMany.mockResolvedValue([
      {
        id: 'duplicate-workout',
        userId: 'athlete-1',
        isDuplicate: true,
        duplicateOf: 'canonical-workout'
      }
    ])
    findUnique.mockResolvedValue({
      id: 'canonical-workout',
      userId: 'athlete-1'
    })
    findFirst.mockResolvedValue({
      id: 'canonical-workout',
      userId: 'athlete-1',
      title: 'Scoped workout'
    })

    const result = await getAccessibleWorkout('athlete-1', 'duplicate-workout', {
      select: {
        id: true,
        userId: true,
        title: true
      }
    })

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'canonical-workout' },
      select: { id: true, userId: true }
    })
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'canonical-workout',
        userId: 'athlete-1'
      },
      select: {
        id: true,
        userId: true,
        title: true
      }
    })
    expect(result).toEqual({
      id: 'canonical-workout',
      userId: 'athlete-1',
      title: 'Scoped workout'
    })
  })
})
