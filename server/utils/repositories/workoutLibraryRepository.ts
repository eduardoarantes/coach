import type { Prisma, WorkoutLibraryDefaultKind } from '@prisma/client'
import { prisma } from '../db'

export const workoutLibraryRepository = {
  async getById<T extends Prisma.WorkoutLibraryInclude>(
    id: string,
    userId: string,
    options: {
      include?: T
      select?: Prisma.WorkoutLibrarySelect
    } = {}
  ) {
    if (options.select) {
      return prisma.workoutLibrary.findFirst({
        where: { id, userId },
        select: options.select
      })
    }

    return prisma.workoutLibrary.findFirst({
      where: { id, userId },
      include: options.include
    }) as unknown as Promise<Prisma.WorkoutLibraryGetPayload<{ include: T }> | null>
  },

  async getByDefaultKind<T extends Prisma.WorkoutLibraryInclude>(
    userId: string,
    defaultKind: WorkoutLibraryDefaultKind,
    options: {
      include?: T
      select?: Prisma.WorkoutLibrarySelect
    } = {}
  ) {
    if (options.select) {
      return prisma.workoutLibrary.findFirst({
        where: { userId, defaultKind },
        select: options.select
      })
    }

    return prisma.workoutLibrary.findFirst({
      where: { userId, defaultKind },
      include: options.include
    }) as unknown as Promise<Prisma.WorkoutLibraryGetPayload<{ include: T }> | null>
  },

  async create<T extends Prisma.WorkoutLibraryInclude>(
    data: Prisma.WorkoutLibraryUncheckedCreateInput,
    options: {
      include?: T
      tx?: Prisma.TransactionClient
    } = {}
  ) {
    const { include, tx = prisma } = options

    return tx.workoutLibrary.create({
      data,
      include
    }) as unknown as Promise<Prisma.WorkoutLibraryGetPayload<{ include: T }>>
  },

  async update<T extends Prisma.WorkoutLibraryInclude>(
    id: string,
    userId: string,
    data: Prisma.WorkoutLibraryUpdateInput,
    options: {
      include?: T
      tx?: Prisma.TransactionClient
    } = {}
  ) {
    const { include, tx = prisma } = options

    return tx.workoutLibrary.update({
      where: { id, userId },
      data,
      include
    }) as unknown as Promise<Prisma.WorkoutLibraryGetPayload<{ include: T }>>
  },

  async delete(id: string, userId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.workoutLibrary.delete({
      where: { id, userId }
    })
  },

  async list<T extends Prisma.WorkoutLibraryInclude>(
    userId: string,
    options: {
      include?: T
      where?: Prisma.WorkoutLibraryWhereInput
      orderBy?:
        | Prisma.WorkoutLibraryOrderByWithRelationInput
        | Prisma.WorkoutLibraryOrderByWithRelationInput[]
    } = {}
  ) {
    return prisma.workoutLibrary.findMany({
      where: {
        userId,
        ...options.where
      },
      include: options.include,
      orderBy: options.orderBy || { createdAt: 'desc' }
    }) as unknown as Promise<Array<Prisma.WorkoutLibraryGetPayload<{ include: T }>>>
  }
}
