# 322 — Garmin Trail Courses Are Mapped as Road Running

**Type:** Bug  
**Priority:** Low  
**Area:** `integrations, courses`  
**Status:** Open

## Description

`mapCourseActivityToGarmin` checks whether the workout type contains `run` before checking whether it
contains `trail`. A type such as `TrailRun` therefore returns `RUNNING`; the intended
`TRAIL_RUNNING` branch is unreachable for normal trail-running names.

## Steps to Reproduce

1. Build a Garmin course payload for a `TrailRun`.
2. Observe `activityType: RUNNING`.

## Expected Behavior

Trail-running courses map to `TRAIL_RUNNING`.

## Affected Files

- `server/utils/garmin-push.ts`
- `tests/unit/server/utils/garmin-push.test.ts`

## Acceptance Criteria

- [ ] Trail-running types map to `TRAIL_RUNNING`
- [ ] Generic running types continue to map to `RUNNING`
- [ ] Mapping order has regression coverage
