# 032 — Trigger tag taxonomy inconsistent for workout structure jobs

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `backend`, `workouts`, `infra`  
**Status:** Fixed
**Related:** [002](./002-missing-planned-workout-run-tags.md), [013](./013-chat-duplicate-structure-generation-triggers.md)

## Description

`user:{userId}` tagging exists for ownership, but **secondary entity tags** for workout structure generation are applied inconsistently across entry points — making per-workout monitoring, filtering, and debugging unreliable.

## Tag matrix (`generate-structured-workout`)

| Entry point                               | Trigger tags                                        | `publishTaskRunStartedEvent` tags |
| ----------------------------------------- | --------------------------------------------------- | --------------------------------- |
| Chat `create_planned_workout`             | `user`, **`planned-workout:{id}`**                  | Same ✓                            |
| Chat `generate_planned_workout_structure` | `user`, **`planned-workout:{id}`**                  | Same ✓                            |
| API `generate-structure.post.ts`          | **`user` only**                                     | **`user` only**                   |
| API `adjust.post.ts`                      | **`user` only**                                     | **`user` only**                   |
| `accept.post.ts` (recommendations)        | **`user` only**                                     | Not published                     |
| `generate-training-block` loop            | **`user` only**                                     | Not published                     |
| `generate-ad-hoc-workout` chain           | **`user` only**                                     | Not published                     |
| Library template API                      | `user:{templateOwner}`, **`workout-template:{id}`** | Not published                     |

## Impact

- Planned Workout Details page `activeStructureRun` only matches `planned-workout:` tag ([002](./002-missing-planned-workout-run-tags.md)).
- Trigger Monitor shows generic “Generate Structured Workout” with no entity context.
- Trigger.dev dashboard searches by tag are harder.
- Cannot cancel/filter all structure jobs for one workout reliably.

## Recommended standard

```typescript
type StructureRunTags = [
  `user:${string}`,
  `planned-workout:${string}` | `workout-template:${string}`,
  ...(optional: `source:chat` | `source:api` | `source:block`)
]
```

Single helper:

```typescript
function structureGenerationRunTags(opts: {
  userId: string
  plannedWorkoutId?: string
  workoutTemplateId?: string
  source?: string
}): string[]
```

Use in **both** `tasks.trigger` and `publishTaskRunStartedEvent`.

## Also missing tags on related tasks

| Task                        | Suggested extra tag                 |
| --------------------------- | ----------------------------------- |
| `adjust-structured-workout` | `planned-workout:{id}`              |
| `generate-workout-messages` | `planned-workout:{id}`              |
| `generate-ad-hoc-workout`   | `planned-workout:{id}` after create |

## Acceptance Criteria

- [ ] One helper used by all structure-related enqueue sites
- [ ] Trigger Monitor or workout UI can correlate runs to a specific planned workout
- [ ] Document tag conventions in `docs/04-guides/background-task-monitoring.md`
