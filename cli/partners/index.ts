import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient, type SubscriptionTier } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { assertProdWriteAllowed } from '../../server/utils/cli-prod-safety'
import { normalizeSlug } from '../../shared/slug'
import {
  getCampaignAvailability,
  normalizePartnerCampaignSlug,
  toPartnerCampaignPublicView
} from '../../server/utils/partner-campaigns'
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

function parseTier(value: string): SubscriptionTier {
  const normalized = value.toUpperCase()
  if (!['FREE', 'SUPPORTER', 'PRO'].includes(normalized)) {
    throw new Error(`Invalid tier: ${value}`)
  }
  return normalized as SubscriptionTier
}

function collect(value: string, previous: string[]) {
  return previous.concat([value])
}

async function attachEventSlugs(
  prisma: PrismaClient,
  campaignId: string,
  eventSlugs: string[],
  makePrimaryFirst = true
) {
  const uniqueSlugs = [...new Set(eventSlugs.map((slug) => normalizeSlug(slug)))]
  for (let index = 0; index < uniqueSlugs.length; index++) {
    const eventSlug = uniqueSlugs[index]!
    const publicEvent = await prisma.publicEvent.findUnique({ where: { slug: eventSlug } })
    if (!publicEvent) {
      throw new Error(`Public event not found: ${eventSlug}`)
    }

    await prisma.partnerCampaignEvent.upsert({
      where: {
        campaignId_publicEventId: {
          campaignId,
          publicEventId: publicEvent.id
        }
      },
      update: {
        displayOrder: index,
        isPrimary: makePrimaryFirst && index === 0
      },
      create: {
        campaignId,
        publicEventId: publicEvent.id,
        displayOrder: index,
        isPrimary: makePrimaryFirst && index === 0
      }
    })
  }
}

async function loadCampaignWithEvents(prisma: PrismaClient, slug: string) {
  return prisma.partnerCampaign.findUnique({
    where: { slug: normalizePartnerCampaignSlug(slug) },
    include: {
      campaignEvents: {
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        include: { publicEvent: true }
      }
    }
  })
}

function printCampaignDetail(
  campaign: NonNullable<Awaited<ReturnType<typeof loadCampaignWithEvents>>>
) {
  const events = campaign.campaignEvents.map((link) => ({
    ...toPublicEventPublicView(link.publicEvent),
    isPrimary: link.isPrimary,
    displayOrder: link.displayOrder,
    isPublished: link.publicEvent.isPublished
  }))

  console.log(
    JSON.stringify(
      {
        ...toPartnerCampaignPublicView(campaign, new Date(), events),
        isActive: campaign.isActive,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        absolutePublicUrl: `https://coachwatts.com/partners/${campaign.slug}`,
        eventUrls: events.map((event) => `https://coachwatts.com/events/${event.slug}`)
      },
      null,
      2
    )
  )
}

const partnersCommand = new Command('partners').description('Partner campaign administration')

