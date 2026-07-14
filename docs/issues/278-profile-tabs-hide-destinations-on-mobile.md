# 278 — Profile settings tabs hide most destinations on mobile

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `profile, settings, mobile`

## Summary

The profile settings toolbar is a horizontally scrollable row with its scrollbar deliberately hidden. On a 390px viewport only Basic Settings, Sport Settings, and the first letter of Measurements are visible; Availability, Nutrition, Public Profile, and Communication have no visible affordance.

## Steps to Reproduce

1. Open `/profile/settings` at 390×844.
2. Observe the settings tab toolbar without performing a horizontal swipe.

## Actual Behavior

- The seven tabs occupy approximately 1,021px in one row.
- The row uses `overflow-x-auto` together with `no-scrollbar`.
- The third tab is clipped to a single letter, and there is no chevron, fade, count, menu, or other indication that more destinations exist off-screen.
- Tab controls are only 32px high.

## Affected Files

- `app/pages/profile/settings.vue` (lines 10–28)

## Suggested Fix

Use a mobile-select/overflow-menu pattern or add a strong scroll affordance with snap points and edge fades. Ensure the active tab is automatically scrolled into view when selected through a deep link.

## Acceptance Criteria

- [ ] Mobile users can discover all seven settings destinations without guessing that the row is swipeable.
- [ ] No tab label is presented as a misleading clipped fragment.
- [ ] A query-string-selected tab is visible on initial render.
- [ ] Tab targets are comfortably tappable.
