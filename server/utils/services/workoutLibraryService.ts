import {
  Prisma,
  WorkoutLibraryDefaultKind as WorkoutLibraryDefaultKindEnum,
  WorkoutLibraryVisibility as WorkoutLibraryVisibilityEnum
} from '@prisma/client'
import { plannedWorkoutRepository } from '../repositories/plannedWorkoutRepository'
import { workoutLibraryItemRepository } from '../repositories/workoutLibraryItemRepository'
import { workoutLibraryRepository } from '../repositories/workoutLibraryRepository'

export interface CreateWorkoutLibraryInput {
  name: string
  description?: string | null
  visibility?: WorkoutLibraryVisibilityEnum
  isDefault?: boolean
  defaultKind?: WorkoutLibraryDefaultKindEnum | null
}

export interface UpdateWorkoutLibraryInput {
  name?: string
  description?: string | null
  visibility?: WorkoutLibraryVisibilityEnum
  isDefault?: boolean
  defaultKind?: WorkoutLibraryDefaultKindEnum | null
}

export interface CreateWorkoutLibraryItemInput {
  libraryId: string
  title: string
  description?: string | null
  type?: string | null
  category?: string | null
  durationSec?: number | null
  distanceMeters?: number | null
  tss?: number | null
  workIntensity?: number | null
  targetArea?: string | null
  tags?: string[]
  structuredWorkout?: Prisma.InputJsonValue | null
  sourcePlannedWorkoutId?: string | null
}

export interface UpdateWorkoutLibraryItemInput {
  libraryId?: string
  title?: string
  description?: string | null
  type?: string | null
  category?: string | null
  durationSec?: number | null
  distanceMeters?: number | null
  tss?: number | null
  workIntensity?: number | null
  targetArea?: string | null
  tags?: string[]
  structuredWorkout?: Prisma.InputJsonValue | null
}

export interface ClonePlannedWorkoutToLibraryItemInput {
  libraryId: string
  plannedWorkoutId: string
  preventDuplicateSource?: boolean
  overrides?: Partial<Omit<CreateWorkoutLibraryItemInput, 'libraryId' | 'sourcePlannedWorkoutId'>>
}

export interface InstantiateWorkoutLibraryItemInput {
  itemId: string
  date: Date
  startTime?: string | null
  trainingWeekId?: string | null
  title?: string
  description?: string | null
  externalId?: string
  managedBy?: string
}

export const AI_WORKOUT_LIBRARY_NAME = 'AI Workouts'
export const AI_WORKOUT_LIBRARY_DESCRIPTION =
  'Automatically saved workouts created from AI training plans.'

