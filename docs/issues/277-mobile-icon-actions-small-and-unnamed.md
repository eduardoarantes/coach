# 277 — Mobile icon actions have small hit areas and missing accessible names

**Priority:** Medium  
**Type:** Accessibility / UI  
**Status:** Open  
**Area:** `navigation, sidebar, activities, dashboard, library, analytics, mobile`

## Summary

Desktop labels are hidden below the `sm` breakpoint, but several resulting icon-only controls have no replacement `aria-label`. Most header controls also render at only 28–36px high, making adjacent actions difficult to target reliably on a phone.

## Steps to Reproduce

1. Open `/dashboard`, `/activities`, or `/nutrition` at 390×844.
2. Inspect the accessible names and bounding boxes of header actions.

## Actual Behavior

- `/activities` exposes unnamed icon controls for upload, overflow, refresh, calendar settings, calendar/list mode, and month navigation.
- `/dashboard` exposes an unnamed upload link and other icon-only actions depending on client state.
- `/nutrition` exposes icon-only history and refresh controls after their visible labels are hidden.
- Header controls measured 28–36px high; activity-card comparison and drag controls measured 24px square.
- Mobile sidebar navigation rows measure approximately 32px high even though they are the primary way to move through the app.
- Library Workouts, Exercises, and Plans expose unnamed sport filters, favorite/menu actions, edit/delete actions, and 16px selection checkboxes. Several visible actions measure only 20–24px.
- Analytics dashboards repeat unnamed 24–36px widget and menu controls.
- The Help Center Tasks button loses its visible label below `md` but has no replacement accessible name.

Sighted users must infer unfamiliar icons, screen-reader users encounter unnamed controls, and densely packed small targets increase accidental activation.

## Affected Files

- `app/pages/dashboard.vue` (lines 28–55)
- `app/pages/activities.vue` (lines 14–49, 158–260, 622–662)
- `app/pages/nutrition/index.vue` (lines 14–39)
- Shared navbar/action components used by these pages
- `app/layouts/default.vue` (mobile sidebar navigation, lines 881–885)
- `app/pages/library/workouts/index.vue`
- `app/pages/library/exercises/index.vue`
- `app/pages/library/plans/index.vue`
- `app/pages/analytics/index.vue`
- `app/pages/help-center.vue` (header actions, lines 93–103)

## Suggested Fix

Add localized `aria-label` values whenever visible labels are hidden, and provide mobile hit areas of roughly 44px without necessarily enlarging the icon. Include accessible-name assertions in component tests for icon-only actions.

## Acceptance Criteria

- [ ] Every interactive icon has a meaningful accessible name at mobile breakpoints.
- [ ] Frequently used mobile actions have comfortable, non-overlapping hit areas.
- [ ] Icon labels are localized and match the action performed.
- [ ] Automated accessibility checks no longer report unnamed buttons or links on the audited pages.
