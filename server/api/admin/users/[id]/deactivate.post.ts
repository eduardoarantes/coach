import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { getServerSession } from '../../../../utils/session'
import { deactivateAccount } from '../../../../utils/services/accountDeactivationService'

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional()
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

  if (userId === session.user.originalUserId || userId === session.user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot deactivate your own account from the admin panel'
    })
  }

  const body = bodySchema.parse((await readBody(event)) || {})

  return await deactivateAccount({
    userId,
    actor: {
      id: session.user.originalUserId || session.user.id,
      email: session.user.originalUserEmail || session.user.email
    },
    reason: body.reason,
    event
  })
})
