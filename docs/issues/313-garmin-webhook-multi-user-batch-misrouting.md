# 313 — Garmin Webhook Multi-User Batches Are Misrouted

**Type:** Security / Data Integrity Bug  
**Priority:** Critical  
**Area:** `integrations, webhooks, privacy`  
**Status:** Open

## Description

Garmin notification values are arrays, and the checked-in Activity API documentation explicitly shows
an `activityFiles` notification containing records for different `userId` values.

`GarminService.processWebhookEvent` resolves one `externalUserId` from the first available record,
loads one integration, and processes all summary lists and activity files using that integration.
Consequences include:

- activity summaries for later users can be stored on the first Coach Watts account;
- activity files for later users are searched under the wrong account and dropped;
- mixed-type payloads can be attributed according to whichever list is checked first.

## Steps to Reproduce

1. Connect two Garmin users.
2. Process one notification containing activity or activity-file records for both Garmin `userId`
   values.
3. Observe that only the first resolved integration is used for the entire payload.

## Expected Behavior

Every record is routed by its own Garmin `userId`. Mixed-user notifications must be partitioned before
any persistence or file retrieval occurs.

## Affected Files

- `server/utils/services/garminService.ts`
- `tests/unit/server/utils/services/garminService.test.ts`

## Acceptance Criteria

- [ ] All recognized summary lists are partitioned by record-level `userId`
- [ ] Each partition resolves exactly one Garmin integration
- [ ] Unknown users do not prevent valid users in the same payload from processing
- [ ] Multi-user activity, wellness, and activity-file payloads have unit coverage
- [ ] No record can be persisted to a different Garmin user's Coach Watts account
