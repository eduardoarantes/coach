# 312 — Garmin Activity File Callback Can Exfiltrate Access Tokens

**Type:** Security Bug  
**Priority:** Critical  
**Area:** `integrations, webhooks, security`  
**Status:** Open

## Description

Garmin Activity File notifications contain a `callbackURL`. The worker passes that URL directly to
`fetchGarminActivityFileByCallbackUrl`, which sends the athlete's Garmin access token in the
`Authorization` header.

The Garmin webhook is currently unauthenticated (issue [069](./069-garmin-webhook-unauthenticated.md)).
An attacker who can provide a payload that matches a known Garmin user/activity can set
`callbackURL` to an attacker-controlled host and receive the bearer token.

Even after webhook authentication is implemented, callback URLs should be treated as untrusted input
and restricted before credentials are attached.

## Steps to Reproduce

1. Identify a connected Garmin `externalUserId` and an existing Garmin activity ID.
2. POST an `activityFiles` notification with those identifiers and an attacker-controlled
   `callbackURL`.
3. Observe the worker request the supplied URL with `Authorization: Bearer <garmin-token>`.

## Expected Behavior

- Only approved HTTPS Garmin API callback hosts are fetched with Garmin credentials.
- Invalid callback URLs are rejected without making a network request.
- Garmin webhook authenticity is verified when provider configuration supports it.

## Affected Files

- `server/api/webhooks/garmin.post.ts`
- `server/utils/services/garminService.ts` (`processActivityFiles`)
- `server/utils/garmin.ts` (`fetchGarminActivityFileByCallbackUrl`)

## Related

- [069](./069-garmin-webhook-unauthenticated.md) — Garmin webhook unauthenticated

## Acceptance Criteria

- [ ] Callback URL protocol and hostname are allowlisted before any request
- [ ] Authorization headers are never forwarded to non-Garmin origins
- [ ] Tests cover malicious hosts, redirects, malformed URLs, and valid Garmin callback URLs
- [ ] Webhook authentication/configuration decision is documented
