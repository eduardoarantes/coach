# 035 — Remove unused stream data from structure-generation context fetch

**Type:** Performance  
**Priority:** Low  
**Area:** `backend`, `workouts`  
**Status:** Open

## Description

When building context for structure generation, the task fetches the user's **4 most recent workouts** with nested `streams` (HR/power zone times), but the prompt summary **never uses stream data**. This adds unnecessary DB load and payload size on every generation.

## Root Cause

```1005:1017:trigger/generate-structured-workout.ts
    const recentWorkouts = await workoutRepository.getForUser(workout.userId, {
      limit: 4,
      orderBy: { date: 'desc' },
      include: {
        streams: {
          select: {
            hrZoneTimes: true,
            powerZoneTimes: true
          }
        }
      }
    })
```

Summary builder ignores streams:

```821:832:server/utils/gemini.ts
export function buildConciseWorkoutSummary(workouts: any[], timezone?: string): string {
  return workouts
    .map((w, idx) => {
      const dateStr = formatDateUTC(w.date, 'MMM d')
      const duration = Math.round(w.durationSec / 60)
      ...
      return `${idx + 1}. ${dateStr}: ${w.type} - ${w.title} [${duration}m${tss}${intensity}${power}]`
    })
    .join('\n')
}
```

Same pattern exists in `trigger/adjust-structured-workout.ts`.

Comment says “Limit to 7” but code uses `limit: 4` — stale comment.

## Impact

- Extra join/query cost per structure job (× all batch block fan-out jobs).
- Streams loaded into memory then discarded.
- No corresponding prompt benefit.

## Suggested Fix

**Option A (minimal):** Remove `include: { streams: ... }` from both generate and adjust tasks.

**Option B (if recent context is valuable):** Keep the 4-workout summary but fetch only fields used by `buildConciseWorkoutSummary` (`date`, `type`, `title`, `durationSec`, `tss`, `intensity`, `averageWatts`).

**Option C (future):** If zone-time context is desired, add a **one-line** aggregate to the summary (e.g. “last ride: 45m, 62% time Z2”) — do not load full stream objects unless used.

## Acceptance Criteria

- [ ] Structure generate/adjust no longer queries `streams` for recent workouts
- [ ] Prompt output for `RECENT WORKOUTS (brief)` unchanged for typical users
- [ ] Stale “Limit to 7” comment updated or removed
- [ ] Measurable reduction in DB query time for structure task `loaded-recent-workouts` stage (optional benchmark)

## References

- [034](./034-deduplicate-structure-prompt-targeting.md) — complementary prompt slimming
- `workoutRepository.getForUser` usage in generate/adjust tasks
