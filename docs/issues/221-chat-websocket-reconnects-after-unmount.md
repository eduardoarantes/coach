# 221 — Chat WebSocket Reconnects After Unmount

**Type:** Bug  
**Priority:** Medium  
**Area:** \`chat, ui/ux\`  
**Status:** Open

## Description

The chat WebSocket close handler schedules a reconnect unconditionally. Page cleanup closes the socket during unmount, which can trigger that handler and create a reconnect timer after the page is gone.

## Steps to Reproduce

1. Open \`/chat\` and allow the WebSocket to connect.
2. Navigate away while the socket is open or reconnecting.
3. Observe a reconnect attempt after the chat page has unmounted.

## Affected Files

- \`app/pages/chat.vue\`

## Acceptance Criteria

- Unmount cleanup prevents future reconnect attempts.
- WebSocket timers and handlers are fully stopped when leaving \`/chat\`.
