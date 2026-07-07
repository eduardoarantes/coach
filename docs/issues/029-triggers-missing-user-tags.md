# 029 — Some triggers missing `user:{userId}` tags

**Type:** Bug  
**Priority:** High  
**Area:** `backend`, `infra`  
**Status:** Open

## Description

The run monitor and `/api/runs/*` ownership checks rely on every user-scoped run being tagged with `user:{userId}`. Several trigger sites omit this tag, causing inconsistent monitoring, broken cancel/status APIs, and blind spots in ownership enforcement.

## Confirmed examples

| Location | Task | Tags |
|----------|------|------|
| `server/api/nutrition/analyze-all.post.ts` | `analyze-nutrition` | **None** (only `concurrencyKey`) |
| `server/api/chat/rooms/[id]/summarize.post.ts` | `summarize-chat` | **None** |
| `server/utils/email-service.ts` | `send-email` | **None** |
| `server/api/stripe/webhook.post.ts` | `send-email` | **None** |
| `server/api/admin/debug/trigger-test.post.ts` | test tasks | **None** (admin-only; OK) |

Compare with correct pattern in `server/api/workouts/[id]/analyze.post.ts`:

```typescript
tags: [`user:${user.id}`],
concurrencyKey: user.id,
```

## Impact

- Runs without `user:` tag **never appear** in `/api/runs/active` (filtered by tag).
- If a WS event is published with wrong/missing tags, ownership checks on `/api/runs/[id]` return 404.
- Harder to audit or debug per-user job volume in Trigger.dev.

## Suggested Fix

1. Add shared helper `buildUserRunTags(userId, extras?: string[])` used at every `tasks.trigger` call site.
2. Lint/check script: fail CI if `tasks.trigger` in `server/` lacks `user:` tag (except explicit system tasks).
3. Backfill documentation in `docs/04-guides/background-task-monitoring.md`.

## Acceptance Criteria

- [ ] All user-initiated API triggers include `user:{userId}` tag
- [ ] Audit list documented and enforced in CI or code review checklist