function normalizeRequiredName(value: string, fieldName: string) {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${fieldName} is required`)
  }
  return normalized
}

function normalizeOptionalText(value?: string | null) {
  if (value == null) return null
  const normalized = value.trim()
  return normalized || null
}

function normalizeTags(tags?: string[]) {
  if (!tags?.length) return []
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

function cloneJsonValue(value: Prisma.JsonValue | null | undefined) {
  if (value == null) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function normalizeDateOnly(date: Date) {
  const rawDate = new Date(date)
  if (Number.isNaN(rawDate.getTime())) {
    throw new Error('Invalid date')
  }

  return new Date(Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate()))
}

function buildLibraryExternalId(userId: string, itemId: string) {
  return `library_${userId}_${itemId}_${Date.now()}`
}

export const workoutLibraryService = {
  async listLibraries(userId: string) {
    return workoutLibraryRepository.list(userId)
  },

  async getLibraryById(libraryId: string, userId: string) {
    return workoutLibraryRepository.getById(libraryId, userId, {
      include: {
        items: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  },

  async createLibrary(userId: string, input: CreateWorkoutLibraryInput) {
    return workoutLibraryRepository.create({
      userId,
      name: normalizeRequiredName(input.name, 'Library name'),
      description: normalizeOptionalText(input.description),
      visibility: input.visibility ?? WorkoutLibraryVisibilityEnum.PRIVATE,
      isDefault: input.defaultKind ? true : (input.isDefault ?? false),
      defaultKind: input.defaultKind ?? undefined
    })
  },

  async updateLibrary(libraryId: string, userId: string, input: UpdateWorkoutLibraryInput) {
    const data: Prisma.WorkoutLibraryUpdateInput = {}

    if (input.name !== undefined) {
      data.name = normalizeRequiredName(input.name, 'Library name')
    }
    if (input.description !== undefined) {
      data.description = normalizeOptionalText(input.description)
    }
    if (input.visibility !== undefined) {
      data.visibility = input.visibility
    }
    if (input.isDefault !== undefined) {
      data.isDefault = input.isDefault
    }
    if (input.defaultKind !== undefined) {
      data.defaultKind = input.defaultKind
    }

    return workoutLibraryRepository.update(libraryId, userId, data)
  },

  async deleteLibrary(libraryId: string, userId: string) {
    return workoutLibraryRepository.delete(libraryId, userId)
  },

  async listLibraryItems(libraryId: string, userId: string) {
    const library = await workoutLibraryRepository.getById(libraryId, userId, {
      select: { id: true }
    })

    if (!library) {
      throw new Error('Workout library not found')
    }

    return workoutLibraryItemRepository.listByLibrary(libraryId, userId)
  },

  async getLibraryItemById(itemId: string, userId: string) {
    return workoutLibraryItemRepository.getById(itemId, userId, {
      include: {
        library: true
      }
    })
  },

  async createLibraryItem(userId: string, input: CreateWorkoutLibraryItemInput) {
    const library = await workoutLibraryRepository.getById(input.libraryId, userId, {
      select: { id: true }
    })

    if (!library) {
      throw new Error('Workout library not found')
    }

    return workoutLibraryItemRepository.create({
      userId,
      libraryId: input.libraryId,
      title: normalizeRequiredName(input.title, 'Workout library item title'),
      description: normalizeOptionalText(input.description),
      type: normalizeOptionalText(input.type),
      category: normalizeOptionalText(input.category),
      durationSec: input.durationSec ?? undefined,
      distanceMeters: input.distanceMeters ?? undefined,
      tss: input.tss ?? undefined,
      workIntensity: input.workIntensity ?? undefined,
      targetArea: normalizeOptionalText(input.targetArea),
      tags: normalizeTags(input.tags),
      structuredWorkout: input.structuredWorkout ?? undefined,
      sourcePlannedWorkoutId: input.sourcePlannedWorkoutId ?? undefined
    })
  },

  async updateLibraryItem(itemId: string, userId: string, input: UpdateWorkoutLibraryItemInput) {
    const data: Prisma.WorkoutLibraryItemUpdateInput = {}

    if (input.libraryId !== undefined) {
      const targetLibrary = await workoutLibraryRepository.getById(input.libraryId, userId, {
        select: { id: true }
      })
      if (!targetLibrary) {
        throw new Error('Workout library not found')
      }
      data.library = {
        connect: {
          id: input.libraryId
        }
      }
    }
    if (input.title !== undefined) {
      data.title = normalizeRequiredName(input.title, 'Workout library item title')
    }
    if (input.description !== undefined) {
      data.description = normalizeOptionalText(input.description)
    }
    if (input.type !== undefined) {
      data.type = normalizeOptionalText(input.type)
    }
    if (input.category !== undefined) {
      data.category = normalizeOptionalText(input.category)
    }
    if (input.durationSec !== undefined) {
      data.durationSec = input.durationSec
    }
    if (input.distanceMeters !== undefined) {
      data.distanceMeters = input.distanceMeters
    }
    if (input.tss !== undefined) {
      data.tss = input.tss
    }
    if (input.workIntensity !== undefined) {
      data.workIntensity = input.workIntensity
    }
    if (input.targetArea !== undefined) {
      data.targetArea = normalizeOptionalText(input.targetArea)
    }
    if (input.tags !== undefined) {
      data.tags = normalizeTags(input.tags)
    }
    if (input.structuredWorkout !== undefined) {
      data.structuredWorkout = input.structuredWorkout
    }

    return workoutLibraryItemRepository.update(itemId, userId, data)
  },

  async deleteLibraryItem(itemId: string, userId: string) {
    return workoutLibraryItemRepository.delete(itemId, userId)
  },

  async clonePlannedWorkoutToLibraryItem(
    userId: string,
    input: ClonePlannedWorkoutToLibraryItemInput
  ) {
    const library = await workoutLibraryRepository.getById(input.libraryId, userId, {
      select: { id: true }
    })

    if (!library) {
      throw new Error('Workout library not found')
    }

    if (input.preventDuplicateSource) {
      const existingItem = await workoutLibraryItemRepository.findBySourcePlannedWorkout(
        input.libraryId,
        userId,
        input.plannedWorkoutId
      )

      if (existingItem) {
        return existingItem
      }
    }

    const plannedWorkout = await plannedWorkoutRepository.getById(input.plannedWorkoutId, userId)

    if (!plannedWorkout) {
      throw new Error('Planned workout not found')
    }

    return workoutLibraryItemRepository.create({
      userId,
      libraryId: input.libraryId,
      title: normalizeRequiredName(
        input.overrides?.title ?? plannedWorkout.title,
        'Workout library item title'
      ),
      description: normalizeOptionalText(
        input.overrides?.description ?? plannedWorkout.description
      ),
      type: normalizeOptionalText(input.overrides?.type ?? plannedWorkout.type),
      category: normalizeOptionalText(input.overrides?.category ?? plannedWorkout.category),
      durationSec: input.overrides?.durationSec ?? plannedWorkout.durationSec ?? undefined,
      distanceMeters: input.overrides?.distanceMeters ?? plannedWorkout.distanceMeters ?? undefined,
      tss: input.overrides?.tss ?? plannedWorkout.tss ?? undefined,
      workIntensity: input.overrides?.workIntensity ?? plannedWorkout.workIntensity ?? undefined,
      targetArea: normalizeOptionalText(input.overrides?.targetArea ?? plannedWorkout.targetArea),
      tags: normalizeTags(input.overrides?.tags),
      structuredWorkout:
        input.overrides?.structuredWorkout ?? cloneJsonValue(plannedWorkout.structuredWorkout),
      sourcePlannedWorkoutId: plannedWorkout.id
    })
  },

  async instantiateLibraryItem(userId: string, input: InstantiateWorkoutLibraryItemInput) {
    const item = await workoutLibraryItemRepository.getById(input.itemId, userId)

    if (!item) {
      throw new Error('Workout library item not found')
    }

    const normalizedDate = normalizeDateOnly(input.date)

    return plannedWorkoutRepository.create({
      userId,
      externalId: input.externalId || buildLibraryExternalId(userId, item.id),
      date: normalizedDate,
      startTime: normalizeOptionalText(input.startTime) ?? undefined,
      title: normalizeRequiredName(input.title ?? item.title, 'Planned workout title'),
      description: normalizeOptionalText(input.description ?? item.description) ?? '',
      type: normalizeOptionalText(item.type) || 'Ride',
      category: normalizeOptionalText(item.category) ?? undefined,
      durationSec: item.durationSec ?? undefined,
      distanceMeters: item.distanceMeters ?? undefined,
      tss: item.tss ?? undefined,
      workIntensity: item.workIntensity ?? undefined,
      targetArea: normalizeOptionalText(item.targetArea) ?? undefined,
      trainingWeekId: input.trainingWeekId ?? undefined,
      syncStatus: 'LOCAL_ONLY',
      completed: false,
      managedBy: input.managedBy ?? 'USER',
      rawJson: {
        source: 'workout_library',
        workoutLibraryId: item.libraryId,
        workoutLibraryItemId: item.id,
        sourcePlannedWorkoutId: item.sourcePlannedWorkoutId
      },
      structuredWorkout: cloneJsonValue(item.structuredWorkout)
    })
  },

  async ensureAiDefaultLibrary(userId: string) {
    const existingLibrary = await workoutLibraryRepository.getByDefaultKind(
      userId,
      WorkoutLibraryDefaultKindEnum.AI_GENERATED
    )

    if (existingLibrary) {
      return existingLibrary
    }

    try {
      return await this.createLibrary(userId, {
        name: AI_WORKOUT_LIBRARY_NAME,
        description: AI_WORKOUT_LIBRARY_DESCRIPTION,
        visibility: WorkoutLibraryVisibilityEnum.PRIVATE,
        isDefault: true,
        defaultKind: WorkoutLibraryDefaultKindEnum.AI_GENERATED
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const createdByRace = await workoutLibraryRepository.getByDefaultKind(
          userId,
          WorkoutLibraryDefaultKindEnum.AI_GENERATED
        )
        if (createdByRace) {
          return createdByRace
        }
      }

      throw error
    }
  }
}
