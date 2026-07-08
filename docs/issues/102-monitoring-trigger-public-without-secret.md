# 102 — Monitoring Trigger Public Without Secret

**Type:** Bug  
**Priority:** High  
**Area:** `infra, backend`  
**Status:** Postponed
> **Postponed (2026-07-08):** Monitoring endpoint auth requires ops/env coordination (MONITORING_SECRET). Skipped for now to avoid breaking ingest or integration flows until third-party systems are adjusted.

## Description

server/api/monitoring/trigger.get.ts

## Steps to Reproduce

Call /api/monitoring/trigger without auth when MONITORING_SECRET unset.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Require auth always or fail closed when secret unset in production.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
