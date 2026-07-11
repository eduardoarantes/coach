import type { WorkoutContractIssue } from './structured-workout-contract'

/** Bounds for canonical pace, distance, and duration semantics. */
export const CANONICAL_SEMANTIC_BOUNDS = {
  minPaceMps: 0.8,
  maxPaceMps: 12,
  minStepDistanceMeters: 1,
  maxStepDistanceMeters: 100_000,
  minStepDurationSeconds: 1,
  maxStepDurationSeconds: 6 * 60 * 60,
  maxWorkoutDistanceMeters: 500_000,
  maxWorkoutDurationSeconds: 24 * 60 * 60
} as const

function finitePositive(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function paceMidMps(pace: any): number | null {
  if (!pace || pace.unresolved || pace.kind === 'freeform') return null
  if (pace.rangeMps) {
    const min = Number(pace.rangeMps.min)
    const max = Number(pace.rangeMps.max)
    if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2
  }
  const start = Number(pace?.range?.start)
  const end = Number(pace?.range?.end)
  if (Number.isFinite(start) && Number.isFinite(end)) return (start + end) / 2
  const value = finitePositive(pace?.value)
  if (value !== null && pace?.units === 'm/s') return value
  return null
}

/** Stronger semantic validation beyond structural limits. */
export function validateCanonicalSemantics(
  structure: any,
  bounds = CANONICAL_SEMANTIC_BOUNDS
): WorkoutContractIssue[] {
  const issues: WorkoutContractIssue[] = []
  let totalDuration = 0
  let totalDistance = 0

  const visit = (steps: unknown, depth: number, multiplier: number, path: string) => {
    if (!Array.isArray(steps)) return
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index] as any
      const stepPath = `${path}[${index}]`
      const reps = Math.max(1, Math.trunc(Number(step?.reps ?? step?.repeat ?? 1)))

      if (Array.isArray(step?.steps) && step.steps.length > 0) {
        visit(step.steps, depth + 1, multiplier * reps, `${stepPath}.steps`)
        continue
      }

      const duration = finitePositive(step?.durationSeconds ?? step?.duration)
      if (duration !== null) {
        if (duration < bounds.minStepDurationSeconds || duration > bounds.maxStepDurationSeconds) {
          issues.push({
            code: 'max_duration_exceeded',
            path: stepPath,
            message: 'Step duration is outside supported bounds.'
          })
        }
        totalDuration += duration * multiplier * reps
      }

      const distance = finitePositive(step?.distanceMeters ?? step?.distance)
      if (distance !== null) {
        if (distance < bounds.minStepDistanceMeters || distance > bounds.maxStepDistanceMeters) {
          issues.push({
            code: 'invalid_pace_value',
            path: stepPath,
            message: 'Step distance is outside supported bounds.'
          })
        }
        totalDistance += distance * multiplier * reps
      }

      const paceMps = paceMidMps(step?.pace)
      if (paceMps !== null && (paceMps < bounds.minPaceMps || paceMps > bounds.maxPaceMps)) {
        issues.push({
          code: 'invalid_pace_value',
          path: `${stepPath}.pace`,
          message: 'Pace value is outside realistic running/cycling bounds.'
        })
      }
    }
  }

  visit(structure?.steps, 1, 1, 'steps')

  if (totalDuration > bounds.maxWorkoutDurationSeconds) {
    issues.push({
      code: 'max_duration_exceeded',
      path: 'steps',
      message: 'Workout total duration exceeds supported bounds.'
    })
  }
  if (totalDistance > bounds.maxWorkoutDistanceMeters) {
    issues.push({
      code: 'invalid_pace_value',
      path: 'steps',
      message: 'Workout total distance exceeds supported bounds.'
    })
  }

  return issues
}
