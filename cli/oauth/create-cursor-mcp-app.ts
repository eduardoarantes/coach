import { Command } from 'commander'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { oauthRepository } from '../../server/utils/repositories/oauthRepository'
import {
  CURSOR_MCP_APP_NAME,
  CURSOR_MCP_REDIRECT_URIS
} from '../../server/utils/oauth/cursor-mcp-client'

function connectDatabase(isProd: boolean) {
  const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

  if (!connectionString) {
    console.error(
      chalk.red(isProd ? 'DATABASE_URL_PROD is not defined.' : 'DATABASE_URL is not defined.')
    )
    process.exit(1)
  }

  process.env.DATABASE_URL = connectionString
  const pool = new pg.Pool({ connectionString })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  globalThis.prismaGlobalV2 = prisma

  if (isProd) {
    console.log(chalk.yellow('Using PRODUCTION database.'))
  } else {
    console.log(chalk.blue('Using DEVELOPMENT database.'))
  }

  return { prisma, pool }
}

const createCursorMcpAppCommand = new Command('create-cursor-mcp-app')
  .description('Pre-register a public OAuth app for Cursor MCP with standard redirect URIs')
  .requiredOption('--owner-email <email>', 'Owner email address')
  .option('--prod', 'Use production database')
  .option('--name <name>', 'Application name', CURSOR_MCP_APP_NAME)
  .option('--force', 'Update redirect URIs if an app with the same name already exists')
  .action(async (options) => {
    const { prisma, pool } = connectDatabase(Boolean(options.prod))

    try {
      const user = await prisma.user.findUnique({
        where: { email: options.ownerEmail }
      })

      if (!user) {
        console.error(chalk.red(`User with email ${options.ownerEmail} not found`))
        process.exit(1)
      }

      const existing = await prisma.oAuthApp.findFirst({
        where: {
          ownerId: user.id,
          name: options.name
        },
        select: {
          id: true,
          clientId: true,
          redirectUris: true,
          isPublicClient: true
        }
      })

      if (existing) {
        const redirectUris = [...CURSOR_MCP_REDIRECT_URIS]
        const sameRedirects =
          existing.redirectUris.length === redirectUris.length &&
          redirectUris.every((uri) => existing.redirectUris.includes(uri))

        if (sameRedirects && existing.isPublicClient) {
          console.log(chalk.green('\n✅ Cursor MCP app already exists.'))
          console.log(chalk.gray('--------------------------------------------------'))
          console.log(`${chalk.bold('Name:')}      ${options.name}`)
          console.log(`${chalk.bold('Client ID:')} ${existing.clientId}`)
          console.log(chalk.gray('--------------------------------------------------\n'))
          return
        }

        if (!options.force) {
          console.error(
            chalk.red(
              `An app named "${options.name}" already exists for ${options.ownerEmail}. Re-run with --force to update redirect URIs.`
            )
          )
          process.exit(1)
        }

        const updated = await prisma.oAuthApp.update({
          where: { id: existing.id },
          data: {
            redirectUris,
            isPublicClient: true,
            registrationType: 'manual',
            description: 'Pre-registered MCP client for Cursor'
          },
          select: {
            clientId: true,
            redirectUris: true
          }
        })

        console.log(chalk.green('\n✅ Cursor MCP app updated successfully!'))
        console.log(chalk.gray('--------------------------------------------------'))
        console.log(`${chalk.bold('Name:')}          ${options.name}`)
        console.log(`${chalk.bold('Client ID:')}     ${updated.clientId}`)
        console.log(`${chalk.bold('Redirect URIs:')} ${updated.redirectUris.join(', ')}`)
        console.log(chalk.gray('--------------------------------------------------\n'))
        return
      }

      const app = await oauthRepository.createPublicMcpClient({
        ownerId: user.id,
        name: options.name,
        redirectUris: [...CURSOR_MCP_REDIRECT_URIS],
        homepageUrl: 'https://cursor.com'
      })

      console.log(chalk.green('\n✅ Cursor MCP app created successfully!'))
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(`${chalk.bold('Name:')}          ${options.name}`)
      console.log(`${chalk.bold('Client ID:')}     ${app.clientId}`)
      console.log(`${chalk.bold('Redirect URIs:')} ${app.redirectUris.join(', ')}`)
      console.log(chalk.gray('--------------------------------------------------'))
      console.log(
        chalk.cyan('Add to .cursor/mcp.json auth.CLIENT_ID or export COACH_WATTS_MCP_CLIENT_ID')
      )
      console.log(chalk.gray('--------------------------------------------------\n'))
    } catch (error) {
      console.error(chalk.red('Failed to create Cursor MCP app:'), error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default createCursorMcpAppCommand
