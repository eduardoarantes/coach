import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Events'],
    summary: 'Get event details',
    description: 'Returns a single event by ID (session or Bearer with goal:read).',
    inputSchema: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' }
      }
    ]
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['goal:read'])

  const id = getRouterParam(event, 'id')

  try {
    const eventData = await prisma.event.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        goals: true
      }
    })

    if (!eventData) {
      throw createError({ statusCode: 404, message: 'Event not found' })
    }

    return eventData
  } catch (error: any) {
    console.error('Error fetching event:', error)
    if (error.statusCode === 404) throw error
    throw createError({ statusCode: 500, message: 'Failed to fetch event' })
  }
})
