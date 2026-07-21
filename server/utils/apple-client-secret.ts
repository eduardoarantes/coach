import { createPrivateKey, sign } from 'node:crypto'

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

/**
 * Build the short-lived client_secret JWT Apple requires for the web Services ID flow.
 * Valid up to 6 months; regenerating on process start is fine.
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */
export function createAppleClientSecret(opts: {
  teamId: string
  clientId: string
  keyId: string
  privateKeyPem: string
  /** Seconds from now (default 180 days). Apple max is ~6 months. */
  expiresInSeconds?: number
}): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (opts.expiresInSeconds ?? 60 * 60 * 24 * 180)
  const header = { alg: 'ES256', kid: opts.keyId }
  const payload = {
    iss: opts.teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: opts.clientId
  }

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`
  const key = createPrivateKey(opts.privateKeyPem.replace(/\\n/g, '\n'))
  const signature = sign('SHA256', Buffer.from(signingInput, 'utf8'), {
    key,
    dsaEncoding: 'ieee-p1363'
  })

  return `${signingInput}.${signature.toString('base64url')}`
}

export function isAppleSignInConfigured(): boolean {
  if (process.env.APPLE_CLIENT_SECRET && (process.env.APPLE_ID || process.env.APPLE_CLIENT_ID)) {
    return true
  }
  return Boolean(
    (process.env.APPLE_ID || process.env.APPLE_CLIENT_ID) &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  )
}

export function resolveAppleClientSecret(): string | null {
  if (process.env.APPLE_CLIENT_SECRET) {
    return process.env.APPLE_CLIENT_SECRET
  }
  const clientId = process.env.APPLE_ID || process.env.APPLE_CLIENT_ID
  const teamId = process.env.APPLE_TEAM_ID
  const keyId = process.env.APPLE_KEY_ID
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY
  if (!clientId || !teamId || !keyId || !privateKeyPem) {
    return null
  }
  return createAppleClientSecret({
    teamId,
    clientId,
    keyId,
    privateKeyPem
  })
}
