import { isAllowedNativeRedirectUri } from './cursor-mcp-client'

const MAX_REDIRECT_URIS = 10
const MAX_URI_LENGTH = 2048

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function validateRedirectUri(uri: string): string {
  if (!uri || uri.length > MAX_URI_LENGTH) {
    throw new Error('Invalid redirect URI')
  }

  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    throw new Error('Invalid redirect URI')
  }

  if (parsed.username || parsed.password) {
    throw new Error('Redirect URI must not contain credentials')
  }
  if (parsed.hash) {
    throw new Error('Redirect URI must not contain a fragment')
  }
  if (parsed.protocol === 'cursor:') {
    const normalized = parsed.toString()
    if (!isAllowedNativeRedirectUri(normalized)) {
      throw new Error('Unsupported native redirect URI')
    }
    return normalized
  }

  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && isLoopbackHostname(parsed.hostname))
  ) {
    throw new Error('Redirect URI must use HTTPS except for loopback hosts')
  }

  return parsed.toString()
}

export function validateRedirectUris(uris: string[]): string[] {
  if (!uris.length) {
    throw new Error('At least one redirect URI is required')
  }
  if (uris.length > MAX_REDIRECT_URIS) {
    throw new Error(`At most ${MAX_REDIRECT_URIS} redirect URIs are allowed`)
  }

  const normalized = uris.map((uri) => validateRedirectUri(uri))
  const unique = new Set(normalized)
  if (unique.size !== normalized.length) {
    throw new Error('Duplicate redirect URIs are not allowed')
  }
  return normalized
}
