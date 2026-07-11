import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import {
  grantLifetimeSubscription,
  isLifetimeSubscriber,
  revokeLifetimeSubscription
} from '../../../../../server/utils/lifetime-subscription'
import { logAction } from '../../../../../server/utils/audit'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)

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

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/lifetime-subscription', () => ({
  isLifetimeSubscriber: vi.fn(),
  grantLifetimeSubscription: vi.fn(),
  revokeLifetimeSubscription: vi.fn()
}))

vi.mock('../../../../../server/utils/audit', () => ({
  logAction: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/admin/users/[id]/lifetime-subscription.post')
  return mod.default
}

describe('POST /api/admin/users/[id]/lifetime-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: false } } as any)
    const handler = await getHandler()

    await expect(
      handler({
        context: { params: { id: 'user-1' } },
        body: { action: 'grant' }
      } as any)
    ).rejects.toThrow('Forbidden')
  })

  it('grants lifetime pro access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', isAdmin: true }
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null
    } as any)
    vi.mocked(isLifetimeSubscriber).mockReturnValue(false)
    vi.mocked(grantLifetimeSubscription).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      subscriptionTier: 'PRO',
      subscriptionStatus: 'CONTRIBUTOR',
      subscriptionPeriodEnd: null
    } as any)

    const handler = await getHandler()
    const result = await handler({
      context: { params: { id: 'user-1' } },
      body: { action: 'grant', tier: 'PRO' }
    } as any)

    expect(grantLifetimeSubscription).toHaveBeenCalledWith('user-1', 'PRO')
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'admin.lifetime_subscription.grant'
      })
    )
    expect(result.success).toBe(true)
    expect(result.user.subscriptionStatus).toBe('CONTRIBUTOR')
  })

  it('revokes lifetime access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', isAdmin: true }
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      subscriptionTier: 'PRO',
      subscriptionStatus: 'CONTRIBUTOR',
      subscriptionPeriodEnd: null
    } as any)
    vi.mocked(isLifetimeSubscriber).mockReturnValue(true)
    vi.mocked(revokeLifetimeSubscription).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null
    } as any)

    const handler = await getHandler()
    const result = await handler({
      context: { params: { id: 'user-1' } },
      body: { action: 'revoke' }
    } as any)

    expect(revokeLifetimeSubscription).toHaveBeenCalledWith('user-1')
    expect(result.user.subscriptionStatus).toBe('NONE')
  })
})
