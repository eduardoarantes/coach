/**
 * JSON schemas for structured workout AI generation (legacy_json path).
 */

const strengthBlockStepSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    libraryExerciseId: { type: 'string' },
    videoUrl: { type: 'string' },
    notes: { type: 'string' },
    movementPattern: {
      type: 'string',
      enum: ['squat', 'hinge', 'push', 'pull', 'lunge', 'core', 'carry', 'mobility']
    },
    intent: {
      type: 'string',
      enum: ['max_strength', 'power', 'muscular_endurance', 'prehab']
    },
    prescriptionMode: {
      type: 'string',
      enum: [
        'reps',
        'reps_per_side',
        'duration',
        'distance_meters',
        'distance_km',
        'distance_ft',
        'distance_yd',
        'distance_miles'
      ]
    },
    loadMode: {
      type: 'string',
      enum: [
        'none',
        'generic',
        'weight_lb',
        'weight_kg',
        'weight_per_side_lb',
        'weight_per_side_kg'
      ]
    },
    defaultRest: { type: 'string' },
    showRestColumn: { type: 'boolean' },
    setRows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          loadValue: { type: 'string' },
          restOverride: { type: 'string' }
        }
      }
    }
  },
  required: ['name', 'setRows']
}

const strengthBlocksSchema = {
  type: 'array',
  minItems: 1,
  description: 'Canonical strength workout structure grouped into blocks',
  items: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['warmup', 'single_exercise', 'cooldown', 'superset', 'circuit']
      },
      title: { type: 'string' },
      notes: { type: 'string' },
      durationSec: { type: 'integer', minimum: 1 },
      steps: {
        type: 'array',
        minItems: 1,
        items: strengthBlockStepSchema
      }
    },
    required: ['type', 'title', 'steps']
  }
}

/**
 * Strength-only schema: requires native `blocks` and omits top-level interval
 * `steps` / flat `exercises` so structured output cannot satisfy the wrong shape.
 */
export const strengthWorkoutStructureSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description:
        'Overall workout strategy in complete sentences (e.g. "Warm up, then squat and hinge strength work with accessory supersets."). NEVER use bullet points or list the exercises here.'
    },
    coachInstructions: {
      type: 'string',
      description: 'Personalized advice on technique, execution, and purpose (2-3 sentences).'
    },
    sRPE_target: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'Optional session RPE target on a 1-10 scale.'
    },
    blocks: strengthBlocksSchema
  },
  required: ['coachInstructions', 'blocks']
}
