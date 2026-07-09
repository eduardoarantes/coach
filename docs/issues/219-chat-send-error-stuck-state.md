# 219 — Chat Send Error Stuck State

**Type:** Bug  
**Priority:** High  
**Area:** \`ai, chat, ui/ux\`  
**Status:** Open

## Description

\`sendOutgoingMessage()\` sets \`awaitingTurnStart\` after \`chat.sendMessage()\` resolves. The AI SDK can resolve after invoking the chat error handler, so the later assignment can overwrite the error-path reset and leave the composer in a waiting/typing state.

## Steps to Reproduce

1. Start a chat turn.
2. Interrupt the \`/api/chat/messages\` request or force a network failure.
3. Observe that the composer can remain blocked with a typing placeholder.

## Affected Files

- \`app/pages/chat.vue\`

## Acceptance Criteria

- A failed send returns the composer to a usable state.
- Queued messages remain processable after a failed turn.
- The failure is visible and retryable.
