import { describe, expect, it } from 'vitest'
import { mcpMetrics } from '../../../../../server/utils/mcp/metrics'
import { mcpSuccessResult } from '../../../../../server/utils/mcp/errors'

describe('mcp/metrics', () => {
  it('tracks auth failures and runtime counters', () => {
    mcpMetrics.resetForTests()
    mcpMetrics.recordAuthFailure('invalid_token')
    mcpMetrics.recordRateLimitHit()
    mcpMetrics.recordQuotaDenial()
    mcpMetrics.recordRefreshReuseDetected()

    expect(mcpMetrics.snapshot()).toMatchObject({
      authFailures: { invalid_token: 1 },
      rateLimitHits: 1,
      quotaDenials: 1,
      refreshReuseDetected: 1
    })
  })
})

describe('mcp/errors payload limits', () => {
  it('records payload limit failures', () => {
    mcpMetrics.resetForTests()
    const huge = { data: 'x'.repeat(600_000) }
    const result = mcpSuccessResult(huge)
    expect(result.isError).toBe(true)
    expect(mcpMetrics.snapshot().payloadLimitFailures).toBe(1)
  })
})
