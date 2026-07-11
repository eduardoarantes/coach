import { validateRedirectUris } from './redirect-uri'

const MAX_CLIENT_NAME_LENGTH = 120
const MAX_METADATA_URL_LENGTH = 2048
const MAX_DCR_BODY_KEYS = 20

type RateBucket = { count: number; resetAt: number }

const ipBuckets = new Map<string, RateBucket>()

export function getClientIpFromRequest(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string
): string {
  const forwarded = headers['x-forwarded-for']
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded
  // Use the address added by the nearest proxy. Taking the first entry lets a
  // caller prepend arbitrary values when a proxy appends to X-Forwarded-For.
  const nearestForwardedAddress = raw
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1)
  return nearestForwardedAddress || remoteAddress || 'unknown'
}

export function assertDcrRateLimit(ip: string, limitPerHour = 10) {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)

  if (!bucket || bucket.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return
  }

  bucket.count += 1
  if (bucket.count > limitPerHour) {
    throw new Error('Dynamic client registration rate limit exceeded')
  }
}

function validateOptionalUrl(value: unknown, field: string) {
  if (value == null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string URL`)
  }
  if (value.length > MAX_METADATA_URL_LENGTH) {
    throw new Error(`${field} is too long`)
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`${field} must use http or https`)
    }
    return parsed.toString()
  } catch (error) {
    if (error instanceof Error && error.message.includes('must use')) throw error
    throw new Error(`${field} must be a valid URL`, { cause: error })
  }
}

export function parseDcrRegistrationBody(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Invalid registration request body')
  }

  const entries = Object.entries(body as Record<string, unknown>)
  if (entries.length > MAX_DCR_BODY_KEYS) {
    throw new Error('Registration metadata is too large')
  }

  const redirect_uris = Array.isArray((body as any).redirect_uris)
    ? (body as any).redirect_uris.map(String)
    : []
  const client_name =
    typeof (body as any).client_name === 'string' ? (body as any).client_name.trim() : ''

  if (!client_name) {
    throw new Error('client_name is required')
  }
  if (client_name.length > MAX_CLIENT_NAME_LENGTH) {
    throw new Error('client_name is too long')
  }

  const client_uri = validateOptionalUrl((body as any).client_uri, 'client_uri')
  const logo_uri = validateOptionalUrl((body as any).logo_uri, 'logo_uri')
  const redirectUris = validateRedirectUris(redirect_uris)

  return {
    client_name,
    redirectUris,
    client_uri,
    logo_uri
  }
}

export function resetDcrRateLimitsForTests() {
  ipBuckets.clear()
}
