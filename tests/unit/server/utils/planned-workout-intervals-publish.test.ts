import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publishPlannedWorkoutToIntervals } from '../../../../server/utils/planned-workout-intervals-publish'
import { formatSettingsStalenessPublishWarning } from '../../../../server/utils/planned-workout-publish-guards'
import { prisma } from '../../../../server/utils/db'
import { sportSettingsRepository } from '../../../../server/utils/repositories/sportSettingsRepository'
import { plannedWorkoutPublishRepository } from '../../../../server/utils/repositories/plannedWorkoutPublishRepository'
import { plannedWorkoutRepository } from '../../../../server/utils/repositories/plannedWorkoutRepository'
import {
  createIntervalsPlannedWorkout,
  updateIntervalsPlannedWorkout
} from '../../../../server/utils/intervals'
import { serializeCanonicalForIntervals } from '../../../../server/utils/canonical-workout-serializer'
import { hasActiveStructureGenerationRun } from '../../../../server/utils/structure-generation-run'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    integration: {
      findFirst: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../server/utils/repositories/plannedWorkoutPublishRepository', () => ({
  plannedWorkoutPublishRepository: {
    getByProvider: vi.fn(),
    upsert: vi.fn()
  }
}))

vi.mock('../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    update: vi.fn()
  }
}))

vi.mock('../../../../server/utils/intervals', () => ({
  createIntervalsPlannedWorkout: vi.fn(),
  updateIntervalsPlannedWorkout: vi.fn(),
  cleanIntervalsDescription: vi.fn((value: string) => value),
  isIntervalsEventId: vi.fn((value: string | null | undefined) =>
    Boolean(value && /^\d+$/.test(value))
  ),
  normalizeIntervalsSportType: vi.fn((value: string | null | undefined) => value || 'Ride')
}))

vi.mock('../../../../server/utils/canonical-workout-serializer', () => ({
  serializeCanonicalForIntervals: vi.fn()
}))

vi.mock('../../../../server/utils/structure-generation-run', () => ({
  hasActiveStructureGenerationRun: vi.fn()
}))

describe('planned-workout-intervals-publish', () => {
  const userId = 'user-1'
  const workoutId = 'pw-1'

  const baseWorkout = {
    id: workoutId,
    userId,
    title: 'Threshold',
    description: 'Hard session',
    type: 'Ride',
    date: new Date('2026-02-20T00:00:00Z'),
    startTime: '08:00',
    durationSec: 3600,
    tss: 80,
    managedBy: null,
    externalId: null,
    syncConflict: false,
    structuredWorkout: {
      source: 'AI_GENERATION',
      steps: [{ type: 'Active', name: 'Main set', duration: 1800 }]
    },
    lastGenerationSettingsSnapshot: null,
    createdFromSettingsSnapshot: null,
    user: { ftp: 250 }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(false)
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue(baseWorkout as any)
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({ id: 'int-1' } as any)
    vi.mocked(plannedWorkoutPublishRepository.getByProvider).mockResolvedValue(null)
    vi.mocked(serializeCanonicalForIntervals).mockReturnValue('workout doc')
    vi.mocked(createIntervalsPlannedWorkout).mockResolvedValue({ id: 12345 } as any)
    vi.mocked(plannedWorkoutRepository.update).mockResolvedValue(baseWorkout as any)
    vi.mocked(plannedWorkoutPublishRepository.upsert).mockResolvedValue({} as any)
    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      ftp: 260,
      lthr: 170,
      maxHr: 190,
      thresholdPace: 2.4,
      hrZones: [],
      powerZones: [],
      paceZones: []
    } as any)
  })

  it('blocks publish when sync conflict is active', async () => {
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue({
      ...baseWorkout,
      syncConflict: true
    } as any)

    const result = await publishPlannedWorkoutToIntervals(userId, workoutId)

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        code: 'sync_conflict'
      })
    )
    expect(createIntervalsPlannedWorkout).not.toHaveBeenCalled()
  })

  it('blocks publish while structure generation is in flight', async () => {
    vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(true)

    const result = await publishPlannedWorkoutToIntervals(userId, workoutId)

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        code: 'generation_in_flight'
      })
    )
  })

  it('publishes a local workout and warns when settings are stale', async () => {
    vi.mocked(prisma.plannedWorkout.findUnique)
      .mockResolvedValueOnce({
        ...baseWorkout,
        lastGenerationSettingsSnapshot: {
          thresholds: { ftp: 240 },
          zones: { power: [], heartRate: [], pace: [] }
        }
      } as any)
      .mockResolvedValueOnce({ ...baseWorkout, syncStatus: 'SYNCED', externalId: '12345' } as any)

    const result = await publishPlannedWorkoutToIntervals(userId, workoutId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.action).toBe('created')
      expect(result.warnings?.settings_staleness?.stale).toBe(true)
      expect(result.message).toContain('FTP')
    }
    expect(createIntervalsPlannedWorkout).toHaveBeenCalled()
  })

  it('recreates on intervals when update returns 404', async () => {
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue({
      ...baseWorkout,
      externalId: '99999'
    } as any)
    vi.mocked(plannedWorkoutPublishRepository.getByProvider).mockResolvedValue({
      externalId: '99999'
    } as any)
    vi.mocked(updateIntervalsPlannedWorkout).mockRejectedValue(new Error('404 Event not found'))
    vi.mocked(createIntervalsPlannedWorkout).mockResolvedValue({ id: 54321 } as any)

    const result = await publishPlannedWorkoutToIntervals(userId, workoutId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.action).toBe('recreated')
    }
    expect(createIntervalsPlannedWorkout).toHaveBeenCalled()
  })

  it('formats staleness warnings for chat and HTTP responses', () => {
    expect(
      formatSettingsStalenessPublishWarning({
        stale: true,
        reasons: ['ftp_changed', 'zones_changed'],
        snapshotProfileId: 'a',
        liveProfileId: 'b'
      })
    ).toContain('FTP')
  })
})
