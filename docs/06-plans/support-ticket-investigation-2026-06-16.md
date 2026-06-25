# Support Ticket Investigation Update - 2026-06-16

## Scope

This document continues the triage work in [support-ticket-triage-2026-06-16.md](./support-ticket-triage-2026-06-16.md) and focuses on the top priorities:

- potential cross-user workout exposure
- repeated Intervals.icu sync failures affecting Ralf and Dzmitry

This document started as an investigation pass and is now being maintained alongside the follow-up fixes applied from that investigation.

## Summary

Two practical engineering tracks emerged from the investigation:

1. A defensive access-hardening pass for workout detail and analytics endpoints.
2. A concrete Intervals planned-workout retry bug, plus a likely webhook delta-gap for some missing activity reports.

The privacy-risk ticket is serious, but I could not reproduce an active cross-user leak directly from the current production data. The safer conclusion is:

- there may have been a real historical leak that no longer exists in the database
- or the user saw a stale/mis-associated workout through a less direct endpoint

The sync investigation produced one confirmed bug with a clear fix path.

## Implementation Status

Applied in this pass:

- queued Intervals planned-workout sync payloads now hydrate string dates before retry processing
- Intervals publish helpers now coerce `Date | string` and fail clearly on invalid dates
- Intervals webhook activity handling now attempts a detailed activity fetch before skipping sparse payloads
- workout explorer endpoints now use a shared scoped workout fetch helper instead of re-fetching by bare workout ID after access resolution
- direct self-only workout endpoints for stream and metric reads were tightened to query by both `id` and `userId`
- remaining self-only workout link, unlink, share, duplicate-unlink, promote, and adherence-analysis endpoints now also use explicit owner-scoped reads
- duplicate promotion rewiring now limits follow-up duplicate reassignment to the same owner

Still recommended after runtime verification:

- broader telemetry for sparse Intervals webhook fallbacks
- regression coverage for the expanded workout access-hardening sweep
- production follow-up on old privacy ticket IDs if support has screenshots or timestamps

Added in the latest continuation:

- sparse Intervals webhook fallback now logs whether the detailed fetch recovered the activity or still left it date-incomplete
- delta-only skips now include enough context to correlate future support incidents with specific webhook payload shapes

## Investigation Details

### 1. Potential cross-user workout exposure

Ticket:

- `31cf00a6-f276-456b-aa74-b44b8b2d575e`

#### What I checked

- Pulled the ticket details with `pnpm cw:cli support tickets get ... --prod`
- Queried production for the exact workout ID from the ticket
- Queried production for the reported title `Wien Rennradfahren`
- Reviewed the main workout access paths in:
  - [server/utils/repositories/workoutRepository.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/repositories/workoutRepository.ts)
  - [server/utils/calendar-data.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/calendar-data.ts)
  - [server/api/workouts/index.get.ts](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/index.get.ts)
  - [server/api/workouts/[id].get.ts](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/[id].get.ts)
  - several workout explorer endpoints under `/server/api/analytics/workout-explorer`

#### Findings

- The exact workout ID from the ticket, `2373ece2-e12d-44e2-8d52-63d535465327`, does not currently exist in production.
- The title `Wien Rennradfahren` appears on many workouts across several different users.
- The main activity history path appears properly scoped:
  - `workoutRepository.getForUser(userId, ...)` always includes `userId`
  - calendar aggregation in `getCalendarDataForUser(...)` also scopes by `userId`
- Several user-facing workout detail and analytics endpoints do an access check first, then re-fetch the canonical workout by `id` only.
  - Example pattern:
    - `assertSingleWorkoutAccess(user.id, workoutId)`
    - then `prisma.workout.findFirst({ where: { id: workoutId } })`
  - This is probably safe today because the access assertion already resolved the ID.
  - It is still weaker than necessary and makes later regressions easier.
- Some other endpoints still use direct `findUnique({ where: { id: workoutId } })` and then compare `workout.userId` against session user afterward.
  - This is also probably safe in practice.
  - It is not the strongest pattern for a system with multiple query surfaces, duplicate canonicalization, and coaching access.

#### Conclusion

I could not prove an active current leak from the main activity-history flow.

The most likely explanations are:

- a historical record that has since been deleted or remediated
- a less direct route showing the wrong workout after an access check, stale ID, or canonicalization mismatch
- an AI/tooling side-path referencing a workout title from another user rather than a true calendar feed leak

Even without a clean reproduction, this area should be hardened immediately because the ticket describes a privacy-sensitive failure mode.

#### Proposed solution

1. Introduce a single canonical access helper for all workout reads.

Use one pattern everywhere:

- resolve access with user/coaching scope
- fetch with both `id` and `userId` when returning private workout data

