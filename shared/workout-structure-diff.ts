/**
 * Structured step/target comparison for sync conflict review.
 */
import { formatStepTargetLabel, type ChartMetric } from './workout-render-model'
import { adaptStructuredWorkout, type ZoneProfileSnapshot } from './structured-workout-contract'

export type StructureStepDiff = {
  path: string
  index: number
  name: string
  type: string
  durationSec: number
  localTarget: string
  remoteTarget: string
  changedFields: string[]
}

type FlatStep = {
  path: string
  index: number
  step: any
}

function flattenSteps(steps: unknown, prefix = 'steps'): FlatStep[] {
  if (!Array.isArray(steps)) return []
  const result: FlatStep[] = []
  steps.forEach((step, index) => {
    const path = `${prefix}[${index}]`
    result.push({ path, index, step })
    if (Array.isArray(step?.steps) && step.steps.length > 0) {
      result.push(...flattenSteps(step.steps, `${path}.steps`))
    }
  })
  return result
}

function stepDurationSec(step: any): number {
  return Number(step?.durationSeconds || step?.duration || 0)
}

function detectPrimaryMetric(step: any): ChartMetric {
  if (step?.pace && !step.pace.unresolved) return 'pace'
  if (step?.heartRate && !step.heartRate.unresolved) return 'hr'
  return 'power'
}

function summarizeStep(
  step: any,
  snapshot?: ZoneProfileSnapshot
): { name: string; type: string; durationSec: number; target: string } {
  const metric = detectPrimaryMetric(step)
  return {
    name: String(step?.name || step?.text || 'Step'),
    type: String(step?.type || 'Active'),
    durationSec: stepDurationSec(step),
    target: formatStepTargetLabel(step, metric, snapshot)
  }
}

function diffFields(
  local: ReturnType<typeof summarizeStep>,
  remote: ReturnType<typeof summarizeStep>
) {
  const changed: string[] = []
  if (local.name !== remote.name) changed.push('name')
  if (local.type !== remote.type) changed.push('type')
  if (local.durationSec !== remote.durationSec) changed.push('duration')
  if (local.target !== remote.target) changed.push('target')
  return changed
}

export function compareStructuredWorkouts(
  localStructure: unknown,
  remoteStructure: unknown
): {
  steps: StructureStepDiff[]
  localOnlyCount: number
  remoteOnlyCount: number
  localEnvelope: ReturnType<typeof adaptStructuredWorkout>
  remoteEnvelope: ReturnType<typeof adaptStructuredWorkout>
} {
  const localEnvelope = adaptStructuredWorkout(localStructure)
  const remoteEnvelope = adaptStructuredWorkout(remoteStructure, {
    source: 'INTERVALS_IMPORT',
    zoneProfileSnapshot: (remoteStructure as any)?.zoneProfileSnapshot
  })
  const localFlat = flattenSteps(localEnvelope?.steps || [])
  const remoteFlat = flattenSteps(remoteEnvelope?.steps || [])
  const max = Math.max(localFlat.length, remoteFlat.length)
  const steps: StructureStepDiff[] = []

  for (let i = 0; i < max; i++) {
    const localStep = localFlat[i]?.step
    const remoteStep = remoteFlat[i]?.step
    const localSummary = localStep
      ? summarizeStep(localStep, localEnvelope?.zoneProfileSnapshot)
      : { name: '—', type: '—', durationSec: 0, target: '—' }
    const remoteSummary = remoteStep
      ? summarizeStep(remoteStep, remoteEnvelope?.zoneProfileSnapshot)
      : { name: '—', type: '—', durationSec: 0, target: '—' }

    const changedFields = diffFields(localSummary, remoteSummary)
    if (!localStep || !remoteStep || changedFields.length > 0) {
      steps.push({
        path: localFlat[i]?.path || remoteFlat[i]?.path || `steps[${i}]`,
        index: i + 1,
        name: localSummary.name !== '—' ? localSummary.name : remoteSummary.name,
        type: localSummary.type !== '—' ? localSummary.type : remoteSummary.type,
        durationSec: localSummary.durationSec || remoteSummary.durationSec,
        localTarget: localSummary.target,
        remoteTarget: remoteSummary.target,
        changedFields: !localStep
          ? ['missing_local']
          : !remoteStep
            ? ['missing_remote']
            : changedFields
      })
    }
  }

  return {
    steps,
    localOnlyCount: Math.max(0, localFlat.length - remoteFlat.length),
    remoteOnlyCount: Math.max(0, remoteFlat.length - localFlat.length),
    localEnvelope,
    remoteEnvelope
  }
}
