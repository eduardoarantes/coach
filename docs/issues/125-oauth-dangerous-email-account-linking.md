# 125 — Oauth Dangerous Email Account Linking

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Postponed
> **Postponed (2026-07-08):** Disabling dangerous email linking affects Google/Strava/Intervals login behavior. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/auth/[...].ts

## Steps to Reproduce

OAuth identity with victim email links into existing account without verification.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Disable dangerous linking or require verified email match + confirmation.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
