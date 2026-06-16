import { describe, expect, it } from 'vitest'
import {
  getRedisRetryDelay,
  isRedisConnectionError,
  shouldRecreateRedisConnection
} from './redis-connection'

describe('redis connection helpers', () => {
  it('marks ended connections for recreation', () => {
    expect(shouldRecreateRedisConnection('end')).toBe(true)
    expect(shouldRecreateRedisConnection('close')).toBe(true)
    expect(shouldRecreateRedisConnection('ready')).toBe(false)
    expect(shouldRecreateRedisConnection('reconnecting')).toBe(false)
    expect(shouldRecreateRedisConnection(undefined)).toBe(false)
  })

  it('classifies broken redis connection errors', () => {
    expect(isRedisConnectionError(new Error('Connection is closed.'))).toBe(true)
    expect(isRedisConnectionError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' })).toBe(
      true
    )
    expect(
      isRedisConnectionError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND cache' })
    ).toBe(true)
    expect(isRedisConnectionError(new Error('some unrelated failure'))).toBe(false)
  })

  it('uses a bounded redis reconnect delay', () => {
    expect(getRedisRetryDelay(1)).toBe(250)
    expect(getRedisRetryDelay(4)).toBe(1000)
    expect(getRedisRetryDelay(100)).toBe(5000)
  })
})
