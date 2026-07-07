# 038 — Reduce or disable thinking budget for Flash structure generation

**Type:** Performance  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

Structure generation uses **`generateStructuredAnalysis`** with JSON schema enforcement — the model output shape is largely constrained. Despite that, Flash calls inherit **thinking budget/level** from LLM operation settings (default Flash: `thinkingLevel: 'low'`, `thinkingBudget: 2000`), which adds latency and reasoning tokens without clear benefit for codifying intervals.

## Current Behavior

```517:546:server/utils/gemini.ts
export async function generateStructuredAnalysis<T>(...) {
  const opSettings = await getLlmOperationSettings(
    trackingContext?.userId,
    trackingContext?.operation
  )
  ...
  const thinkingLevel = trackingContext?.thinkingLevelOverride || opSettings.thinkingLevel
  const thinkingBudget = trackingContext?.thinkingBudgetOverride || opSettings.thinkingBudget
  ...
  const providerOptions = trackingContext?.disableThinking
    ? {}
    : buildGoogleProviderOptions(modelName, thinkingLevel, thinkingBudget)
```

Structure tasks pass `operation: 'generate_structured_workout'` / `'adjust_structured_workout'` but do **not** set `disableThinking` on attempt 1. Attempt 2 explicitly sets `thinkingLevelOverride: 'high'`.

Default Flash settings:

```18:24:server/utils/ai-operation-settings.ts
const DEFAULT_FLASH_SETTINGS: LlmOperationSettings = {
  model: 'flash',
  modelId: 'gemini-2.5-flash',
  thinkingBudget: 2000,
  thinkingLevel: 'low',
  maxSteps: 3
}
```

Usage logging already captures `reasoningTokens` — can validate before/after.

## Impact

- Extra seconds on every structure job (attempt 1 is the common case).
- Reasoning tokens billed on top of structured output completion.
- Compounds with large prompts ([034](./034-deduplicate-structure-prompt-targeting.md), [036](./036-bound-aicontext-in-structure-generation.md)).

## Suggested Fix

**Option A (code-level, fastest to ship):** Pass `disableThinking: true` on attempt 1 for `generate_structured_workout` and `adjust_structured_workout` in both generate and adjust tasks.

**Option B (ops-level):** Add `llmOperationOverride` rows for `generate_structured_workout` / `adjust_structured_workout` with `thinkingLevel: 'minimal'` or zero budget on Flash tier.

**Option C (hybrid):** Disable thinking for `draft_json_v1`; keep low thinking for legacy/strength if still needed.

Reserve thinking for attempt-2 corrective calls only when patch retry fails ([037](./037-structure-generation-lightweight-retries.md)).

## Acceptance Criteria

- [ ] Attempt-1 structure Flash calls use minimal or no thinking budget
- [ ] `reasoningTokens` in LLM ops drops for successful first-attempt structure jobs
- [ ] `aiDurationMs` P50 improves without increase in validation failure rate
- [ ] Strength/swim edge cases spot-checked (complex sessions still pass coverage validation)
- [ ] Document override in LLM ops panel or `docs/06-plans/llm-ops-control-panel.md`

## References

- [037](./037-structure-generation-lightweight-retries.md) — retry thinking escalation
- `docs/06-plans/llm-ops-control-panel.md` — operation list includes `generate_structured_workout`
- [012](./012-ai-in-triggers-architecture-rethink.md) — unified AI timeout/thinking policy
