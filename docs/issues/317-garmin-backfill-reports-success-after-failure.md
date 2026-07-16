# 317 — Garmin Backfill Reports Success After Failure

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data, triggers`  
**Status:** Open

## Description

`GarminService.startBackfill` silently returns when no integration exists and catches every per-type
backfill error without returning an aggregate result or throwing. `garmin-backfill` subsequently
returns `{ success: true }`.

The initial connection flow can therefore appear successful when no historical backfill request was
accepted by Garmin.

## Steps to Reproduce

1. Run `garmin-backfill` without an integration, or make every Garmin backfill endpoint fail.
2. Observe the per-type error logs.
3. Observe the Trigger task complete successfully.

## Expected Behavior

Missing integrations and total backfill failure fail the task. Partial success is returned explicitly
with per-type results.

## Affected Files

- `server/utils/services/garminService.ts` (`startBackfill`)
- `trigger/garmin-backfill.ts`
- `server/api/integrations/garmin/callback.get.ts`

## Acceptance Criteria

- [ ] Missing Garmin integration fails the backfill task
- [ ] Total backfill failure fails the task
- [ ] Partial success returns successful and failed types
- [ ] OAuth callback/backfill observability exposes a failed initial backfill
- [ ] Tests cover missing integration, total failure, partial success, and full success
