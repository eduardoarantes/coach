import type { Integration } from '@prisma/client'
import { refreshGarminToken } from './garmin'

/**
 * Ensures a valid token, refreshing if necessary
 */
async function ensureValidToken(integration: Integration): Promise<Integration> {
  if (!integration.expiresAt || new Date() >= new Date(integration.expiresAt.getTime() - 300000)) {
    return await refreshGarminToken(integration)
  }
  return integration
}

export type GarminTargetThresholds = {
  ftp?: number
  lthr?: number
  maxHr?: number
}

function getGarminHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  }
}

function mapStepIntensity(stepType: string): string {
  const type = stepType?.toLowerCase?.() || ''
  if (type.includes('warm')) return 'WARMUP'
  if (type.includes('cool')) return 'COOLDOWN'
  if (type.includes('rest') || type.includes('recover')) return 'REST'
  return 'ACTIVE'
}

function getDurationType(step: any): string {
  if (step?.distance) return 'DISTANCE'
  if (step?.durationSec || step?.durationSeconds || step?.duration) return 'TIME'
  return 'OPEN'
}

function getDurationValue(step: any): number {
  if (step?.distance) return Number(step.distance) || 0
  return Number(step?.durationSec || step?.durationSeconds || step?.duration) || 0
}

function normalizeRelativeFraction(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value > 3) return value / 100
  return value
}

function isRelativePowerUnits(units: unknown): boolean {
  const normalized = String(units || '')
    .trim()
    .toLowerCase()
  return (
    normalized.includes('%') || normalized === '' || normalized === 'ftp' || normalized === '%ftp'
  )
}

function isRelativeHeartRateUnits(units: unknown): boolean {
  const normalized = String(units || '')
    .trim()
    .toLowerCase()
  return (
    normalized.includes('%') ||
    normalized === '' ||
    normalized === 'lthr' ||
    normalized === '%lthr' ||
    normalized === 'max_hr' ||
    normalized === 'maxhr'
  )
}

function toAbsolutePower(
  value: number,
  units: unknown,
  thresholds: GarminTargetThresholds
): number {
  if (!isRelativePowerUnits(units)) return Math.round(value)
  const ftp = Number(thresholds.ftp) || 250
  return Math.round(normalizeRelativeFraction(value) * ftp)
}

function toAbsoluteHeartRate(
  value: number,
  units: unknown,
  thresholds: GarminTargetThresholds
): number {
  if (!isRelativeHeartRateUnits(units)) return Math.round(value)
  const normalized = String(units || '')
    .trim()
    .toLowerCase()
  const basis =
    normalized.includes('max') && thresholds.maxHr
      ? Number(thresholds.maxHr)
      : Number(thresholds.lthr) || 160
  return Math.round(normalizeRelativeFraction(value) * basis)
}

function getTarget(
  step: any,
  thresholds: GarminTargetThresholds = {}
): {
  targetType: string
  targetValue?: number
  targetValueLow?: number
  targetValueHigh?: number
} {
  const power = step?.power
  const hr = step?.heartRate
  const pace = step?.pace
  const cadence = step?.cadence

  if (power?.range) {
    return {
      targetType: 'POWER',
      targetValueLow: toAbsolutePower(Number(power.range.start) || 0, power.units, thresholds),
      targetValueHigh: toAbsolutePower(Number(power.range.end) || 0, power.units, thresholds)
    }
  }
  if (typeof power?.value === 'number') {
    return {
      targetType: 'POWER',
      targetValue: toAbsolutePower(power.value, power.units, thresholds)
    }
  }

  if (hr?.range) {
    return {
      targetType: 'HEART_RATE',
      targetValueLow: toAbsoluteHeartRate(Number(hr.range.start) || 0, hr.units, thresholds),
      targetValueHigh: toAbsoluteHeartRate(Number(hr.range.end) || 0, hr.units, thresholds)
    }
  }
  if (typeof hr?.value === 'number') {
    return {
      targetType: 'HEART_RATE',
      targetValue: toAbsoluteHeartRate(hr.value, hr.units, thresholds)
    }
  }

  if (pace?.range) {
    return {
      targetType: 'PACE',
      targetValueLow: Number(pace.range.start) || 0,
      targetValueHigh: Number(pace.range.end) || 0
    }
  }
  if (typeof pace?.value === 'number') {
    return { targetType: 'PACE', targetValue: pace.value }
  }

  if (typeof cadence === 'number') {
    return { targetType: 'CADENCE', targetValue: cadence }
  }

  return { targetType: 'OPEN' }
}

function explodeSteps(steps: any[]): any[] {
  const out: any[] = []

  const visit = (step: any) => {
    if (!step) return
    const repsRaw = Number(step.reps ?? step.repeat ?? step.intervals ?? 1)
    const reps = Number.isFinite(repsRaw) && repsRaw > 0 ? Math.floor(repsRaw) : 1

    if (Array.isArray(step.steps) && step.steps.length > 0) {
      for (let i = 0; i < reps; i++) {
        for (const nested of step.steps) visit(nested)
      }
      return
    }

    for (let i = 0; i < reps; i++) out.push(step)
  }

  for (const step of steps || []) visit(step)
  return out
}

