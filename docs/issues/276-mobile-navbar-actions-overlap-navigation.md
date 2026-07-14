# 276 — Mobile navbar actions overlap and hide primary navigation

**Priority:** High  
**Type:** UI / UX  
**Status:** Open  
**Area:** `dashboard, navigation, mobile`

## Summary

Page-specific navbar actions do not collapse or move into an overflow menu on narrow phones. The right action group is wider than the viewport and is painted over the leading sidebar control.

## Steps to Reproduce

1. Open `/dashboard` at 390×844 or 360×800.
2. Wait for the authenticated dashboard to finish loading.
3. Inspect the top navbar.

## Actual Behavior

- At 390px, the sidebar control and Share Coach action occupy the same 32px area.
- Clicking the visible `Open sidebar` area at 390px opens the **Help Coach Watts Grow** share dialog instead of the sidebar because the heart action is painted over the hamburger. This is a functional navigation failure, not only a visual collision.
- At 360px, the Chat action extends to approximately x=391 and is clipped by the viewport.
- The visible header contains as many as seven actions, all kept on one line.
- The same crowded pattern is present on `/activities`, `/nutrition`, `/workouts`, and `/chat`, with a different number and ordering of actions on each page.
- On `/coaching/calendar`, the Show/Hide roster action occupies the hamburger's hit area. Clicking the `Open sidebar` control at 390px toggles the roster instead of opening app navigation.

This makes the primary navigation control visually ambiguous or inaccessible and causes important page actions to disappear without an overflow affordance.

## Affected Files

- `app/pages/dashboard.vue` (navbar right actions, lines 8–67)
- `app/pages/activities.vue` (navbar right actions, lines 8–62)
- `app/pages/nutrition/index.vue` (navbar right actions, lines 8–52)
- `app/pages/workouts/index.vue`
- `app/pages/chat.vue`
- `app/pages/coaching/calendar.vue` (navbar controls, lines 3–66)

## Suggested Fix

Define a shared mobile navbar policy: preserve the sidebar control, keep at most one primary action visible, and move secondary actions into an explicitly labeled overflow menu. On the dashboard, move the Share Coach heart and What's New gift out of the top row below the `sm` breakpoint; keep them reachable in overflow or the sidebar rather than removing the actions entirely. Notifications, upload, sync, and monitor controls should follow the same explicit priority order. Add constrained-width tests at 360px and 390px for every dashboard navbar variant.

## Acceptance Criteria

- [ ] The sidebar control never overlaps another action at 360px or 390px.
- [ ] Tapping the hamburger always opens the sidebar and cannot activate an overpainted header action.
- [ ] No navbar action extends outside the viewport.
- [ ] Hidden secondary actions remain reachable from a visible overflow menu.
- [ ] The mobile action order and primary action treatment are consistent across core pages.
