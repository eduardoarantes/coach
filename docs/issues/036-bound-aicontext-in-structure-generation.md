# 036 — Bound `aiContext` in structure-generation prompts

**Type:** Performance  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

Structure generation injects the user's full **`aiContext`** string (global “About me / special instructions” from AI settings) into every structure job. Users can store long, chat-oriented context that is rarely needed to place interval targets for a specific planned workout — and it can dominate prompt size.

## Root Cause

```1025:1025:trigger/generate-structured-workout.ts
    const aiContext = workout.user.aiContext || ''
```

```1154:1154:trigger/generate-structured-workout.ts
    ${aiContext ? `- User Preferences/Context: ${aiContext}` : ''}
```

Same injection in `draftPrompt` and in `adjust-structured-workout.ts`.

By contrast, chat and analysis tasks use the full blob appropriately; structure gen already has workout `title`, `description`, goal/phase/focus, zones, and targeting policy.

## Impact

- Unbounded prompt growth when `aiContext` is large (injury history, race plans, nutrition notes, etc.).
- Slower Flash calls and higher timeout/retry rate ([037](./037-structure-generation-lightweight-retries.md)).
- Global context may **conflict** with the specific workout prescription (e.g. “focus on swimming” in aiContext for a Run workout).

## Suggested Fix

1. **Hard cap** — e.g. first 400–600 characters with ellipsis, or token-budget helper shared with chat context utilities.
2. **Relevance filter (optional)** — include lines matching sport keywords, injury/constraint terms, or intensity preferences; drop narrative fluff.
3. **Skip when redundant** — if workout `description` is non-empty and > N chars (chat-created shells), omit `aiContext` or use minimal cap.
4. **Structured extraction (later)** — parse aiContext into tagged sections at settings save time; structure gen reads only `training_constraints` slice.

Centralize in a helper, e.g. `formatAiContextForStructureGen({ aiContext, workoutType, description })`, used by generate + adjust.

## Acceptance Criteria

- [ ] Structure prompts never include unbounded `aiContext`
- [ ] Injury/constraint info still reachable when present in first N chars or matched keywords
- [ ] `promptChars` P95 decreases for users with long aiContext
- [ ] No regression for users who rely on aiContext for cadence/zone preferences (spot-check cycling users)
- [ ] Helper covered by unit tests with long input and sport-specific cases

## References

- [025](./025-planned-workout-details-context-bloat.md) — chat-side context bloat (related, separate path)
- `server/api/settings/ai.post.ts` — where aiContext is stored
- `server/utils/services/chatContextService.ts` — full context usage in chat
