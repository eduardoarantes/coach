import { describe, expect, it } from 'vitest'
import {
  validateRedirectUri,
  validateRedirectUris
} from '../../../../../server/utils/oauth/redirect-uri'
import { CURSOR_MCP_REDIRECT_URIS } from '../../../../../server/utils/oauth/cursor-mcp-client'

describe('oauth/redirect-uri', () => {
  it('accepts Cursor MCP redirect URIs', () => {
    for (const uri of CURSOR_MCP_REDIRECT_URIS) {
      expect(validateRedirectUri(uri)).toBe(uri)
    }
    expect(validateRedirectUris([...CURSOR_MCP_REDIRECT_URIS])).toHaveLength(
      CURSOR_MCP_REDIRECT_URIS.length
    )
  })

  it('rejects unsupported native redirect URIs', () => {
    expect(() => validateRedirectUri('cursor://evil.example/callback')).toThrow(
      /Unsupported native redirect URI/
    )
  })
})
