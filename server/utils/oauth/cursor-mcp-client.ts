export const CURSOR_MCP_APP_NAME = 'Cursor MCP'

export const CURSOR_MCP_REDIRECT_URIS = [
  'http://localhost:8787/callback',
  'cursor://anysphere.cursor-mcp/oauth/callback',
  'https://www.cursor.com/agents/mcp/oauth/callback'
] as const

export function isAllowedNativeRedirectUri(uri: string): boolean {
  return (CURSOR_MCP_REDIRECT_URIS as readonly string[]).includes(uri)
}
