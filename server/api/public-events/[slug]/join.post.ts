import { z } from 'zod/v3'
import { requireAuth } from '../../../utils/auth-guard'
import { joinPublicEventAsGoal } from '../../../utils/public-events'
import { checkRateLimit, getRateLimitKeyFromEvent } from '../../../utils/rate-limit'

const joinSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('HIGH'),
  phase: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Event slug is required' })
  }

  const rateLimit = checkRateLimit('public-event-join', `${user.id}:${slug}`, {
    windowMs: 60_000,
    maxAttempts: 10,
    minIntervalMs: 500
  })
  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many join attempts. Please wait and try again.'
    })
  }

  const ipKey = getRateLimitKeyFromEvent({
    headers: {
      'x-forwarded-for': getHeader(event, 'x-forwarded-for') || undefined
    }
  })
  const ipRateLimit = checkRateLimit('public-event-join-ip', `${ipKey}:${slug}`, {
    windowMs: 60_000,
    maxAttempts: 30,
    minIntervalMs: 0
  })
  if (!ipRateLimit.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many join attempts from this network. Please try again later.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const parsed = joinSchema.safeParse(body ?? {})
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: parsed.error.issues
    })
  }

  return joinPublicEventAsGoal(user.id, slug, {
    priority: parsed.data.priority,
    phase: parsed.data.phase ?? 'BUILD'
  })
})
