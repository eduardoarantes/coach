import { createHash } from 'node:crypto'
import { prisma } from '../db'
import { getUserAiSettings } from '../ai-user-settings'
import { getToolsWithContext } from '../ai-tools'
import { isToolAllowedByPolicy, MCP_TOOL_POLICY_BY_NAME } from './tool-manifest'
import type { getEnabledMcpPhases } from './tool-manifest'
import { mapExecutionError, McpClientError, mcpSuccessResult } from './errors'
import type { McpAuthContext, McpToolCallResult } from './types'
import { assertQuotaAllowed } from '../quotas/http'
import { isMcpToolAvailable } from './tool-availability'
import { mcpMetrics } from './metrics'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_PER_TOKEN = 120
const RATE_LIMIT_PER_USER = 300

type RateBucket = { count: number; resetAt: number }
const tokenRateBuckets = new Map<string, RateBucket>()
const userRateBuckets = new Map<string, RateBucket>()

function hashArgs(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value ?? null))
    .digest('hex')
}

function checkRateLimit(key: string, buckets: Map<string, RateBucket>, limit: number) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }
  bucket.count += 1
  if (bucket.count > limit) {
    mcpMetrics.recordRateLimitHit()
    throw new McpClientError('Rate limit exceeded', 'rate_limit_exceeded')
  }
}

function stripIdempotencyKey(args: Record<string, unknown>) {
  const { _idempotencyKey, ...rest } = args
  return {
    idempotencyKey: typeof _idempotencyKey === 'string' ? _idempotencyKey : undefined,
    args: rest
  }
}

async function enforceQuota(operation: string | undefined, userId: string) {
  if (!operation) return
  try {
    await assertQuotaAllowed(userId, operation)
  } catch (error: any) {
    if (error?.statusCode === 429) {
      mcpMetrics.recordQuotaDenial()
      throw new McpClientError('Quota exceeded', 'quota_exceeded')
    }
    throw error
  }
}

