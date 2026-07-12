import { Command } from 'commander'
import { workerStatusCommand } from './status'

const workerStatsCommand = new Command('worker').description(
  'Inspect webhook worker health, BullMQ queues, and Redis'
)

workerStatsCommand.addCommand(workerStatusCommand)

export default workerStatsCommand
