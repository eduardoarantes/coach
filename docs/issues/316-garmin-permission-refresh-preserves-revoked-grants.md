# 316 — Garmin Permission Refresh Preserves Revoked Grants

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, permissions`  
**Status:** Open

## Description

Issue [310](./310-garmin-ingest-stale-export-permissions.md) added a live
`GET /user/permissions` refresh, but the result is unioned with the stored `Integration.scope`.

If a permission-change webhook is missed and Garmin's live response no longer contains
`WORKOUT_IMPORT`, `COURSE_IMPORT`, `HEALTH_EXPORT`, or `ACTIVITY_EXPORT`, the old value remains in
the union. The database therefore continues to claim that the revoked permission is granted.

OAuth/API scopes and user export/import permissions need separate replacement semantics even if they
continue to share one database field.

## Steps to Reproduce

1. Store `WORKOUT_IMPORT` in the Garmin integration scope.
2. Return live permissions without `WORKOUT_IMPORT`.
3. Run `refreshGarminIntegrationPermissions`.
4. Observe `WORKOUT_IMPORT` remains stored.

## Expected Behavior

Live Garmin user permissions replace the previously stored user-permission subset while OAuth/API
scopes are preserved.

## Affected Files

- `server/utils/garmin.ts`
- `server/api/workouts/planned/[id]/publish-garmin.post.ts`
- `tests/unit/server/utils/garmin.test.ts`

## Related

- [310](./310-garmin-ingest-stale-export-permissions.md) — initial live permission refresh

## Acceptance Criteria

- [ ] Known Garmin user permissions are removed when absent from a successful live response
- [ ] OAuth/API scopes remain preserved
- [ ] An empty successful permission response is distinguished from an API failure
- [ ] Tests cover grant, partial revoke, full revoke, and request failure