partnersCommand
  .command('create')
  .description('Create a partner campaign')
  .requiredOption('--slug <slug>', 'Unique campaign slug')
  .requiredOption('--partner-name <name>', 'Partner display name')
  .requiredOption('--campaign-name <name>', 'Campaign display name')
  .requiredOption('--granted-tier <tier>', 'Granted tier: FREE, SUPPORTER, or PRO')
  .requiredOption('--duration-days <days>', 'Access duration in days', (value) => Number(value))
  .requiredOption('--max-redemptions <count>', 'Maximum redemptions', (value) => Number(value))
  .option('--window-starts-at <iso>', 'Redemption window start (ISO timestamp)')
  .option('--window-ends-at <iso>', 'Redemption window end (ISO timestamp)')
  .option(
    '--event-slug <slug>',
    'Attach a published or draft public event (repeatable)',
    collect,
    []
  )
  .option('--inactive', 'Create the campaign in disabled state')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)

    const preview = {
      slug: normalizePartnerCampaignSlug(options.slug),
      partnerName: options.partnerName,
      campaignName: options.campaignName,
      grantedTier: parseTier(options.grantedTier),
      accessDurationDays: options.durationDays,
      maxRedemptions: options.maxRedemptions,
      eventSlugs: options.eventSlug,
      publicUrl: `https://coachwatts.com/partners/${normalizePartnerCampaignSlug(options.slug)}`
    }
    console.log(chalk.cyan('Campaign preview:'))
    console.log(JSON.stringify(preview, null, 2))

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run only. No database write performed.'))
      return
    }

    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.create({
        data: {
          slug: normalizePartnerCampaignSlug(options.slug),
          partnerName: options.partnerName,
          campaignName: options.campaignName,
          grantedTier: parseTier(options.grantedTier),
          accessDurationDays: options.durationDays,
          maxRedemptions: options.maxRedemptions,
          windowStartsAt: options.windowStartsAt ? new Date(options.windowStartsAt) : null,
          windowEndsAt: options.windowEndsAt ? new Date(options.windowEndsAt) : null,
          isActive: !options.inactive
        }
      })

      if (options.eventSlug?.length) {
        await attachEventSlugs(prisma, campaign.id, options.eventSlug)
      }

      const full = await loadCampaignWithEvents(prisma, campaign.slug)
      console.log(chalk.green('✅ Partner campaign created.'))
      if (full) printCampaignDetail(full)
    } catch (error) {
      console.error(chalk.red('Failed to create campaign:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('show')
  .description('Inspect a partner campaign')
  .argument('<slug>', 'Campaign slug')
  .option('--prod', 'Use production database')
  .action(async (slug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await loadCampaignWithEvents(prisma, slug)
      if (!campaign) {
        console.log(chalk.yellow(`Campaign not found: ${slug}`))
        return
      }
      printCampaignDetail(campaign)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('list')
  .description('List partner campaigns')
  .option('--prod', 'Use production database')
  .action(async (options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaigns = await prisma.partnerCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { campaignEvents: true } } }
      })

      console.table(
        campaigns.map((campaign) => ({
          slug: campaign.slug,
          partner: campaign.partnerName,
          tier: campaign.grantedTier,
          redemptions: `${campaign.redemptionCount}/${campaign.maxRedemptions}`,
          events: campaign._count.campaignEvents,
          availability: getCampaignAvailability(campaign),
          active: campaign.isActive
        }))
      )
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('disable')
  .description('Disable a partner campaign')
  .argument('<slug>', 'Campaign slug')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (slug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)
    if (options.dryRun) {
      console.log(chalk.yellow(`Dry run: would disable ${normalizePartnerCampaignSlug(slug)}`))
      return
    }
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.update({
        where: { slug: normalizePartnerCampaignSlug(slug) },
        data: { isActive: false }
      })
      console.log(chalk.green(`Disabled campaign ${campaign.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to disable campaign:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('update-capacity')
  .description('Adjust campaign capacity or re-enable a campaign')
  .argument('<slug>', 'Campaign slug')
  .option('--max-redemptions <count>', 'New maximum redemptions', (value) => Number(value))
  .option('--enable', 'Re-enable a disabled campaign')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (slug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)
    if (options.dryRun) {
      console.log(
        chalk.yellow(`Dry run: would update capacity for ${normalizePartnerCampaignSlug(slug)}`)
      )
      return
    }
    const { prisma, pool } = createPrisma(isProd)

    try {
      const campaign = await prisma.partnerCampaign.update({
        where: { slug: normalizePartnerCampaignSlug(slug) },
        data: {
          ...(options.maxRedemptions ? { maxRedemptions: options.maxRedemptions } : {}),
          ...(options.enable ? { isActive: true } : {})
        }
      })
      console.log(chalk.green(`Updated campaign ${campaign.slug}`))
      console.log(
        JSON.stringify(
          {
            maxRedemptions: campaign.maxRedemptions,
            redemptionCount: campaign.redemptionCount,
            isActive: campaign.isActive
          },
          null,
          2
        )
      )
    } catch (error) {
      console.error(chalk.red('Failed to update campaign:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('attach-event')
  .description('Attach a public event to a campaign')
  .argument('<campaign-slug>', 'Campaign slug')
  .argument('<event-slug>', 'Public event slug')
  .option('--primary', 'Mark this event as the campaign primary event')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (campaignSlug, eventSlug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)

    const preview = {
      campaignSlug: normalizePartnerCampaignSlug(campaignSlug),
      eventSlug: normalizeSlug(eventSlug),
      primary: Boolean(options.primary)
    }
    console.log(chalk.cyan('Attach preview:'), JSON.stringify(preview, null, 2))
    if (options.dryRun) {
      console.log(chalk.yellow('Dry run only. No database write performed.'))
      return
    }

    const { prisma, pool } = createPrisma(isProd)
    try {
      const campaign = await prisma.partnerCampaign.findUnique({
        where: { slug: normalizePartnerCampaignSlug(campaignSlug) }
      })
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignSlug}`)
      }

      const publicEvent = await prisma.publicEvent.findUnique({
        where: { slug: normalizeSlug(eventSlug) }
      })
      if (!publicEvent) {
        throw new Error(`Public event not found: ${eventSlug}`)
      }

      const existingCount = await prisma.partnerCampaignEvent.count({
        where: { campaignId: campaign.id }
      })

      if (options.primary) {
        await prisma.partnerCampaignEvent.updateMany({
          where: { campaignId: campaign.id },
          data: { isPrimary: false }
        })
      }

      await prisma.partnerCampaignEvent.upsert({
        where: {
          campaignId_publicEventId: {
            campaignId: campaign.id,
            publicEventId: publicEvent.id
          }
        },
        update: {
          isPrimary: Boolean(options.primary) || existingCount === 0
        },
        create: {
          campaignId: campaign.id,
          publicEventId: publicEvent.id,
          displayOrder: existingCount,
          isPrimary: Boolean(options.primary) || existingCount === 0
        }
      })

      const full = await loadCampaignWithEvents(prisma, campaign.slug)
      console.log(chalk.green('✅ Event attached.'))
      if (full) printCampaignDetail(full)
    } catch (error) {
      console.error(chalk.red('Failed to attach event:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('detach-event')
  .description('Detach a public event from a campaign')
  .argument('<campaign-slug>', 'Campaign slug')
  .argument('<event-slug>', 'Public event slug')
  .option('--prod', 'Use production database')
  .option('--confirm-prod', 'Required with --prod for non-dry-run writes')
  .option('--dry-run', 'Preview without writing')
  .action(async (campaignSlug, eventSlug, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    assertProdWriteAllowed(options)
    if (options.dryRun) {
      console.log(
        chalk.yellow(
          `Dry run: would detach ${normalizeSlug(eventSlug)} from ${normalizePartnerCampaignSlug(campaignSlug)}`
        )
      )
      return
    }

    const { prisma, pool } = createPrisma(isProd)
    try {
      const campaign = await prisma.partnerCampaign.findUnique({
        where: { slug: normalizePartnerCampaignSlug(campaignSlug) }
      })
      const publicEvent = await prisma.publicEvent.findUnique({
        where: { slug: normalizeSlug(eventSlug) }
      })
      if (!campaign || !publicEvent) {
        throw new Error('Campaign or event not found')
      }

      await prisma.partnerCampaignEvent.delete({
        where: {
          campaignId_publicEventId: {
            campaignId: campaign.id,
            publicEventId: publicEvent.id
          }
        }
      })

      console.log(chalk.green(`Detached ${publicEvent.slug} from ${campaign.slug}`))
    } catch (error) {
      console.error(chalk.red('Failed to detach event:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

partnersCommand
  .command('user-grant')
  .description('Inspect a user promotional grant for support (no partner reporting)')
  .argument('<query>', 'User email or ID')
  .option('--prod', 'Use production database')
  .action(async (query, options) => {
    const isProd = Boolean(options.prod)
    printProdWarning(isProd)
    const { prisma, pool } = createPrisma(isProd)

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: query }, { email: { equals: query, mode: 'insensitive' } }]
        },
        select: {
          id: true,
          email: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionPeriodEnd: true
        }
      })

      if (!user) {
        console.log(chalk.yellow(`User not found: ${query}`))
        return
      }

      const redemptions = await prisma.partnerCampaignRedemption.findMany({
        where: { userId: user.id },
        include: {
          campaign: {
            select: {
              slug: true,
              partnerName: true,
              campaignName: true
            }
          }
        },
        orderBy: { redeemedAt: 'desc' }
      })

      console.log(
        JSON.stringify(
          {
            user: {
              id: user.id,
              email: user.email,
              subscriptionTier: user.subscriptionTier,
              subscriptionStatus: user.subscriptionStatus,
              subscriptionPeriodEnd: user.subscriptionPeriodEnd?.toISOString() ?? null
            },
            grants: redemptions.map((redemption) => ({
              campaignSlug: redemption.campaign.slug,
              partnerName: redemption.campaign.partnerName,
              campaignName: redemption.campaign.campaignName,
              grantedTier: redemption.grantedTier,
              startsAt: redemption.startsAt.toISOString(),
              endsAt: redemption.endsAt.toISOString(),
              active: redemption.endsAt > new Date()
            }))
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

export default partnersCommand
