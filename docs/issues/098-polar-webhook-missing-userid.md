# 098 — Polar Webhook Missing Userid

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Postponed
> **Postponed (2026-07-08):** Polar webhook ingest requires Polar payload format and worker mapping from provider. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/integrations/polar/webhook.post.ts

## Steps to Reproduce

Send Polar webhook; ingest runs with undefined userId tag.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `trigger/ingest-polar.ts`

## Suggested Fix

Resolve userId from Polar payload like other providers.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
