import { McpServer } from '@modelcontextprotocol/server'
import type { McpRequestContext } from '@modelcontextprotocol/server'
import { getToolsWithContext } from '../ai-tools'
import { prisma } from '../db'
import { getUserAiSettings } from '../ai-user-settings'
import { authInfoToMcpContext } from './auth'
import { executeMcpTool } from './execution'
import { getEnabledMcpPhases, listManifestToolsForToken } from './tool-manifest'
import { McpClientError, mcpErrorResult } from './errors'
import { listAvailableMcpToolNames } from './tool-availability'
import { mcpAsyncStatusTools } from './mcp-only-tools'
import { toMcpInputSchema } from './input-schema'
import type { RuntimeConfig } from 'nuxt/schema'

function getMcpRuntimeFlags(config: RuntimeConfig) {
  return {
    read: config.mcpReadEnabled !== false,
    write: config.mcpWriteEnabled === true,
    async: config.mcpAsyncEnabled === true,
    executionEnabled: config.mcpExecutionEnabled !== false
  }
}

function isClientAllowed(clientId: string, config: RuntimeConfig): boolean {
  const allowlist = (config.mcpClientAllowlist || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (allowlist.length === 0) return true
  return allowlist.includes(clientId)
}

export function createCoachWattsMcpServerFactory(config: RuntimeConfig) {
  const enabledPhases = getEnabledMcpPhases(getMcpRuntimeFlags(config))

  return async (ctx: McpRequestContext) => {
    const server = new McpServer({
      name: 'coach-watts',
      version: config.public.version || '0.0.0'
    })

    if (!ctx.authInfo) {
      return server
    }

    if (!isClientAllowed(ctx.authInfo.clientId, config)) {
      return server
    }

    const requestId =
      typeof ctx.requestInfo?.headers.get('x-request-id') === 'string'
        ? ctx.requestInfo.headers.get('x-request-id')!
        : crypto.randomUUID()

    const idempotencyKey = ctx.requestInfo?.headers.get('mcp-idempotency-key') || undefined
    const authContext = authInfoToMcpContext(ctx.authInfo, requestId, idempotencyKey || undefined)

    const user = await prisma.user.findUnique({ where: { id: authContext.userId } })
    if (!user) return server

    const aiSettings = await getUserAiSettings(authContext.userId)
    const mcpOnlyTools =
      enabledPhases.has('read') || enabledPhases.has('async')
        ? mcpAsyncStatusTools(authContext.userId)
        : {}

    const availableNames = listAvailableMcpToolNames(
      authContext.userId,
      user.timezone || 'UTC',
      aiSettings,
      enabledPhases,
      mcpOnlyTools
    )

    const registryTools = {
      ...getToolsWithContext(authContext.userId, user.timezone || 'UTC', aiSettings),
      ...mcpOnlyTools
    }

    const exposed = listManifestToolsForToken(availableNames, authContext.scopes, enabledPhases)

    for (const policy of exposed) {
      const toolDef = registryTools[policy.name as keyof typeof registryTools] as
        | { description?: string; inputSchema?: unknown; execute?: (...args: unknown[]) => unknown }
        | undefined
      if (!toolDef) continue

      server.registerTool(
        policy.name,
        {
          description: toolDef.description || policy.name,
          inputSchema: toMcpInputSchema(toolDef.inputSchema) as any,
          annotations: {
            readOnlyHint: !policy.mutates,
            destructiveHint: policy.mutates && policy.name.startsWith('delete_')
          }
        },
        async (args: Record<string, unknown>) => {
          if (getMcpRuntimeFlags(config).executionEnabled === false) {
            return mcpErrorResult(
              'MCP tool execution is temporarily disabled',
              'execution_disabled'
            )
          }

          try {
            return await executeMcpTool(
              authContext,
              policy.name,
              (args || {}) as Record<string, unknown>,
              {
                enabledPhases,
                registryTools
              }
            )
          } catch (error) {
            if (error instanceof McpClientError) {
              return mcpErrorResult(error.message, error.code)
            }
            return mcpErrorResult('Tool execution failed', 'internal_error')
          }
        }
      )
    }

    return server
  }
}
