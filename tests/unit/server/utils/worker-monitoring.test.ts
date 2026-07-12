import { describe, expect, it } from 'vitest'
import {
  WORKER_MONITORING_THRESHOLDS,
  workerMonitoringHttpStatus
} from '../../../../../server/utils/worker-monitoring'

describe('worker monitoring', () => {
  it('maps critical status to HTTP 503', () => {
    expect(workerMonitoringHttpStatus('critical')).toBe(503)
  })

  it('maps ok and degraded status to HTTP 200', () => {
    expect(workerMonitoringHttpStatus('ok')).toBe(200)
    expect(workerMonitoringHttpStatus('degraded')).toBe(200)
  })

  it('uses practical queue and redis thresholds', () => {
    expect(WORKER_MONITORING_THRESHOLDS.webhookWaitingCritical).toBeGreaterThan(
      WORKER_MONITORING_THRESHOLDS.webhookWaitingDegraded
    )
    expect(WORKER_MONITORING_THRESHOLDS.redisMemoryPercentCritical).toBeGreaterThan(
      WORKER_MONITORING_THRESHOLDS.redisMemoryPercentDegraded
    )
  })
})
