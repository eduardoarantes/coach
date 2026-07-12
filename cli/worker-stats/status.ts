import { Command } from 'commander'
import chalk from 'chalk'
import { printWorkerMonitoring } from './format'
import { fetchWorkerMonitoringFromApi } from './fetch'

export const workerStatusCommand = new Command('status')
  .description('Show BullMQ queue metrics, Redis memory, and webhook SQL stats')
  .option('--prod', 'Read prod via /api/monitoring/worker (requires MONITORING_SECRET_PROD)')
  .option(
    '--remote',
    'Fetch from the monitoring HTTP endpoint instead of connecting to REDIS_URL directly'
  )
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    const useRemote = Boolean(options.remote || options.prod)

    try {
      let snapshot

      if (useRemote) {
        snapshot = await fetchWorkerMonitoringFromApi(isProd)
        printWorkerMonitoring(
          snapshot,
          `Worker Monitoring (${isProd ? 'production API' : 'local API'})`
        )
        return
      }

      if (isProd && process.env.DATABASE_URL_PROD) {
        process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
      }

      const { collectWorkerMonitoringSnapshot } =
        await import('../../server/utils/worker-monitoring')
      snapshot = await collectWorkerMonitoringSnapshot()
      printWorkerMonitoring(
        snapshot,
        `Worker Monitoring (${isProd ? 'production DB + REDIS_URL' : 'local REDIS_URL'})`
      )
    } catch (error: any) {
      console.error(chalk.red('Failed to fetch worker stats:'), error.message || error)
      process.exitCode = 1
    } finally {
      const { prisma } = await import('../../server/utils/db')
      const { webhookQueue, pingQueue, streamsQueue } = await import('../../server/utils/queue')
      await Promise.all([
        webhookQueue.close().catch(() => undefined),
        pingQueue.close().catch(() => undefined),
        streamsQueue.close().catch(() => undefined),
        prisma.$disconnect().catch(() => undefined)
      ])
      process.exit(process.exitCode || 0)
    }
  })
