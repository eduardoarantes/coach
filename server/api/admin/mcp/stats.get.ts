import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth-guard'
import { mcpMetrics } from '../../../utils/mcp/metrics'

function percentile(values: number[], pct: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)] ?? null
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [executions, failures, byTool, byApp, byErrorCode, durations, dcrClients, recentDcr] =
    await Promise.all([
      prisma.mcpToolExecution.count({ where: { createdAt: { gte: since } } }),
      prisma.mcpToolExecution.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.mcpToolExecution.groupBy({
        by: ['toolName', 'status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.mcpToolExecution.groupBy({
        by: ['appId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.mcpToolExecution.groupBy({
        by: ['errorCode'],
        where: { createdAt: { gte: since }, errorCode: { not: null } },
        _count: { _all: true }
      }),
      prisma.mcpToolExecution.findMany({
        where: { createdAt: { gte: since }, durationMs: { not: null } },
        select: { durationMs: true }
      }),
      prisma.oAuthApp.count({ where: { registrationType: 'dcr' } }),
      prisma.oAuthApp.count({
        where: {
          registrationType: 'dcr',
          createdAt: { gte: since }
        }
      })
    ])

  const appIds = byApp.map((row) => row.appId)
  const apps = appIds.length
    ? await prisma.oAuthApp.findMany({
        where: { id: { in: appIds } },
        select: { id: true, name: true, clientId: true, registrationType: true }
      })
    : []

  const appNameById = new Map(apps.map((app) => [app.id, app]))
  const durationValues = durations
    .map((row) => row.durationMs)
    .filter((value): value is number => typeof value === 'number')

  return {
    windowHours: 24,
    totalExecutions: executions,
    byStatus: failures.map((row) => ({ status: row.status, count: row._count._all })),
    byErrorCode: byErrorCode.map((row) => ({
      errorCode: row.errorCode,
      count: row._count._all
    })),
    latencyMs: {
      p50: percentile(durationValues, 50),
      p95: percentile(durationValues, 95)
    },
    runtimeMetrics: mcpMetrics.snapshot(),
    dcr: {
      totalClients: dcrClients,
      registeredLast24h: recentDcr
    },
    topTools: byTool
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 20)
      .map((row) => ({
        toolName: row.toolName,
        status: row.status,
        count: row._count._all
      })),
    topClients: byApp
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 20)
      .map((row) => ({
        appId: row.appId,
        count: row._count._all,
        app: appNameById.get(row.appId) || null
      }))
  }
})
