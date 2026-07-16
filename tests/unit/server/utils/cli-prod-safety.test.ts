import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertProdWriteAllowed } from '../../../../server/utils/cli-prod-safety'

describe('cli prod safety', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('allows non-prod writes', () => {
    expect(() => assertProdWriteAllowed({ prod: false })).not.toThrow()
  })

  it('allows dry-run with prod', () => {
    expect(() => assertProdWriteAllowed({ prod: true, dryRun: true })).not.toThrow()
  })

  it('allows prod writes with confirm-prod', () => {
    expect(() => assertProdWriteAllowed({ prod: true, confirmProd: true })).not.toThrow()
  })

  it('rejects prod writes without confirm-prod', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as any)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => assertProdWriteAllowed({ prod: true })).toThrow('exit:1')
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalled()
  })
})
