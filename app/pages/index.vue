<template>
  <div
    class="relative min-h-screen overflow-x-clip bg-[oklch(12%_0.015_155)] selection:bg-primary-500/30"
  >
    <div class="pointer-events-none fixed inset-0 z-10 opacity-[0.02] grain-overlay" />
    <LandingHero class="mb-8 sm:mb-12" />
    <LandingNutritionExplainer class="py-16 sm:py-20" />
    <LandingHowItWorks class="py-20 sm:py-28" />
    <LandingIntegrations class="py-16 sm:py-20" />
    <LandingDeepDiveArchitecture class="py-20 sm:py-24" />
    <LandingFeatureBento class="py-16 sm:py-24" />
    <LandingFeatureGoals class="py-20 sm:py-28" />
    <LandingCommunity class="py-16 sm:py-20" />
    <LandingPricing class="py-20 sm:py-24" />

    <!-- Closing band — left-biased, not another centered SaaS CTA -->
    <section class="border-t border-white/8 bg-[oklch(14%_0.018_155)] px-6 py-16 sm:py-20 lg:px-8">
      <div
        class="mx-auto flex max-w-[88rem] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="max-w-xl">
          <h2
            class="font-athletic text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl"
          >
            {{ t('cta.headline') }}
          </h2>
          <p class="mt-4 text-lg leading-8 text-gray-400">
            {{ t('cta.description') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <UButton size="xl" to="/join" color="primary" class="whitespace-nowrap">{{
            t('cta.primary')
          }}</UButton>
          <UButton size="xl" to="/stories" color="neutral" variant="ghost" class="whitespace-nowrap"
            >{{ t('cta.secondary') }} <span aria-hidden="true">→</span></UButton
          >
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('common')
  const { status } = useAuth()

  definePageMeta({
    layout: 'home',
    auth: false
  })

  useSeoMeta({
    title: 'AI Endurance Coaching',
    ogTitle: 'Coach Watts - AI Endurance Coaching',
    description:
      'Coach Watts is your AI-powered endurance coach. Optimize training, recovery, and glycogen-aware fueling with personalized daily guidance.',
    ogDescription:
      'Coach Watts is your AI-powered endurance coach. Optimize training, recovery, and glycogen-aware fueling with personalized daily guidance.',
    ogImage: '/images/og-image.png',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Coach Watts - AI Endurance Coaching',
    twitterDescription:
      'Coach Watts is your AI-powered endurance coach. Optimize training, recovery, and glycogen-aware fueling with personalized daily guidance.',
    twitterImage: '/images/og-image.png'
  })

  const route = useRoute()

  // Only redirect if authenticated, otherwise stay on landing page.
  // ?preview=1 keeps the marketing page visible under AUTH_BYPASS_USER.
  watchEffect(() => {
    if (status.value === 'authenticated' && route.query.preview !== '1') {
      navigateTo('/dashboard')
    }
  })
</script>
