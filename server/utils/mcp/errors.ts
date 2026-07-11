import type { McpToolCallResult } from './types'
import { mcpMetrics } from './metrics'

export const MCP_MAX_RESULT_BYTES = 512 * 1024

export class McpClientError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message)
    this.name = 'McpClientError'
  }
}

export function mcpErrorResult(message: string, code = 'tool_error'): McpToolCallResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: code, message }) }]
  }
}

export function mcpSuccessResult(result: unknown): McpToolCallResult {
  const text = JSON.stringify(result ?? null)
  if (Buffer.byteLength(text, 'utf8') > MCP_MAX_RESULT_BYTES) {
    mcpMetrics.recordPayloadLimitFailure()
    return mcpErrorResult('Tool result exceeds maximum allowed size', 'payload_too_large')
  }

  return {
    content: [{ type: 'text', text }],
    structuredContent: result
  }
}

export function mapExecutionError(error: unknown): McpToolCallResult {
  if (error instanceof McpClientError) {
    return mcpErrorResult(error.message, error.code)
  }

  const message = error instanceof Error ? error.message : 'Tool execution failed'
  return mcpErrorResult(message, 'internal_error')
}

export function sanitizePublicErrorCode(error: unknown): string {
  if (error instanceof McpClientError) return error.code
  return 'internal_error'
}
