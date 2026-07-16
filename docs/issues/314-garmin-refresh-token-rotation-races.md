# 314 — Garmin Refresh Token Rotation Is Race-Prone

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, oauth, reliability`  
**Status:** Open

## Description

Garmin returns a new refresh token whenever an access token is refreshed. Current callers do not
serialize refresh operations per integration.

`ingest-garmin` starts up to six API requests concurrently. Near token expiry, every request can
re-fetch the same integration, decide it needs refreshing, and rotate the same refresh token in
parallel. Competing responses can fail or overwrite the database with a token that is no longer the
latest usable token.

The Training API helper has a second stale-object variant: workout create/update and schedule calls
each receive the original integration object. If the first operation refreshes it, a later operation can
attempt another refresh with the original refresh token.

## Steps to Reproduce

1. Set a Garmin integration token within the refresh threshold.
2. Start Garmin ingest or publish a workout that also creates/updates a schedule.
3. Observe multiple refresh requests using the same stored refresh token.

## Expected Behavior

At most one refresh operation runs per integration at a time. Later callers reuse the newly persisted
token and refresh token.

## Affected Files

- `server/utils/garmin.ts`
- `server/utils/garmin-push.ts`
- `trigger/ingest-garmin.ts`
- `server/api/workouts/planned/[id]/publish-garmin.post.ts`

## Acceptance Criteria

- [ ] Token refresh is serialized or atomically coordinated per integration
- [ ] Concurrent callers re-read and reuse the result of an in-flight/completed refresh
- [ ] Training create/update/schedule operations use the latest integration credentials
- [ ] Concurrent-refresh and expired-token publish flows have tests
- [ ] A losing refresh attempt cannot mark a successfully refreshed integration as failed
