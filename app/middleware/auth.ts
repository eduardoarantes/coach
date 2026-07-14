export default defineNuxtRouteMiddleware(async (to, from) => {
  const config = useRuntimeConfig()

  if (config.public.authBypassEnabled) {
    return
  }

  const { status, data, getSession } = useAuth()

  if (typeof data.value === 'undefined') {
    await getSession().catch(() => null)
  }

  if (status.value === 'loading') {
    return
  }

  if (status.value !== 'authenticated') {
    return navigateTo(`/login?callbackUrl=${encodeURIComponent(to.fullPath)}`)
  }
})