async function reserveIdempotencyKey(params: {
  appId: string
  tokenId: string
  toolName: string
  idempotencyKey: string
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  try {
    await prisma.mcpIdempotencyKey.create({
      data: {
        appId: params.appId,
        tokenId: params.tokenId,
        toolName: params.toolName,
        idempotencyKey: params.idempotencyKey,
        status: 'in_progress',
        expiresAt
      }
    })
    return null
  } catch {
    const existing = await prisma.mcpIdempotencyKey.findUnique({
      where: {
        appId_tokenId_toolName_idempotencyKey: {
          appId: params.appId,
          tokenId: params.tokenId,
          toolName: params.toolName,
          idempotencyKey: params.idempotencyKey
        }
      }
    })
    if (!existing) {
      throw new McpClientError('Idempotency conflict', 'idempotency_conflict')
    }
    if (existing.status === 'completed' && existing.responseHash) {
      try {
        return JSON.parse(existing.responseHash)
      } catch {
        return mcpSuccessResult({ idempotentReplay: true })
      }
    }
    if (existing.status === 'in_progress') {
      throw new McpClientError('Duplicate request in progress', 'idempotency_in_progress')
    }
    throw new McpClientError(
      'Idempotency key already used with a failed result',
      'idempotency_failed'
    )
  }
}

async function finalizeIdempotencyKey(params: {
  appId: string
  tokenId: string
  toolName: string
  idempotencyKey: string
  status: 'completed' | 'failed'
  responseHash?: string
}) {
  await prisma.mcpIdempotencyKey.update({
    where: {
      appId_tokenId_toolName_idempotencyKey: {
        appId: params.appId,
        tokenId: params.tokenId,
        toolName: params.toolName,
        idempotencyKey: params.idempotencyKey
      }
    },
    data: {
      status: params.status,
      responseHash: params.responseHash
    }
  })
}

export async function executeMcpTool(
  ctx: McpAuthContext,
  toolName: string,
  rawArgs: Record<string, unknown>,
  options: {
    enabledPhases: ReturnType<typeof getEnabledMcpPhases>
    registryTools?: Record<string, { execute?: (args: unknown) => Promise<unknown> }>
  }
): Promise<McpToolCallResult> {
  const policy = MCP_TOOL_POLICY_BY_NAME.get(toolName)
  if (!policy || !options.enabledPhases.has(policy.phase)) {
    throw new McpClientError('Tool not found', 'tool_not_found')
  }
  if (!isToolAllowedByPolicy(toolName, ctx.scopes, options.enabledPhases)) {
    throw new McpClientError('Insufficient scope for tool', 'insufficient_scope')
  }
  if (!isMcpToolAvailable(toolName, options.enabledPhases)) {
    throw new McpClientError('Tool temporarily unavailable', 'tool_unavailable')
  }

  checkRateLimit(ctx.tokenId, tokenRateBuckets, RATE_LIMIT_PER_TOKEN)
  checkRateLimit(ctx.userId, userRateBuckets, RATE_LIMIT_PER_USER)

  const { idempotencyKey: argKey, args } = stripIdempotencyKey(rawArgs)
  const idempotencyKey = ctx.idempotencyKey || argKey
  const argsHash = hashArgs(args)

  if (policy.mutates && idempotencyKey) {
    const cachedHash = await reserveIdempotencyKey({
      appId: ctx.appId,
      tokenId: ctx.tokenId,
      toolName,
      idempotencyKey
    })
    if (cachedHash) {
      try {
        return JSON.parse(cachedHash)
      } catch {
        return mcpSuccessResult({ idempotentReplay: true })
      }
    }
  }

  const audit = await prisma.mcpToolExecution.create({
    data: {
      userId: ctx.userId,
      appId: ctx.appId,
      tokenId: ctx.tokenId,
      requestId: ctx.requestId,
      toolName,
      argsHash,
      status: 'started'
    }
  })

  const startedAt = Date.now()
  try {
    await enforceQuota(policy.quotaOperation, ctx.userId)

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } })
    if (!user || user.deactivatedAt) {
      throw new McpClientError('Account deactivated', 'account_deactivated')
    }

    const aiSettings = await getUserAiSettings(ctx.userId)
    const tools =
      options.registryTools || getToolsWithContext(ctx.userId, user.timezone || 'UTC', aiSettings)
    const tool = tools[toolName as keyof typeof tools] as
      | {
          execute?: (args: unknown) => Promise<unknown>
          description?: string
          inputSchema?: unknown
        }
      | undefined

    if (!tool?.execute) {
      throw new McpClientError('Tool not available for this account', 'tool_unavailable')
    }

    const result = await Promise.race([
      tool.execute(args),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new McpClientError('Tool execution timed out', 'timeout')),
          policy.timeoutMs
        )
      })
    ])

    const response = mcpSuccessResult(result)

    await prisma.mcpToolExecution.update({
      where: { id: audit.id },
      data: {
        status: 'completed',
        durationMs: Date.now() - startedAt,
        completedAt: new Date()
      }
    })

    if (policy.mutates && idempotencyKey) {
      await finalizeIdempotencyKey({
        appId: ctx.appId,
        tokenId: ctx.tokenId,
        toolName,
        idempotencyKey,
        status: 'completed',
        responseHash: JSON.stringify(response)
      })
    }

    return response
  } catch (error) {
    await prisma.mcpToolExecution.update({
      where: { id: audit.id },
      data: {
        status: 'failed',
        errorCode: error instanceof McpClientError ? error.code : 'internal_error',
        durationMs: Date.now() - startedAt,
        completedAt: new Date()
      }
    })

    if (policy.mutates && idempotencyKey) {
      await finalizeIdempotencyKey({
        appId: ctx.appId,
        tokenId: ctx.tokenId,
        toolName,
        idempotencyKey,
        status: 'failed'
      }).catch(() => undefined)
    }

    return mapExecutionError(error)
  }
}

export { hashArgs as hashMcpToolArgs }
