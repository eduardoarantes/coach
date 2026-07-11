import { getToolsWithContext, TEMPORARILY_DISABLED_CHAT_TOOLS } from '../ai-tools'
import { MCP_DATA_SCOPES, MCP_OAUTH_SCOPES } from '../oauth/scopes'
import { MCP_TOOL_MANIFEST, MCP_TOOL_POLICY_BY_NAME } from './tool-manifest'

export type ManifestValidationIssue = {
  level: 'error' | 'warning'
  message: string
}

/**
 * Validates manifest entries against the chat tool registry for a representative user context.
 * Intended for startup checks and CI drift tests.
 */
export function validateMcpToolManifest(options?: {
  registryToolNames?: Iterable<string>
}): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = []
  const registry = new Set(options?.registryToolNames || [])

  for (const entry of MCP_TOOL_MANIFEST) {
    for (const scope of entry.scopes) {
      if (!MCP_OAUTH_SCOPES.includes(scope as (typeof MCP_OAUTH_SCOPES)[number])) {
        issues.push({
          level: 'error',
          message: `Manifest tool ${entry.name} references unknown scope ${scope}`
        })
      }
    }

    if (entry.mutates && entry.phase === 'read') {
      issues.push({
        level: 'error',
        message: `Manifest tool ${entry.name} is read phase but marked mutating`
      })
    }

    if (!entry.mutates && entry.name.startsWith('delete_')) {
      issues.push({
        level: 'warning',
        message: `Manifest tool ${entry.name} looks destructive but mutates=false`
      })
    }

    if (registry.size > 0 && !registry.has(entry.name) && entry.name !== 'get_async_job_status') {
      issues.push({
        level: 'error',
        message: `Manifest tool ${entry.name} is missing from the tool registry`
      })
    }

    if (TEMPORARILY_DISABLED_CHAT_TOOLS.has(entry.name) && entry.phase !== 'async') {
      issues.push({
        level: 'error',
        message: `Manifest tool ${entry.name} is temporarily disabled in chat but not async phase`
      })
    }
  }

  const manifestNames = new Set(MCP_TOOL_MANIFEST.map((entry) => entry.name))
  for (const scope of MCP_DATA_SCOPES) {
    void scope
  }

  for (const name of registry) {
    if (!manifestNames.has(name)) {
      // informational only — default deny is intentional
      void name
    }
  }

  return issues
}

export function assertMcpManifestValid(options?: { registryToolNames?: Iterable<string> }) {
  const errors = validateMcpToolManifest(options).filter((issue) => issue.level === 'error')
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => issue.message).join('\n'))
  }
}

export function sampleRegistryToolNames(): string[] {
  const tools = getToolsWithContext('00000000-0000-0000-0000-000000000099', 'UTC', {
    aiPersona: 'Supportive',
    aiModelPreference: 'flash',
    aiAutoAnalyzeWorkouts: false,
    aiAutoAnalyzeNutrition: false,
    aiAutoAnalyzeReadiness: false,
    aiRequireToolApproval: false,
    aiProactivityEnabled: false,
    aiConversationalEngagement: true,
    aiMemoryEnabled: true,
    aiContext: null,
    nutritionTrackingEnabled: true,
    updateWorkoutNotesEnabled: true,
    nickname: null,
    aiTtsStyle: 'coach',
    aiTtsVoiceName: 'Kore',
    aiTtsSpeed: 'normal',
    aiTtsAutoReadMessages: false
  })

  const names = new Set(Object.keys(tools))

  for (const name of TEMPORARILY_DISABLED_CHAT_TOOLS) {
    if (MCP_TOOL_POLICY_BY_NAME.get(name)?.phase === 'async') {
      names.add(name)
    }
  }

  names.add('get_async_job_status')

  return [...names]
}

export function findManifestDrift(): ManifestValidationIssue[] {
  return validateMcpToolManifest({ registryToolNames: sampleRegistryToolNames() })
}
