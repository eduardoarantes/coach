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
  let revealTimeout: ReturnType<typeof setTimeout> | null = null

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

  /** Scroll just enough to reveal expanded submenu items without hiding the trigger. */
  function revealExpandedGroup(trigger: Element) {
    const container = mobileNavScrollRef.value
    if (!container) return

    const item = trigger.closest('li')
    if (!item || !container.contains(item)) return

    const content = item.querySelector<HTMLElement>('[data-slot="content"]')
    const groupBottom = content ?? item
    const padding = 12
    const containerRect = container.getBoundingClientRect()
    const triggerRect = trigger.getBoundingClientRect()
    const bottomRect = groupBottom.getBoundingClientRect()

    let delta = 0
    if (bottomRect.bottom > containerRect.bottom - padding) {
      delta = bottomRect.bottom - (containerRect.bottom - padding)
    }

    // Prefer keeping the trigger visible at the top when the submenu is tall.
    const maxDelta = triggerRect.top - (containerRect.top + padding)
    if (delta > 0) {
      container.scrollBy({
        top: Math.min(delta, Math.max(0, maxDelta)),
        behavior: 'smooth'
      })
    }

    updateScrollHint()
  }

  function scheduleRevealExpandedGroup(trigger: Element) {
    if (revealTimeout) clearTimeout(revealTimeout)

    // Wait for accordion open + height animation before measuring.
    revealTimeout = setTimeout(() => {
      revealTimeout = null
      if (trigger.getAttribute('aria-expanded') !== 'true') return
      revealExpandedGroup(trigger)
    }, 220)
  }

  function onNavClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element)) return

    const trigger = target.closest<HTMLElement>('[aria-expanded]')
    if (!trigger || !mobileNavScrollRef.value?.contains(trigger)) return

    // Only scroll when opening (collapsed → expanded).
    if (trigger.getAttribute('aria-expanded') !== 'false') return

    scheduleRevealExpandedGroup(trigger)
  }

  onMounted(() => {
    const container = mobileNavScrollRef.value
    container?.addEventListener('scroll', updateScrollHint, { passive: true })
    // Capture phase: read aria-expanded before the accordion toggles it.
    container?.addEventListener('click', onNavClick, true)
    nextTick(() => {
      scrollActiveItemIntoView()
      updateScrollHint()
    })
  })

  onBeforeUnmount(() => {
    const container = mobileNavScrollRef.value
    container?.removeEventListener('scroll', updateScrollHint)
    container?.removeEventListener('click', onNavClick, true)
    if (revealTimeout) clearTimeout(revealTimeout)
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
