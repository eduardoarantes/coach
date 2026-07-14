import type { PricingTier } from '~/utils/pricing'
import { resolveRecommendedUpgradeTier } from '~~/shared/quota-paywall'
import type { SubscriptionTier } from '@prisma/client'

interface UpgradeModalOptions {
  title?: string
  feature?: string
  featureTitle?: string
  featureDescription?: string
  bullets?: string[]
  recommendedTier?: PricingTier
  reason?: string
  quotaResetLabel?: string
  operation?: string
}

export function useUpgradeModal() {
  const isOpen = useState<boolean>('upgradeModalOpen', () => false)
  const options = useState<UpgradeModalOptions>('upgradeModalOptions', () => ({}))
  const { trackUpgradeView, trackModalOpen, trackModalDismiss } = useAnalytics()
  const userStore = useUserStore()

  function show(opts: UpgradeModalOptions = {}) {
    const subscriptionTier = (userStore.user?.subscriptionTier || 'FREE') as SubscriptionTier
    const resolvedTier = opts.recommendedTier ?? resolveRecommendedUpgradeTier(subscriptionTier)

    options.value = {
      ...opts,
      recommendedTier: resolvedTier
    }
    isOpen.value = true

    const featureName = opts.featureTitle || opts.title || 'Upgrade Plan'
    trackUpgradeView(featureName, opts.reason || 'upsell')
    trackModalOpen('upgrade_modal', featureName)
  }

  function close() {
    trackModalDismiss('upgrade_modal')
    isOpen.value = false
  }

  return {
    isOpen,
    options,
    show,
    close
  }
}
