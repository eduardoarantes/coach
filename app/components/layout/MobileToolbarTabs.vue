<script setup lang="ts">
  export type MobileToolbarTab = {
    id: string
    label: string
    icon?: string
  }

  const props = defineProps<{
    items: MobileToolbarTab[]
    activeId: string
    selectLabel?: string
  }>()

  const emit = defineEmits<{
    select: [id: string]
  }>()

  const toolbarRef = ref<HTMLElement | null>(null)
  const showScrollHint = ref(false)

  const selectItems = computed(() =>
    props.items.map((item) => ({
      label: item.label,
      value: item.id
    }))
  )

  function updateScrollHint() {
    const element = toolbarRef.value
    if (!element) {
      showScrollHint.value = false
      return
    }
    showScrollHint.value = element.scrollWidth - element.scrollLeft - element.clientWidth > 16
  }

  function scrollActiveIntoView() {
    const container = toolbarRef.value
    if (!container) return
    const activeButton = container.querySelector<HTMLElement>('[data-active-tab="true"]')
    activeButton?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    updateScrollHint()
  }

  watch(
    () => props.activeId,
    () => nextTick(scrollActiveIntoView),
    { immediate: true }
  )

  onMounted(() => {
    toolbarRef.value?.addEventListener('scroll', updateScrollHint, { passive: true })
    nextTick(scrollActiveIntoView)
  })
</script>

<template>
  <div class="w-full">
    <div class="md:hidden">
      <USelect
        :model-value="activeId"
        :items="selectItems"
        value-key="value"
        label-key="label"
        :aria-label="selectLabel || 'Section navigation'"
        class="w-full"
        @update:model-value="
          (value: string) => {
            emit('select', value)
          }
        "
      />
    </div>

    <div class="relative hidden md:block">
      <div
        ref="toolbarRef"
        class="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1"
        role="tablist"
      >
        <UButton
          v-for="item in items"
          :key="item.id"
          role="tab"
          :aria-selected="activeId === item.id"
          :data-active-tab="activeId === item.id ? 'true' : undefined"
          :variant="activeId === item.id ? 'solid' : 'ghost'"
          :color="activeId === item.id ? 'primary' : 'neutral'"
          class="min-h-11 shrink-0 snap-start whitespace-nowrap"
          @click="
            () => {
              emit('select', item.id)
            }
          "
        >
          <UIcon v-if="item.icon" :name="item.icon" class="mr-2 size-4" />
          {{ item.label }}
        </UButton>
      </div>
      <div
        v-if="showScrollHint"
        class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-default to-transparent"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
