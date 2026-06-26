import { createError, getRouterParam } from 'h3'
import { getServerSession } from '../../../../utils/session'
import { reactivateAccount } from '../../../../utils/services/accountDeactivationService'

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

  return await reactivateAccount({
    userId,
    actor: {
      id: session.user.originalUserId || session.user.id,
      email: session.user.originalUserEmail || session.user.email
    },
    event
  })
})
