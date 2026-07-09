# 037 — Lightweight corrective retries for structure generation

**Type:** Performance  
**Priority:** High  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Fixed

## Description

When structure generation fails validation or times out, retries **resend the entire prompt** and upgrade to **Gemini Pro with high thinking** — up to ~90s of AI time inside a 180s task. Corrective feedback is generic and does not include the failed draft, so the model often re-derives the full workout from scratch.

## Current Behavior

```1270:1291:trigger/generate-structured-workout.ts
    for (let attempt = 1; attempt <= 2; attempt++) {
      ...
        if (isRetry) actualModelUsed = 'pro'
        ...
          const draft = await generateStructuredAnalysis(
            isRetry
              ? `${draftPrompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous draft was rejected or incomplete.\n- Keep the same compact schema.\n- Stay inside duration tolerance and include a complete main set.`
              : draftPrompt,
            ...
              modelOverride: isRetry ? 'gemini-3-pro-preview' : undefined,
              thinkingLevelOverride: isRetry ? 'high' : undefined
```

Coverage validation retry (attempt 2) prepends the same full `prompt` + reason:

```1444:1444:trigger/generate-structured-workout.ts
      promptToUse = `${prompt}\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT:\n- The previous structure was rejected because ${coverageValidation.reason}.\n- ...`
```

Strength validation uses the same full-prompt pattern.

## Why This Hurts

| Issue                            | Effect                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Full prompt on retry             | Pays full input tokens again (~4k–10k+ chars)                                  |
| Pro + high thinking on attempt 2 | Slowest model tier for what is often a small fix (duration trim, add main set) |
| No failed draft in retry         | Model cannot patch; must regenerate entire structure                           |
| Generic feedback                 | Does not tell model _which_ steps failed coverage or strength rules            |

## Suggested Fix

### Retry prompt shape

On attempt 2+, send a **short corrective prompt**:

- Workout metadata (title, duration, type) — ~10 lines
- **Previous draft JSON** (truncated if huge)
- **Specific failure**: `coverageValidation.reason`, strength validation reason, or timeout
- Compact schema only
- Instruction: “Fix the issues below; preserve valid steps where possible.”

### Model/thinking escalation

1. Attempt 1: Flash, low/minimal thinking ([038](./038-disable-thinking-flash-structure-generation.md))
2. Attempt 2: Flash or Pro with **low** thinking first
3. Attempt 3 (optional): Pro + high thinking only for strength/swim or repeated failure — requires task budget review

### Failure-type routing

| Failure                 | Retry strategy                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| Timeout                 | Smaller prompt + same model, or split coach copy from steps (future) |
| Coverage under/over     | Patch prompt with computed duration delta                            |
| Empty steps             | Full regen but still compact prompt                                  |
| Strength blocks invalid | Strength-specific corrective block only                              |

Store last draft in task scope between attempts (in-memory; no DB required).

## Acceptance Criteria

- [ ] Attempt-2 prompt is materially smaller than attempt-1 (`promptChars` logged separately)
- [ ] Retry prompt includes previous draft JSON and specific validation reason when available
- [ ] Pro + high thinking not used as default for all attempt-2 cases (configurable escalation)
- [ ] P95 `aiDurationMs` for successful first-attempt generations unchanged or improved
- [ ] P95 total task duration decreases for jobs that previously needed attempt 2
- [ ] Same behavior applied in `adjust-structured-workout.ts`

## References

- [012](./012-ai-in-triggers-architecture-rethink.md) — timeout/retry architecture
- [006](./006-ui-timeout-messaging-mismatch.md) — user-visible duration expectations
- [033](./033-retire-legacy-structure-generator.md) — smaller base prompt helps all retries
