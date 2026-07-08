# 069 — Garmin Webhook Unauthenticated

**Type:** Bug  
**Priority:** Critical  
**Area:** `integrations, backend`  
**Status:** Postponed
> **Postponed (2026-07-08):** Garmin webhook auth requires Garmin developer console / signature configuration. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/webhooks/garmin.post.ts

## Steps to Reproduce

POST fake Garmin payload with known externalUserId to webhook endpoint.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/utils/services/garminService.ts`

## Suggested Fix

Implement Garmin signature verification; reject unverified payloads.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
