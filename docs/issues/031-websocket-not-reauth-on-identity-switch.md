# 031 — WebSocket not re-authenticated on identity switch

**Type:** Bug  
**Priority:** Medium  
**Area:** `infra`, `ui/ux`  
**Status:** Fixed
**Related:** [027](./027-cross-user-runs-on-identity-switch.md)

## Description

The WebSocket connection authenticates **once on open** with a short-lived token. When the user switches identity (coaching act-as, impersonation), the socket is **not** re-authenticated — `peerContext.userId` may remain the original login user.

## Root Cause

Client sends auth only in `onopen`:

```185:194:app/composables/useUserRuns.ts
    ws.onopen = async () => {
      ...
      const { token } = await ($fetch as any)('/api/websocket-token')
      ws?.send(JSON.stringify({ type: 'authenticate', token }))
      ws?.send(JSON.stringify({ type: 'subscribe_user' }))
```

`subscribe_user` is sent but **not handled** by `server/api/websocket.ts` (noop).

Session identity watch calls `init()` without reconnecting the socket:

```296:301:app/composables/useUserRuns.ts
        if (newId) {
          void init()
```

WS token is generated from `session.user.id` at connect time (`server/api/websocket-token.get.ts`). After act-as toggle without reconnect, realtime delivery targets the wrong peer userId.

## Impact

- While acting as athlete, coach may **not** receive athlete run WS updates (relies on polling).
- After switching back, coach may still receive events routed to stale peer context in edge cases.
- Contributes to confusing monitor state combined with [027](./027-cross-user-runs-on-identity-switch.md).

## Suggested Fix

On `session.user.id` change:

1. Close and reconnect WebSocket (re-auth with fresh token), or
2. Send `reauthenticate` message handled server-side to update `peerContext.userId`.

Remove dead `subscribe_user` client message or implement it server-side.

## Acceptance Criteria

- [ ] Act-as toggle reconnects WS with correct user id
- [ ] Realtime run updates match active session identity
