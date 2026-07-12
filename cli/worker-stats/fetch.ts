import type { WorkerMonitoringSnapshot } from '../../server/utils/worker-monitoring'

export async function fetchWorkerMonitoringFromApi(
  isProd: boolean
): Promise<WorkerMonitoringSnapshot> {
  const baseUrl = isProd ? 'https://coachwatts.com' : 'http://localhost:3000'
  const secret = isProd ? process.env.MONITORING_SECRET_PROD : process.env.MONITORING_SECRET

  if (!secret) {
    throw new Error(
      `${isProd ? 'MONITORING_SECRET_PROD' : 'MONITORING_SECRET'} is not set for remote worker monitoring`
    )
  }

  const response = await fetch(`${baseUrl}/api/monitoring/worker`, {
    headers: { 'x-monitoring-secret': secret }
  })

  const data = (await response.json().catch(() => null)) as WorkerMonitoringSnapshot | null

  if (!response.ok || !data) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}${
        data && 'alerts' in data && data.alerts?.[0]?.message ? ` (${data.alerts[0].message})` : ''
      }`
    )
  }

  return data
}
