<script setup lang="ts">
  import { sanitizeCallbackUrl } from '#shared/safe-callback-url'

  const props = defineProps<{
    slug: string
    campaignSlug?: string | null
  }>()

  const route = useRoute()
  const toast = useToast()
  const { data: session } = useAuth()
  const {
    trackPartnerEventView,
    trackPartnerEventJoinStart,
    trackPartnerEventJoinCompleted,
    trackPartnerEventJoinAlreadyExists,
    trackOfficialEventRegistrationClick
  } = useAnalytics()

  const loading = ref(true)
  const joining = ref(false)
  const error = ref<string | null>(null)
  const payload = ref<any>(null)
  const showConfirm = ref(false)
  const priority = ref<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH')
  const phase = ref('BUILD')

  const event = computed(() => payload.value?.event)
  const enrollment = computed(() => payload.value?.enrollment)

  const callbackPath = computed(() =>
    sanitizeCallbackUrl(
      `/events/${props.slug}?join=1${props.campaignSlug ? `&campaign=${props.campaignSlug}` : ''}`,
      '/dashboard'
    )
  )
  const signupUrl = computed(() => `/join?callbackUrl=${encodeURIComponent(callbackPath.value)}`)
  const loginUrl = computed(() => `/login?callbackUrl=${encodeURIComponent(callbackPath.value)}`)

  const locationLabel = computed(() => {
    if (!event.value) return null
    if (event.value.isVirtual) return 'Virtual'
    return (
      event.value.location ||
      [event.value.city, event.value.country].filter(Boolean).join(', ') ||
      null
    )
  })

  async function fetchEvent() {
    loading.value = true
    error.value = null
    try {
      payload.value = await $fetch(`/api/public-events/${props.slug}`)
      trackPartnerEventView(props.campaignSlug || null, props.slug)
    } catch (err: any) {
      error.value = err.data?.message || 'Event not found.'
    } finally {
      loading.value = false
    }
  }

  async function joinEvent() {
    if (!session.value) {
      trackPartnerEventJoinStart(props.campaignSlug || null, props.slug)
      await navigateTo(signupUrl.value)
      return
    }

    joining.value = true
    try {
      trackPartnerEventJoinStart(props.campaignSlug || null, props.slug)
      const response = await $fetch(`/api/public-events/${props.slug}/join`, {
        method: 'POST',
        body: { priority: priority.value, phase: phase.value }
      })
      if (response.status === 'ALREADY_JOINED') {
        trackPartnerEventJoinAlreadyExists(props.campaignSlug || null, props.slug)
      } else {
        trackPartnerEventJoinCompleted(props.campaignSlug || null, props.slug)
      }
      toast.add({
        title: response.status === 'ALREADY_JOINED' ? 'Already added' : 'Goal created',
        description: response.message,
        color: 'success'
      })
      showConfirm.value = false
      await fetchEvent()
    } catch (err: any) {
      toast.add({
        title: 'Could not add event',
        description: err.data?.message || 'Please try again later.',
        color: 'error'
      })
    } finally {
      joining.value = false
    }
  }

  function onOfficialRegistrationClick() {
    trackOfficialEventRegistrationClick(props.campaignSlug || null, props.slug)
  }

  onMounted(fetchEvent)

  watch(
    () => props.slug,
    () => {
      void fetchEvent()
    }
  )

  watchEffect(() => {
    if (
      import.meta.client &&
      session.value &&
      payload.value &&
      !loading.value &&
      route.query.join === '1' &&
      !enrollment.value?.enrolled &&
      !joining.value &&
      !showConfirm.value
    ) {
      showConfirm.value = true
    }
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
        <p class="text-neutral-500 font-medium">Loading event...</p>
      </div>

      <div v-else-if="error" class="p-10 text-center space-y-6">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-error-500 mx-auto" />
        <div class="space-y-2">
          <h1 class="text-2xl font-black uppercase tracking-tight">Event unavailable</h1>
          <p class="text-neutral-500">{{ error }}</p>
        </div>
        <UButton to="/" color="neutral" variant="ghost" label="Back to home" block size="lg" />
      </div>

      <div v-else-if="event" class="p-0">
        <div class="bg-primary-600 p-8 text-white space-y-3">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Public event</p>
          <h1 class="text-3xl font-black uppercase tracking-tight leading-tight">
            {{ event.title }}
          </h1>
          <p class="text-sm text-primary-50/90">{{ event.organizerName }}</p>
        </div>

        <div class="p-8 space-y-6">
          <p v-if="event.description" class="text-neutral-600 dark:text-neutral-300">
            {{ event.description }}
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Date</p>
              <p class="mt-1 font-semibold">
                {{ new Date(event.date).toLocaleDateString() }}
                <span v-if="event.startTime" class="text-neutral-500">
                  · {{ event.startTime }}</span
                >
              </p>
              <p class="text-xs text-neutral-500 mt-1">{{ event.timezone }}</p>
            </div>
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Location</p>
              <p class="mt-1 font-semibold">{{ locationLabel || 'TBA' }}</p>
            </div>
            <div
              v-if="event.distance || event.elevation"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Course</p>
              <p class="mt-1 font-semibold">
                <span v-if="event.distance">{{ event.distance }} km</span>
                <span v-if="event.distance && event.elevation"> · </span>
                <span v-if="event.elevation">{{ event.elevation }} m elev</span>
              </p>
            </div>
            <div
              v-if="event.type || event.subType"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Sport</p>
              <p class="mt-1 font-semibold">
                {{ [event.type, event.subType].filter(Boolean).join(' · ') }}
              </p>
            </div>
          </div>

          <UAlert
            color="neutral"
            variant="subtle"
            title="Coach Watts training goal, not official race registration"
            description="Adding this event creates a personal training goal in Coach Watts. Official race entry is handled separately by the organizer."
          />

          <div class="space-y-3">
            <UButton
              v-if="event.registrationUrl"
              :to="event.registrationUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="neutral"
              variant="soft"
              block
              @click="onOfficialRegistrationClick"
            >
              Official race registration
            </UButton>

            <UButton
              v-if="enrollment?.enrolled && enrollment.goalId"
              :to="`/profile/goals`"
              color="primary"
              variant="soft"
              block
            >
              Already in your Coach Watts goals
            </UButton>

            <UButton
              v-else
              color="primary"
              size="xl"
              block
              class="font-black uppercase tracking-wide"
              :loading="joining"
              @click="
                () => {
                  if (session) {
                    showConfirm = true
                    return
                  }
                  void joinEvent()
                }
              "
            >
              {{ session ? 'Add as my Coach Watts training goal' : 'Sign up to add this goal' }}
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
        </div>
      </div>
    </UCard>

    <UModal v-model:open="showConfirm">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-bold text-lg">Confirm training goal</h3>
          </template>
          <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            This adds <strong>{{ event?.title }}</strong> as a Coach Watts training goal. It does
            not register you for the official race.
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
                  showConfirm = false
                }
              "
            >
              Cancel
            </UButton>
            <UButton color="primary" :loading="joining" @click="joinEvent">
              Confirm and add goal
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
