# 220 — Chat Stale Room Load Overwrites Active Room

**Type:** Bug  
**Priority:** High  
**Area:** \`chat, ui/ux\`  
**Status:** Open

## Description

\`loadMessages()\` allows concurrent loads for different rooms and assigns each response to the shared \`chat.messages\` collection without verifying that the room is still active. A slower response from a previously selected room can replace the messages for the currently selected room.

## Steps to Reproduce

1. Open a chat room with a slow message request.
2. Quickly switch to another room.
3. Observe that the first room's messages can appear in the second room.

## Affected Files

- \`app/pages/chat.vue\`

## Acceptance Criteria

- Responses for inactive rooms cannot replace the active room's messages.
- Loading state belongs to the currently selected room.
- Rapid room switching leaves the active room consistent.
