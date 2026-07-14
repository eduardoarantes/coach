<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const props = defineProps<{
    user: { name?: string | null; email?: string | null } | null | undefined
    impersonatedEmail?: string | null
    stoppingImpersonation?: boolean
    sidebarVersionDisplay: string
  }>()

  const emit = defineEmits<{
    logout: []
    stopImpersonation: []
  }>()

  const { t } = useTranslate('common')
  const ready = computed(() => typeof t.value === 'function')

  const displayName = computed(
    () => props.user?.name || props.impersonatedEmail || props.user?.email || 'Account'
  )

  const accountMenuItems = computed(() => {
    const items: Array<{
      label: string
      icon?: string
      to?: string
      target?: string
      onSelect?: () => void
    }> = [
      {
        label: ready.value ? t.value('navigation_settings_profile') : 'Profile',
        icon: 'i-lucide-user',
        to: '/profile/settings'
      },
      {
        label: ready.value ? t.value('navigation_settings_changelog') : 'Changelog',
        icon: 'i-lucide-scroll-text',
        to: '/settings/changelog'
      },
      {
        label: ready.value ? t.value('sidebar_community_discord') : 'Discord',
        icon: 'i-simple-icons-discord',
        to: 'https://discord.gg/dPYkzg49T9',
        target: '_blank'
      },
      {
        label: ready.value ? t.value('sidebar_community_github') : 'GitHub',
        icon: 'i-simple-icons-github',
        to: 'https://github.com/newpush/coach',
        target: '_blank'
      },
      {
        label: ready.value ? t.value('sidebar_attribution_strava') : 'Powered by Strava',
        icon: 'i-simple-icons-strava',
        to: 'https://www.strava.com/clubs/2004142',
        target: '_blank'
      },
      {
        label: ready.value ? t.value('sidebar_attribution_garmin') : 'Works with Garmin',
        icon: 'i-lucide-watch',
        to: 'https://www.garmin.com',
        target: '_blank'
      }
    ]

    if (props.impersonatedEmail) {
      items.push({
        label: ready.value
          ? t.value('navigation_admin_nav_stop_impersonating')
          : 'Stop impersonating',
        icon: 'i-lucide-user-x',
        onSelect: () => emit('stopImpersonation')
      })
    } else {
      items.push({
        label: ready.value ? t.value('navigation_admin_nav_sign_out') : 'Sign out',
        icon: 'i-lucide-log-out',
        onSelect: () => emit('logout')
      })
    }

    return [items]
  })
</script>

<template>
  <div class="border-t border-default px-3 py-2 lg:hidden">
    <div class="flex items-center gap-2">
      <UDropdownMenu :items="accountMenuItems" :ui="{ content: 'min-w-56' }">
        <button
          type="button"
          class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :aria-label="ready ? t('sidebar_account_menu') : 'Account menu'"
        >
          <UAvatar v-if="user" :alt="user.email || ''" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-highlighted">{{ displayName }}</p>
            <p class="truncate text-[11px] text-muted">{{ sidebarVersionDisplay }}</p>
          </div>
          <UIcon name="i-lucide-chevron-up" class="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </UDropdownMenu>
      <ColorModeButton />
    </div>
  </div>
</template>
