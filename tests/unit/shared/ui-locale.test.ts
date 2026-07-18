import { describe, expect, it } from 'vitest'
import {
  aiLanguageForUiLocale,
  detectBrowserUiLocale,
  isDefaultLanguagePreference,
  normalizeUiLocale,
  parseAcceptLanguageHeader,
  resolvePreferredUiLocale
} from '../../../shared/ui-locale'

describe('normalizeUiLocale', () => {
  it('normalizes supported locales and region tags', () => {
    expect(normalizeUiLocale('hu')).toBe('hu')
    expect(normalizeUiLocale('HU-hu')).toBe('hu')
    expect(normalizeUiLocale('zh-CN')).toBe('zh')
    expect(normalizeUiLocale('zh_Hans')).toBe('zh')
  })

  it('rejects unsupported locales', () => {
    expect(normalizeUiLocale('pt')).toBeNull()
    expect(normalizeUiLocale('')).toBeNull()
    expect(normalizeUiLocale(null)).toBeNull()
  })
})

describe('parseAcceptLanguageHeader', () => {
  it('picks the highest-quality supported locale', () => {
    expect(parseAcceptLanguageHeader('fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5')).toBe('fr')
    expect(parseAcceptLanguageHeader('pt-BR, en-US;q=0.8')).toBe('en')
    expect(parseAcceptLanguageHeader('hu-HU,hu;q=0.9')).toBe('hu')
  })

  it('returns null when nothing matches', () => {
    expect(parseAcceptLanguageHeader('pt-BR, pt;q=0.9')).toBeNull()
    expect(parseAcceptLanguageHeader('pt-BR, hu;q=0')).toBeNull()
    expect(parseAcceptLanguageHeader(undefined)).toBeNull()
  })
})

describe('detectBrowserUiLocale', () => {
  it('reads navigator-style language lists', () => {
    expect(detectBrowserUiLocale(['hu-HU', 'en-US'])).toBe('hu')
    expect(detectBrowserUiLocale('de-DE')).toBe('de')
  })
})

describe('language preference helpers', () => {
  it('treats unset English defaults as default preferences', () => {
    expect(isDefaultLanguagePreference(null, null)).toBe(true)
    expect(isDefaultLanguagePreference('en', 'English')).toBe(true)
    expect(isDefaultLanguagePreference('hu', 'Hungarian')).toBe(false)
    expect(isDefaultLanguagePreference('en', 'German')).toBe(false)
  })

  it('resolves preferred locale with explicit > cookie > Accept-Language', () => {
    expect(
      resolvePreferredUiLocale({
        explicit: 'de',
        cookie: 'hu',
        acceptLanguage: 'fr'
      })
    ).toBe('de')

    expect(
      resolvePreferredUiLocale({
        cookie: 'hu',
        acceptLanguage: 'fr'
      })
    ).toBe('hu')

    expect(
      resolvePreferredUiLocale({
        acceptLanguage: 'ja-JP, en;q=0.8'
      })
    ).toBe('ja')
  })

  it('maps UI locales to AI coaching language names', () => {
    expect(aiLanguageForUiLocale('hu')).toBe('Hungarian')
    expect(aiLanguageForUiLocale('zh')).toBe('Chinese')
  })
})