Prefer repository-backed helpers instead of endpoint-local `prisma.workout.findFirst({ id })`.

2. Sweep the workout explorer and detail endpoints for defense-in-depth.

High-priority targets:

- [server/api/analytics/workout-explorer/workout.post.ts](/Users/hdkiller/Develop/coach-wattz/server/api/analytics/workout-explorer/workout.post.ts)
- [server/api/analytics/workout-explorer/summary.post.ts](/Users/hdkiller/Develop/coach-wattz/server/api/analytics/workout-explorer/summary.post.ts)
- [server/api/analytics/workout-explorer/intervals.post.ts](/Users/hdkiller/Develop/coach-wattz/server/api/analytics/workout-explorer/intervals.post.ts)
- [server/api/analytics/workout-explorer/streams.post.ts](/Users/hdkiller/Develop/coach-wattz/server/api/analytics/workout-explorer/streams.post.ts)
- [server/api/workouts/[id]/segment-summary.post.ts](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/[id]/segment-summary.post.ts)
- [server/api/workouts/[id]/streams.get.ts](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/[id]/streams.get.ts)
- [server/api/workouts/[id]/metric-history.get.ts](/Users/hdkiller/Develop/coach-wattz/server/api/workouts/[id]/metric-history.get.ts)

3. Add regression tests for cross-user same-title collisions.

Test scenarios should include:

- two users with workouts sharing the same title
- duplicate workouts with canonical/duplicate relationships
- analytics explorer access for self, coach, and non-owner
- stale or remapped workout IDs

4. Add audit logging for suspicious workout access attempts.

Log when:

- a user requests a workout ID that exists but belongs to someone else
- a canonical remap changes the requested workout ID
- an endpoint receives a workout ID that passes one layer but not the final scoped fetch

This gives us future forensics if a similar ticket reappears.

## 2. Intervals sync incidents

Representative tickets:

- `05c440b8-416c-4352-b750-1eb77061a90a` Ralf master incident
- `4076711c-d3e5-40fa-823b-f5b6f02081e8` Dzmitry sync incident

#### What I checked

- Ticket details with `cw:cli support tickets get`
- User ingestion stats with `pnpm cw:cli debug user-stats --user-id ... --prod`
- Production integration records
- Recent `SyncQueue` failures
- Recent `WebhookLog` activity for Intervals
- Relevant code in:
  - [server/utils/services/intervalsService.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/services/intervalsService.ts)
  - [server/utils/intervals-sync.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals-sync.ts)
  - [server/utils/intervals.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals.ts)
  - [cli/worker/start.ts](/Users/hdkiller/Develop/coach-wattz/cli/worker/start.ts)

#### Findings: user state

- Ralf currently has:
  - Intervals integration present
  - `syncStatus = SUCCESS`
  - `lastSyncAt = 2026-06-13T08:19:25.237Z`
  - newest workout in DB dated `2026-06-13`
- Dzmitry currently has:
  - Intervals integration present
  - `syncStatus = SUCCESS`
  - `lastSyncAt = 2026-06-15T15:47:03.705Z`
  - newest workout in DB dated `2026-06-15`

This means the integrations are not currently disconnected or globally broken.

#### Findings: webhook health

- Intervals webhook logs are still arriving on `2026-06-16`
- Recent logs include:
  - `ACTIVITY_UPLOADED`
  - `ACTIVITY_UPDATED`
  - `ACTIVITY_DELETED`
  - `WELLNESS_UPDATED`
  - `FITNESS_UPDATED`
- Statuses show active movement through `PENDING` and `QUEUED`

This suggests:

- upstream Intervals webhook delivery is still active
- the system is still receiving change events

So the incident is more likely in event handling, delta processing, retry behavior, or specific payload shapes than in total connectivity failure.

### Confirmed bug: queued planned-workout sync payloads lose `Date` type

#### Evidence

Production `SyncQueue` entries for both affected users show repeated failures like:

- `data.date.getUTCFullYear is not a function`

Affected examples:

- Dzmitry:
  - `818c7d8f-3172-4033-b57b-acefa4869ad8`
  - `81cde3ed-5876-4625-804d-3c6fecde93e5`
  - `aa88ab92-92e4-4cdc-9bab-c7f128c98f32`
- Ralf:
  - `52c05a7c-fe21-444d-8f30-2971682a5d64`
  - `555eeabd-1020-41be-97ab-c9ff0f2289d7`
  - `7f5e2311-333a-40b6-9e17-e5da9cbe21f9`
  - `6d37de2f-d8d7-440e-958e-7e0e7bdf37d8`
  - `c2932473-f694-4605-9946-b88b74f343f9`

#### Root cause

