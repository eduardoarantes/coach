import { useTranslate } from '@tolgee/vue'

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  )
}

export function useResolvedTranslate(namespace: string) {
  const { t } = useTranslate(namespace)

  function tr(key: string, fallback: string, params?: Record<string, string | number>) {
    if (typeof t.value !== 'function') return interpolate(fallback, params)
    const translated = t.value(key, params)
    return !translated || translated === key ? interpolate(fallback, params) : translated
  }

  return { t, tr }
}
