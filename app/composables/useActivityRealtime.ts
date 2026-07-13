import { getCurrentScope, onScopeDispose } from 'vue'
import { useRealtimeEvents } from '~/composables/useUserRuns'

export function useActivityRealtime(onRefresh: () => void | Promise<void>) {
  const config = useRuntimeConfig()

  if (!config.public.realtimeBusEnabled) {
    return
  }

  const { onEvent } = useRealtimeEvents()
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  onEvent((message) => {
    if (message.channel !== 'activity') return
    if (!message.event) return
    if (message.event.scope !== 'activity' && message.event.scope !== 'calendar') return

    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    refreshTimer = setTimeout(() => {
      refreshTimer = null
      void Promise.resolve(onRefresh()).catch((error) => {
        console.error('[useActivityRealtime] refresh failed', error)
      })
    }, 400)
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
    })
  }
}