export function buildGarminTrainingPayload(workout: any, thresholds: GarminTargetThresholds = {}) {
  const steps = explodeSteps(workout?.steps || [])

  return {
    workoutName: workout.title,
    description: workout.description || '',
    sport: mapSportToGarmin(workout.type),
    estimatedDurationInSecs: Number(workout.durationSec) || undefined,
    estimatedDistanceInMeters: Number(workout.distanceMeters) || undefined,
    workoutProvider: 'COACH_WATTZ',
    steps: steps.map((step: any, index: number) => {
      const durationType = getDurationType(step)
      const durationValue = getDurationValue(step)
      const target = getTarget(step, thresholds)
      return {
        stepOrder: index + 1,
        type: 'WorkoutStep',
        intensity: mapStepIntensity(step.type || ''),
        description: step.name || undefined,
        durationType,
        durationValue: durationValue > 0 ? durationValue : undefined,
        ...target
      }
    })
  }
}

export async function createGarminWorkout(integration: Integration, payload: any) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch('https://apis.garmin.com/training-api/workout', {
    method: 'POST',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin create workout failed (${response.status}): ${error}`)
  }

  return response.json()
}

export async function updateGarminWorkout(
  integration: Integration,
  workoutId: string,
  payload: any
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch(`https://apis.garmin.com/training-api/workout/${workoutId}`, {
    method: 'PUT',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin update workout failed (${response.status}): ${error}`)
  }

  return { success: true }
}

export async function createGarminWorkoutSchedule(
  integration: Integration,
  payload: { workoutId: number | string; date: string }
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch('https://apis.garmin.com/training-api/schedule', {
    method: 'POST',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin create schedule failed (${response.status}): ${error}`)
  }

  return response.json()
}

export function extractGarminScheduleId(response: unknown): string {
  if (response == null) return ''
  if (typeof response === 'string' || typeof response === 'number') return String(response)
  if (typeof response === 'object') {
    const value = response as Record<string, unknown>
    const id = value.scheduleId ?? value.id ?? value.schedule_id
    if (id != null) return String(id)
  }
  return ''
}

export async function updateGarminWorkoutSchedule(
  integration: Integration,
  scheduleId: string,
  payload: { workoutId: number | string; date: string }
) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch(`https://apis.garmin.com/training-api/schedule/${scheduleId}`, {
    method: 'PUT',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin update schedule failed (${response.status}): ${error}`)
  }

  return { success: true }
}

export function buildGarminCoursePayload(workout: any) {
  const points = Array.isArray(workout?.geoPoints) ? workout.geoPoints : []
  if (points.length < 2) {
    throw new Error('Course publish requires at least 2 geoPoints (lat/lng)')
  }

  return {
    courseName: workout.title,
    description: workout.description || '',
    distance: Number(workout.distanceMeters) || 0,
    elevationGain: Number(workout.elevationGain || 0),
    elevationLoss: Number(workout.elevationLoss || 0),
    activityType: mapCourseActivityToGarmin(workout.type),
    coordinateSystem: 'WGS84',
    geoPoints: points.map((p: any) => ({
      latitude: Number(p.latitude ?? p.lat),
      longitude: Number(p.longitude ?? p.lng),
      elevation: p.elevation != null ? Number(p.elevation) : undefined
    }))
  }
}

function mapCourseActivityToGarmin(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('run')) return 'RUNNING'
  if (t.includes('trail')) return 'TRAIL_RUNNING'
  if (t.includes('hike')) return 'HIKING'
  if (t.includes('mountain')) return 'MOUNTAIN_BIKING'
  if (t.includes('gravel')) return 'GRAVEL_CYCLING'
  if (t.includes('ride') || t.includes('cycle') || t.includes('bike')) return 'ROAD_CYCLING'
  return 'OTHER'
}

export async function createGarminCourse(integration: Integration, payload: any) {
  const validIntegration = await ensureValidToken(integration)
  const response = await fetch('https://apis.garmin.com/training-api/courses/v1/course', {
    method: 'POST',
    headers: getGarminHeaders(validIntegration.accessToken),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    throw new Error(`Garmin create course failed (${response.status}): ${error}`)
  }

  return response.json()
}

function mapSportToGarmin(type: string): string {
  const normalized = String(type || '').trim()
  const map: Record<string, string> = {
    Run: 'RUNNING',
    TrailRun: 'TRAIL_RUNNING',
    Ride: 'CYCLING',
    VirtualRide: 'CYCLING',
    GravelRide: 'CYCLING',
    MountainBikeRide: 'CYCLING',
    Swim: 'LAP_SWIMMING',
    Walk: 'WALKING',
    Hike: 'HIKING'
  }
  if (map[normalized]) return map[normalized]!

  const lower = normalized.toLowerCase()
  if (lower.includes('trail') && lower.includes('run')) return 'TRAIL_RUNNING'
  if (lower.includes('run')) return 'RUNNING'
  if (lower.includes('swim')) return 'LAP_SWIMMING'
  if (lower.includes('virtual') || lower.includes('ride') || lower.includes('bike')) {
    return 'CYCLING'
  }
  if (lower.includes('hike')) return 'HIKING'
  if (lower.includes('walk')) return 'WALKING'
  return 'GENERIC'
}
