import {
  adaptStructuredWorkout,
  type CanonicalStructuredWorkout,
  type StructureSource,
  type ZoneProfileSnapshot
} from '../../shared/structured-workout-contract'
import { WorkoutConverter } from './workout-converter'

function converterStep(step: any): any {
  if (!step || typeof step !== 'object') return step
  const result: any = { ...step }
  const pace = result.pace
  if (pace?.metric === 'pace' && pace?.rangeMps) {
    result.pace = {
      range: { start: pace.rangeMps.min, end: pace.rangeMps.max },
      units: 'm/s',
      ramp: pace.ramp === true
    }
  }
  if (Array.isArray(result.steps)) result.steps = result.steps.map(converterStep)
  return result
}

export function canonicalizeForProvider(
  structure: unknown,
  options: { source?: StructureSource; zoneProfileSnapshot?: ZoneProfileSnapshot } = {}
): CanonicalStructuredWorkout {
  const canonical = adaptStructuredWorkout(structure, options)
  if (!canonical) throw createError({ statusCode: 400, message: 'Invalid structured workout' })
  if ((canonical.diagnostics || []).length > 0) {
    throw createError({
      statusCode: 422,
      message: 'Workout has unresolved targets and cannot be exported.',
      data: { diagnostics: canonical.diagnostics }
    })
  }
  return canonical
}

export function serializeCanonicalForIntervals(options: {
  title: string
  description: string
  type?: string | null
  ftp?: number | null
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
}) {
  const canonical = canonicalizeForProvider(options.structure, {
    zoneProfileSnapshot: options.zoneProfileSnapshot
  })
  return WorkoutConverter.toIntervalsICU({
    title: options.title,
    description: options.description,
    type: options.type || undefined,
    ftp: options.ftp || 250,
    steps: canonical.steps.map(converterStep),
    exercises: canonical.exercises,
    messages: canonical.messages,
    generationSettingsSnapshot: {
      zones: {
        pace: canonical.zoneProfileSnapshot.pace?.ranges || [],
        heartRate: canonical.zoneProfileSnapshot.heartRate?.ranges || []
      }
    } as any
  })
}

export function serializeCanonicalDownload(options: {
  title: string
  description: string
  ftp?: number | null
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
  format: 'zwo' | 'fit' | 'mrc' | 'erg'
}) {
  const canonical = canonicalizeForProvider(options.structure, {
    zoneProfileSnapshot: options.zoneProfileSnapshot
  })
  const workout = {
    title: options.title,
    description: options.description,
    ftp: options.ftp || 250,
    steps: canonical.steps.map(converterStep),
    exercises: canonical.exercises,
    messages: canonical.messages
  }
  if (options.format === 'zwo') return WorkoutConverter.toZWO(workout)
  if (options.format === 'fit') return WorkoutConverter.toFIT(workout)
  if (options.format === 'mrc') return WorkoutConverter.toMRC(workout)
  return WorkoutConverter.toERG(workout)
}
