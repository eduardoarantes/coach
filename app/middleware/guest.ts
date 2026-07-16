export default defineNuxtRouteMiddleware(async (to, from) => {
  const { status, data, getSession } = useAuth()

  if (typeof data.value === 'undefined') {
    await getSession().catch(() => null)
  }

  if (status.value === 'loading') {
    return
  }

  // ?preview=1 keeps guest pages visible under AUTH_BYPASS_USER (local review only)
  if (status.value === 'authenticated' && to.query.preview !== '1') {
    return navigateTo('/dashboard')
  }
})
