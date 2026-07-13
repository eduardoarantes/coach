import { prisma } from './db'
import { buildZonedDateTimeFromUtcDate } from './date'
import { pushRouvyWorkout } from './rouvy'
import { plannedWorkoutPublishRepository } from './repositories/plannedWorkoutPublishRepository'
import { serializeCanonicalDownload } from './canonical-workout-serializer'
import {
  appendPublishStalenessWarning,
  buildPublishWarnings,
  loadPlannedWorkoutPublishContext
} from './planned-workout-publish-guards'

function buildRouvyFilename(title: string) {
  const basename = title
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)

  return `${basename || 'workout'}.zwo`
}

export async function publishPlannedWorkoutToRouvy(workoutId: string, userId: string) {
  const precondition = await loadPlannedWorkoutPublishContext(userId, workoutId)
  if (!precondition.ok) {
    throw createError({
      statusCode:
        precondition.code === 'not_found' ? 404 : precondition.code === 'no_structure' ? 422 : 409,
      message: precondition.error,
      data: {
        code: precondition.code,
        settings_staleness: precondition.settings_staleness
      }
    })
  }

  const { workout, sportSettings, settingsStaleness } = precondition.context

  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'rouvy' }
  })

  if (!integration) {
    throw createError({ statusCode: 400, message: 'ROUVY integration not found' })
  }

  let zwoContent: string
  try {
    zwoContent = serializeCanonicalDownload({
      title: workout.title,
      description: workout.description || '',
      structure: workout.structuredWorkout,
      zoneProfileSnapshot: (workout.structuredWorkout as any)?.zoneProfileSnapshot,
      workout,
      liveSportSettings: sportSettings,
      liveUserFtp: workout.user?.ftp || 250,
      format: 'zwo'
    }) as string
  } catch (error: any) {
    throw createError({
      statusCode: 422,
      message: error?.message || 'Workout cannot be exported to ROUVY.',
      data: {
        code: 'export_blocked',
        diagnostics: error?.data?.issues || error?.data?.diagnostics,
        settings_staleness: settingsStaleness.stale ? settingsStaleness : undefined
      }
    })
  }

  const plannedAt = buildZonedDateTimeFromUtcDate(
    workout.date,
    workout.startTime,
    workout.user?.timezone || 'UTC'
  ).toISOString()

  try {
    const result = await pushRouvyWorkout(
      integration,
      plannedAt,
      zwoContent,
      buildRouvyFilename(workout.title)
    )
    const syncedAt = new Date()
    const externalId =
      result && typeof result === 'object' && result.workoutId != null
        ? String(result.workoutId)
        : null

    await plannedWorkoutPublishRepository.upsert(workout.id, 'rouvy', {
      externalId,
      status: 'SYNCED',
      error: null,
      lastSyncedAt: syncedAt
    })

    const warnings = buildPublishWarnings(settingsStaleness)

    return {
      success: true,
      message: appendPublishStalenessWarning('Workout published to ROUVY.', settingsStaleness),
      result,
      plannedAt,
      ...(warnings ? { warnings } : {})
    }
  } catch (error: any) {
    await plannedWorkoutPublishRepository.upsert(workout.id, 'rouvy', {
      status: 'FAILED',
      error: error.message || 'Failed to publish workout to ROUVY'
    })

    throw error
  }
}
