import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getUserEntitlements } from '../../../../server/utils/entitlements'

vi.stubGlobal('useRuntimeConfig', () => ({
  stripeSecretKey: 'sk_test_123'
}))

describe('getUserEntitlements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('treats CONTRIBUTOR as lifetime Pro access', () => {
    const entitlements = getUserEntitlements({
      subscriptionTier: 'PRO',
      subscriptionStatus: 'CONTRIBUTOR',
      subscriptionPeriodEnd: null
    })

    expect(entitlements.tier).toBe('PRO')
    expect(entitlements.aiModel).toBe('pro')
    expect(entitlements.proactivity).toBe(true)
    expect(entitlements.autoSync).toBe(true)
  })

  it('keeps grace period access for canceled subscriptions', () => {
    const entitlements = getUserEntitlements({
      subscriptionTier: 'PRO',
      subscriptionStatus: 'CANCELED',
      subscriptionPeriodEnd: new Date(Date.now() + 86_400_000)
    })

    expect(entitlements.tier).toBe('PRO')
  })
})
