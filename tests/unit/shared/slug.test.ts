import { describe, expect, it } from 'vitest'
import { isValidSlug, normalizeSlug } from '../../../shared/slug'

describe('slug helpers', () => {
  it('normalizes titles into stable slugs', () => {
    expect(normalizeSlug('XIX. Pilis Kupa – 2. forduló')).toBe('xix-pilis-kupa-2-fordulo')
    expect(normalizeSlug('  Pilis_Kupa_2026  ')).toBe('pilis-kupa-2026')
  })

  it('validates normalized slugs', () => {
    expect(isValidSlug('pilis-kupa-2026')).toBe(true)
    expect(isValidSlug('-bad-')).toBe(false)
    expect(isValidSlug('Bad Slug')).toBe(false)
  })
})
