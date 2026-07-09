# 222 — Chat Stale-Turn Recovery Race

**Type:** Bug  
**Priority:** High  
**Area:** \`ai, chat, backend\`  
**Status:** Open

## Description

Stale-turn recovery first reads stale active turns and later updates each turn by ID without checking that it is still active. A turn that completes between those operations can be rewritten as \`INTERRUPTED\`.

## Steps to Reproduce

1. Have a long-running chat turn near the heartbeat timeout.
2. Let the recovery sweep read it as stale while execution is finishing.
3. Observe the completed turn being marked interrupted.

## Affected Files

- \`server/utils/services/chatTurnService.ts\`

## Acceptance Criteria

- Recovery only interrupts turns that are still in an active status.
- Completed, failed, or cancelled turns cannot be overwritten by recovery.
- Recovery and execution updates are safe under concurrency.
