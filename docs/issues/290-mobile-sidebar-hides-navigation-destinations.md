# 290 — Mobile sidebar hides navigation destinations below the fold

**Priority:** High  
**Type:** UI / UX  
**Status:** Open  
**Area:** `sidebar, navigation, mobile`

## Summary

The mobile sidebar presents 18–19 ungrouped top-level destinations in a short scroll region. Important destinations and even the active nested route can open below the viewport with no cue that more navigation is available.

## Steps to Reproduce

1. Open `/settings/apps` at 390×844.
2. Open the mobile sidebar.
3. Inspect the initially visible navigation and the expanded Settings group.

## Actual Behavior

- The logo and search control use the first approximately 136px before the first navigation row.
- The navigation region is only about 565px high (`scrollHeight` approximately 880px) because a fixed footer begins around y=629.
- The initial list runs from Dashboard through Library/Coaching before being cut off; Help Center, Admin, and Settings require scrolling.
- Settings expands for the current route, but its active Apps child starts around y=840, below the viewport and behind the fixed footer. The menu does not scroll the active item into view.
- Dashboard actions, daily check-in shortcuts, training data, planning, analytics, library, coaching, help, admin, and settings all share one visual level with no section labels or primary/secondary hierarchy.

Users can reasonably conclude that the visible items are the complete menu and miss destinations near the bottom. Opening the menu on a nested page does not help them locate where they currently are.

## Affected Files

- `app/layouts/default.vue` (flat primary navigation, lines 129–425)
- `app/layouts/default.vue` (mobile sidebar content, lines 856–885)

## Suggested Fix

Create a mobile information architecture rather than rendering the full desktop list unchanged:

- Keep a short primary section for Dashboard, Activities, Plan/Workouts, and Chat.
- Group analysis destinations (Performance, Fitness, Reports, Recommendations), planning/library destinations, and account/help destinations under labeled, collapsible sections.
- Put Morning Check-in and Today's Wellness in a clearly named Today section or on the Dashboard, rather than treating them as peer-level app destinations.
- When the drawer opens, expand the current group and scroll the active item into view.
- Add a visible scroll affordance or fade when more destinations remain below the fold.

Validate final grouping with actual usage analytics before permanently demoting destinations.

## Acceptance Criteria

- [ ] Core destinations and the current location are discoverable at 360×800 and 390×844.
- [ ] Opening the sidebar on a nested route reveals its active navigation item without manual searching.
- [ ] Secondary destinations are grouped under understandable, localized section labels.
- [ ] The menu indicates when additional items are available by scrolling.
- [ ] Navigation remains fully keyboard- and screen-reader-operable.
