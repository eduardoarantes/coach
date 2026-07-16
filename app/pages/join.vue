<template>
  <div
    class="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-x-clip bg-[oklch(12%_0.015_155)] px-4 py-10 sm:px-6 lg:py-16"
  >
    <UContainer class="relative z-10 w-full max-w-6xl">
      <div
        class="grid overflow-hidden rounded-2xl border border-white/10 bg-[oklch(14%_0.018_155)] lg:grid-cols-12"
      >
        <aside
          class="relative hidden flex-col justify-between border-r border-white/8 p-10 lg:col-span-5 lg:flex lg:p-12"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-primary-400">Coach Watts</p>
            <h2
              class="font-athletic mt-6 text-3xl font-bold uppercase leading-[0.95] tracking-tight text-white"
            >
              Eliminate the <span class="text-primary-400">guesswork</span>
            </h2>
            <p class="mt-4 text-sm font-medium leading-relaxed text-gray-400">
              {{ joinTagline }}
            </p>
          </div>

          <div class="mt-10 space-y-4">
            <div class="rounded-xl border border-white/8 bg-black/30 p-4">
              <p class="text-sm text-gray-300">“{{ userInquiry }}”</p>
            </div>
            <div class="rounded-xl border border-white/8 bg-black/40 p-4">
              <div class="mb-2 flex items-center gap-2">
                <UIcon name="i-heroicons-bolt-solid" class="h-4 w-4 text-primary-400" />
                <span class="text-xs font-bold uppercase tracking-widest text-gray-500"
                  >Coach Watts</span
                >
              </div>
              <p class="text-sm font-medium leading-relaxed text-gray-200">
                <span v-html="aiGreeting" />
              </p>
              <p class="mt-2 text-sm font-medium leading-relaxed text-white" v-html="aiAdvice" />
            </div>
          </div>
        </aside>

        <div class="flex flex-col justify-center p-8 sm:p-12 lg:col-span-7 lg:p-16">
          <div class="mx-auto w-full max-w-md">
            <h1
              class="font-athletic text-4xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-5xl"
            >
              {{ joinTitle }}
              <span class="text-primary-400">{{ joinSubtitle }}</span>
            </h1>
            <p class="mt-4 text-base font-medium text-gray-400 sm:text-lg">
              {{ joinFormSubtitle }}
            </p>

            <div class="mt-8 space-y-3">
              <UButton
                block
                size="xl"
                icon="i-simple-icons-google"
                color="primary"
                variant="solid"
                class="h-14 min-w-full rounded-xl text-xs font-bold uppercase tracking-[0.15em]"
                :loading="loading"
                @click="
                  () => {
                    void handleGoogleLogin()
                  }
                "
              >
                {{ joinGoogle }}
              </UButton>

              <UButton
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="h-14 min-w-full rounded-xl border-white/10 text-xs font-bold uppercase tracking-[0.12em]"
                :loading="loadingStrava"
                @click="
                  () => {
                    void handleStravaLogin()
                  }
                "
              >
                <template #leading>
                  <UIcon name="i-simple-icons-strava" class="h-5 w-5 text-[#FC4C02]" />
                </template>
                {{ joinStrava }}
              </UButton>

              <UButton
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="h-14 min-w-full rounded-xl border-white/10 text-xs font-bold uppercase tracking-[0.12em]"
                :loading="loadingIntervals"
                @click="
                  () => {
                    void handleIntervalsLogin()
                  }
                "
              >
                <template #leading>
                  <img src="/images/logos/intervals.png" alt="" class="h-5 w-5" />
                </template>
                {{ joinIntervals }}
              </UButton>
            </div>

            <p class="mt-5 text-xs font-bold uppercase tracking-widest text-primary-400">
              {{ joinFreeForeverNote }}
            </p>

            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t border-white/10" />
              </div>
              <div class="relative flex justify-center text-xs">
                <span
                  class="bg-[oklch(14%_0.018_155)] px-3 font-bold uppercase tracking-widest text-gray-400"
                  >{{ joinSecureOAuth }}</span
                >
              </div>
            </div>

            <p class="text-sm text-gray-400">
              {{ joinAlreadyAccount }}
              <NuxtLink
                :to="
                  callbackUrl === '/dashboard'
                    ? '/login'
                    : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                "
                class="ml-1 font-bold uppercase tracking-widest text-primary-400 transition-colors hover:text-primary-300"
                >{{ joinLogin }}</NuxtLink
              >
            </p>

            <p class="mt-4 max-w-sm text-xs leading-relaxed text-gray-400">
              {{ joinTermsAgree }}
              <NuxtLink to="/terms" class="underline underline-offset-2 hover:text-white">{{
                joinTerms
              }}</NuxtLink>
              {{ joinAnd }}
              <NuxtLink to="/privacy" class="underline underline-offset-2 hover:text-white">{{
                joinPrivacy
              }}</NuxtLink
              >.
            </p>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { buildAcquisitionContext } from '#shared/analytics-events'

  const { t } = useTranslate('auth')
  const { signIn } = useAuth()
  const route = useRoute()
  const toast = useToast()
  const { trackSignupStarted, trackSignupFailed } = useAnalytics()

  const acquisitionContext = computed(() => buildAcquisitionContext(route.query, 'join'))

  definePageMeta({
    layout: 'home',
    middleware: ['guest'],
    auth: false
  })

  const callbackUrl = (route.query.callbackUrl as string) || '/dashboard'

  useSeoMeta({
    title: 'Create your account',
    ogTitle: 'Join Coach Watts - AI Endurance Coaching',
    description:
      'Create your Coach Watts account and get personalized AI training, recovery analytics, and daily coaching insights.',
    ogDescription:
      'Create your Coach Watts account and get personalized AI training, recovery analytics, and daily coaching insights.',
    ogImage: '/images/og-image.png',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Join Coach Watts - AI Endurance Coaching',
    twitterDescription:
      'Create your Coach Watts account and get personalized AI training, recovery analytics, and daily coaching insights.',
    twitterImage: '/images/og-image.png'
  })

  const loading = ref(false)
  const loadingStrava = ref(false)
  const loadingIntervals = ref(false)

  const translateOrFallback = (key: string, fallback: string, invalidValues: string[] = []) =>
    computed(() => {
      const translated = t.value(key)
      return translated === key || invalidValues.includes(translated) ? fallback : translated
    })

  const joinTitle = translateOrFallback('join.title', 'Create your')
  const joinSubtitle = translateOrFallback('join.subtitle', 'account')
  const joinTagline = translateOrFallback(
    'join.tagline',
    'Adaptive training and fueling guidance from day one.'
  )
  const joinFormSubtitle = translateOrFallback(
    'join.form_subtitle',
    'Start free with a 14-day full-access trial. No credit card required.',
    ['Create your Coach Watts account. No credit card required.']
  )
  const joinSecureOAuth = translateOrFallback('login.secure_oauth', 'Secure OAuth Login')
  const joinErrorTitle = translateOrFallback('join.error_title', 'Signup failed')
  const joinErrorGoogle = translateOrFallback(
    'join.error_google',
    'Could not start Google signup. Please try again.'
  )
  const joinErrorStrava = translateOrFallback(
    'join.error_strava',
    'Could not start Strava signup. Please try again.'
  )
  const joinErrorIntervals = translateOrFallback(
    'join.error_intervals',
    'Could not start Intervals signup. Please try again.'
  )
  const joinGoogle = translateOrFallback('join.google', 'Create Account with Google')
  const joinStrava = translateOrFallback('join.strava', 'Create Account with Strava')
  const joinIntervals = translateOrFallback('join.intervals', 'Create Account with Intervals.icu')
  const joinFreeForeverNote = translateOrFallback(
    'join.free_forever_note',
    'Free forever with optional upgrades. Your 14-day trial starts at signup.'
  )
  const joinAlreadyAccount = translateOrFallback('join.already_account', 'Already have an account?')
  const joinLogin = translateOrFallback('join.login', 'Log in')
  const joinTermsAgree = translateOrFallback('join.terms_agree', 'By continuing, you agree to our')
  const joinTerms = translateOrFallback('join.terms', 'Terms of Service')
  const joinAnd = translateOrFallback('join.and', 'and')
  const joinPrivacy = translateOrFallback('join.privacy', 'Privacy Policy')

  const referral = computed(() => (route.query.ref as string) || '')

  const userInquiry = computed(() => {
    if (referral.value === 'hall-of-fame') {
      return 'I want to break my 5K personal best. Can you help?'
    }
    return t.value('join.user_message')
  })

  const aiGreeting = computed(() => {
    if (referral.value === 'hall-of-fame') {
      return 'Absolutely. I see your current best is 18:42 from last June.'
    }
    return "I noticed your <span class='text-primary-400 font-bold'>HRV</span> dropped to 28ms overnight."
  })

  const aiAdvice = computed(() => {
    if (referral.value === 'hall-of-fame') {
      return "Based on your current fatigue profile, we need to focus on <span class='font-bold text-primary-400'>Threshold Intervals</span> this week to push that ceiling."
    }
    return "Let's swap your intervals for a <span class='font-bold text-primary-400'>Zone 2 Recovery Ride</span>. We'll get back to intensity tomorrow."
  })

  function showSignupError(
    description: string,
    error: unknown,
    provider: 'google' | 'strava' | 'intervals'
  ) {
    console.error(`${provider} signup error:`, error)
    toast.add({
      title: joinErrorTitle.value,
      description: error instanceof Error ? error.message : description,
      color: 'error'
    })
  }

  function signupFailureCode(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message.slice(0, 64)
    }
    return 'unknown_error'
  }

  async function handleGoogleLogin() {
    trackSignupStarted('google', acquisitionContext.value)
    loading.value = true
    try {
      await signIn('google', { callbackUrl })
    } catch (error: unknown) {
      showSignupError(joinErrorGoogle.value, error, 'google')
      trackSignupFailed('google', 'oauth_start', signupFailureCode(error), acquisitionContext.value)
      loading.value = false
    }
  }

  async function handleStravaLogin() {
    trackSignupStarted('strava', acquisitionContext.value)
    loadingStrava.value = true
    try {
      await signIn('strava', { callbackUrl })
    } catch (error: unknown) {
      showSignupError(joinErrorStrava.value, error, 'strava')
      trackSignupFailed('strava', 'oauth_start', signupFailureCode(error), acquisitionContext.value)
      loadingStrava.value = false
    }
  }

  async function handleIntervalsLogin() {
    trackSignupStarted('intervals', acquisitionContext.value)
    loadingIntervals.value = true
    try {
      await signIn('intervals', { callbackUrl })
    } catch (error: unknown) {
      showSignupError(joinErrorIntervals.value, error, 'intervals')
      trackSignupFailed(
        'intervals',
        'oauth_start',
        signupFailureCode(error),
        acquisitionContext.value
      )
      loadingIntervals.value = false
    }
  }
</script>
