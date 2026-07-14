# 284 — Recommendations heading is clipped on mobile

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `recommendations, mobile`

## Summary

The fixed `text-4xl` uppercase Recommendations heading is wider than a 390px phone viewport. The final characters are clipped at the right edge instead of wrapping or scaling down.

## Steps to Reproduce

1. Open `/recommendations` at 390×844.
2. Inspect the page heading.

## Actual Behavior

`RECOMMENDATIONS` extends beyond the content width and is visibly cut off. The surrounding subtitle and cards fit normally.

## Affected Files

- `app/pages/recommendations/index.vue` (lines 51–63)

## Suggested Fix

Use a responsive heading scale such as `text-3xl sm:text-4xl`, or allow safe wrapping/breaking for long translated page names. Audit other fixed-size uppercase page headings with similarly long labels.

## Acceptance Criteria

- [ ] The full heading is visible at 360px and 390px.
- [ ] Longer translated headings wrap or scale predictably.
- [ ] Desktop typography is unchanged.
