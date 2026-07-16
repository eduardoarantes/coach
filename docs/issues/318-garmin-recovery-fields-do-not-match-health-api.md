# 318 — Garmin Recovery Fields Do Not Match Health API Models

**Type:** Bug / Data Quality  
**Priority:** Medium  
**Area:** `integrations, wellness, recovery`  
**Status:** Open

## Description

The checked-in Health API model documents Daily fields
`bodyBatteryChargedValue` and `bodyBatteryDrainedValue`. Absolute Body Battery samples are documented
on Stress Details as `timeOffsetBodyBatteryValues`.

The current recovery extractor instead expects fields such as `bodyBatteryMostRecentValue`,
`bodyBatteryCurrentValue`, and `trainingReadinessScore`, which are not present in the checked-in Daily,
Sleep, HRV, Body Composition, or User Metrics schemas.

`stressDetails` notifications are recognized as handled but are not persisted or passed to a recovery
processor. Garmin recovery/readiness can therefore remain empty even when the documented data is
available.

## Steps to Reproduce

1. Process a Daily summary matching `ClientDaily` from `tmp/garmin-api/wellness-api.json`.
2. Include documented Body Battery charged/drained fields.
3. Observe `extractGarminBodyBatteryScore` return `null`.
4. Process a Stress Details summary containing absolute Body Battery samples and observe it is marked
   handled without persistence.

## Expected Behavior

Recovery mapping is based on documented Garmin fields, with an explicit product rule for converting
absolute samples or charged/drained values into the Coach Watts recovery model.

## Affected Files

- `server/utils/services/garminService.ts`
- `tests/unit/server/utils/services/garminService.test.ts`
- `tmp/garmin-api/Health_API_1.2.3.pdf`
- `tmp/garmin-api/wellness-api.json`

## Related

- [309](./309-garmin-health-summary-types-unused.md) — intentionally deferred Health types

## Acceptance Criteria

- [ ] Product mapping for Garmin Body Battery/recovery is documented
- [ ] Extractors use fields present in the applicable Garmin summary models
- [ ] Recognized recovery-bearing summaries are not silently discarded
- [ ] Tests use representative payloads from the checked-in Garmin schemas/docs
