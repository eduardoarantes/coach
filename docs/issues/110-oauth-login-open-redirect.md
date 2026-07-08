# 110 — Oauth Login Open Redirect

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, ui/ux`  
**Status:** Postponed
> **Postponed (2026-07-08):** OAuth login callbackUrl validation needs allowlist agreement with integration partners. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

app/pages/oauth/login.vue

## Steps to Reproduce

Visit /oauth/login?callbackUrl=https://evil.example; Continue sends user off-site.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/oauth/authorize.vue`

## Suggested Fix

Validate callbackUrl is same-origin or allowlisted.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
