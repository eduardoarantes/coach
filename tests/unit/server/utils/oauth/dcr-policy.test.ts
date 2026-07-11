import { beforeEach, describe, expect, it } from 'vitest'
import {
  assertDcrRateLimit,
  getClientIpFromRequest,
  parseDcrRegistrationBody,
  resetDcrRateLimitsForTests
} from '../../../../../server/utils/oauth/dcr-policy'

describe('oauth/dcr-policy', () => {
  beforeEach(() => {
    resetDcrRateLimitsForTests()
  })

  it('parses valid registration metadata', () => {
    const parsed = parseDcrRegistrationBody({
      client_name: 'Cursor',
      redirect_uris: ['http://127.0.0.1:8765/callback'],
      client_uri: 'https://cursor.com'
    })

    expect(parsed.client_name).toBe('Cursor')
    expect(parsed.redirectUris).toHaveLength(1)
    expect(parsed.client_uri).toBe('https://cursor.com/')
  })

  it('rejects invalid redirect URIs', () => {
    expect(() =>
      parseDcrRegistrationBody({
        client_name: 'Bad Client',
        redirect_uris: ['http://evil.example/callback']
      })
    ).toThrow(/HTTPS/)
  })

  it('enforces per-IP registration rate limits', () => {
    for (let i = 0; i < 3; i++) {
      assertDcrRateLimit('127.0.0.1', 3)
    }
    expect(() => assertDcrRateLimit('127.0.0.1', 3)).toThrow(/rate limit/i)
  })

  it('uses the address supplied by the nearest forwarding proxy', () => {
    expect(
      getClientIpFromRequest({ 'x-forwarded-for': 'attacker-controlled, 203.0.113.10' }, '10.0.0.2')
    ).toBe('203.0.113.10')
    expect(getClientIpFromRequest({}, '10.0.0.2')).toBe('10.0.0.2')
  })
})
