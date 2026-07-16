<script setup lang="ts">
  import { useTolgee } from '@tolgee/vue'

  const tolgee = useTolgee(['language'])
  const localeCookie = useCookie('cw_locale', { maxAge: 60 * 60 * 24 * 365 })

  const languageOptions = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'hu', label: 'Magyar' },
    { value: 'it', label: 'Italiano' },
    { value: 'ja', label: '日本語' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'ru', label: 'Русский' },
    { value: 'zh-CN', label: '中文' }
  ]

  const selectedLanguage = computed({
    get: () => {
      const lang = tolgee.value.getLanguage() || 'en'
      return lang === 'zh' ? 'zh-CN' : lang
    },
    set: (language: string) => {
      const tolgeeLang = language === 'zh-CN' ? 'zh' : language
      localeCookie.value = tolgeeLang
      void tolgee.value.changeLanguage(tolgeeLang)
    }
  })
</script>

<template>
  <USelect
    v-model="selectedLanguage"
    :items="languageOptions"
    value-key="value"
    label-key="label"
    class="min-w-[8.5rem]"
    size="sm"
    variant="ghost"
    :ui="{ item: 'cursor-pointer' }"
  />
</template>
