# 279 — Performance highlight filters are clipped on mobile

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `performance, mobile`

## Summary

The Activity Highlights title and two fixed-width filters are forced into a single `justify-between` row. Their combined width exceeds a phone viewport, so the period filter is cut off instead of wrapping below the heading.

## Steps to Reproduce

1. Open `/performance` at 390×844.
2. Inspect the Activity Highlights section header.

## Actual Behavior

- The sport filter begins around x=149 with width 160px.
- The period filter begins around x=317 with width 128px and ends around x=445, outside the 390px viewport.
- The container clips the overflow, so the current period and dropdown affordance are only partially visible.

## Affected Files

- `app/pages/performance/index.vue` (lines 85–111)

## Suggested Fix

Stack the section title and filters below `sm`, or allow the filter row to wrap with responsive widths (`w-full`/flex-1 and sensible minimums). Repeat the same responsive pattern for the other chart section headers.

## Acceptance Criteria

- [ ] Both filters are fully visible and operable at 360px and 390px.
- [ ] The section title does not compete with controls for the same horizontal row on narrow screens.
- [ ] Equivalent filter headers elsewhere on the page use the same mobile layout.
