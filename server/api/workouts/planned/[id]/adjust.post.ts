import { z } from 'zod/v3'
import { getServerSession } from '../../../../utils/session'
import { publishTaskRunStartedEvent } from '../../../../utils/task-run-events'
import { enqueuePlannedWorkoutStructureAdjustment } from '../../../../utils/planned-workout-structure-trigger'
import { prisma } from '../../../../utils/db'

const adjustSchema = z.object({
  durationMinutes: z.number().optional(),
  intensity: z.string().optional(),
  feedback: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const workoutId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const adjustments = adjustSchema.parse(body)

  const workout = await prisma.plannedWorkout.findFirst({
    where: {
      id: workoutId,
      userId: (session.user as any).id
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  const userId = (session.user as any).id
  const queued = await enqueuePlannedWorkoutStructureAdjustment({
    userId,
    plannedWorkoutId: workout.id,
    adjustments,
    source: 'api'
  })
  if (queued.status !== 'queued') {
    throw createError({ statusCode: 500, message: queued.error })
  }

  return { success: true, jobId: queued.runId, generationRunId: queued.generationRunId }
})
