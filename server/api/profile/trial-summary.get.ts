import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { DEFAULT_TRIAL_DAYS } from '../../../shared/trial-config'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, subscriptionTier: true, createdAt: true }
  })

  if (!user?.trialEndsAt) {
    return { hasTrialHistory: false, usage: [] }
  }

  const trialEnd = new Date(user.trialEndsAt)
  const trialStart = new Date(trialEnd)
  trialStart.setDate(trialStart.getDate() - DEFAULT_TRIAL_DAYS)

  const usageRows = await prisma.llmUsage.groupBy({
    by: ['operation'],
    where: {
      userId,
      success: true,
      counted: true,
      createdAt: {
        gte: trialStart,
        lte: trialEnd
      }
    },
    _count: { _all: true },
    orderBy: { _count: { operation: 'desc' } },
    take: 6
  })

  return {
    hasTrialHistory: true,
    trialEndsAt: user.trialEndsAt,
    trialStart,
    usage: usageRows.map((row) => ({
      operation: row.operation.replace(/_/g, ' '),
      count: row._count._all
    }))
  }
})
