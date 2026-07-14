# 292 — Exercise Library hides movement filters on mobile

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `library, exercises, filters, mobile`

## Summary

The Exercise Library renders movement-pattern filters in a horizontal, scrollbar-free strip. At phone width, almost 40% of the filter row starts off-screen with no indication that it can be swiped.

## Steps to Reproduce

1. Open `/library/exercises` at 390×844.
2. Inspect the movement-pattern row below Search.

## Actual Behavior

- The visible filter container is 326px wide while its content is approximately 515px wide.
- The row visibly cuts off during `Lunge`; Core, Carry, and Mobility are completely hidden initially.
- `no-scrollbar` removes the native scroll cue and there is no edge fade, More button, or count indicating additional options.
- The adjacent intent filters wrap differently, so the two filter groups use inconsistent mobile interaction patterns.

Users may assume the visible movement patterns are the complete filter set and cannot reliably discover hidden options.

## Affected Files

- `app/pages/library/exercises/index.vue` (movement and intent filters, lines 60–110)

## Suggested Fix

Use one consistent mobile filter pattern. Prefer a Filter button opening a sheet with labeled Movement Pattern, Intent, and Muscle Groups sections. If horizontal chips are retained, add a persistent edge fade or trailing More affordance, keep the active chip visible, and do not hide the only native scroll cue without a replacement.

## Acceptance Criteria

- [ ] Core, Carry, and Mobility are discoverable without guessing at an invisible swipe gesture.
- [ ] Movement and intent filters use a consistent phone interaction pattern.
- [ ] The active filters remain visible or are summarized near the Filter control.
- [ ] The filter UI works at 360×800 and 390×844.
