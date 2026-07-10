/**
 * Shared chart/editor render helpers. Uses canonical envelope fields only; never
 * infers pace units from numeric magnitude.
 */
import { paceToMps, type ZoneProfileSnapshot } from './structured-workout-contract'

export type ChartMetric = 'power' | 'hr' | 'pace'

export type StepTargetRefs = {
  ftp: number
  lthr: number
  maxHr: number
  thresholdPace: number
}

export function isUnresolvedTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false
  return (target as any).unresolved === true || (target as any).kind === 'freeform'
}

function finiteMidpoint(value: unknown, range?: { start?: unknown; end?: unknown }): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (range && typeof range.start === 'number' && typeof range.end === 'number') {
    return (range.start + range.end) / 2
  }
  return null
}

/** Canonical m/s from a pace target, or null when unresolved. */
export function resolveCanonicalPaceMps(pace: any, snapshot?: ZoneProfileSnapshot): number | null {
  if (!pace || isUnresolvedTarget(pace)) return null
  if (pace.metric === 'pace' && pace.rangeMps) {
    const min = Number(pace.rangeMps.min)
    const max = Number(pace.rangeMps.max)
    if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2
  }
  const mid = finiteMidpoint(pace.value, pace.range)
  if (mid === null) return null
  return paceToMps(mid, pace.units || pace.sourceUnit)
}

export function resolvePaceZoneBounds(
  zoneIndex: number,
  snapshot?: ZoneProfileSnapshot
): { start: number; end: number } | null {
  const index = Math.max(1, Math.round(zoneIndex))
  const zone = snapshot?.pace?.ranges?.[index - 1]
  if (!zone || !Number.isFinite(zone.min) || !Number.isFinite(zone.max)) return null
  return { start: zone.min, end: zone.max }
}

export function resolveHrZoneBounds(
  zoneIndex: number,
  snapshot?: ZoneProfileSnapshot
): { start: number; end: number } | null {
  const index = Math.max(1, Math.round(zoneIndex))
  const zone = snapshot?.heartRate?.ranges?.[index - 1]
  if (!zone || !Number.isFinite(zone.min) || !Number.isFinite(zone.max)) return null
  return { start: zone.min, end: zone.max }
}

export function resolvePowerZoneBounds(
  zoneIndex: number,
  snapshot?: ZoneProfileSnapshot
): { start: number; end: number } | null {
  const index = Math.max(1, Math.round(zoneIndex))
  const zone = snapshot?.power?.ranges?.[index - 1]
  if (!zone || !Number.isFinite(zone.min) || !Number.isFinite(zone.max)) return null
  return { start: zone.min, end: zone.max }
}

/** Relative intensity (0–1.5) for chart bars; 0 when target is unresolved. */
export function resolveStepChartIntensity(
  step: any,
  metric: ChartMetric,
  refs: StepTargetRefs,
  snapshot?: ZoneProfileSnapshot
): number {
  if (metric === 'pace') {
    const pace = step?.pace
    if (isUnresolvedTarget(pace)) return 0
    if (pace?.kind === 'zone' && typeof pace.zone === 'number') {
      const bounds = resolvePaceZoneBounds(pace.zone, snapshot)
      const threshold = Number(snapshot?.pace?.thresholdMps || refs.thresholdPace || 0)
      if (bounds && threshold > 0) return (bounds.start + bounds.end) / 2 / threshold
      return 0
    }
    const mps = resolveCanonicalPaceMps(pace, snapshot)
    const threshold = Number(snapshot?.pace?.thresholdMps || refs.thresholdPace || 0)
    return mps !== null && threshold > 0 ? mps / threshold : 0
  }

  if (metric === 'hr') {
    const hr = step?.heartRate
    if (isUnresolvedTarget(hr)) return 0
    const units = String(hr?.units || '').toLowerCase()
    if (units.includes('zone')) {
      const bounds = resolveHrZoneBounds(Number(hr.value), snapshot)
      const lthr = Number(refs.lthr || 0)
      if (bounds && lthr > 0) return (bounds.start + bounds.end) / 2 / lthr
      return 0
    }
    const mid = finiteMidpoint(hr?.value, hr?.range)
    if (mid === null) return 0
    if (units === 'bpm') {
      const lthr = Number(refs.lthr || 0)
      return lthr > 0 ? mid / lthr : 0
    }
    return mid > 3 ? mid / 100 : mid
  }

  const power = step?.power
  if (isUnresolvedTarget(power)) return 0
  const units = String(power?.units || '').toLowerCase()
  if (units.includes('zone')) {
    const bounds = resolvePowerZoneBounds(Number(power.value), snapshot)
    const ftp = Number(refs.ftp || 0)
    if (bounds && ftp > 0) return (bounds.start + bounds.end) / 2 / ftp
    return 0
  }
  const mid = finiteMidpoint(power?.value, power?.range)
  if (mid === null) return 0
  if (units === 'w' || units === 'watts') {
    const ftp = Number(refs.ftp || 0)
    return ftp > 0 ? mid / ftp : 0
  }
  return mid > 3 ? mid / 100 : mid
}

export function formatStepTargetLabel(
  step: any,
  metric: ChartMetric,
  snapshot?: ZoneProfileSnapshot
): string {
  if (metric === 'pace') {
    const pace = step?.pace
    if (isUnresolvedTarget(pace)) return 'Unresolved pace'
    if (pace?.kind === 'zone') return `Z${pace.zone}`
    const mps = resolveCanonicalPaceMps(pace, snapshot)
    if (mps === null) return 'Unresolved pace'
    const secPerKm = 1000 / mps
    const min = Math.floor(secPerKm / 60)
    const sec = Math.round(secPerKm % 60)
    return `${min}:${String(sec).padStart(2, '0')}/km`
  }
  if (metric === 'hr') {
    const hr = step?.heartRate
    if (isUnresolvedTarget(hr)) return 'Unresolved HR'
    const units = String(hr?.units || '').toLowerCase()
    if (units.includes('zone')) return `Z${Math.round(Number(hr.value))}`
    const mid = finiteMidpoint(hr?.value, hr?.range)
    return mid !== null ? `${Math.round(mid)}% LTHR` : 'Unresolved HR'
  }
  const power = step?.power
  if (isUnresolvedTarget(power)) return 'Unresolved power'
  const units = String(power?.units || '').toLowerCase()
  if (units.includes('zone')) return `Z${Math.round(Number(power.value))}`
  const mid = finiteMidpoint(power?.value, power?.range)
  return mid !== null ? `${Math.round(mid > 3 ? mid : mid * 100)}% FTP` : 'Unresolved power'
}
