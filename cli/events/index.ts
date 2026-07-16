import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { assertProdWriteAllowed } from '../../server/utils/cli-prod-safety'
import { isValidSlug, normalizeSlug } from '../../shared/slug'
import { toPublicEventPublicView } from '../../server/utils/public-events'

function createPrisma(isProd: boolean) {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL
  if (!connectionString) {
    console.error(chalk.red('Error: Database connection string is not defined.'))
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return { prisma: new PrismaClient({ adapter }), pool }
}

function printProdWarning(isProd: boolean) {
  if (isProd) {
    console.log(chalk.yellow('⚠️  Using PRODUCTION database.'))
  } else {
    console.log(chalk.blue('Using DEVELOPMENT database.'))
  }
}

function collect(value: string, previous: string[]) {
  return previous.concat([value])
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM-DD.`)
  }
  return new Date(`${value}T12:00:00.000Z`)
}

function buildEventData(options: any, slug: string) {
  return {
    slug,
    title: options.title,
    description: options.description ?? null,
    organizerName: options.organizerName,
    date: parseDateOnly(options.date),
    timezone: options.timezone || 'UTC',
    startTime: options.startTime ?? null,
    type: options.sport || options.type || null,
    subType: options.subType ?? null,
    distance: options.distance != null ? Number(options.distance) : null,
    elevation: options.elevation != null ? Number(options.elevation) : null,
    expectedDuration: options.expectedDuration != null ? Number(options.expectedDuration) : null,
    terrain: options.terrain ?? null,
    city: options.city ?? null,
    country: options.country ?? null,
    location: options.location ?? null,
    isVirtual: Boolean(options.virtual),
    websiteUrl: options.websiteUrl ?? null,
    registrationUrl: options.registrationUrl ?? null,
    imageUrl: options.imageUrl ?? null,
    isPublished: Boolean(options.published)
  }
}

const eventsCommand = new Command('events').description(
  'Canonical public event catalog administration'
)

function addWriteSafetyOptions(command: Command) {
  return command
    .option('--prod', 'Use production database')
    .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
    .option('--dry-run', 'Preview without writing')
}

eventsCommand
  .command('create')
  .description('Create or upsert a canonical public event')
  .requiredOption('--slug <slug>', 'Unique event slug')
  .requiredOption('--title <title>', 'Event title')
  .requiredOption('--organizer-name <name>', 'Organizer display name')
  .requiredOption('--date <yyyy-mm-dd>', 'Event date')
  .option('--timezone <tz>', 'IANA timezone', 'UTC')
  .option('--sport <sport>', 'Sport / type (e.g. CYCLING)')
  .option('--type <type>', 'Alias for --sport')
  .option('--sub-type <subType>', 'Event subtype')
  .option('--city <city>', 'City')
  .option('--country <country>', 'Country code or name')
  .option('--location <location>', 'Free-form location')
  .option('--distance <km>', 'Distance in km')
  .option('--elevation <m>', 'Elevation in meters')
  .option('--expected-duration <hours>', 'Expected duration in hours')
  .option('--terrain <terrain>', 'Terrain description')
  .option('--start-time <time>', 'Local start time label')
  .option('--description <text>', 'Event description')
  .option('--website-url <url>', 'Organizer website')
  .option('--registration-url <url>', 'Official registration URL')
  .option('--image-url <url>', 'Optional image URL')
  .option('--virtual', 'Mark as virtual event')
  .option('--published', 'Publish immediately')
  .option('--upsert', 'Update if slug already exists')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)

    const slug = normalizeSlug(options.slug)
    if (!isValidSlug(slug)) {
      console.error(chalk.red(`Invalid slug: ${options.slug}`))
      process.exit(1)
    }

    const data = buildEventData(options, slug)
    console.log(chalk.cyan('Public event preview:'))
    console.log(
      JSON.stringify(
        {
          ...data,
          date: data.date.toISOString(),
          publicUrl: `https://coachwatts.com/events/${slug}`
        },
        null,
        2
      )
    )

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run only. No database write performed.'))
      return
    }

    const { prisma, pool } = createPrisma(isProd)
    try {
      const existing = await prisma.publicEvent.findUnique({ where: { slug } })
      if (existing && !options.upsert) {
        console.error(
          chalk.red(
            `Event slug "${slug}" already exists. Re-run with --upsert to update, or choose another slug.`
          )
        )
        process.exit(1)
      }

      const event = existing
        ? await prisma.publicEvent.update({ where: { slug }, data })
        : await prisma.publicEvent.create({ data })

      console.log(chalk.green(existing ? '✅ Public event updated.' : '✅ Public event created.'))
      console.log(JSON.stringify(toPublicEventPublicView(event), null, 2))
      console.log(chalk.cyan(`Public URL: https://coachwatts.com/events/${event.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to create event:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

eventsCommand
  .command('show')
  .description('Inspect a public event')
  .argument('<slug>', 'Event slug')
  .option('--prod', 'Use production database')
  .action(async (slugArg, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)
    try {
      const event = await prisma.publicEvent.findUnique({
        where: { slug: normalizeSlug(slugArg) },
        include: {
          campaignEvents: {
            include: { campaign: { select: { slug: true, partnerName: true } } }
          }
        }
      })
      if (!event) {
        console.log(chalk.yellow(`Event not found: ${slugArg}`))
        return
      }
      console.log(
        JSON.stringify(
          {
            ...toPublicEventPublicView(event),
            isPublished: event.isPublished,
            campaigns: event.campaignEvents.map((link) => ({
              campaignSlug: link.campaign.slug,
              partnerName: link.campaign.partnerName,
              isPrimary: link.isPrimary,
              displayOrder: link.displayOrder
            })),
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString()
          },
          null,
          2
        )
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

eventsCommand
  .command('list')
  .description('List public events')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)
    try {
      const events = await prisma.publicEvent.findMany({ orderBy: { date: 'asc' } })
      console.table(
        events.map((event) => ({
          slug: event.slug,
          title: event.title,
          organizer: event.organizerName,
          date: event.date.toISOString().slice(0, 10),
          published: event.isPublished
        }))
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

eventsCommand
  .command('update')
  .description('Update fields on a public event')
  .argument('<slug>', 'Event slug')
  .option('--title <title>', 'Event title')
  .option('--organizer-name <name>', 'Organizer display name')
  .option('--date <yyyy-mm-dd>', 'Event date')
  .option('--timezone <tz>', 'IANA timezone')
  .option('--sport <sport>', 'Sport / type')
  .option('--sub-type <subType>', 'Event subtype')
  .option('--city <city>', 'City')
  .option('--country <country>', 'Country')
  .option('--location <location>', 'Location')
  .option('--distance <km>', 'Distance in km')
  .option('--elevation <m>', 'Elevation in meters')
  .option('--website-url <url>', 'Website URL')
  .option('--registration-url <url>', 'Registration URL')
  .option('--description <text>', 'Description')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (slugArg, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)

    const slug = normalizeSlug(slugArg)
    const data: Record<string, unknown> = {}
    if (options.title) data.title = options.title
    if (options.organizerName) data.organizerName = options.organizerName
    if (options.date) data.date = parseDateOnly(options.date)
    if (options.timezone) data.timezone = options.timezone
    if (options.sport) data.type = options.sport
    if (options.subType) data.subType = options.subType
    if (options.city) data.city = options.city
    if (options.country) data.country = options.country
    if (options.location) data.location = options.location
    if (options.distance != null) data.distance = Number(options.distance)
    if (options.elevation != null) data.elevation = Number(options.elevation)
    if (options.websiteUrl) data.websiteUrl = options.websiteUrl
    if (options.registrationUrl) data.registrationUrl = options.registrationUrl
    if (options.description) data.description = options.description

    console.log(chalk.cyan('Update preview:'), JSON.stringify(data, null, 2))
    if (options.dryRun) {
      console.log(chalk.yellow('Dry run only. No database write performed.'))
      return
    }

    const { prisma, pool } = createPrisma(isProd)
    try {
      const event = await prisma.publicEvent.update({ where: { slug }, data })
      console.log(chalk.green(`Updated event ${event.slug}`))
      console.log(JSON.stringify(toPublicEventPublicView(event), null, 2))
    } catch (error) {
      console.error(chalk.red('Failed to update event:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

eventsCommand
  .command('publish')
  .description('Publish a public event')
  .argument('<slug>', 'Event slug')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (slugArg, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)
    if (options.dryRun) {
      console.log(chalk.yellow(`Dry run: would publish ${normalizeSlug(slugArg)}`))
      return
    }
    const { prisma, pool } = createPrisma(isProd)
    try {
      const event = await prisma.publicEvent.update({
        where: { slug: normalizeSlug(slugArg) },
        data: { isPublished: true }
      })
      console.log(chalk.green(`Published ${event.slug}`))
      console.log(chalk.cyan(`Public URL: https://coachwatts.com/events/${event.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to publish event:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

eventsCommand
  .command('unpublish')
  .description('Unpublish a public event (blocks public join)')
  .argument('<slug>', 'Event slug')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (slugArg, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)
    if (options.dryRun) {
      console.log(chalk.yellow(`Dry run: would unpublish ${normalizeSlug(slugArg)}`))
      return
    }
    const { prisma, pool } = createPrisma(isProd)
    try {
      const event = await prisma.publicEvent.update({
        where: { slug: normalizeSlug(slugArg) },
        data: { isPublished: false }
      })
      console.log(chalk.green(`Unpublished ${event.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to unpublish event:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

// silence unused helper lint if tree-shaken oddly
void addWriteSafetyOptions
void collect

export default eventsCommand
