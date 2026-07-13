import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { workoutRepository } from '../../server/utils/repositories/workoutRepository'
import { deduplicationService } from '../../server/utils/services/deduplicationService'

const deduplicateCommand = new Command('deduplicate')

deduplicateCommand
  .description('Run workout deduplication logic for a user')
  .requiredOption('-u, --user <email_or_id>', 'User Email or ID')
  .option('--dry-run', 'Run in dry-run mode (no changes)', false)
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const { user: userIdInput, dryRun, prod: isProd } = options

    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
    if (!connectionString) {
      console.error(
        chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
      )
      process.exit(1)
    }

    if (isProd) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_PROD
      console.log(chalk.yellow('Using PRODUCTION database.'))
    } else {
      console.log(chalk.blue('Using DEVELOPMENT database.'))
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    globalThis.prismaGlobalV2 = prisma

    console.log(`Running deduplication for user: ${userIdInput} (Dry Run: ${dryRun})`)

    try {
      let actualUserId = userIdInput
      if (userIdInput.includes('@')) {
        const user = await prisma.user.findUnique({ where: { email: userIdInput } })
        if (!user) {
          console.error('User not found')
          process.exit(1)
        }
        actualUserId = user.id
      }

      const workouts = await workoutRepository.getForUser(actualUserId, {
        includeDuplicates: true,
        orderBy: { date: 'desc' },
        include: {
          streams: { select: { id: true } },
          exercises: { select: { id: true } }
        }
      })

      console.log(`Loaded ${workouts.length} workouts`)

      const groups = deduplicationService.findDuplicateGroups(workouts)
      console.log(`Found ${groups.length} duplicate groups`)

      for (const group of groups) {
        console.log('\n--- Duplicate Group ---')
        const best = group.workouts.find((w) => w.id === group.bestWorkoutId)
        console.log(`Best: [${best.source}] ${best.title} (${best.id})`)

        const others = group.workouts.filter((w) => w.id !== group.bestWorkoutId)
        others.forEach((o) => {
          console.log(`  Duplicate: [${o.source}] ${o.title} (${o.id})`)
        })

        if (!dryRun) {
          console.log('Merging...')
          const result = await deduplicationService.mergeDuplicateGroup(group)
          console.log(`Merged! Deleted: ${result.deletedCount}, Kept: ${result.keptCount}`)
        }
      }

      console.log('\nDone.')
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default deduplicateCommand
