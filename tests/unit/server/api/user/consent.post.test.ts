import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

const readBody = vi.fn()
vi.stubGlobal('readBody', readBody)

const getCookie = vi.fn()
const getHeader = vi.fn()
vi.mock('h3', () => ({
  getCookie,
  getHeader
}))

const requireAuth = vi.fn()
const userFindUnique = vi.fn()
const userUpdate = vi.fn()
const triggerDeferredProviderIngests = vi.fn()

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth
}))

vi.mock('../../../../../server/utils/deferred-provider-ingest', () => ({
  triggerDeferredProviderIngests
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      update: userUpdate
    }
  }
}))

describe('POST /api/user/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    requireAuth.mockResolvedValue({ id: 'user-1' })
    userFindUnique.mockResolvedValue({
      uiLanguage: 'en',
      language: 'English'
    })
    userUpdate.mockResolvedValue({
      id: 'user-1',
      termsAcceptedAt: new Date('2026-07-08T00:00:00Z'),
      uiLanguage: 'en',
      language: 'English'
    })
    triggerDeferredProviderIngests.mockResolvedValue(undefined)
    getCookie.mockReturnValue(undefined)
    getHeader.mockReturnValue(undefined)
  })

  it('rejects requests without explicit health consent', async () => {
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0'
    })

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Health consent is required'
    })
    expect(userUpdate).not.toHaveBeenCalled()
    expect(triggerDeferredProviderIngests).not.toHaveBeenCalled()
  })

  it('rejects outdated policy versions', async () => {
    readBody.mockResolvedValue({
      termsVersion: '0.9',
      privacyPolicyVersion: '1.0',
      healthConsentAccepted: true
    })

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Outdated policy version'
    })
    expect(userUpdate).not.toHaveBeenCalled()
    expect(triggerDeferredProviderIngests).not.toHaveBeenCalled()
  })

  it('accepts consent when healthConsentAccepted is true and triggers deferred ingest', async () => {
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0',
      healthConsentAccepted: true
    })

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default
    const result = await handler({} as any)

    expect(userUpdate).toHaveBeenCalled()
    expect(triggerDeferredProviderIngests).toHaveBeenCalledWith('user-1')
    expect(result).toMatchObject({ success: true })
  })

  it('adopts browser/cookie locale when the user still has English defaults', async () => {
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0',
      healthConsentAccepted: true,
      uiLanguage: 'hu'
    })
    userUpdate.mockResolvedValue({
      id: 'user-1',
      termsAcceptedAt: new Date('2026-07-08T00:00:00Z'),
      uiLanguage: 'hu',
      language: 'Hungarian'
    })

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default
    const result = await handler({} as any)

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        uiLanguage: 'hu',
        language: 'Hungarian'
      })
    })
    expect(result).toMatchObject({
      success: true,
      uiLanguage: 'hu',
      language: 'Hungarian'
    })
  })

  it('does not overwrite an explicit non-default language preference', async () => {
    userFindUnique.mockResolvedValue({
      uiLanguage: 'de',
      language: 'German'
    })
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0',
      healthConsentAccepted: true,
      uiLanguage: 'hu'
    })
    getCookie.mockReturnValue('fr')
    getHeader.mockReturnValue('hu-HU')

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default
    await handler({} as any)

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        termsAcceptedAt: expect.any(Date),
        healthConsentAcceptedAt: expect.any(Date),
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0'
      }
    })
  })

  it('falls back to Accept-Language when no explicit locale is provided', async () => {
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0',
      healthConsentAccepted: true
    })
    getHeader.mockReturnValue('ja-JP, en;q=0.8')

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default
    await handler({} as any)

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        uiLanguage: 'ja',
        language: 'Japanese'
      })
    })
  })
})
