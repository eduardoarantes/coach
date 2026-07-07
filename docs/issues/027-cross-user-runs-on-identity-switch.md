# 027 — Trigger monitor leaks runs after coaching act-as / impersonation switch

**Type:** Bug  
**Priority:** Critical  
**Area:** `ui/ux`, `backend`, `infra`  
**Status:** Open

## Description

Users (especially coaches using **Act As**, or admins using **impersonation**) can see **another user's Trigger.dev runs** in the in-app Trigger Monitor after switching back to their own account.

This matches reports of “seeing other users' triggers” in the monitor.

## Root Cause

`useUserRuns.fetchActiveRuns()` **always merges** new API results into the existing in-memory run list — it never clears runs from a previous session identity.

```90:123:app/composables/useUserRuns.ts
      const mergedRunsMap = new Map<string, TriggerRun>()
      runs.value.forEach((r) => mergedRunsMap.set(r.id, r))  // ← previous user's runs kept

      data.forEach((run: any) => {
        mergedRunsMap.set(run.id, run)
      })
      ...
      runs.value = finalRuns.slice(0, 50)
```

When `session.user.id` changes (coaching act-as or admin impersonation), the watcher calls `init()` but **does not clear** `runs.value` first:

```296:311:app/composables/useUserRuns.ts
    watch(
      () => (session.value?.user as any)?.id,
      (newId) => {
        if (newId) {
          void init()   // ← no runs.value = []
        } else {
          runs.value = []
        }
      }
    )
```

### Example flow

1. Coach (user A) opens app → monitor shows A's runs.
2. Coach enables **Act As** athlete (user B) → API fetch returns B's runs → merge keeps **A + B**.
3. Coach disables act-as → API fetch returns A's runs → merge keeps **A + B** → coach still sees athlete jobs.

Same pattern for admin impersonation (`server/utils/session.ts` swaps `session.user.id` to target user).

## Security notes

- `/api/runs/active` and `/api/runs/[id]` **do** filter by `user:${session.user.id}` tag — direct API access is scoped correctly.
- The leak is **client-side stale state**, not Trigger.dev returning other users' runs from the API.
- `/api/runs/[id]` cancel/retrieve still checks tags — cancelling a leaked stale run ID would 404 if tagged for another user (good).

## Expected Behavior

On any identity switch (`session.user.id` change):

1. Clear `runs.value` immediately.
2. Re-fetch active runs for the new identity only.
3. Optionally reconnect/re-auth WebSocket (see [031](./031-websocket-not-reauth-on-identity-switch.md)).

## Acceptance Criteria

- [ ] Switching act-as off removes athlete runs from monitor within one refresh cycle
- [ ] Impersonation start/stop shows only the active identity's runs
- [ ] `handleRunUpdate` ignores runs whose tags don't match current user (defense in depth)

## Related

- [031](./031-websocket-not-reauth-on-identity-switch.md)
- [028](./028-trigger-monitor-stale-run-merge.md)
