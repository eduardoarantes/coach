import {
  getPublishedPublicEventBySlug,
  getUserEnrollmentForPublicEvent,
  toPublicEventPublicView
} from '../../utils/public-events'
import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Event slug is required' })
  }

  const publicEvent = await getPublishedPublicEventBySlug(slug)
  if (!publicEvent) {
    throw createError({ statusCode: 404, message: 'Public event not found' })
  }

  const session = await getServerSession(event)
  let enrollment = {
    authenticated: false,
    enrolled: false,
    goalId: null as string | null,
    eventId: null as string | null
  }

  if (session?.user?.id) {
    const state = await getUserEnrollmentForPublicEvent(session.user.id, publicEvent.id)
    enrollment = {
      authenticated: true,
      enrolled: state.enrolled,
      goalId: state.goalId,
      eventId: state.eventId
    }
  }

  return {
    event: toPublicEventPublicView(publicEvent),
    enrollment
  }
})
