# 126 — Oauth Authorize No Scope Validation

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, backend`  
**Status:** Postponed
> **Postponed (2026-07-08):** OAuth scope allowlist must align with registered third-party app scopes. Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/oauth/authorize.post.ts

## Steps to Reproduce

Request non-existent scopes in authorize URL; server persists them.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/oauth/authorize.vue`

## Suggested Fix

Validate scopes against registered app allowed scopes.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
