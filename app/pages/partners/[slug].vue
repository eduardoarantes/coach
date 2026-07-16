<script setup lang="ts">
  import { sanitizeCallbackUrl } from '#shared/safe-callback-url'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useAuth()
  const userStore = useUserStore()
  const {
    trackPartnerPageView,
    trackPartnerSignupStart,
    trackPartnerRedemption,
    trackPartnerEventJoinStart,
    trackPartnerEventJoinCompleted,
    trackPartnerEventJoinAlreadyExists,
    trackOfficialEventRegistrationClick
  } = useAnalytics()

  const slug = computed(() => String(route.params.slug || '').toLowerCase())
  const campaignData = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const redeeming = ref(false)
  const autoRedeeming = ref(false)
  const joiningSlug = ref<string | null>(null)
  const redemptionResult = ref<any>(null)
  const confirmEvent = ref<any>(null)
  const priority = ref<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH')
  const phase = ref('BUILD')

  const callbackPath = computed(() =>
    sanitizeCallbackUrl(`/partners/${slug.value}?redeem=1`, '/dashboard')
  )
  const signupUrl = computed(() => `/join?callbackUrl=${encodeURIComponent(callbackPath.value)}`)
  const loginUrl = computed(() => `/login?callbackUrl=${encodeURIComponent(callbackPath.value)}`)

  const availability = computed(() => campaignData.value?.campaign?.availability || 'DISABLED')
  const campaign = computed(() => campaignData.value?.campaign)
  const userState = computed(() => campaignData.value?.userState)
  const events = computed(() => campaign.value?.events || [])
  const hasRedeemed = computed(
    () => Boolean(userState.value?.alreadyRedeemed) || Boolean(redemptionResult.value)
  )

  const headline = computed(() => {
    if (!campaign.value) return 'Partner offer'
    return `${campaign.value.accessDurationDays} days of Coach Watts ${campaign.value.grantedTier} for ${campaign.value.partnerName}`
  })

  const benefitCopy = computed(() => {
    if (!campaign.value) return ''
    if (campaign.value.grantedTier === 'PRO') {
      return 'Full PRO access: automatic sync and analysis, deep-reasoning AI, priority processing, and proactive coaching insights.'
    }
    return 'Supporter access: automatic sync and analysis with priority processing.'
  })

  const statusMessage = computed(() => {
    if (loading.value) return null
    if (error.value) return error.value
    if (redemptionResult.value?.message) return redemptionResult.value.message

    switch (availability.value) {
      case 'DISABLED':
        return 'This partner offer is currently unavailable.'
      case 'NOT_STARTED':
        return 'This partner offer is not open yet.'
      case 'EXPIRED':
        return 'This partner offer has ended.'
      case 'CAPACITY_REACHED':
        return `This pilot offer has reached its ${campaign.value?.maxRedemptions || 0}-member capacity.`
      default:
        if (userState.value?.alreadyRedeemed) {
          return 'You have already redeemed this offer.'
        }
        return null
    }
  })

  const canRedeem = computed(() => {
    return (
      availability.value === 'AVAILABLE' &&
      session.value &&
      !userState.value?.alreadyRedeemed &&
      !redemptionResult.value
    )
  })

  function formatEventDate(iso: string) {
    return new Date(iso).toLocaleDateString()
  }

  function eventLocation(event: any) {
    if (event.isVirtual) return 'Virtual'
    return event.location || [event.city, event.country].filter(Boolean).join(', ') || 'TBA'
  }

  async function fetchCampaign() {
    loading.value = true
    error.value = null
    try {
      campaignData.value = await $fetch(`/api/partners/${slug.value}`)
      trackPartnerPageView(slug.value, campaignData.value.campaign.availability)
    } catch (err: any) {
      error.value = err.data?.message || 'Partner offer not found.'
    } finally {
      loading.value = false
    }
  }

  async function redeemOffer() {
    if (!session.value) {
      trackPartnerSignupStart(slug.value)
      await navigateTo(signupUrl.value)
      return
    }

    redeeming.value = true
    try {
      const response = await $fetch(`/api/partners/${slug.value}/redeem`, {
        method: 'POST'
      })
      redemptionResult.value = response
      trackPartnerRedemption(
        slug.value,
        response.status === 'ALREADY_REDEEMED' ? 'already_redeemed' : 'completed'
      )
      await userStore.fetchUser(true)
      await fetchCampaign()
      toast.add({
        title: response.status === 'ALREADY_REDEEMED' ? 'Already redeemed' : 'Offer activated',
        description: response.message,
        color: 'success'
      })

      if (events.value.length === 1 && !events.value[0]?.enrollment?.enrolled) {
        confirmEvent.value = events.value[0]
      }
    } catch (err: any) {
      const reason = err.data?.reason || err.data?.message || 'unknown'
      trackPartnerRedemption(slug.value, 'rejected', reason)
      toast.add({
        title: 'Could not redeem offer',
        description: err.data?.message || 'Please try again later.',
        color: 'error'
      })
    } finally {
      redeeming.value = false
    }
  }

  async function joinEvent(event: any) {
    if (!session.value) {
      trackPartnerEventJoinStart(slug.value, event.slug)
      await navigateTo(signupUrl.value)
      return
    }

    joiningSlug.value = event.slug
    try {
      trackPartnerEventJoinStart(slug.value, event.slug)
      const response = await $fetch(`/api/public-events/${event.slug}/join`, {
        method: 'POST',
        body: { priority: priority.value, phase: phase.value }
      })
      if (response.status === 'ALREADY_JOINED') {
        trackPartnerEventJoinAlreadyExists(slug.value, event.slug)
      } else {
        trackPartnerEventJoinCompleted(slug.value, event.slug)
      }
      toast.add({
        title: response.status === 'ALREADY_JOINED' ? 'Already added' : 'Goal created',
        description: response.message,
        color: 'success'
      })
      confirmEvent.value = null
      await fetchCampaign()
    } catch (err: any) {
      toast.add({
        title: 'Could not add event',
        description: err.data?.message || 'Please try again later.',
        color: 'error'
      })
    } finally {
      joiningSlug.value = null
    }
  }

  onMounted(fetchCampaign)

  watchEffect(() => {
    if (
      import.meta.client &&
      session.value &&
      campaignData.value &&
      !loading.value &&
      route.query.redeem === '1' &&
      canRedeem.value &&
      !redeeming.value &&
      !autoRedeeming.value
    ) {
      autoRedeeming.value = true
      redeemOffer().finally(() => {
        autoRedeeming.value = false
        router.replace({ path: route.path, query: {} })
      })
    }
  })

  useSeoMeta({
    title: () => `${headline.value} | Coach Watts`,
    description: () =>
      benefitCopy.value ||
      'Redeem a time-limited partner offer for Coach Watts. No payment card required.'
  })
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
    <UCard class="w-full max-w-2xl overflow-hidden">
      <div v-if="loading" class="p-10 text-center space-y-4">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-12 h-12 text-primary-500 animate-spin mx-auto"
        />
        <p class="text-neutral-500 font-medium">Loading partner offer...</p>
      </div>

      <div v-else-if="error" class="p-10 text-center space-y-6">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mx-auto" />
        <div class="space-y-2">
          <h1 class="text-2xl font-black uppercase tracking-tight">Offer unavailable</h1>
          <p class="text-neutral-500">{{ error }}</p>
        </div>
        <UButton to="/" color="neutral" variant="ghost" label="Back to home" block size="lg" />
      </div>

      <div v-else-if="campaign" class="p-0">
        <div class="bg-primary-600 p-8 text-white space-y-3">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Partner offer</p>
          <h1 class="text-3xl font-black uppercase tracking-tight leading-tight">{{ headline }}</h1>
          <p class="text-sm text-primary-50/90">{{ campaign.campaignName }}</p>
        </div>

        <div class="p-8 space-y-6">
          <p class="text-neutral-600 dark:text-neutral-300">{{ benefitCopy }}</p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Payment</p>
              <p class="mt-1 font-semibold">No payment card required</p>
            </div>
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Billing</p>
              <p class="mt-1 font-semibold">No automatic charge</p>
            </div>
          </div>

          <p class="text-sm text-neutral-500">
            After {{ campaign.accessDurationDays }} days, your account continues on the permanent
            FREE tier unless you choose to upgrade.
          </p>

          <p v-if="campaign.maxRedemptions" class="text-xs text-neutral-500">
            This pilot offer is limited to {{ campaign.maxRedemptions }} members ({{
              campaign.redemptionCount
            }}
            redeemed so far).
          </p>

          <UAlert
            v-if="statusMessage"
            :color="
              availability === 'AVAILABLE' && !userState?.alreadyRedeemed ? 'primary' : 'neutral'
            "
            variant="subtle"
            :title="statusMessage"
          />

          <div class="space-y-3">
            <UButton
              color="primary"
              size="xl"
              block
              class="font-black uppercase tracking-wide"
              :loading="redeeming || autoRedeeming"
              :disabled="Boolean(session) && !canRedeem && !hasRedeemed"
              @click="redeemOffer"
            >
              {{
                session
                  ? canRedeem
                    ? 'Redeem offer'
                    : userState?.alreadyRedeemed || redemptionResult
                      ? 'Offer redeemed'
                      : 'Offer unavailable'
                  : 'Sign up to redeem'
              }}
            </UButton>

            <UButton
              v-if="!session"
              :to="loginUrl"
              color="neutral"
              variant="ghost"
              label="Already have an account? Log in"
              block
            />
          </div>

          <div
            v-if="events.length"
            class="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800"
          >
            <div>
              <h2 class="text-lg font-black uppercase tracking-tight">
                {{ hasRedeemed ? 'Next step: add your event' : 'Associated events' }}
              </h2>
              <p class="text-sm text-neutral-500 mt-1">
                Adding an event creates a Coach Watts training goal. It is not official race
                registration.
              </p>
            </div>

            <div
              v-for="event in events"
              :key="event.slug"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
              :class="event.isPrimary ? 'ring-1 ring-primary-500/40' : ''"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-lg">{{ event.title }}</p>
                  <p class="text-sm text-neutral-500">{{ event.organizerName }}</p>
                </div>
                <UBadge v-if="event.isPrimary" color="primary" variant="subtle">Primary</UBadge>
              </div>

              <div class="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                <p>{{ formatEventDate(event.date) }} · {{ eventLocation(event) }}</p>
                <p v-if="event.distance || event.elevation">
                  <span v-if="event.distance">{{ event.distance }} km</span>
                  <span v-if="event.distance && event.elevation"> · </span>
                  <span v-if="event.elevation">{{ event.elevation }} m elev</span>
                </p>
              </div>

              <div class="flex flex-col sm:flex-row gap-2">
                <UButton
                  v-if="event.registrationUrl"
                  :to="event.registrationUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  @click="trackOfficialEventRegistrationClick(slug, event.slug)"
                >
                  Official registration
                </UButton>

                <UButton
                  v-if="event.enrollment?.enrolled"
                  to="/profile/goals"
                  color="primary"
                  variant="soft"
                  size="sm"
                >
                  Already in your Coach Watts goals
                </UButton>

                <UButton
                  v-else
                  color="primary"
                  size="sm"
                  :loading="joiningSlug === event.slug"
                  :disabled="!session"
                  @click="confirmEvent = event"
                >
                  {{ session ? 'Add to my Coach Watts goals' : 'Log in to add goal' }}
                </UButton>

                <UButton
                  :to="`/events/${event.slug}?campaign=${slug}`"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                >
                  Event details
                </UButton>
              </div>
            </div>
          </div>

          <UButton
            v-if="session && hasRedeemed"
            to="/dashboard"
            color="neutral"
            variant="soft"
            label="Go to dashboard"
            block
          />
        </div>
      </div>
    </UCard>

    <UModal :open="Boolean(confirmEvent)" @update:open="(open) => !open && (confirmEvent = null)">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-bold text-lg">Confirm training goal</h3>
          </template>
          <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            This adds <strong>{{ confirmEvent?.title }}</strong> as a Coach Watts training goal. It
            does not register you for the official race.
          </p>
          <div class="grid gap-3 sm:grid-cols-2 mb-6">
            <UFormField label="Priority">
              <USelect
                v-model="priority"
                :items="[
                  { label: 'High', value: 'HIGH' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'Low', value: 'LOW' }
                ]"
              />
            </UFormField>
            <UFormField label="Phase">
              <USelect
                v-model="phase"
                :items="[
                  { label: 'Build', value: 'BUILD' },
                  { label: 'Base', value: 'BASE' },
                  { label: 'Peak', value: 'PEAK' },
                  { label: 'Taper', value: 'TAPER' }
                ]"
              />
            </UFormField>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton
              color="neutral"
              variant="ghost"
              @click="
                () => {
                  confirmEvent = null
                }
              "
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="Boolean(joiningSlug)"
              @click="
                () => {
                  if (confirmEvent) void joinEvent(confirmEvent)
                }
              "
            >
              Confirm and add goal
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
