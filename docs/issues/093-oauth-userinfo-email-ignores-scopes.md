# 093 — Oauth Userinfo Email Ignores Scopes

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, backend`  
**Status:** Postponed
> **Postponed (2026-07-08):** OAuth userinfo scope gating may break apps relying on email without profile:read. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/oauth/userinfo.get.ts

## Steps to Reproduce

Authorize app with workout:read only; /userinfo still returns email.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Omit email unless profile:read or dedicated email scope granted.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
