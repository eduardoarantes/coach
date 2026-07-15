<template>
  <UCard
    v-if="status"
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-5'
    }"
    class="border-y sm:border border-primary-500/30 bg-primary-50/40 dark:bg-primary-950/20"
  >
    <div class="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2 min-w-0 flex-1">
        <div class="flex items-start gap-2">
          <UIcon
            v-if="status.importState === 'importing'"
            name="i-heroicons-arrow-path"
            class="w-5 h-5 text-primary-500 animate-spin shrink-0 mt-0.5"
          />
          <UIcon
            v-else-if="status.importState === 'failed'"
            name="i-heroicons-exclamation-triangle"
            class="w-5 h-5 text-red-500 shrink-0 mt-0.5"
          />
          <UIcon
            v-else
            name="i-heroicons-sparkles"
            class="w-5 h-5 text-primary-500 shrink-0 mt-0.5"
          />
          <h2 class="font-bold text-gray-900 dark:text-white leading-snug flex-1 min-w-0">
            {{ headline }}
          </h2>
          <UButton
            v-if="!status.activationComplete"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            class="shrink-0 -mt-1 -mr-1 sm:hidden"
            aria-label="Dismiss setup progress"
            @click="emit('dismiss')"
          />
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300">{{ description }}</p>
        <p v-if="status.workoutCount > 0 || status.wellnessCount > 0" class="text-xs text-gray-500">
          {{
            t('setup_progress_data_summary', {
              workouts: status.workoutCount,
              wellness: status.wellnessCount
            })
          }}
        </p>
      </div>

      <div class="flex w-full sm:w-auto flex-col sm:flex-row gap-2 shrink-0 sm:justify-end">
        <UButton
          v-if="status.importState === 'failed'"
          color="primary"
          variant="solid"
          size="sm"
          block
          icon="i-heroicons-arrow-path"
          class="sm:w-auto"
          @click="emit('sync')"
        >
          {{ t('setup_progress_retry_sync') }}
        </UButton>
        <UButton
          v-if="status.hasFirstInsight && !status.activationComplete"
          color="primary"
          variant="solid"
          size="sm"
          block
          class="sm:w-auto"
          @click="emit('complete')"
        >
          {{ t('setup_progress_view_insight') }}
        </UButton>
        <UButton
          v-if="!status.hasIntegration"
          color="neutral"
          variant="outline"
          size="sm"
          block
          class="sm:w-auto"
          to="/settings/apps"
        >
          {{ t('setup_progress_connect_apps') }}
        </UButton>
        <UButton
          v-if="!status.activationComplete"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-heroicons-x-mark"
          class="hidden sm:inline-flex"
          aria-label="Dismiss setup progress"
          @click="emit('dismiss')"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import type { OnboardingStatus } from '#shared/onboarding-status'

  const props = defineProps<{
    status: OnboardingStatus | null
  }>()

  const emit = defineEmits<{
    sync: []
    complete: []
    dismiss: []
  }>()

  const { t } = useTranslate('onboarding')

  const headline = computed(() => {
    if (!props.status) return ''
    if (props.status.importState === 'importing') return t.value('setup_progress_importing_title')
    if (props.status.importState === 'failed') return t.value('setup_progress_failed_title')
    if (props.status.importState === 'empty') return t.value('setup_progress_empty_title')
    if (props.status.hasFirstInsight) return t.value('setup_progress_insight_ready_title')
    if (props.status.hasUsableData) return t.value('setup_progress_analysis_title')
    if (props.status.hasIntegration) return t.value('setup_progress_connected_title')
    return t.value('setup_progress_connect_title')
  })

  const description = computed(() => {
    if (!props.status) return ''
    if (props.status.importErrorMessage) return props.status.importErrorMessage
    if (props.status.importState === 'importing') {
      return t.value('setup_progress_importing_desc')
    }
    if (props.status.importState === 'empty') {
      return t.value('setup_progress_empty_desc')
    }
    if (props.status.hasFirstInsight) {
      return t.value('setup_progress_insight_ready_desc')
    }
    if (props.status.hasUsableData) {
      return t.value('setup_progress_analysis_desc')
    }
    if (props.status.hasIntegration) {
      return t.value('setup_progress_connected_desc')
    }
    return t.value('setup_progress_connect_desc')
  })
</script>
