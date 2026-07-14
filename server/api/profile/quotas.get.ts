import { getServerSession } from '../../utils/session'
import { getQuotaSummary } from '../../utils/quotas/engine'
import {
  QUOTA_REGISTRY,
  mapOperationToQuota,
  type QuotaOperation
} from '../../utils/quotas/registry'
import type { SubscriptionTier } from '@prisma/client'
import type { QuotaStatus } from '~~/app/types/quotas'

function resolveEffectiveTier(user: {
  subscriptionTier: SubscriptionTier
  trialEndsAt: Date | null
}): SubscriptionTier {
  const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > new Date()
  return user.subscriptionTier === 'FREE' && isTrialActive ? 'SUPPORTER' : user.subscriptionTier
}

function getNextTier(tier: SubscriptionTier): 'SUPPORTER' | 'PRO' | null {
  if (tier === 'FREE') return 'SUPPORTER'
  if (tier === 'SUPPORTER') return 'PRO'
  return null
}

function enrichQuotasWithNextTier(
  quotas: QuotaStatus[],
  effectiveTier: SubscriptionTier
): QuotaStatus[] {
  const nextTier = getNextTier(effectiveTier)
  if (!nextTier) return quotas

  return quotas.map((quota) => {
    const canonicalOp = mapOperationToQuota(quota.operation) || (quota.operation as QuotaOperation)
    const nextTierLimit = QUOTA_REGISTRY[nextTier][canonicalOp]?.limit ?? null
    return {
      ...quota,
      nextTier,
      nextTierLimit
    }
  })
}

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Get user LLM quotas',
    description:
      'Returns the current usage and limits for LLM operations based on the user subscription tier.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tier: { type: 'string' },
                quotas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      operation: { type: 'string' },
                      allowed: { type: 'boolean' },
                      used: { type: 'integer' },
                      limit: { type: 'integer' },
                      remaining: { type: 'integer' },
                      window: { type: 'string' },
                      resetsAt: { type: 'string', format: 'date-time' },
                      enforcement: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, trialEndsAt: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const quotas = await getQuotaSummary(userId)
  const effectiveTier = resolveEffectiveTier(user)
  const enrichedQuotas = enrichQuotasWithNextTier(quotas, effectiveTier)
  const isTrialActive = Boolean(user.trialEndsAt && new Date(user.trialEndsAt) > new Date())

  return {
    tier: user.subscriptionTier,
    trialEndsAt: user.trialEndsAt,
    isTrialActive,
    showQuotaMeter: user.subscriptionTier === 'FREE',
    effectiveTier,
    quotas: enrichedQuotas
  }
})
