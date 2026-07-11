import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../server/utils/db'
import { sportSettingsRepository } from '../../../../server/utils/repositories/sportSettingsRepository'
import { syncPlannedWorkoutToIntervals } from '../../../../server/utils/intervals-sync'
import { serializeCanonicalForIntervals } from '../../../../server/utils/canonical-workout-serializer'
import { hasActiveStructureGenerationRun } from '../../../../server/utils/structure-generation-run'
import {
  buildManualStructureEditStatusMessage,
  resolveManualEditZoneProfileSnapshot,
  syncManualPlannedWorkoutStructureToIntervalsIfSynced
} from '../../../../server/utils/planned-workout-manual-structure-edit'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    plannedWorkout: {
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn()
  }
}))

vi.mock('../../../../server/utils/intervals-sync', () => ({
  syncPlannedWorkoutToIntervals: vi.fn()
}))

vi.mock('../../../../server/utils/canonical-workout-serializer', () => ({
  serializeCanonicalForIntervals: vi.fn()
}))

vi.mock('../../../../server/utils/structure-generation-run', () => ({
  hasActiveStructureGenerationRun: vi.fn()
}))

describe('planned-workout-manual-structure-edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(serializeCanonicalForIntervals).mockReturnValue('workout text')
    vi.mocked(syncPlannedWorkoutToIntervals).mockResolvedValue({ synced: true } as any)
    vi.mocked(prisma.plannedWorkout.update).mockResolvedValue({} as any)
    vi.mocked(hasActiveStructureGenerationRun).mockResolvedValue(false)
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

  describe('resolveManualEditZoneProfileSnapshot', () => {
    it('preserves existing snapshot by default', () => {
      const existing = { zoneProfileSnapshot: { thresholds: { ftp: 240 } } }
      const live = { ftp: 260 }

      const snapshot = resolveManualEditZoneProfileSnapshot({
        existingStructuredWorkout: existing,
        sportSettings: live
      })

      expect(snapshot).toEqual({ thresholds: { ftp: 240 } })
    })

    it('rebases to live settings when requested', () => {
      const snapshot = resolveManualEditZoneProfileSnapshot({
        existingStructuredWorkout: { zoneProfileSnapshot: { thresholds: { ftp: 240 } } },
        sportSettings: {
          ftp: 260,
          lthr: 170,
          maxHr: 190,
          thresholdPace: 2.4,
          powerZones: [{ min: 1, max: 2 }]
        },
        rebaseZones: true
      })

      expect(snapshot).toEqual(
        expect.objectContaining({
          power: expect.objectContaining({ unit: 'watts' })
        })
      )
      expect(snapshot).not.toEqual({ thresholds: { ftp: 240 } })
    })
  })

  describe('syncManualPlannedWorkoutStructureToIntervalsIfSynced', () => {
    const baseOptions = {
      userId: 'user-1',
      plannedWorkoutId: 'pw-1',
      updatedWorkout: {
        title: 'Tempo',
        description: 'Hard',
        type: 'Ride',
        structuredWorkout: { steps: [] }
      },
      canonical: { zoneProfileSnapshot: { thresholds: { ftp: 250 } }, steps: [] },
      sportSettings: { ftp: 250 },
      liveUserFtp: 250
    }

    it('skips sync for LOCAL_ONLY workouts', async () => {
      const result = await syncManualPlannedWorkoutStructureToIntervalsIfSynced({
        ...baseOptions,
        priorSyncStatus: 'LOCAL_ONLY'
      })

      expect(result).toEqual({ synced: false, sync_status: 'LOCAL_ONLY' })
      expect(syncPlannedWorkoutToIntervals).not.toHaveBeenCalled()
    })

    it('pushes update when workout is already SYNCED', async () => {
      const result = await syncManualPlannedWorkoutStructureToIntervalsIfSynced({
        ...baseOptions,
        priorSyncStatus: 'SYNCED'
      })

      expect(syncPlannedWorkoutToIntervals).toHaveBeenCalledWith(
        'UPDATE',
        expect.objectContaining({ workout_doc: 'workout text' }),
        'user-1'
      )
      expect(prisma.plannedWorkout.update).toHaveBeenCalled()
      expect(result).toEqual({ synced: true, sync_status: 'SYNCED' })
    })

    it('returns PENDING when intervals sync fails', async () => {
      vi.mocked(syncPlannedWorkoutToIntervals).mockResolvedValue({ synced: false } as any)

      const result = await syncManualPlannedWorkoutStructureToIntervalsIfSynced({
        ...baseOptions,
        priorSyncStatus: 'SYNCED'
      })

      expect(result).toEqual({ synced: false, sync_status: 'PENDING' })
      expect(prisma.plannedWorkout.update).not.toHaveBeenCalled()
    })
  })

  describe('buildManualStructureEditStatusMessage', () => {
    it('describes successful intervals sync', () => {
      expect(
        buildManualStructureEditStatusMessage({
          sync_status: 'SYNCED',
          intervals_synced: true
        })
      ).toContain('Intervals.icu')
    })
  })
})
