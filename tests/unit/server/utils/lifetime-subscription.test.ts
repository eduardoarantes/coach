import { describe, expect, it } from 'vitest'
import {
  isLifetimeSubscriber,
  stripeBillingResetData
} from '../../../../server/utils/lifetime-subscription'

describe('lifetime-subscription helpers', () => {
  it('detects CONTRIBUTOR as lifetime access', () => {
    expect(isLifetimeSubscriber({ subscriptionStatus: 'CONTRIBUTOR' })).toBe(true)
    expect(isLifetimeSubscriber({ subscriptionStatus: 'ACTIVE' })).toBe(false)
  })

  it('preserves tier/status when clearing Stripe ids for lifetime users', () => {
    expect(stripeBillingResetData(true)).toEqual({
      stripeCustomerId: null,
      stripeSubscriptionId: null
    })
  })

  it('resets billing fields for non-lifetime users', () => {
    expect(stripeBillingResetData(false)).toEqual({
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null,
      pendingSubscriptionTier: null,
      pendingSubscriptionPeriodEnd: null
    })
  })
})
