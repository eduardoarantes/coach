import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_WORKOUT_LIBRARY_DESCRIPTION,
  AI_WORKOUT_LIBRARY_NAME,
  workoutLibraryService
} from '../../../../../server/utils/services/workoutLibraryService'
import { plannedWorkoutRepository } from '../../../../../server/utils/repositories/plannedWorkoutRepository'
import { workoutLibraryItemRepository } from '../../../../../server/utils/repositories/workoutLibraryItemRepository'
import { workoutLibraryRepository } from '../../../../../server/utils/repositories/workoutLibraryRepository'

vi.mock('../../../../../server/utils/repositories/workoutLibraryRepository', () => ({
  workoutLibraryRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    getByDefaultKind: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/workoutLibraryItemRepository', () => ({
  workoutLibraryItemRepository: {
    listByLibrary: vi.fn(),
    getById: vi.fn(),
    findBySourcePlannedWorkout: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/repositories/plannedWorkoutRepository', () => ({
  plannedWorkoutRepository: {
    getById: vi.fn(),
    create: vi.fn()
  }
}))

describe('workoutLibraryService', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates libraries with normalized defaults', async () => {
    vi.mocked(workoutLibraryRepository.create).mockResolvedValue({ id: 'library-1' } as any)

    await workoutLibraryService.createLibrary(userId, {
      name: '  Base Library  '
    })

    expect(workoutLibraryRepository.create).toHaveBeenCalledWith({
      userId,
      name: 'Base Library',
      description: null,
      visibility: 'PRIVATE',
      isDefault: false,
      defaultKind: undefined
    })
  })

  it('rejects creating items for missing libraries', async () => {
    vi.mocked(workoutLibraryRepository.getById).mockResolvedValue(null)

    await expect(
      workoutLibraryService.createLibraryItem(userId, {
        libraryId: 'missing-library',
        title: 'Threshold Builder'
      })
    ).rejects.toThrow('Workout library not found')
  })

  it('returns the existing source item when duplicate prevention is enabled', async () => {
    vi.mocked(workoutLibraryRepository.getById).mockResolvedValue({ id: 'library-1' } as any)
    vi.mocked(workoutLibraryItemRepository.findBySourcePlannedWorkout).mockResolvedValue({
      id: 'item-existing'
    } as any)

    const result = await workoutLibraryService.clonePlannedWorkoutToLibraryItem(userId, {
      libraryId: 'library-1',
      plannedWorkoutId: 'planned-1',
      preventDuplicateSource: true
    })

    expect(workoutLibraryItemRepository.findBySourcePlannedWorkout).toHaveBeenCalledWith(
      'library-1',
      userId,
      'planned-1'
    )
    expect(plannedWorkoutRepository.getById).not.toHaveBeenCalled()
    expect(result).toEqual({ id: 'item-existing' })
  })

  it('clones a planned workout into a library snapshot', async () => {
    vi.mocked(workoutLibraryRepository.getById).mockResolvedValue({ id: 'library-1' } as any)
    vi.mocked(workoutLibraryItemRepository.findBySourcePlannedWorkout).mockResolvedValue(null)
    vi.mocked(plannedWorkoutRepository.getById).mockResolvedValue({
      id: 'planned-1',
      title: 'Tempo Builder',
      description: 'Steady pressure',
      type: 'Ride',
      category: 'WORKOUT',
      durationSec: 3600,
      distanceMeters: 25000,
      tss: 70,
      workIntensity: 0.78,
      targetArea: 'Tempo',
      structuredWorkout: {
        steps: [{ name: 'Warmup' }]
      }
    } as any)
    vi.mocked(workoutLibraryItemRepository.create).mockResolvedValue({ id: 'item-1' } as any)

    await workoutLibraryService.clonePlannedWorkoutToLibraryItem(userId, {
      libraryId: 'library-1',
      plannedWorkoutId: 'planned-1'
    })

    expect(workoutLibraryItemRepository.create).toHaveBeenCalledWith({
      userId,
      libraryId: 'library-1',
      title: 'Tempo Builder',
      description: 'Steady pressure',
      type: 'Ride',
      category: 'WORKOUT',
      durationSec: 3600,
      distanceMeters: 25000,
      tss: 70,
      workIntensity: 0.78,
      targetArea: 'Tempo',
      tags: [],
      structuredWorkout: {
        steps: [{ name: 'Warmup' }]
      },
      sourcePlannedWorkoutId: 'planned-1'
    })
  })

  it('instantiates a library item into a local planned workout', async () => {
    vi.mocked(workoutLibraryItemRepository.getById).mockResolvedValue({
      id: 'item-1',
      libraryId: 'library-1',
      sourcePlannedWorkoutId: 'planned-1',
      title: 'VO2 Session',
      description: 'Sharp work',
      type: 'Ride',
      category: 'WORKOUT',
      durationSec: 5400,
      distanceMeters: null,
      tss: 88,
      workIntensity: 0.91,
      targetArea: 'VO2',
      structuredWorkout: {
        steps: [{ name: 'Main Set' }]
      }
    } as any)
    vi.mocked(plannedWorkoutRepository.create).mockResolvedValue({ id: 'planned-new' } as any)

    await workoutLibraryService.instantiateLibraryItem(userId, {
      itemId: 'item-1',
      date: new Date('2026-03-17T17:45:00.000Z'),
      startTime: '06:00'
    })

    expect(plannedWorkoutRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        date: new Date('2026-03-17T00:00:00.000Z'),
        startTime: '06:00',
        title: 'VO2 Session',
        description: 'Sharp work',
        type: 'Ride',
        category: 'WORKOUT',
        durationSec: 5400,
        tss: 88,
        workIntensity: 0.91,
        targetArea: 'VO2',
        syncStatus: 'LOCAL_ONLY',
        completed: false,
        managedBy: 'USER',
        rawJson: {
          source: 'workout_library',
          workoutLibraryId: 'library-1',
          workoutLibraryItemId: 'item-1',
          sourcePlannedWorkoutId: 'planned-1'
        },
        structuredWorkout: {
          steps: [{ name: 'Main Set' }]
        }
      })
    )
  })

  it('creates the default AI library only when missing', async () => {
    vi.mocked(workoutLibraryRepository.getByDefaultKind).mockResolvedValue(null)
    vi.mocked(workoutLibraryRepository.create).mockResolvedValue({ id: 'library-ai' } as any)

    await workoutLibraryService.ensureAiDefaultLibrary(userId)

    expect(workoutLibraryRepository.create).toHaveBeenCalledWith({
      userId,
      name: AI_WORKOUT_LIBRARY_NAME,
      description: AI_WORKOUT_LIBRARY_DESCRIPTION,
      visibility: 'PRIVATE',
      isDefault: true,
      defaultKind: 'AI_GENERATED'
    })
  })
})
