# 320 — Garmin OAuth Callback Is Not Bound to Its Initiation

**Type:** Security Bug  
**Priority:** Medium  
**Area:** `integrations, oauth, session`  
**Status:** Open

## Description

The Garmin authorization request uses PKCE but does not send or validate OAuth `state`. The
`garmin_code_verifier` cookie contains only the verifier and is not bound to the user/session that
initiated authorization.

If browser identity changes between authorization and callback, the callback uses the current session
and can link the Garmin account to a different Coach Watts user than the one that initiated the flow.
Explicit state validation also provides defense in depth against callback/request correlation attacks.

## Steps to Reproduce

1. Begin Garmin authorization as Coach Watts user A.
2. Change the active Coach Watts identity before completing Garmin consent.
3. Complete the callback while authenticated as user B.
4. Observe the callback associates the token using the current user B session.

## Expected Behavior

The callback is cryptographically correlated to the initiating session/user and rejected if the
identity or state does not match.

## Affected Files

- `server/api/integrations/garmin/authorize.get.ts`
- `server/api/integrations/garmin/callback.get.ts`

## Acceptance Criteria

- [ ] Authorization sends an unpredictable OAuth `state`
- [ ] Callback validates state with constant-time-safe comparison where applicable
- [ ] State/verifier storage is bound to the initiating Coach Watts user/session
- [ ] State and verifier cookies are cleared on success and terminal failure
- [ ] Tests cover missing, mismatched, replayed, expired, and identity-switched callbacks
