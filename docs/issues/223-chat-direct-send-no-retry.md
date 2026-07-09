# 223 — Chat Direct Send No Retry

**Type:** Bug  
**Priority:** Medium  
**Area:** \`ai, chat, ui/ux\`  
**Status:** Open

## Description

Messages sent while no turn is active bypass the durable outgoing queue. A transient failure therefore leaves the user without a retained, retryable local message, unlike messages that were already queued behind an active turn.

## Steps to Reproduce

1. Send a message while the chat is ready.
2. Interrupt the request or cause a transient network failure.
3. Refresh or retry from the UI and observe that the message is not retained as a queued send.

## Affected Files

- \`app/pages/chat.vue\`

## Acceptance Criteria

- Direct-send failures retain the message for retry.
- Retrying does not duplicate a message that was already persisted.
- The user receives clear failure and retry feedback.
