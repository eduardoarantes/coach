import { describe, expect, it } from 'vitest'
import {
  isCursorCompatibleDcrRequest,
  serializeDcrRegistrationResponse
} from '../../../../../server/utils/oauth/mcp-dcr'
import { CURSOR_MCP_REDIRECT_URIS } from '../../../../../server/utils/oauth/cursor-mcp-client'

describe('oauth/mcp-dcr', () => {
  it('detects Cursor-compatible DCR redirect URIs', () => {
    expect(isCursorCompatibleDcrRequest(['http://localhost:8787/callback'])).toBe(true)
    expect(isCursorCompatibleDcrRequest([...CURSOR_MCP_REDIRECT_URIS])).toBe(true)
    expect(isCursorCompatibleDcrRequest(['http://127.0.0.1:8765/callback'])).toBe(true)
    expect(isCursorCompatibleDcrRequest(['https://evil.example/callback'])).toBe(false)
  })

  it('serializes RFC 7591 registration responses', () => {
    const createdAt = new Date('2026-07-11T12:00:00.000Z')
    expect(
      serializeDcrRegistrationResponse({
        clientId: 'client-1',
        name: 'Cursor MCP',
        redirectUris: ['http://localhost:8787/callback'],
        createdAt
      })
    ).toEqual({
      client_id: 'client-1',
      client_id_issued_at: Math.floor(createdAt.getTime() / 1000),
      client_name: 'Cursor MCP',
      redirect_uris: ['http://localhost:8787/callback'],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code']
    })
  })
})
