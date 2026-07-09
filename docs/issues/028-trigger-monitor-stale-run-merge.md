# 028 — Trigger monitor merge never evicts stale runs

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`  
**Status:** Fixed

## Description

The Trigger Monitor can show **old completed runs long after** the server stopped returning them from `/api/runs/active`, because the client merge strategy only adds/updates — never removes runs missing from the API payload.

## Root Cause

`/api/runs/active` returns active runs plus completed runs from the **last 60 seconds** only:

```34:57:server/api/runs/active.get.ts
    const RECENT_THRESHOLD_MS = 60 * 1000
    ...
    const filteredRuns = activeRuns.data.filter((run) => {
      const isActive = [...].includes(run.status)
      if (isActive) return true
      if (run.finishedAt) {
        return now.getTime() - finishedTime < RECENT_THRESHOLD_MS
      }
      return false
    })
```

But `fetchActiveRuns` seeds the merge map from **all** existing `runs.value` entries (up to 50), so completed jobs from minutes or hours ago remain visible until pushed out by newer runs.

WebSocket `handleRunUpdate` also adds runs without pruning.

## Impact

- Monitor history feels “stuck” or cluttered.
- Combined with [027](./027-cross-user-runs-on-identity-switch.md), stale runs from a prior identity persist indefinitely.

## Suggested Fix

Replace merge-with-retain with one of:

- **Replace mode:** `runs.value = data` on full fetch (plus WS patch overlay for in-flight updates), or
- **TTL prune:** drop completed runs older than 60s on each fetch, or
- **Identity-aware reset:** clear on user id change (required for 027).

## Acceptance Criteria

- [ ] Completed runs disappear from monitor ~1 minute after finish (matching API policy)
- [ ] Active runs still update in real time via WebSocket
