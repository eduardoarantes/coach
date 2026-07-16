# 321 — Garmin External User Ownership Check Is Race-Prone

**Type:** Security / Data Integrity Bug  
**Priority:** Medium  
**Area:** `integrations, oauth, database`  
**Status:** Open

## Description

The Garmin callback checks whether `externalUserId` belongs to another Coach Watts user and then
performs an upsert keyed by `(userId, provider)`.

There is no database uniqueness constraint on `(provider, externalUserId)`. Two concurrent callbacks
for different Coach Watts users can both pass the ownership check and create duplicate mappings for
the same Garmin account. The webhook processor detects duplicates later and throws, preventing data
delivery for that Garmin user.

## Steps to Reproduce

1. Run concurrent Garmin callbacks for two Coach Watts users using the same Garmin account.
2. Allow both ownership queries to complete before either upsert commits.
3. Observe two Garmin integrations with the same `externalUserId`.
4. Process a webhook for that Garmin ID and observe duplicate-mapping failure.

## Expected Behavior

Garmin account ownership is enforced atomically by the database and callback conflicts produce a
deterministic account-already-linked response.

## Affected Files

- `server/api/integrations/garmin/callback.get.ts`
- `prisma/schema.prisma` (`Integration`)
- `server/utils/services/garminService.ts`

## Acceptance Criteria

- [ ] Database constraints prevent duplicate non-null Garmin external-user mappings
- [ ] Callback handles uniqueness conflicts as account-already-linked
- [ ] Existing duplicate mappings can be detected and remediated before migration
- [ ] Concurrent callback behavior has an integration test
