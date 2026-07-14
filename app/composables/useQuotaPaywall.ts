import type { PricingTier } from '~/utils/pricing'
import type { QuotaStatus } from '~/types/quotas'
import type { SubscriptionTier } from '@prisma/client'
import {
  buildQuotaFeatureDescription,
  buildQuotaUpgradeBullets,
  resolveRecommendedUpgradeTier,
  type QuotaPaywallOperation
} from '~~/shared/quota-paywall'

export interface QuotaPaywallOptions {
  operation?: QuotaPaywallOperation
  title?: string
  featureTitle: string
  featureDescription?: string
  recommendedTier?: PricingTier
  bullets?: string[]
  reason?: string
  quota?: QuotaStatus | null
  quotaResetLabel?: string
}

export function useQuotaPaywall() {
  const upgradeModal = useUpgradeModal()
  const userStore = useUserStore()
  const quotasState = useState<any | null>('profileQuotaSummary', () => null)

  async function ensureQuotasLoaded() {
    if (quotasState.value) return quotasState.value
    quotasState.value = await $fetch('/api/profile/quotas')
    return quotasState.value
  }

  function getQuotaForOperation(
    operation: string,
    quotas?: QuotaStatus[] | null
  ): QuotaStatus | null {
    const list = quotas || quotasState.value?.quotas
    if (!Array.isArray(list)) return null
    return list.find((entry) => entry.operation === operation) || null
  }

  function buildPaywallOptions(input: QuotaPaywallOptions) {
    const subscriptionTier = (userStore.user?.subscriptionTier || 'FREE') as SubscriptionTier
    const quota = input.quota ?? (input.operation ? getQuotaForOperation(input.operation) : null)
    const recommendedTier = input.recommendedTier ?? resolveRecommendedUpgradeTier(subscriptionTier)
    const nextTierName = recommendedTier === 'pro' ? 'Pro' : 'Supporter'

    return {
      title: input.title || 'Upgrade Your Plan',
      featureTitle: input.featureTitle,
      featureDescription:
        input.featureDescription ||
        buildQuotaFeatureDescription({
          featureLabel: input.featureTitle,
          quota,
          nextTierName
        }),
      recommendedTier,
      bullets:
        input.bullets ||
        (input.operation
          ? buildQuotaUpgradeBullets(
              input.operation,
              quota?.nextTier || (recommendedTier === 'pro' ? 'PRO' : 'SUPPORTER'),
              quota?.nextTierLimit,
              quota?.window
            )
          : []),
      reason: input.reason || 'quota_exceeded',
      quotaResetLabel: input.quotaResetLabel,
      operation: input.operation
    }
  }

  async function showQuotaPaywall(input: QuotaPaywallOptions) {
    if (input.operation) {
      await ensureQuotasLoaded()
    }
    upgradeModal.show(buildPaywallOptions(input))
  }

  async function getOperationQuota(operation: string) {
    await ensureQuotasLoaded()
    return getQuotaForOperation(operation)
  }

  function isQuotaExhausted(quota: QuotaStatus | null | undefined) {
    if (!quota) return false
    return quota.remaining <= 0 || !quota.allowed
  }

  function shouldShowQuotaMeterForUser() {
    return userStore.user?.subscriptionTier === 'FREE'
  }

  async function handleLockedAction(params: {
    operation: QuotaPaywallOperation
    featureTitle: string
    onAllowed: () => void | Promise<void>
  }) {
    if (!shouldShowQuotaMeterForUser()) {
      await params.onAllowed()
      return
    }

    await ensureQuotasLoaded()
    const quota = getQuotaForOperation(params.operation)
    if (isQuotaExhausted(quota)) {
      await showQuotaPaywall({
        operation: params.operation,
        featureTitle: params.featureTitle,
        reason: 'locked_affordance',
        quota
      })
      return
    }

    await params.onAllowed()
  }

  function useOperationLockState(operation: QuotaPaywallOperation) {
    const locked = computed(() => {
      if (!shouldShowQuotaMeterForUser()) return false
      return isQuotaExhausted(getQuotaForOperation(operation))
    })

    const lockedTierLabel = computed(() => {
      const subscriptionTier = (userStore.user?.subscriptionTier || 'FREE') as SubscriptionTier
      return resolveRecommendedUpgradeTier(subscriptionTier) === 'pro' ? 'Pro' : 'Supporter'
    })

    onMounted(() => {
      void ensureQuotasLoaded()
    })

    return { locked, lockedTierLabel }
  }

  return {
    ensureQuotasLoaded,
    getOperationQuota,
    getQuotaForOperation,
    isQuotaExhausted,
    shouldShowQuotaMeterForUser,
    showQuotaPaywall,
    buildPaywallOptions,
    handleLockedAction,
    useOperationLockState
  }
}
