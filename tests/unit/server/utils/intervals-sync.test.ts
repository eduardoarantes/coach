import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'
import {
  createIntervalsPlannedWorkout,
  updateIntervalsPlannedWorkout
} from '../../../../server/utils/intervals'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    integration: {
      findFirst: vi.fn()
    },
    plannedWorkout: {
      update: vi.fn()
    },
    syncQueue: {
      create: vi.fn(),
      update: vi.fn()
    },
    event: {
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/intervals', () => ({
  createIntervalsPlannedWorkout: vi.fn(),
  updateIntervalsPlannedWorkout: vi.fn(),
  deleteIntervalsPlannedWorkout: vi.fn(),
  updateIntervalsEvent: vi.fn(),
  createIntervalsEvent: vi.fn(),
  deleteIntervalsEvent: vi.fn(),
  isIntervalsEventId: vi.fn((value: string | null | undefined) => /^\d+$/.test(value || ''))
}))

vi.mock('../../../../server/utils/repositories/plannedWorkoutPublishRepository', () => ({
  plannedWorkoutPublishRepository: {
    upsert: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('intervals-sync helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({
      id: 'integration-1',
      provider: 'intervals'
    } as any)
  })

  it('recreates the workout when an Intervals update returns 404', async () => {
    const { syncPlannedWorkoutToIntervals } =
      await import('../../../../server/utils/intervals-sync')

    vi.mocked(updateIntervalsPlannedWorkout).mockRejectedValue(
      new Error('Intervals API error: 404 {"status":404,"error":"Event not found"}')
    )
    vi.mocked(createIntervalsPlannedWorkout).mockResolvedValue({ id: '98765' } as any)

    const result = await syncPlannedWorkoutToIntervals(
      'UPDATE',
      {
        id: 'planned-1',
        externalId: '12345',
        date: new Date('2026-03-12T00:00:00Z'),
        title: 'Tempo Ride',
        type: 'Ride'
      },
      'user-1'
    )

    expect(createIntervalsPlannedWorkout).toHaveBeenCalled()
    expect(prisma.plannedWorkout.update).toHaveBeenCalledWith({
      where: { id: 'planned-1' },
      data: {
        externalId: '98765',
        syncError: null
      }
    })
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        synced: true,
        result: { id: '98765' }
      })
    )
  })

  it('hydrates queued planned workout dates before retry processing', async () => {
    const { processSyncQueueItem } = await import('../../../../server/utils/intervals-sync')

    vi.mocked(createIntervalsPlannedWorkout).mockResolvedValue({ id: '24680' } as any)

    const result = await processSyncQueueItem({
      id: 'queue-1',
      userId: 'user-1',
      entityType: 'planned_workout',
      entityId: 'planned-1',
      operation: 'CREATE',
      payload: {
        id: 'planned-1',
        externalId: 'local-1',
        date: '2026-03-12T00:00:00.000Z',
        title: 'Tempo Ride',
        type: 'Ride'
      },
      attempts: 0
    })

    expect(result).toBe(true)
    expect(createIntervalsPlannedWorkout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        date: expect.any(Date),
        title: 'Tempo Ride'
      })
    )
    expect(prisma.syncQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'queue-1' },
        data: expect.objectContaining({
          status: 'COMPLETED'
        })
      })
    )
  })
})
