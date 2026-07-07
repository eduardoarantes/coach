# 034 — Deduplicate targeting instructions in structure-generation prompts

**Type:** Performance  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

Structure-generation prompts repeat **targeting and format rules multiple times** in the same request: dedicated policy formatters, zone blocks, INSTRUCTIONS bullets, and sport-specific paragraphs all restate primary metric, fallback order, range vs value preference, and mixed-target policy. This adds input tokens without improving output quality and can slow generation.

## Root Cause

Prompt assembly in `trigger/generate-structured-workout.ts` (mirrored in `adjust-structured-workout.ts`):

```1064:1067:trigger/generate-structured-workout.ts
    const targetPolicyPrompt = formatTargetPolicyPrompt(targetPolicy, loadPreference)
    const targetFormatPolicyPrompt = formatTargetFormatPolicyPrompt(targetFormatPolicy)
```

These blocks are injected into the prompt, then **repeated** in INSTRUCTIONS:

```1191:1196:trigger/generate-structured-workout.ts
    - **METRIC PRIORITY**: Respect the user's TARGET POLICY and preferred order (${loadPreference}).
      - Priority Order: ${priorityText}.
      - Primary metric for each step should be: ${targetPolicy.primaryMetric}.
      - ${targetPolicy.strictPrimary ? 'Strict primary is enabled...' : 'Fallback metrics are allowed...'}
      - ${targetPolicy.allowMixedTargetsPerStep ? 'Mixed targets...' : 'Do not include multiple intensity targets...'}
```

Sport-specific blocks add a third pass (e.g. running repeats priority order and pace unit rules).

`formatTargetPolicyPrompt` alone emits 6 bullet lines (`trigger/utils/workout-targeting.ts`).

## Impact

- Higher prompt token count on every structure job (×2 attempts on retry).
- Model attention split across redundant constraints instead of workout-specific design.
- Harder to maintain — rule changes require editing 3+ locations.

## Suggested Fix

1. Extract a single **`formatCompactTargetingBlock()`** (~5–8 lines) used once per prompt.
2. Remove the INSTRUCTIONS **METRIC PRIORITY** subsection when the compact block is present.
3. Trim sport rules to sport-only constraints (cadence for cycling, distance for running, send-off for swim) — drop targeting restatements already in the compact block.
4. Apply the same refactor to both `prompt` / `draftPrompt` paths (or only `draftPrompt` after [033](./033-retire-legacy-structure-generator.md)).
5. Optionally move static JSON rules (“omit null”, “valid JSON only”) to a shared constant included once.

Example compact block shape:

```
TARGETING: primary=power (% FTP), fallback=HR > RPE, steady=single value, one metric per step.
FORMAT: HR=LTHR fractions (0.80), power=% FTP (0.95), pace=Pace or /km per policy.
```

## Acceptance Criteria

- [ ] Target policy appears **once** in generate/adjust prompts (not 3×)
- [ ] Sport-specific sections contain no duplicate priority-order text
- [ ] `promptChars` reduced vs baseline (log at `prompt-built` stage)
- [ ] Spot-check: ride/run/swim outputs still respect user sport settings and targeting overrides
- [ ] Adjust task prompts stay in sync with generate task

## References

- `trigger/utils/workout-targeting.ts` — `formatTargetPolicyPrompt`, `formatTargetFormatPolicyPrompt`
- [033](./033-retire-legacy-structure-generator.md) — reduces to one prompt path
