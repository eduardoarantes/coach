import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recommendationTools } from '../../../../../server/utils/ai-tools/recommendations'
import { recommendationRepository } from '../../../../../server/utils/repositories/recommendationRepository'
import { activityRecommendationRepository } from '../../../../../server/utils/repositories/activityRecommendationRepository'

vi.mock('../../../../../server/utils/repositories/recommendationRepository', () => ({
  recommendationRepository: {
    findById: vi.fn(),
    list: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/activityRecommendationRepository', () => ({
  activityRecommendationRepository: {
    findToday: vi.fn()
  }
}))

describe('recommendationTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const tools = recommendationTools(userId, timezone)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue(null)
    vi.mocked(recommendationRepository.list).mockResolvedValue([])
  })

  it('makes workout recommendations explicit that they are not scheduled or synced', async () => {
    const tools = recommendationTools('user-1', 'Europe/Budapest')

    const result = await tools.recommend_workout.execute(
      {
        day_of_week: 5,
        bike_access: true,
        indoor_only: true,
        notes: 'Testing MyWhoosh sync'
      },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result).toEqual(
      expect.objectContaining({
        created: false,
        synced: false,
        success: false,
        next_action: expect.stringContaining('create_planned_workout')
      })
    )
  })

  it('returns today activity recommendation when available', async () => {
    vi.mocked(activityRecommendationRepository.findToday).mockResolvedValue({
      id: 'act-rec-1',
      recommendation: 'proceed',
      confidence: 0.9,
      reasoning: 'Readiness is good.',
      status: 'COMPLETED',
      analysisJson: null,
      plannedWorkout: {
        id: 'pw-1',
        title: 'Easy Run',
        type: 'Run',
        durationSec: 3600,
        tss: 45,
        description: 'Zone 2 aerobic run.'
      }
    } as any)

    const result = await tools.recommend_workout.execute(
      { day_of_week: 2 },
      { toolCallId: 'tool-1', messages: [] }
    )

    expect(result.recommendation).toEqual(
      expect.objectContaining({
        source: 'activity_recommendation',
        title: 'Easy Run',
        type: 'Run',
        planned_workout_id: 'pw-1'
      })
    )
  })

  describe('get_recommendation_details', () => {
    it('should return details when found', async () => {
      const mockRec = { id: 'rec1', userId, status: 'ACTIVE' }
      vi.mocked(recommendationRepository.findById).mockResolvedValue(mockRec as any)

      const result = await tools.get_recommendation_details.execute(
        { recommendation_id: 'rec1' },
        { toolCallId: '1', messages: [] }
      )

      expect(recommendationRepository.findById).toHaveBeenCalledWith('rec1', userId)
      expect(result).toEqual(mockRec)
    })

    it('should return error when not found', async () => {
      vi.mocked(recommendationRepository.findById).mockResolvedValue(null)

      const result = await tools.get_recommendation_details.execute(
        { recommendation_id: 'rec1' },
        { toolCallId: '1', messages: [] }
      )

      expect(result).toEqual({ error: 'Recommendation not found' })
    })
  })

  describe('list_pending_recommendations', () => {
    it('should return list of recommendations', async () => {
      const mockRecs = [
        { id: 'rec1', priority: 'HIGH' },
        { id: 'rec2', priority: 'LOW' }
      ]
      vi.mocked(recommendationRepository.list).mockResolvedValue(mockRecs as any)

      const result = await tools.list_pending_recommendations.execute(
        { status: 'ACTIVE' },
        { toolCallId: '1', messages: [] }
      )

      expect(recommendationRepository.list).toHaveBeenCalledWith(userId, {
        status: 'ACTIVE',
        limit: 5
      })
      expect(result).toEqual({ count: 2, recommendations: mockRecs })
    })

    it('should filter by priority manually', async () => {
      const mockRecs = [
        { id: 'rec1', priority: 'HIGH' },
        { id: 'rec2', priority: 'LOW' }
      ]
      vi.mocked(recommendationRepository.list).mockResolvedValue(mockRecs as any)

      const result = await tools.list_pending_recommendations.execute(
        { status: 'ACTIVE', priority: 'HIGH' },
        { toolCallId: '1', messages: [] }
      )

      expect(result.recommendations).toHaveLength(1)
      expect(result.recommendations[0].priority).toBe('HIGH')
    })
  })
})
