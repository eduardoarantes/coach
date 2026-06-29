import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../../server/utils/db'
import { getServerSession } from '../../../../../../server/utils/session'
import { sportSettingsRepository } from '../../../../../../server/utils/repositories/sportSettingsRepository'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, name: string) => event.params?.[name])
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).statusMessage = err.statusMessage
  return error
})

vi.mock('../../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../../../server/utils/intervals-sync', () => ({
  syncPlannedWorkoutToIntervals: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../../server/api/workouts/planned/[id]/structure.patch')
  return mod.default
}

const strengthBlocksPayload = [
  {
    type: 'single_exercise',
    title: 'Main Lift',
    steps: [
      {
        name: 'Back Squat',
        prescriptionMode: 'reps',
        defaultRest: '2m',
        setRows: [
          { index: 1, value: '5' },
          { index: 2, value: '5' }
        ]
      }
    ]
  }
]

describe('PATCH /api/workouts/planned/:id/structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue({
      id: 'workout-1',
      userId: 'user-1',
      type: 'WeightTraining',
      durationSec: 1800,
      tss: 40,
      workIntensity: 0.8,
      syncStatus: 'LOCAL_ONLY',
      structuredWorkout: {},
      user: { ftp: 250 }
    } as any)
    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      ftp: 250,
      lthr: 168,
      maxHr: 185,
      thresholdPace: 2.345,
      hrZones: [],
      powerZones: [],
      paceZones: []
    } as any)
    vi.mocked(prisma.plannedWorkout.update).mockImplementation(async ({ data }: any) => ({
      id: 'workout-1',
      userId: 'user-1',
      type: 'WeightTraining',
      durationSec: data.durationSec,
      tss: data.tss,
      workIntensity: data.workIntensity,
      syncStatus: data.syncStatus,
      structuredWorkout: data.structuredWorkout,
      lastStructureEditSource: data.lastStructureEditSource
    }))
  })

  it('saves strength-only structure payloads without interval steps', async () => {
    const handler = await getHandler()

    const result = await handler({
      params: { id: 'workout-1' },
      body: {
        blocks: strengthBlocksPayload,
        exercises: [
          {
            group: 'Main Lift',
            name: 'Back Squat',
            sets: 2,
            reps: '5',
            rest: '2m'
          }
        ],
        durationSec: 1800,
        tss: 40
      }
    } as any)

    expect(result.success).toBe(true)
    expect(prisma.plannedWorkout.update).toHaveBeenCalledWith({
      where: { id: 'workout-1' },
      data: expect.objectContaining({
        lastStructureEditSource: 'USER',
        structuredWorkout: expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({
              title: 'Main Lift',
              steps: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Back Squat'
                })
              ])
            })
          ]),
          exercises: expect.arrayContaining([
            expect.objectContaining({
              name: 'Back Squat'
            })
          ])
        })
      })
    })
  })
})
