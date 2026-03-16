import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../../server/utils/db'
import { workoutLibraryItemRepository } from '../../../../../server/utils/repositories/workoutLibraryItemRepository'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    workoutLibraryItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

describe('workoutLibraryItemRepository', () => {
  const userId = 'user-123'
  const libraryId = 'library-1'
  const itemId = 'item-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets an item by id with user scoping', async () => {
    vi.mocked(prisma.workoutLibraryItem.findFirst).mockResolvedValue({ id: itemId } as any)

    await workoutLibraryItemRepository.getById(itemId, userId)

    expect(prisma.workoutLibraryItem.findFirst).toHaveBeenCalledWith({
      where: { id: itemId, userId },
      include: undefined
    })
  })

  it('finds an item by source planned workout', async () => {
    await workoutLibraryItemRepository.findBySourcePlannedWorkout(libraryId, userId, 'planned-1')

    expect(prisma.workoutLibraryItem.findFirst).toHaveBeenCalledWith({
      where: {
        libraryId,
        userId,
        sourcePlannedWorkoutId: 'planned-1'
      },
      include: undefined
    })
  })

  it('creates an item', async () => {
    const data = {
      userId,
      libraryId,
      title: 'Tempo Builder'
    }
    vi.mocked(prisma.workoutLibraryItem.create).mockResolvedValue({ id: itemId } as any)

    await workoutLibraryItemRepository.create(data as any)

    expect(prisma.workoutLibraryItem.create).toHaveBeenCalledWith({
      data,
      include: undefined
    })
  })

  it('updates an item with user scoping', async () => {
    const data = { title: 'Updated Tempo Builder' }
    vi.mocked(prisma.workoutLibraryItem.update).mockResolvedValue({ id: itemId } as any)

    await workoutLibraryItemRepository.update(itemId, userId, data)

    expect(prisma.workoutLibraryItem.update).toHaveBeenCalledWith({
      where: { id: itemId, userId },
      data,
      include: undefined
    })
  })

  it('lists items newest first within a library by default', async () => {
    vi.mocked(prisma.workoutLibraryItem.findMany).mockResolvedValue([] as any)

    await workoutLibraryItemRepository.listByLibrary(libraryId, userId)

    expect(prisma.workoutLibraryItem.findMany).toHaveBeenCalledWith({
      where: { libraryId, userId },
      include: undefined,
      orderBy: { createdAt: 'desc' }
    })
  })
})
