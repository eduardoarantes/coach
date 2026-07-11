import type { SubscriptionTier, User } from '@prisma/client'
import { prisma } from './db'

export function isLifetimeSubscriber(user: Pick<User, 'subscriptionStatus'>): boolean {
  return user.subscriptionStatus === 'CONTRIBUTOR'
}

export async function grantLifetimeSubscription(
  userId: string,
  tier: Extract<SubscriptionTier, 'PRO' | 'SUPPORTER'> = 'PRO'
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: 'CONTRIBUTOR',
      subscriptionPeriodEnd: null
    },
    select: {
      id: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true
    }
  })
}

export async function revokeLifetimeSubscription(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null
    },
    select: {
      id: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true
    }
  })
}

export function stripeBillingResetData(isLifetime: boolean) {
  if (isLifetime) {
    return {
      stripeCustomerId: null,
      stripeSubscriptionId: null
    }
  }

  return {
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionTier: 'FREE' as const,
    subscriptionStatus: 'NONE' as const,
    subscriptionPeriodEnd: null,
    pendingSubscriptionTier: null,
    pendingSubscriptionPeriodEnd: null
  }
}
