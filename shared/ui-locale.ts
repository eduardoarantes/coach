/** UI locales with static translation packs registered in the Tolgee plugin. */
export const UI_LOCALES = ['en', 'de', 'es', 'fr', 'hu', 'it', 'ja', 'nl', 'ru', 'zh'] as const

export type UiLocale = (typeof UI_LOCALES)[number]

export const LOCALE_COOKIE_NAME = 'cw_locale'

export const UI_LOCALE_TO_AI_LANGUAGE: Record<UiLocale, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  hu: 'Hungarian',
  it: 'Italian',
  ja: 'Japanese',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Chinese'
}

export const AI_LANGUAGE_TO_UI_LOCALE: Record<string, UiLocale> = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Italian: 'it',
  Dutch: 'nl',
  Russian: 'ru',
  Hungarian: 'hu',
  Japanese: 'ja',
  Chinese: 'zh'
}

const UI_LOCALE_SET = new Set<string>(UI_LOCALES)

export function normalizeUiLocale(value: unknown): UiLocale | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase().replace(/_/g, '-')
  if (!normalized) return null

  if (normalized === 'zh-cn' || normalized === 'zh-hans' || normalized.startsWith('zh-')) {
    return 'zh'
  }

  if (UI_LOCALE_SET.has(normalized)) {
    return normalized as UiLocale
  }

  const [primary] = normalized.split('-')
  if (primary && UI_LOCALE_SET.has(primary)) {
    return primary as UiLocale
  }

  return null
}

export function parseAcceptLanguageHeader(header: string | null | undefined): UiLocale | null {
  if (!header) return null

  const tags = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.find((param) => param.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '') : 1
      return {
        tag: tag?.trim() ?? '',
        q: Number.isFinite(q) ? q : 0
      }
    })
    .filter((part) => part.tag && part.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const { tag } of tags) {
    const locale = normalizeUiLocale(tag)
    if (locale) return locale
  }

  return null
}

export function detectBrowserUiLocale(
  languages: readonly string[] | string | null | undefined
): UiLocale | null {
  if (!languages) return null

  const list = typeof languages === 'string' ? [languages] : languages
  for (const language of list) {
    const locale = normalizeUiLocale(language)
    if (locale) return locale
  }

  return null
}

export function isDefaultLanguagePreference(
  uiLanguage?: string | null,
  language?: string | null
): boolean {
  const ui = normalizeUiLocale(uiLanguage) ?? 'en'
  const aiLanguage = (language || 'English').trim()
  return ui === 'en' && aiLanguage === 'English'
}

/**
 * Prefer an explicit client choice, then the locale cookie, then Accept-Language.
 */
export function resolvePreferredUiLocale(sources: {
  explicit?: unknown
  cookie?: unknown
  acceptLanguage?: string | null
}): UiLocale | null {
  return (
    normalizeUiLocale(sources.explicit) ??
    normalizeUiLocale(sources.cookie) ??
    parseAcceptLanguageHeader(sources.acceptLanguage)
  )
}

export function aiLanguageForUiLocale(locale: UiLocale): string {
  return UI_LOCALE_TO_AI_LANGUAGE[locale]
}
