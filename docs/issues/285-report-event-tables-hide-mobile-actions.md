# 285 — Reports and Events tables hide status and actions on mobile

**Priority:** High  
**Type:** UI / UX  
**Status:** Open  
**Area:** `reports, events, mobile`

## Summary

Reports and Events retain wide desktop tables on mobile. The containers scroll horizontally, but there is no visible scroll affordance and the most important status/action columns begin hundreds of pixels beyond the viewport.

## Steps to Reproduce

1. Open `/reports` at 390×844 and observe that only Report Type and Date Range are fully visible.
2. Open `/events` at the same viewport and observe that edit/delete actions are absent from every visible row.

## Actual Behavior

- Report actions begin around x=701; action icons reach x=873.
- Event edit/delete actions begin around x=668.
- Status is only partially visible, while Created and Actions are entirely off-screen.
- Both screens look like truncated cards because the horizontal scrollbar is not visible in the viewport.
- Row action icons also have no accessible names and are only 24px square.

## Affected Files

- `app/pages/reports.vue` (table containers and five-column table, lines 136 onward)
- `app/components/events/EventTable.vue` (lines 27–208)

## Suggested Fix

Provide dedicated mobile card/list variants that surface status and a labeled overflow action per item. If horizontal scrolling remains as a fallback, add sticky identity/action columns and an explicit scroll affordance.

## Acceptance Criteria

- [ ] Report status and primary action are visible without horizontal scrolling.
- [ ] Event edit/delete actions are reachable from each mobile row.
- [ ] All mobile row actions have accessible names and comfortable targets.
- [ ] Desktop table density remains available at larger breakpoints.
