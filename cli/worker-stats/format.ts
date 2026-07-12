import chalk from 'chalk'
import type { WorkerMonitoringSnapshot } from '../../server/utils/worker-monitoring'

export function printWorkerMonitoring(data: WorkerMonitoringSnapshot, label = 'Worker Monitoring') {
  console.log('')
  console.log(chalk.bold.underline(label))
  console.log(chalk.gray(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`))
  console.log(
    data.status === 'ok'
      ? chalk.green(`Status: ${data.status}`)
      : data.status === 'degraded'
        ? chalk.yellow(`Status: ${data.status}`)
        : chalk.red(`Status: ${data.status}`)
  )
  console.log('')

  if (data.redis) {
    console.log(chalk.bold('Redis'))
    console.table({
      Status: data.redis.status,
      Used: data.redis.usedMemoryHuman || 'unknown',
      Max: data.redis.maxMemoryHuman || 'unknown',
      Percent: data.redis.usedMemoryPercent ?? 'unknown'
    })
  }

  if (data.queues?.webhook) {
    console.log(chalk.bold('\nWebhook Queue'))
    console.table(data.queues.webhook)
  }

  if (data.queues?.streams) {
    console.log(chalk.bold('\nStreams Queue'))
    console.table(data.queues.streams)
  }

  if (data.queues?.ping) {
    console.log(chalk.bold('\nPing Queue'))
    console.table(data.queues.ping)
  }

  if (data.webhooks) {
    console.log(chalk.bold('\nWebhook SQL'))
    console.table(data.webhooks)
  }

  if (data.alerts?.length) {
    console.log(chalk.bold.yellow('\nAlerts'))
    data.alerts.forEach((alert) => {
      const color = alert.level === 'critical' ? chalk.red : chalk.yellow
      console.log(color(`- [${alert.level}] ${alert.message}`))
    })
  } else {
    console.log(chalk.green('\nNo active worker alerts.'))
  }
}
