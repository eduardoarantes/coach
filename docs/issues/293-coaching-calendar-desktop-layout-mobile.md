# 293 — Coaching Calendar preserves a desktop workspace on mobile

**Priority:** High  
**Type:** UI / UX  
**Status:** Open  
**Area:** `coaching, calendar, navigation, mobile`

## Summary

Coaching Calendar keeps its desktop rail, three-button header toolbar, date navigation, view switcher, and athlete lane side by side on a 390px phone. The layout becomes cramped and its roster control blocks access to the app sidebar.

## Steps to Reproduce

1. Open `/coaching/calendar` at 390×844.
2. Leave the roster visible and inspect the calendar lane and date toolbar.
3. Hide the roster, then tap the apparent hamburger/`Open sidebar` area.

## Actual Behavior

- With the roster open, it shrinks to roughly 160px and leaves only about 215px for the calendar lane.
- The date range wraps vertically (`Jul 13 - Jul 19, 2026` becomes a narrow stack), while week/month/split controls consume additional rows.
- Show/Hide roster, Show workouts, and Show drawer occupy the full top navbar without a mobile overflow policy.
- The Show/Hide roster control is painted over the hamburger. Clicking `Open sidebar` at 390px toggles the roster instead of opening app navigation.
- Hiding the roster makes the lane more readable, but the page does not default to that phone-appropriate state and the header collision remains.
- The rail and main workspace use fixed desktop flex behavior without responsive mode changes.

## Affected Files

- `app/pages/coaching/calendar.vue` (navbar actions, lines 3–66)
- `app/pages/coaching/calendar.vue` (fixed rail and workspace, lines 69–215)
- `app/pages/coaching/calendar.vue` (date/view toolbar, lines 216–328)

## Suggested Fix

Introduce a dedicated phone mode:

- Default the roster, workout library, and workout drawer to closed.
- Present each secondary panel as a full-width sheet or drawer rather than a persistent rail.
- Preserve the hamburger and one calendar action in the header; move the other workspace controls into an overflow menu.
- Keep date navigation on one compact row and use a single view selector instead of multiple adjacent controls.
- Render one full-width athlete lane; make comparison/split view a tablet-or-larger feature or an explicit phone flow.

## Acceptance Criteria

- [ ] Tapping the hamburger always opens the app sidebar.
- [ ] The initial 390px layout shows one readable, full-width calendar lane.
- [ ] Roster, workouts, and drawer remain reachable through clearly labeled mobile sheets or menus.
- [ ] Date navigation does not wrap into a vertical stack.
- [ ] No toolbar control overlaps navigation at 360×800 or 390×844.