`SyncQueue.payload` is stored as JSON.

When a planned workout sync is queued in [server/utils/intervals-sync.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals-sync.ts), any `Date` becomes a string during JSON serialization.

Later, retry processing calls:

- `createIntervalsPlannedWorkout(...)`
- `updateIntervalsPlannedWorkout(...)`

Those paths ultimately expect `data.date` to still be a `Date` and do:

- `data.date.getUTCFullYear()`

in [server/utils/intervals.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/intervals.ts).

That is a real type mismatch and a reliable retry failure.

#### Impact

- Planned workout publish/update/delete retries can fail permanently.
- Broken planned-workout sync can create secondary symptoms:
  - missing or stale planned workouts remotely
  - failed pairing via `paired_event_id`
  - downstream complaints that “sync is broken” even when completed workout ingestion still works

#### Proposed fix

1. Normalize queued payloads before retry processing.

In `processSyncQueueItem(...)`, hydrate payload dates explicitly:

- if `payload.date` is a string, convert with `new Date(payload.date)`
- validate it before calling Intervals publish/update helpers

2. Add input coercion at the Intervals boundary as a second guard.

In `createIntervalsPlannedWorkout`, `updateIntervalsPlannedWorkout`, and related helpers:

- accept `Date | string`
- normalize once with a helper like `coerceUtcDate(value)`
- fail fast with a clear message if invalid

3. Add regression tests for queue serialization.

Cover:

- create/update/delete retry path
- payload stored as JSON with string date
- successful reprocessing after hydration

### Likely second issue: delta-only webhook handling can skip activity ingestion

#### Evidence in code

`IntervalsService.processWebhookEvent(...)` now favors direct delta upserts.

If a webhook event lacks enough activity detail, it does not run a bounded follow-up sync. It logs and skips:

- if no `activity` or no `activity.id`, it skips
- if there is an activity but no usable date and no existing record, it can also skip without a recovery sync

This is visible in:

- [server/utils/services/intervalsService.ts](/Users/hdkiller/Develop/coach-wattz/server/utils/services/intervalsService.ts)

#### Why this matters

If Intervals sends a lighter webhook payload for some event types or edge cases, the local system can:

- receive the event successfully
- not have enough data to upsert a workout
- do nothing until a manual sync is triggered later

That matches the user experience of:

- workouts appearing late
- some updates arriving while others do not
- repeated “manual refresh fixes it” reports

#### Proposed fix

1. Add a targeted recovery fetch when `activity.id` exists but payload is incomplete.

Instead of skipping immediately:

- call `fetchIntervalsActivity(integration, activityId)`
- if that succeeds, upsert from the fetched full payload

2. If the detailed fetch fails, enqueue a bounded catch-up sync.

Fallback window should be small, for example:

- activity date minus 1 day to plus 1 day when date is known
- last 2 days when only an activity ID or event timestamp is available

3. Add explicit telemetry for skipped delta events.

Track counters/logs for:

- missing activity payload
- missing activity date
- fetch fallback success
- fetch fallback failure
- range-sync fallback triggered

Without that, these intermittent misses will continue to look random in support.

## Proposed Patch Order

### Patch 1

Fix `SyncQueue` retry date hydration for planned workouts.

Why first:

- confirmed bug
- narrow change
- production evidence already exists
- low ambiguity

### Patch 2

Add recovery behavior for sparse Intervals webhook payloads.

Why second:

- likely contributor to “manual sync fixed it”
- targeted improvement without reintroducing heavy full-sync behavior everywhere

### Patch 3

Workout access hardening sweep.

Why third:

- privacy-sensitive
- even without a current reproduction, the system should standardize on stricter scoped reads

## Recommended Test Plan

### For sync retry

- unit tests for `processSyncQueueItem` with JSON-string dates
- integration test for queue-create -> retry -> success

### For sparse webhook payloads

- webhook with full activity payload
- webhook with only `activity.id`
- webhook with `activity.id` plus incomplete timestamps
- webhook with missing activity payload entirely

### For privacy hardening

- two users with same workout title
- analytics explorer requests for own workout vs other user’s workout
- duplicate/canonical workout ID remap cases

## Suggested Ticket Notes To Add Later

I did not update tickets yet, but the following internal notes would be appropriate in the next pass:

- Ralf master incident:
  - planned-workout queue retry bug confirmed
  - webhook delivery still active
  - investigate sparse activity webhook fallback
- Dzmitry incident:
  - same planned-workout retry bug confirmed
  - newest activity data is present now
  - missing-workout complaints may map to sparse webhook delta handling
- Privacy ticket:
  - no current reproduction from main calendar path
  - exact workout ID absent in current prod data
  - hardening sweep recommended across workout detail and analytics reads
