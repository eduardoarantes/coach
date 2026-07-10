<script setup lang="ts">
  const route = useRoute()

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Settings',
    meta: [
      {
        name: 'description',
        content: 'Manage your connected apps, AI preferences, and coaching settings.'
      }
    ]
  })

  // Redirect to /settings/apps by default
  // Keep OAuth and billing callback query parameters when normalizing the
  // legacy /settings entry point to the Connected Apps page.
  navigateTo({ path: '/settings/apps', query: route.query }, { replace: true })
</script>

<template>
  <div />
</template>
