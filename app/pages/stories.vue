<template>
  <div class="overflow-x-clip py-14 sm:py-20">
    <UContainer>
      <div class="max-w-2xl text-left">
        <h1
          class="font-athletic text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl"
        >
          {{ t('header_title') }}
        </h1>
        <p class="mt-5 text-lg text-gray-400">
          {{ t('header_description') }}
        </p>
      </div>

      <!-- Lead story + supporting stack -->
      <article
        class="mt-12 rounded-2xl border border-white/10 bg-[oklch(16%_0.02_155)] p-8 sm:p-10 lg:p-12"
      >
        <p class="text-xs font-bold uppercase tracking-widest text-primary-400">
          {{ t('featured_label') }}
        </p>
        <h2 class="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {{ t('featured_headline') }}
        </h2>
        <blockquote class="mt-5 max-w-3xl text-lg leading-relaxed text-gray-300">
          “{{ t('featured_quote') }}”
        </blockquote>
        <div class="mt-8 flex items-center gap-4">
          <UAvatar size="lg" :alt="t('featured_name')" class="bg-primary/20 text-primary" />
          <div>
            <div class="font-bold text-white">{{ t('featured_name') }}</div>
            <div class="text-sm text-gray-500">{{ t('featured_role') }}</div>
          </div>
        </div>
      </article>

      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12">
        <article
          v-for="(story, index) in stories"
          :key="story.name"
          class="rounded-2xl border border-white/10 bg-[oklch(16%_0.02_155)] p-6 sm:p-7"
          :class="index % 3 === 0 ? 'md:col-span-7' : 'md:col-span-5'"
        >
          <div class="flex items-center gap-3">
            <UAvatar :alt="story.name" size="md" class="bg-white/5" />
            <div>
              <div class="text-sm font-bold text-white">{{ story.name }}</div>
              <div class="text-xs uppercase tracking-widest text-gray-500">{{ story.type }}</div>
            </div>
          </div>
          <h3 class="mt-4 text-lg font-semibold text-white">{{ story.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-gray-400">“{{ story.quote }}”</p>
        </article>
      </div>

      <section
        class="mt-16 flex flex-col gap-6 border-t border-white/8 pt-12 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="max-w-xl">
          <h2 class="font-athletic text-2xl font-bold uppercase tracking-tight text-white">
            {{ t('cta_title') }}
          </h2>
          <p class="mt-3 text-gray-400">
            {{ t('cta_description') }}
          </p>
        </div>
        <UButton to="/join" size="xl" color="primary" class="whitespace-nowrap">
          {{ t('cta_button') }}
        </UButton>
      </section>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  const { t } = useTranslate('stories')

  useHead(
    computed(() => ({
      title: t.value('meta_title'),
      meta: [{ name: 'description', content: t.value('meta_description') }]
    }))
  )

  const stories = computed(() => [
    {
      name: 'Jonas Keller',
      type: t.value('s1_type'),
      title: t.value('s1_title'),
      quote: t.value('s1_quote')
    },
    {
      name: 'Elena Ruiz',
      type: t.value('s2_type'),
      title: t.value('s2_title'),
      quote: t.value('s2_quote')
    },
    {
      name: 'Marcus Hale',
      type: t.value('s3_type'),
      title: t.value('s3_title'),
      quote: t.value('s3_quote')
    },
    {
      name: 'Priya Nair',
      type: t.value('s4_type'),
      title: t.value('s4_title'),
      quote: t.value('s4_quote')
    },
    {
      name: 'Tomás Álvarez',
      type: t.value('s5_type'),
      title: t.value('s5_title'),
      quote: t.value('s5_quote')
    },
    {
      name: 'Aisha Rahman',
      type: t.value('s6_type'),
      title: t.value('s6_title'),
      quote: t.value('s6_quote')
    }
  ])
</script>
