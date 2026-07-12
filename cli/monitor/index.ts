import { Command } from 'commander'
import chalk from 'chalk'
import { printWorkerMonitoring } from '../worker-stats/format'
import { fetchWorkerMonitoringFromApi } from '../worker-stats/fetch'

const monitorCommand = new Command('monitor')

monitorCommand
  .description('Monitor application endpoints')
  .option('--prod', 'Use production environment')
  .option('--worker', 'Show worker and Redis monitoring only')
  .option('--trigger', 'Show Trigger.dev monitoring only')
  .action(async (options) => {
    try {
      const isProd = options.prod
      const showWorker = options.worker || (!options.worker && !options.trigger)
      const showTrigger = options.trigger || (!options.worker && !options.trigger)

      if (showWorker) {
        const data = await fetchWorkerMonitoringFromApi(isProd)
        printWorkerMonitoring(
          data,
          `Worker Monitoring (${data.environment || (isProd ? 'production' : 'development')})`
        )
      }

      if (showTrigger) {
        const baseUrl = isProd ? 'https://coachwatts.com' : 'http://localhost:3000'
        const secret = isProd ? process.env.MONITORING_SECRET_PROD : process.env.MONITORING_SECRET

        if (!secret) {
          console.warn(
            chalk.yellow(
              `Warning: ${isProd ? 'MONITORING_SECRET_PROD' : 'MONITORING_SECRET'} is not set.`
            )
          )
        }

        const url = `${baseUrl}/api/monitoring/trigger`
        console.log(chalk.blue(`Fetching stats from: ${url}`))

        const headers: HeadersInit = {}
        if (secret) {
          headers['x-monitoring-secret'] = secret
        }

        const response = await fetch(url, { headers })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            `HTTP Error: ${response.status} ${response.statusText}${
              data?.alerts?.[0]?.message ? ` (${data.alerts[0].message})` : ''
            }`
          )
        }

        console.log('')
        console.log(
          chalk.bold.underline(
            `Trigger.dev Monitoring (${data.environment || (isProd ? 'production' : 'development')})`
          )
        )
        console.log(chalk.gray(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`))
        console.log(chalk.gray(`Period: ${data.period}`))
        console.log('')

        const stats = data.stats
        if (stats) {
          console.log(chalk.bold('Run Statistics:'))
          console.table({
            Total: stats.total,
            Completed: stats.completed,
            Failed: stats.failed,
            Executing: stats.executing,
            Queued: stats.queued,
            Canceled: stats.canceled
          })
        }

        const failures = data.recentFailures
        if (failures && failures.length > 0) {
          console.log(chalk.bold.red('\nRecent Failures:'))
          failures.forEach((f: any) => {
            console.log(chalk.red(`- [${f.status}] ${f.taskIdentifier}`))
            console.log(chalk.gray(`  ID: ${f.id}`))
            console.log(chalk.gray(`  Started: ${new Date(f.startedAt).toLocaleString()}`))
          })
        } else {
          console.log(chalk.green('\nNo recent Trigger failures found in the last batch.'))
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Monitoring failed:'), error.message)
      process.exit(1)
    }
  })

export default monitorCommand
