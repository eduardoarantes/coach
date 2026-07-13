import { z } from 'zod/v3'
import { getServerSession } from '../../../../utils/session'
import { enqueuePlannedWorkoutStructureAdjustment } from '../../../../utils/planned-workout-structure-trigger'
import { prisma } from '../../../../utils/db'
import { checkQuota } from '../../../../utils/quotas/engine'

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
    },
    include: {
      user: {
        select: {
          subscriptionTier: true,
          timezone: true
        }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  const userId = (session.user as any).id

  try {
    await checkQuota(userId, 'generate_structured_workout')
  } catch (error: any) {
    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: error.message || 'Quota exceeded for structured workout generation.'
      })
    }
    throw error
  }

  if (workout.user.subscriptionTier === 'FREE') {
    const { getUserLocalDate } = await import('../../../../utils/date')
    const timezone = workout.user.timezone || 'UTC'
    const today = getUserLocalDate(timezone)
    const fourWeeksFromNow = new Date(today)
    fourWeeksFromNow.setUTCDate(today.getUTCDate() + 28)

    if (workout.date > fourWeeksFromNow) {
      throw createError({
        statusCode: 403,
        message:
          'Structured workout adjustment is limited to 4 weeks in advance for free users. Please upgrade to Pro to plan further ahead.'
      })
    }
  }

  const queued = await enqueuePlannedWorkoutStructureAdjustment({
    userId,
    plannedWorkoutId: workout.id,
    adjustments,
    source: 'api',
    quotaCheckedAtEnqueue: true
  })
  if (queued.status !== 'queued') {
    throw createError({ statusCode: 500, message: queued.error })
  }

  return { success: true, jobId: queued.runId, generationRunId: queued.generationRunId }
})
