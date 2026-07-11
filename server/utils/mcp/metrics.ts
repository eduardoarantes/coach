type CounterMap = Record<string, number>

let counters: CounterMap = {}
let rateLimitHits = 0
let quotaDenials = 0
let payloadLimitFailures = 0
let refreshReuseDetected = 0

function increment(key: string, amount = 1) {
  counters[key] = (counters[key] || 0) + amount
}

export const mcpMetrics = {
  recordAuthFailure(reason: string) {
    increment(`auth_failure:${reason}`)
  },

  recordRateLimitHit() {
    rateLimitHits += 1
  },

  recordQuotaDenial() {
    quotaDenials += 1
  },

  recordPayloadLimitFailure() {
    payloadLimitFailures += 1
  },

  recordRefreshReuseDetected() {
    refreshReuseDetected += 1
    increment('refresh_reuse_detected')
  },

  snapshot() {
    const authFailures = Object.fromEntries(
      Object.entries(counters)
        .filter(([key]) => key.startsWith('auth_failure:'))
        .map(([key, count]) => [key.replace('auth_failure:', ''), count])
    )

    return {
      authFailures,
      rateLimitHits,
      quotaDenials,
      payloadLimitFailures,
      refreshReuseDetected
    }
  },

  resetForTests() {
    counters = {}
    rateLimitHits = 0
    quotaDenials = 0
    payloadLimitFailures = 0
    refreshReuseDetected = 0
  }
}
