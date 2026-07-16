const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineNuxtRouteMiddleware(async (to) => {
  const id = String(to.params.id || '')
  // Public catalog slugs are available without auth.
  if (!UUID_RE.test(id)) return

  const config = useRuntimeConfig()
  if (config.public.authBypassEnabled) return

  const { status, data, getSession } = useAuth()

  if (typeof data.value === 'undefined') {
    await getSession().catch(() => null)
  }

  if (status.value === 'loading') return

  if (status.value !== 'authenticated') {
    return navigateTo(`/login?callbackUrl=${encodeURIComponent(to.fullPath)}`)
  }
})
