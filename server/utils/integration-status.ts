import { prisma } from './db'

export async function getUserIntegrationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      integrations: {
        select: {
          id: true,
          provider: true,
          lastSyncAt: true,
          syncStatus: true,
          externalUserId: true,
          ingestWorkouts: true,
          errorMessage: true
        }
      },
      oauthConsents: {
        include: {
          app: {
            select: {
              name: true,
              logoUrl: true
            }
          }
        }
      },
      accounts: {
        where: { provider: 'intervals' },
        select: {
          provider: true,
          access_token: true,
          providerAccountId: true,
          scope: true
        }
      }
    }
  })

  if (!user) return { integrations: [] }

  const oauthTokenUsage = await prisma.oAuthToken.groupBy({
    by: ['appId'],
    where: { userId: user.id },
    _max: {
      lastUsedAt: true,
      createdAt: true
    }
  })

  const oauthLastActivityByAppId = new Map(
    oauthTokenUsage.map((entry) => [
      entry.appId,
      entry._max.lastUsedAt || entry._max.createdAt || null
    ])
  )

  const oauthIntegrations = user.oauthConsents.map((consent) => ({
    id: consent.id,
    provider: consent.app.name,
    isOAuthApp: true,
    lastSyncAt: oauthLastActivityByAppId.get(consent.appId) || consent.updatedAt,
    syncStatus: 'AUTHORIZED',
    logoUrl: consent.app.logoUrl,
    scopes: consent.scopes
  }))

  const allIntegrations = [...user.integrations, ...oauthIntegrations]

  const hasIntervalsAccount = user.accounts.some((a) => a.provider === 'intervals')
  const hasIntervalsIntegration = user.integrations.some((i) => i.provider === 'intervals')

  if (hasIntervalsAccount && !hasIntervalsIntegration) {
    const account = user.accounts.find((a) => a.provider === 'intervals')
    if (account?.access_token) {
      try {
        const newIntegration = await prisma.integration.create({
          data: {
            userId: user.id,
            provider: 'intervals',
            accessToken: account.access_token,
            externalUserId: account.providerAccountId,
            scope: account.scope,
            syncStatus: 'SUCCESS',
            lastSyncAt: new Date(),
            ingestWorkouts: true
          }
        })

        allIntegrations.push({
          id: newIntegration.id,
          provider: newIntegration.provider,
          lastSyncAt: newIntegration.lastSyncAt,
          syncStatus: newIntegration.syncStatus,
          externalUserId: newIntegration.externalUserId,
          ingestWorkouts: newIntegration.ingestWorkouts,
          errorMessage: newIntegration.errorMessage
        } as any)
      } catch (error) {
        console.error('Failed to self-heal Intervals.icu integration:', error)
      }
    }
  }

  return {
    count: allIntegrations.length,
    integrations: allIntegrations.map((integration: any) => ({
      id: integration.id,
      provider: integration.provider,
      last_sync_at: integration.lastSyncAt,
      sync_status: integration.syncStatus,
      ingest_workouts: integration.ingestWorkouts ?? null,
      error_message: integration.errorMessage ?? null,
      is_oauth_app: integration.isOAuthApp ?? false
    }))
  }
}
