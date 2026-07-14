# 281 — Quick Capture obscures mobile page content

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `quick-capture, dashboard, activities, nutrition, mobile`

## Summary

The global Ask Coach Quick Capture pill is fixed 24px above the bottom of the viewport, but most enabled pages do not reserve bottom space for it. It therefore sits directly over cards, chart controls, calendar rows, and other interactive content while users scroll.

## Steps to Reproduce

1. Open `/dashboard`, `/activities`, or `/nutrition` at 390×844.
2. Scroll through content while the Ask Coach pill is minimized.
3. Observe content in the bottom 72px of the viewport.

## Actual Behavior

- The pill occupies a fixed 160×48px region around y=772–820 on a 844px-high viewport.
- On `/activities`, it visibly covers workout rows and competes with comparison/drag actions.
- On `/nutrition`, it covers the next content section and chart/day controls.
- `/performance` and `/fitness` reserve `pb-24`, but `/dashboard`, `/activities`, `/nutrition`, and `/plan` do not consistently apply equivalent spacing.

## Affected Files

- `app/components/AiQuickCapture.vue` (fixed positioning, lines 1–10; enabled routes, lines 272–280)
- `app/pages/dashboard.vue`
- `app/pages/activities.vue`
- `app/pages/nutrition/index.vue`
- `app/pages/plan.vue`

## Suggested Fix

Expose a shared bottom-inset token for Quick Capture and apply it to every enabled page's actual scroll container on mobile. Consider collapsing the pill to a smaller edge FAB while scrolling and respect safe-area insets.

## Acceptance Criteria

- [ ] The last page/card action can be scrolled fully above Quick Capture on every enabled route.
- [ ] Quick Capture does not cover calendar drag/compare actions or chart controls.
- [ ] Bottom spacing includes `env(safe-area-inset-bottom)` where applicable.
- [ ] Desktop spacing is unchanged.
