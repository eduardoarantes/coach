<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui'

  const props = defineProps<{
    sections: Array<{
      id: string
      label: string
      items: NavigationMenuItem[]
      defaultOpen?: boolean
    }>
  }>()

  const mobileNavScrollRef = ref<HTMLElement | null>(null)
  const showScrollHint = ref(false)

  function updateScrollHint() {
    const element = mobileNavScrollRef.value
    if (!element) {
      showScrollHint.value = false
      return
    }
    showScrollHint.value = element.scrollHeight - element.scrollTop - element.clientHeight > 16
  }

  function scrollActiveItemIntoView() {
    const container = mobileNavScrollRef.value
    if (!container) return
    const active =
      container.querySelector('[data-active]') ||
      container.querySelector('[aria-current="page"]') ||
      container.querySelector('a.router-link-active')
    active?.scrollIntoView({ block: 'nearest' })
    updateScrollHint()
  }

  onMounted(() => {
    mobileNavScrollRef.value?.addEventListener('scroll', updateScrollHint, { passive: true })
    nextTick(() => {
      scrollActiveItemIntoView()
      updateScrollHint()
    })
  })

  watch(
    () => props.sections,
    () => {
      nextTick(() => {
        scrollActiveItemIntoView()
        updateScrollHint()
      })
    },
    { deep: true }
  )

  defineExpose({
    refresh: () => {
      nextTick(() => {
        scrollActiveItemIntoView()
        updateScrollHint()
      })
    }
  })
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col lg:hidden">
    <div
      ref="mobileNavScrollRef"
      class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <section v-for="section in sections" :key="section.id">
        <div class="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
          {{ section.label }}
        </div>
        <UNavigationMenu
          :items="section.items"
          orientation="vertical"
          :default-open="section.defaultOpen"
          tooltip
          :ui="{ link: 'min-h-11 py-2.5', linkLeadingIcon: 'size-5' }"
        />
      </section>
    </div>

    <div
      v-if="showScrollHint"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900"
      aria-hidden="true"
    />
  </div>
</template>
