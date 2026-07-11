import type { AuthInfo, CallToolResult } from '@modelcontextprotocol/server'

export type McpExecutionStatus = 'started' | 'completed' | 'failed' | 'denied'

export interface McpAuthContext {
  userId: string
  appId: string
  tokenId: string
  scopes: string[]
  requestId: string
  idempotencyKey?: string
  authInfo: AuthInfo
}

export type McpToolCallResult = CallToolResult
