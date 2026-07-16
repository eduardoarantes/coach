# 319 — Garmin Run and Swim Cadence Are Not Imported

**Type:** Bug / Data Quality  
**Priority:** Medium  
**Area:** `integrations, activities`  
**Status:** Open

## Description

Garmin Activity summaries expose separate cadence fields for cycling, running, swimming, and
wheelchair activities. The activity mapper only reads:

- `averageBikeCadenceInRoundsPerMinute`
- `maxBikeCadenceInRoundsPerMinute`

Running and swimming activities therefore lose cadence even when Garmin supplies it.

## Expected Behavior

Cadence is selected from the sport-appropriate Garmin fields and normalized into the workout cadence
columns.

## Affected Files

- `server/utils/services/garminService.ts`
- `server/utils/activity-mapping.ts`
- `tests/unit/server/utils/services/garminService.test.ts`

## Acceptance Criteria

- [ ] Cycling cadence behavior remains unchanged
- [ ] Running cadence uses Garmin run cadence fields
- [ ] Swimming cadence uses Garmin swim cadence fields
- [ ] Wheelchair cadence has an explicit mapping/product decision
- [ ] Unit tests cover each supported cadence family
