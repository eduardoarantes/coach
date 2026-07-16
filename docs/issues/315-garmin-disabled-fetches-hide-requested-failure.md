# 315 — Disabled Garmin Fetches Hide Failure of Requested Data

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data, status`  
**Status:** Open

## Description

`ingest-garmin` builds a six-element `Promise.allSettled` list. Disabled data types are represented as
fulfilled empty arrays.

The task only fails when every array entry is rejected. If wellness ingestion is disabled and the
activity request fails, the five disabled wellness entries are fulfilled, so the task records
`syncStatus: SUCCESS` even though every operation that was actually requested failed.

The inverse applies when activity ingestion is disabled and all enabled wellness requests fail.

## Steps to Reproduce

1. Disable Garmin wellness ingestion while leaving activities enabled.
2. Make the Garmin activities request fail.
3. Run Garmin ingest.
4. Observe a successful task/integration status with only a partial-sync warning.

## Expected Behavior

Success and failure are calculated only from enabled/requested operations.

## Affected Files

- `trigger/ingest-garmin.ts`

## Acceptance Criteria

- [ ] Disabled operations are excluded from failure accounting
- [ ] The task fails when every enabled Garmin request fails
- [ ] Partial success remains supported when at least one enabled request succeeds
- [ ] Tests cover activities-only, wellness-only, both-enabled, and both-disabled settings
