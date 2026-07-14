# 298 — Plan wizard progress opens on the wrong steps on mobile

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `plans, wizard, overlays, mobile`

## Summary

The six-step training-plan wizard opens its horizontally overflowing progress indicator centered on steps 3–4, hiding the current Goal step and the next Strategy step.

## Steps to Reproduce

1. Open `/plan` at 390×844 with existing goals.
2. Tap **Create Training Plan**.
3. Inspect the progress indicator at the top of the dialog.

## Actual Behavior

The content heading says “Step 1: Choose your Goal,” while the visible progress labels are “3 Phases” and “4 Schedule.” Goal and Strategy are offscreen to the left with no cue that the indicator can be scrolled. This gives contradictory orientation at the start of a long transactional flow.

## Affected Files

- `app/components/plans/PlanWizard.vue` (six-step progress indicator, lines 1–155)
- `app/pages/plan.vue` (Create Training Plan modal, lines 141–216)

## Suggested Fix

Use a compact mobile progress pattern such as “Step 1 of 6 — Goal,” or actively scroll the current step into view and expose overflow affordances. Avoid `justify-center` on an overflowing row because it can place both ends outside the initial viewport.

## Acceptance Criteria

- [ ] The current step name and position are visible when every wizard step opens.
- [ ] Mobile users are not required to discover horizontal scrolling to understand progress.
- [ ] The indicator updates and remains correctly oriented through all six steps.
- [ ] The desktop indicator remains unchanged or equally clear.
