import type { H3Event } from 'h3'

export function assertMonitoringSecret(event: H3Event) {
  const monitoringSecret = process.env.MONITORING_SECRET
  if (!monitoringSecret) {
    return
  }

  const headerSecret = getHeader(event, 'x-monitoring-secret')
  const querySecret = getQuery(event).secret

  if (headerSecret !== monitoringSecret && querySecret !== monitoringSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
}
