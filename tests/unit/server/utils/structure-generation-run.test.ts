import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'
import { beginStructureGenerationRun } from '../../../../server/utils/structure-generation-run'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    plannedWorkout: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    workoutStructureGenerationRun: {
      updateMany: vi.fn(),
      create: vi.fn()
    }
  }
}))

describe('structure generation run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supersedes active runs and creates a revisioned run atomically', async () => {
    const tx = {
      plannedWorkout: {
        findFirst: vi.fn().mockResolvedValue({ id: 'pw-1' }),
        update: vi.fn().mockResolvedValue({ generationRevision: 4 })
      },
      workoutStructureGenerationRun: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({
          id: 'run-1',
          generationRevision: 4,
          idempotencyKey: 'structure-generate:pw-1:rev-4'
        })
      }
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx))

    const result = await beginStructureGenerationRun({
      plannedWorkoutId: 'pw-1',
      userId: 'user-1',
      mode: 'generate',
      source: 'api',
      requestSnapshot: { targetingOverride: null }
    })

    expect(tx.workoutStructureGenerationRun.updateMany).toHaveBeenCalledWith({
      where: { plannedWorkoutId: 'pw-1', status: { in: ['PENDING', 'RUNNING'] } },
      data: expect.objectContaining({ status: 'SUPERSEDED' })
    })
    expect(result).toEqual({
      runId: 'run-1',
      generationRevision: 4,
      idempotencyKey: 'structure-generate:pw-1:rev-4'
    })
  })
})
