import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { reactivateAccount } from '../../../../../server/utils/services/accountDeactivationService'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  getRouterParam: (event: any, key: string) => event.context?.params?.[key],
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
  reactivateAccount: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/admin/users/[id]/reactivate.post')
  return mod.default
}

describe('POST /api/admin/users/[id]/reactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: false } } as any)
    const handler = await getHandler()

    await expect(
      handler({
        context: { params: { id: 'user-1' } }
      } as any)
    ).rejects.toThrow('Forbidden')
  })

  it('passes actor context to the reactivation service', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'admin-1',
        isAdmin: true,
        email: 'admin@example.com'
      }
    } as any)
    vi.mocked(reactivateAccount).mockResolvedValue({
      success: true,
      message: 'Account reactivated'
    } as any)
    const handler = await getHandler()
    const event = {
      context: { params: { id: 'user-2' } }
    } as any

    const result = await handler(event)

    expect(reactivateAccount).toHaveBeenCalledWith({
      userId: 'user-2',
      actor: {
        id: 'admin-1',
        email: 'admin@example.com'
      },
      event
    })
    expect(result).toEqual({
      success: true,
      message: 'Account reactivated'
    })
  })
})
