# 129 — Oauth Revoke No Client Auth

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, backend`  
**Status:** Postponed
> **Postponed (2026-07-08):** OAuth revoke client-auth may break public OAuth clients. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/oauth/revoke.post.ts

## Steps to Reproduce

POST stolen access_token to /api/oauth/revoke without client_secret.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Require client auth for revoke requests.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
