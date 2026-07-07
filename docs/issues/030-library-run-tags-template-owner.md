# 030 — Library structure jobs tag template owner, not session actor

**Type:** Bug  
**Priority:** Medium  
**Area:** `backend`, `workouts`, `ui/ux`  
**Status:** Open

## Description

Library workout structure generation tags runs with **`user:${template.userId}`**, not the logged-in user who clicked the button. This creates monitor visibility mismatches in coaching scenarios.

## Root Cause

```35:43:server/api/library/workouts/[id]/generate-structure.post.ts
  const handle = await tasks.trigger(
    'generate-structured-workout',
    { workoutTemplateId: id },
    {
      tags: [`user:${template.userId}`, `workout-template:${id}`],
      concurrencyKey: template.userId
    }
  )
```

No `publishTaskRunStartedEvent` is called — monitor relies on polling `/api/runs/active`.

## Scenarios

| Actor | Template owner | Who sees run in monitor |
|-------|----------------|-------------------------|
| Athlete | Self | Athlete ✓ |
| Coach (act-as athlete) | Athlete | Athlete session ✓ |
| Coach (own account, library scope `all`) | Athlete | **Nobody** (tagged athlete, session is coach) |
| Coach generating own template | Coach | Coach ✓ |

## Expected Behavior

Tag runs with **both**:

- `user:{sessionUserId}` — monitor ownership for whoever triggered
- `user:{subjectUserId}` or `template-owner:{id}` — billing/quota subject if different

Or always tag the **session actor** and pass subject in payload only.

## Acceptance Criteria

- [ ] Coach triggering library generation sees the job in their monitor
- [ ] Tag policy documented for coach vs athlete ownership
