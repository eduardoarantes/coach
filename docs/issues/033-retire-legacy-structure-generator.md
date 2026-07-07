# 033 — Retire `legacy_json` structure generator for ride/run/swim

**Type:** Performance  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

Structure generation maintains **two parallel prompt + schema paths**: `legacy_json` (large `workoutStructureSchema`, ~70-line prompt) and `draft_json_v1` (compact draft schema + server-side compile). The default for ride/run/swim is already `draft_json_v1`, but legacy remains as fallback and doubles maintenance, token cost, and timeout surface area.

## Current State

```916:924:trigger/generate-structured-workout.ts
    const generatorMode =
      requestedGeneratorMode === 'draft_json_v1' &&
      isDraftStructuredWorkoutSupported(workout.type || '')
        ? requestedGeneratorMode
        : 'legacy_json'
```

```264:269:server/utils/structured-workout-draft.ts
export function isDraftStructuredWorkoutSupported(workoutType: unknown) {
  const normalized = String(workoutType || '').trim().toLowerCase()
  return normalized.includes('ride') || normalized.includes('run') || normalized.includes('swim')
}
```

- **Ride / Run / Swim** → `draft_json_v1` when feature flag allows (default).
- **WeightTraining / Gym** → always `legacy_json` (draft unsupported).
- **Explicit override** or unsupported type → legacy path with full schema.

The same dual-path logic is duplicated in `trigger/adjust-structured-workout.ts`.

## Why This Hurts

| Problem | Detail |
|---------|--------|
| **Token bloat** | Legacy schema is ~400+ lines with nested property descriptions sent to structured-output API |
| **Prompt duplication** | Two full prompt templates (`prompt` + `draftPrompt`) maintained in sync |
| **Retry cost** | Validation/coverage retries on legacy resend the larger prompt ([037](./037-structure-generation-lightweight-retries.md)) |
| **Drift risk** | Sport rules and targeting instructions must be edited in two places |

## Suggested Fix

1. **Make `draft_json_v1` mandatory** for ride/run/swim in `generate-structured-workout` and `adjust-structured-workout`.
2. **Remove** the legacy prompt branch and `workoutStructureSchema` from those tasks for supported sports (or move legacy to a dedicated strength-only module).
3. **Keep `legacy_json`** only for strength until a blocks draft schema exists ([future strength pipeline]).
4. **Remove or narrow** `generatorOverride` feature flag once parity is confirmed in LLM ops metrics.
5. Update unit tests in `tests/unit/server/utils/structured-workout-draft.test.ts` and any generator-mode integration tests.

## Acceptance Criteria

- [ ] Ride, Run, Swim always use `draft_json_v1`; no silent fallback to legacy unless sport is unsupported
- [ ] Legacy schema/prompt removed from generate/adjust tasks for supported endurance sports
- [ ] Strength / WeightTraining still generates valid structures (legacy or dedicated path)
- [ ] `promptChars` P50 decreases measurably for ride/run/swim in LLM ops
- [ ] No regression in coverage validation pass rate on first attempt

## References

- [012](./012-ai-in-triggers-architecture-rethink.md) — open question on dropping legacy
- `server/utils/structured-workout-generator.ts` — mode resolution
- `server/utils/structured-workout-draft.ts` — draft schema + compile
