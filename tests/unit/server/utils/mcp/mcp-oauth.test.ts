import { describe, expect, it } from 'vitest'
import {
  getMcpResourceUrl,
  isMcpResourceRequest,
  normalizeResourceUrl
} from '../../../../../server/utils/oauth/resource'
import { validateMcpOAuthScopes, parseScopeString } from '../../../../../server/utils/oauth/scopes'
import {
  isToolAllowedByPolicy,
  MCP_TOOL_POLICY_BY_NAME
} from '../../../../../server/utils/mcp/tool-manifest'
import { isMcpToolAvailable } from '../../../../../server/utils/mcp/tool-availability'
import { validateMcpToolManifest } from '../../../../../server/utils/mcp/manifest-validation'
import { buildCoachWattsOAuthMetadata } from '../../../../../server/utils/oauth/metadata'

describe('oauth/resource', () => {
  it('normalizes MCP resource URLs', () => {
    expect(getMcpResourceUrl('https://app.coachwatts.com')).toBe('https://app.coachwatts.com/mcp')
    expect(normalizeResourceUrl('https://app.coachwatts.com/mcp/')).toBe(
      'https://app.coachwatts.com/mcp'
    )
    expect(normalizeResourceUrl('https://app.coachwatts.com/mcp#frag')).toBeNull()
  })

  it('detects MCP resource requests', () => {
    expect(
      isMcpResourceRequest('https://app.coachwatts.com/mcp', 'https://app.coachwatts.com')
    ).toBe(true)
    expect(
      isMcpResourceRequest('https://app.coachwatts.com/api/mcp', 'https://app.coachwatts.com')
    ).toBe(false)
  })
})

describe('oauth/scopes', () => {
  it('parses and validates MCP scopes', () => {
    expect(parseScopeString('profile:read workout:read')).toEqual(['profile:read', 'workout:read'])
    expect(validateMcpOAuthScopes(['planning:read', 'offline_access', 'ai:generate'])).toEqual([
      'planning:read',
      'offline_access',
      'ai:generate'
    ])
    expect(() => validateMcpOAuthScopes(['unknown:scope'])).toThrow(/Unknown MCP OAuth scopes/)
  })
})

describe('oauth/metadata', () => {
  it('advertises MCP scopes and S256 PKCE', () => {
    const metadata = buildCoachWattsOAuthMetadata('https://app.coachwatts.com')
    expect(metadata.scopes_supported).toContain('planning:read')
    expect(metadata.scopes_supported).toContain('ai:generate')
    expect(metadata.registration_endpoint).toBeUndefined()
    expect(metadata.code_challenge_methods_supported).toEqual(['S256'])
  })

  it('advertises registration when DCR is enabled', () => {
    const metadata = buildCoachWattsOAuthMetadata('https://app.coachwatts.com', {
      includeRegistrationEndpoint: true
    })
    expect(String(metadata.registration_endpoint)).toContain('/api/oauth/register')
  })
})

describe('mcp/tool-manifest', () => {
  it('requires scopes for protected read tools', () => {
    expect(isToolAllowedByPolicy('get_user_profile', ['profile:read'], new Set(['read']))).toBe(
      true
    )
    expect(isToolAllowedByPolicy('get_user_profile', ['workout:read'], new Set(['read']))).toBe(
      false
    )
    expect(isToolAllowedByPolicy('get_current_time', [], new Set(['read']))).toBe(true)
  })

  it('includes async and recommendation tools', () => {
    expect(MCP_TOOL_POLICY_BY_NAME.has('generate_planned_workout_structure')).toBe(true)
    expect(MCP_TOOL_POLICY_BY_NAME.has('get_async_job_status')).toBe(true)
    expect(MCP_TOOL_POLICY_BY_NAME.has('list_pending_recommendations')).toBe(true)
  })

  it('allows chat-disabled async tools when async phase is enabled', () => {
    expect(isMcpToolAvailable('sync_data', new Set(['read']))).toBe(false)
    expect(isMcpToolAvailable('sync_data', new Set(['async']))).toBe(true)
    expect(isMcpToolAvailable('get_recent_workouts', new Set(['read']))).toBe(true)
  })
})

describe('mcp/manifest-validation', () => {
  it('flags missing registry entries', () => {
    const registry = ['get_recent_workouts', 'get_user_profile']
    const errors = validateMcpToolManifest({ registryToolNames: registry }).filter(
      (issue) => issue.level === 'error'
    )
    expect(errors.some((issue) => issue.message.includes('get_recent_workouts'))).toBe(false)
    expect(errors.some((issue) => issue.message.includes('create_planned_workout'))).toBe(true)
  })
})
