import { prisma } from '../../../../utils/db'
import { getServerSession } from '../../../../utils/session'
import { serializeCanonicalForIntervals } from '../../../../utils/canonical-workout-serializer'
import {
  getLibraryAccessContext,
  getReadableLibraryOwnerIds,
  parseLibraryScope
} from '../../../../utils/library-access'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const context = getLibraryAccessContext(session.user as any)
  const scope = parseLibraryScope(getQuery(event).scope, context.isCoaching ? 'all' : 'athlete')

  const template = await (prisma as any).workoutTemplate.findFirst({
    where: { id, userId: { in: getReadableLibraryOwnerIds(context, scope) } }
  })

  if (!template) {
    throw createError({ statusCode: 404, message: 'Workout template not found' })
  }

  if (!template.structuredWorkout) {
    return { intervalsDescription: '', hasStructure: false }
  }

  const user = await prisma.user.findUnique({
    where: { id: context.effectiveUserId },
    select: { ftp: true }
  })

  const intervalsDescription = serializeCanonicalForIntervals({
    title: template.title,
    description: template.description || '',
    type: template.type || '',
    ftp: user?.ftp || 250,
    structure: template.structuredWorkout,
    zoneProfileSnapshot: (template.structuredWorkout as any)?.zoneProfileSnapshot
  })
  return { intervalsDescription, hasStructure: true }
})
