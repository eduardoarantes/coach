import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../server/utils/db'
import { sportSettingsRepository } from '../../../../server/utils/repositories/sportSettingsRepository'
import { hasActiveStructureGenerationRun } from '../../../../server/utils/structure-generation-run'
import {
  appendPublishStalenessWarning,
  formatSettingsStalenessPublishWarning,
  loadPlannedWorkoutPublishContext
} from '../../../../server/utils/planned-workout-publish-guards'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../server/utils/structure-generation-run', () => ({
  hasActiveStructureGenerationRun: vi.fn()
}))

describe('planned-workout-publish-guards', () => {
  const userId = 'user-1'
  const workoutId = 'pw-1'

  const baseWorkout = {
    id: workoutId,
    userId,
    title: 'Threshold',
    description: 'Hard',
    type: 'Ride',
    date: new Date('2026-02-20T00:00:00Z'),
    startTime: '08:00',
    durationSec: 3600,
    distanceMeters: null,
    tss: 80,
    managedBy: null,
    externalId: null,
    syncStatus: 'LOCAL_ONLY',
    syncConflict: false,
    structuredWorkout: {
      steps: [{ type: 'Active', name: 'Main', duration: 1800 }]
    },
    lastGenerationSettingsSnapshot: null,
    createdFromSettingsSnapshot: null,
    user: { ftp: 250, timezone: 'UTC' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(false)
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue(baseWorkout as any)
    vi.mocked(sportSettingsRepository.getForActivityType).mockResolvedValue({
      ftp: 250,
      lthr: 168,
      maxHr: 185,
      thresholdPace: 2.3,
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

    const result = await loadPlannedWorkoutPublishContext(userId, workoutId)

    expect(result).toEqual({
      ok: false,
      code: 'sync_conflict',
      error: 'This workout has a sync conflict. Resolve the conflict before publishing.'
    })
  })

  it('blocks publish while structure generation is in flight', async () => {
    vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(true)

    const result = await loadPlannedWorkoutPublishContext(userId, workoutId)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('generation_in_flight')
    }
  })

  it('returns publish context with settings staleness', async () => {
    vi.mocked(prisma.plannedWorkout.findUnique).mockResolvedValue({
      ...baseWorkout,
      lastGenerationSettingsSnapshot: {
        thresholds: { ftp: 240 },
        zones: { power: [], heartRate: [], pace: [] }
      }
    } as any)

    const result = await loadPlannedWorkoutPublishContext(userId, workoutId)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.context.settingsStaleness.stale).toBe(true)
      expect(result.context.workout.user?.timezone).toBe('UTC')
    }
  })

  it('appends staleness warnings to publish messages', () => {
    const message = appendPublishStalenessWarning('Workout published.', {
      stale: true,
      reasons: ['ftp_changed'],
      snapshotProfileId: 'a',
      liveProfileId: 'b'
    })

    expect(message).toContain('FTP')
    expect(
      formatSettingsStalenessPublishWarning({
        stale: true,
        reasons: ['ftp_changed'],
        snapshotProfileId: 'a',
        liveProfileId: 'b'
      })
    ).toContain('FTP')
  })
})
