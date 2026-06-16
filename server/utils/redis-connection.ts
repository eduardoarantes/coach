const BROKEN_REDIS_ERROR_CODES = new Set([
  'CONNECTION_CLOSED',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'NR_CLOSED'
])

const BROKEN_REDIS_MESSAGE_PATTERNS = [
  'connection is closed',
  'connection closed',
  'connect econnrefused',
  'connect ehostunreach',
  'getaddrinfo enotfound'
]

export function getRedisRetryDelay(attempt: number) {
  return Math.min(Math.max(attempt, 1) * 250, 5000)
}

export function shouldRecreateRedisConnection(status: string | null | undefined) {
  return status === 'close' || status === 'end'
}

export function isRedisConnectionError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : ''
  if (code && BROKEN_REDIS_ERROR_CODES.has(code)) return true

  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''
  return BROKEN_REDIS_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))
}
