/**
 * Shared AI timeout policy for workout-related Trigger.dev tasks.
 * Structure generation uses up to 2 attempts (Flash → Pro); each attempt is bounded here.
 * Trigger task maxDuration remains 180s for generate/adjust structure tasks.
 */
export const WORKOUT_STRUCTURE_AI_TIMEOUT_MS = 45_000

export const WORKOUT_STRUCTURE_AI_MAX_RETRIES = 0
