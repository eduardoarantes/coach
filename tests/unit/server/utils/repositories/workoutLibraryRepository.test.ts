import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../../server/utils/db'
import { workoutLibraryRepository } from '../../../../../server/utils/repositories/workoutLibraryRepository'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    workoutLibrary: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

describe('workoutLibraryRepository', () => {
  const userId = 'user-123'
  const libraryId = 'library-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets a library by id with user scoping', async () => {
    vi.mocked(prisma.workoutLibrary.findFirst).mockResolvedValue({ id: libraryId } as any)

    await workoutLibraryRepository.getById(libraryId, userId)

    expect(prisma.workoutLibrary.findFirst).toHaveBeenCalledWith({
      where: { id: libraryId, userId },
      include: undefined
    })
  })

  it('gets a library by default kind with user scoping', async () => {
    await workoutLibraryRepository.getByDefaultKind(userId, 'AI_GENERATED' as any)

    expect(prisma.workoutLibrary.findFirst).toHaveBeenCalledWith({
      where: { userId, defaultKind: 'AI_GENERATED' },
      include: undefined
    })
  })

  it('creates a library', async () => {
    const data = {
      userId,
      name: 'Base',
      visibility: 'PRIVATE'
    }
    vi.mocked(prisma.workoutLibrary.create).mockResolvedValue({ id: libraryId } as any)

    await workoutLibraryRepository.create(data as any)

    expect(prisma.workoutLibrary.create).toHaveBeenCalledWith({
      data,
      include: undefined
    })
  })

  it('updates a library with user scoping', async () => {
    const data = { name: 'Race Prep' }
    vi.mocked(prisma.workoutLibrary.update).mockResolvedValue({ id: libraryId } as any)

    await workoutLibraryRepository.update(libraryId, userId, data)

    expect(prisma.workoutLibrary.update).toHaveBeenCalledWith({
      where: { id: libraryId, userId },
      data,
      include: undefined
    })
  })

  it('lists libraries newest first by default', async () => {
    vi.mocked(prisma.workoutLibrary.findMany).mockResolvedValue([] as any)

    await workoutLibraryRepository.list(userId)

    expect(prisma.workoutLibrary.findMany).toHaveBeenCalledWith({
      where: { userId },
      include: undefined,
      orderBy: { createdAt: 'desc' }
    })
  })
})
