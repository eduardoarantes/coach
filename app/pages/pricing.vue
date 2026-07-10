<template>
  <div>
    <LandingPricing />
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    layout: 'home',
    auth: false
  })

  const route = useRoute()
  const { trackPricingView } = useAnalytics()

  onMounted(() => {
    const entryPoint =
      typeof route.query.from === 'string'
        ? route.query.from
        : document.referrer
          ? 'referral'
          : 'direct'
    trackPricingView(entryPoint)
  })

  useHead({
    title: 'Pricing',
    meta: [
      {
        name: 'description',
        content:
          'Choose the perfect plan for your endurance training journey. From free tracking to professional AI coaching.'
      }
    ]
  })
</script>
