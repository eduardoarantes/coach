import { getToolsWithContext, isChatToolTemporarilyDisabled } from '../ai-tools'
import { MCP_TOOL_POLICY_BY_NAME, type McpToolPhase } from './tool-manifest'

/** MCP may expose chat-disabled tools when they belong to the async phase manifest. */
export function isMcpToolAvailable(toolName: string, enabledPhases: Set<McpToolPhase>): boolean {
  const policy = MCP_TOOL_POLICY_BY_NAME.get(toolName)
  if (!policy || !enabledPhases.has(policy.phase)) return false
  if (isChatToolTemporarilyDisabled(toolName)) {
    return policy.phase === 'async'
  }
  return true
}

export function listAvailableMcpToolNames(
  userId: string,
  timezone: string,
  aiSettings: Parameters<typeof getToolsWithContext>[2],
  enabledPhases: Set<McpToolPhase>,
  extraTools: Record<string, unknown> = {}
): Set<string> {
  const registryTools = getToolsWithContext(userId, timezone, aiSettings)
  const merged = { ...registryTools, ...extraTools }

  return new Set(
    Object.keys(merged).filter(
      (name) => isMcpToolAvailable(name, enabledPhases) && merged[name as keyof typeof merged]
    )
  )
}
