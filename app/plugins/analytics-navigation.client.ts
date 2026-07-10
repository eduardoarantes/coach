export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const router = useRouter()
  const { trackNavigation } = useAnalytics()

  router.afterEach((to, from) => {
    if (to.path === from.path) return

    const sourcePath = from.path || '/'
    trackNavigation(to.path, sourcePath)
  })
})
