export type McpToolPhase = 'read' | 'write' | 'async'

export type McpToolPolicy = {
  name: string
  phase: McpToolPhase
  scopes: string[]
  mutates: boolean
  quotaOperation?: string
  timeoutMs: number
}

const DEFAULT_READ_TIMEOUT_MS = 30_000
const DEFAULT_WRITE_TIMEOUT_MS = 45_000

export const MCP_TOOL_MANIFEST: McpToolPolicy[] = [
  // Read-only phase
  {
    name: 'get_recent_workouts',
    phase: 'read',
    scopes: ['workout:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'search_workouts',
    phase: 'read',
    scopes: ['workout:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_workout_details',
    phase: 'read',
    scopes: ['workout:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_workout_analysis',
    phase: 'read',
    scopes: ['workout:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_workout_streams',
    phase: 'read',
    scopes: ['workout:read'],
    mutates: false,
    timeoutMs: 60_000
  },
  {
    name: 'get_planned_workouts',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'search_planned_workouts',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_current_plan',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_planned_workout_details',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_planned_workout_structure',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_user_profile',
    phase: 'read',
    scopes: ['profile:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_sport_settings',
    phase: 'read',
    scopes: ['profile:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_training_availability',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_wellness_metrics',
    phase: 'read',
    scopes: ['health:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_wellness_events',
    phase: 'read',
    scopes: ['health:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_nutrition_log',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_fueling_recommendations',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_metabolic_strategy',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_daily_fueling_status',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_meal_recommendations',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'show_nutrition_plan',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'analyze_training_load',
    phase: 'read',
    scopes: ['analysis:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'forecast_training_load',
    phase: 'read',
    scopes: ['analysis:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  { name: 'get_current_time', phase: 'read', scopes: [], mutates: false, timeoutMs: 5_000 },
  { name: 'perform_calculation', phase: 'read', scopes: [], mutates: false, timeoutMs: 5_000 },
  {
    name: 'calculate_training_metrics',
    phase: 'read',
    scopes: [],
    mutates: false,
    timeoutMs: 10_000
  },
  {
    name: 'resolve_temporal_reference',
    phase: 'read',
    scopes: [],
    mutates: false,
    timeoutMs: 5_000
  },
  {
    name: 'get_daily_summary',
    phase: 'read',
    scopes: ['profile:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_integrations_status',
    phase: 'read',
    scopes: ['profile:read'],
    mutates: false,
    timeoutMs: 10_000
  },
  {
    name: 'search_workout_library',
    phase: 'read',
    scopes: ['planning:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },

  // Write phase
  {
    name: 'create_planned_workout',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_planned_workout',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'reschedule_planned_workout',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'delete_planned_workout',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'set_planned_workout_structure',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'patch_planned_workout_structure',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_training_week',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'publish_planned_workout',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_workout_notes',
    phase: 'write',
    scopes: ['workout:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_workout_tags',
    phase: 'write',
    scopes: ['workout:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_workout',
    phase: 'write',
    scopes: ['workout:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'create_manual_workout',
    phase: 'write',
    scopes: ['workout:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'delete_workout',
    phase: 'write',
    scopes: ['workout:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_user_profile',
    phase: 'write',
    scopes: ['profile:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_sport_settings',
    phase: 'write',
    scopes: ['profile:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_training_availability',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'record_wellness_event',
    phase: 'write',
    scopes: ['health:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_wellness_event',
    phase: 'write',
    scopes: ['health:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'delete_wellness_event',
    phase: 'write',
    scopes: ['health:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'log_nutrition_meal',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'log_hydration_intake',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'delete_hydration',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'delete_nutrition_item',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'patch_nutrition_items',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'lock_meal_to_plan',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'create_nutrition_plan',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    quotaOperation: 'nutrition_analysis',
    timeoutMs: 60_000
  },
  {
    name: 'swap_planned_meal',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'complete_planned_meal',
    phase: 'write',
    scopes: ['nutrition:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'export_grocery_list',
    phase: 'read',
    scopes: ['nutrition:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'list_memories',
    phase: 'read',
    scopes: ['memory:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'remember_memory',
    phase: 'write',
    scopes: ['memory:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'update_memory',
    phase: 'write',
    scopes: ['memory:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'forget_memory',
    phase: 'write',
    scopes: ['memory:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'save_to_workout_library',
    phase: 'write',
    scopes: ['planning:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },

  // Recommendation reads
  {
    name: 'list_pending_recommendations',
    phase: 'read',
    scopes: ['recommendations:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'get_recommendation_details',
    phase: 'read',
    scopes: ['recommendations:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'recommend_workout',
    phase: 'read',
    scopes: ['recommendations:read'],
    mutates: false,
    timeoutMs: DEFAULT_READ_TIMEOUT_MS
  },
  {
    name: 'accept_recommendation',
    phase: 'write',
    scopes: ['recommendations:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },
  {
    name: 'dismiss_recommendation',
    phase: 'write',
    scopes: ['recommendations:write'],
    mutates: true,
    timeoutMs: DEFAULT_WRITE_TIMEOUT_MS
  },

  // Async / AI-cost phase
  { name: 'get_async_job_status', phase: 'read', scopes: [], mutates: false, timeoutMs: 10_000 },
  {
    name: 'analyze_activity',
    phase: 'async',
    scopes: ['workout:read', 'ai:generate'],
    mutates: true,
    quotaOperation: 'workout_analysis',
    timeoutMs: 30_000
  },
  {
    name: 'generate_planned_workout_structure',
    phase: 'async',
    scopes: ['planning:write', 'ai:generate'],
    mutates: true,
    quotaOperation: 'generate_structured_workout',
    timeoutMs: 60_000
  },
  {
    name: 'adjust_planned_workout',
    phase: 'async',
    scopes: ['planning:write', 'ai:generate'],
    mutates: true,
    quotaOperation: 'generate_structured_workout',
    timeoutMs: 60_000
  },
  {
    name: 'modify_training_plan_structure',
    phase: 'async',
    scopes: ['planning:write', 'ai:generate'],
    mutates: true,
    quotaOperation: 'weekly_plan_generation',
    timeoutMs: 90_000
  },
  {
    name: 'generate_report',
    phase: 'async',
    scopes: ['analysis:read', 'ai:generate'],
    mutates: false,
    quotaOperation: 'unified_report_generation',
    timeoutMs: 60_000
  },
  {
    name: 'generate_athlete_profile',
    phase: 'async',
    scopes: ['profile:write', 'ai:generate'],
    mutates: true,
    quotaOperation: 'athlete_profile_generation',
    timeoutMs: 60_000
  },
  { name: 'sync_data', phase: 'async', scopes: ['workout:read'], mutates: false, timeoutMs: 30_000 }
]

export const MCP_TOOL_POLICY_BY_NAME = new Map(
  MCP_TOOL_MANIFEST.map((entry) => [entry.name, entry])
)

export function getEnabledMcpPhases(config: { read: boolean; write: boolean; async: boolean }) {
  const phases = new Set<McpToolPhase>()
  if (config.read) phases.add('read')
  if (config.write) phases.add('write')
  if (config.async) phases.add('async')
  return phases
}

export function isToolAllowedByPolicy(
  toolName: string,
  tokenScopes: string[],
  enabledPhases: Set<McpToolPhase>
): boolean {
  const policy = MCP_TOOL_POLICY_BY_NAME.get(toolName)
  if (!policy || !enabledPhases.has(policy.phase)) return false
  if (policy.scopes.length === 0) return true
  return policy.scopes.every((scope) => tokenScopes.includes(scope))
}

export function listManifestToolsForToken(
  availableToolNames: Set<string>,
  tokenScopes: string[],
  enabledPhases: Set<McpToolPhase>
): McpToolPolicy[] {
  return MCP_TOOL_MANIFEST.filter(
    (policy) =>
      enabledPhases.has(policy.phase) &&
      availableToolNames.has(policy.name) &&
      isToolAllowedByPolicy(policy.name, tokenScopes, enabledPhases)
  )
}
