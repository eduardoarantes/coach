export function getStructuredWorkoutObject(value: any) {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  if (value?.structuredWorkout && typeof value.structuredWorkout === 'object') {
    return value.structuredWorkout
  }

  return typeof value === 'object' ? value : null
}

export function hasStructuredWorkoutPreviewData(value: any): boolean {
  const structuredWorkout = getStructuredWorkoutObject(value)
  if (!structuredWorkout) return false

  if (Array.isArray(structuredWorkout.steps) && structuredWorkout.steps.length > 0) return true
  if (Array.isArray(structuredWorkout.blocks) && structuredWorkout.blocks.length > 0) return true
  if (Array.isArray(structuredWorkout.exercises) && structuredWorkout.exercises.length > 0) {
    return true
  }

  return false
}

export function getStructuredWorkoutDescription(value: any): string | null {
  const structuredWorkout = getStructuredWorkoutObject(value)
  const description = String(structuredWorkout?.description || '').trim()
  return description || null
}
