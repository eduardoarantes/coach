import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { deactivateAccount } from '../../../../../server/utils/services/accountDeactivationService'

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  getRouterParam: (event: any, key: string) => event.context?.params?.[key],
  readBody: (event: any) => event.body,
  createError: (err: any) => {
    const error = new Error(err.statusMessage)
    ;(error as any).statusCode = err.statusCode
    return error
  }
}))

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/services/accountDeactivationService', () => ({
  deactivateAccount: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/admin/users/[id]/deactivate.post')
  return mod.default
}

describe('POST /api/admin/users/[id]/deactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: false } } as any)
    const handler = await getHandler()

    await expect(
      handler({
        context: { params: { id: 'user-1' } },
        body: {}
      } as any)
    ).rejects.toThrow('Forbidden')
  })

  it('rejects self-deactivation from admin panel', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', isAdmin: true }
    } as any)
    const handler = await getHandler()

    await expect(
      handler({
        context: { params: { id: 'user-1' } },
        body: {}
      } as any)
    ).rejects.toThrow('You cannot deactivate your own account from the admin panel')
  })

  it('passes actor context and reason to the deactivation service', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'impersonated-user',
        isAdmin: true,
        email: 'acting@example.com',
        originalUserId: 'admin-1',
        originalUserEmail: 'admin@example.com'
      }
    } as any)
    vi.mocked(deactivateAccount).mockResolvedValue({
      success: true,
      message: 'Account deactivated'
    } as any)
    const handler = await getHandler()
    const event = {
      context: { params: { id: 'user-2' } },
      body: { reason: 'Requested by support' }
    } as any

    const result = await handler(event)

    expect(deactivateAccount).toHaveBeenCalledWith({
      userId: 'user-2',
      actor: {
        id: 'admin-1',
        email: 'admin@example.com'
      },
      reason: 'Requested by support',
      event
    })
    expect(result).toEqual({
      success: true,
      message: 'Account deactivated'
    })
  })
})
