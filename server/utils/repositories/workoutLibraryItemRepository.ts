import type { Prisma } from '@prisma/client'
import { prisma } from '../db'

export const workoutLibraryItemRepository = {
  async getById<T extends Prisma.WorkoutLibraryItemInclude>(
    id: string,
    userId: string,
    options: {
      include?: T
      select?: Prisma.WorkoutLibraryItemSelect
    } = {}
  ) {
    if (options.select) {
      return prisma.workoutLibraryItem.findFirst({
        where: { id, userId },
        select: options.select
      })
    }

    return prisma.workoutLibraryItem.findFirst({
      where: { id, userId },
      include: options.include
    }) as unknown as Promise<Prisma.WorkoutLibraryItemGetPayload<{ include: T }> | null>
  },

  async findBySourcePlannedWorkout<T extends Prisma.WorkoutLibraryItemInclude>(
    libraryId: string,
    userId: string,
    sourcePlannedWorkoutId: string,
    options: {
      include?: T
      select?: Prisma.WorkoutLibraryItemSelect
    } = {}
  ) {
    if (options.select) {
      return prisma.workoutLibraryItem.findFirst({
        where: { libraryId, userId, sourcePlannedWorkoutId },
        select: options.select
      })
    }

    return prisma.workoutLibraryItem.findFirst({
      where: { libraryId, userId, sourcePlannedWorkoutId },
      include: options.include
    }) as unknown as Promise<Prisma.WorkoutLibraryItemGetPayload<{ include: T }> | null>
  },

  async create<T extends Prisma.WorkoutLibraryItemInclude>(
    data: Prisma.WorkoutLibraryItemUncheckedCreateInput,
    options: {
      include?: T
      tx?: Prisma.TransactionClient
    } = {}
  ) {
    const { include, tx = prisma } = options

    return tx.workoutLibraryItem.create({
      data,
      include
    }) as unknown as Promise<Prisma.WorkoutLibraryItemGetPayload<{ include: T }>>
  },

  async update<T extends Prisma.WorkoutLibraryItemInclude>(
    id: string,
    userId: string,
    data: Prisma.WorkoutLibraryItemUpdateInput,
    options: {
      include?: T
      tx?: Prisma.TransactionClient
    } = {}
  ) {
    const { include, tx = prisma } = options

    return tx.workoutLibraryItem.update({
      where: { id, userId },
      data,
      include
    }) as unknown as Promise<Prisma.WorkoutLibraryItemGetPayload<{ include: T }>>
  },

  async delete(id: string, userId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.workoutLibraryItem.delete({
      where: { id, userId }
    })
  },

  async listByLibrary<T extends Prisma.WorkoutLibraryItemInclude>(
    libraryId: string,
    userId: string,
    options: {
      include?: T
      where?: Prisma.WorkoutLibraryItemWhereInput
      orderBy?:
        | Prisma.WorkoutLibraryItemOrderByWithRelationInput
        | Prisma.WorkoutLibraryItemOrderByWithRelationInput[]
    } = {}
  ) {
    return prisma.workoutLibraryItem.findMany({
      where: {
        libraryId,
        userId,
        ...options.where
      },
      include: options.include,
      orderBy: options.orderBy || { createdAt: 'desc' }
    }) as unknown as Promise<Array<Prisma.WorkoutLibraryItemGetPayload<{ include: T }>>>
  }
}
