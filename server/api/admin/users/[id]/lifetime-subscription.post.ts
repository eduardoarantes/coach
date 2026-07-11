import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod/v3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { logAction } from '../../../../utils/audit'
import {
  grantLifetimeSubscription,
  isLifetimeSubscriber,
  revokeLifetimeSubscription
} from '../../../../utils/lifetime-subscription'

const bodySchema = z.object({
  action: z.enum(['grant', 'revoke']),
  tier: z.enum(['PRO', 'SUPPORTER']).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID required'
    })
  }

  const body = bodySchema.parse((await readBody(event)) || {})

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true
    }
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  if (body.action === 'grant') {
    if (isLifetimeSubscriber(existingUser)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already has lifetime access'
      })
    }

    const updatedUser = await grantLifetimeSubscription(userId, body.tier ?? 'PRO')

    await logAction({
      userId,
      action: 'admin.lifetime_subscription.grant',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        actorId: session.user.originalUserId || session.user.id,
        actorEmail: session.user.originalUserEmail || session.user.email,
        tier: updatedUser.subscriptionTier
      },
      event
    })

    return {
      success: true,
      user: updatedUser
    }
  }

  if (!isLifetimeSubscriber(existingUser)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'User does not have lifetime access'
    })
  }

  const updatedUser = await revokeLifetimeSubscription(userId)

  await logAction({
    userId,
    action: 'admin.lifetime_subscription.revoke',
    resourceType: 'user',
    resourceId: userId,
    metadata: {
      actorId: session.user.originalUserId || session.user.id,
      actorEmail: session.user.originalUserEmail || session.user.email,
      previousTier: existingUser.subscriptionTier
    },
    event
  })

  return {
    success: true,
    user: updatedUser
  }
})
