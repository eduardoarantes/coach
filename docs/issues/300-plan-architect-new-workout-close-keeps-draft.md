# 300 — Closing a new plan workout keeps an unintended draft

**Priority:** Medium  
**Type:** UX / Transactional UI  
**Status:** Open  
**Area:** `plans, architect, workouts, overlays`

## Summary

Choosing New workout in the Plan Architect inserts a default workout before the editor is confirmed. Closing the editor leaves that item in the plan and marks the plan Unsaved.

## Steps to Reproduce

1. Open an existing `/library/plans/:id/architect` plan.
2. On an empty day, tap **Add** → **New workout**.
3. Close the Edit workout dialog with its X button without saving.

## Actual Behavior

A “New workout” item with 30 minutes and 20 TSS is added immediately. Closing the overlay does not cancel creation: the item remains, the plan shows Unsaved, and the dialog offers only Remove workout as the way to reverse the action. “Workout added” is also announced before the user confirms any details.

## Affected Files

- `app/pages/library/plans/[id]/architect.vue` (`createAndEditDayItem`, lines 1088–1097)
- `app/pages/library/plans/[id]/architect.vue` (workout editor modal and footer, lines 589–720)
- `app/components/plans/PlanArchitectBoard.vue` (New workout menu action, lines 510–522)

## Suggested Fix

Create a detached draft for the modal and insert it only when the user chooses Save. Provide an explicit Cancel action; closing with X, Escape, or overlay dismissal should discard a new draft while leaving edits to existing workouts governed by a clear dirty-state policy.

## Acceptance Criteria

- [ ] Opening and cancelling New workout leaves the plan unchanged.
- [ ] The success notification appears only after confirmation.
- [ ] Save inserts exactly one workout with the entered values.
- [ ] Close, Cancel, Escape, and overlay dismissal have consistent behavior.
- [ ] Editing and cancelling an existing workout does not silently apply changes.
