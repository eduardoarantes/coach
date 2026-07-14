# 280 — Activities mobile cards clip chart and reschedule actions

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `activities, calendar, mobile`

## Summary

Mobile calendar cards keep metadata, comparison, a mini chart, and the drag handle on one non-wrapping row. Cards with chart previews cannot fit in the remaining width, so their right-side actions extend beyond the viewport and require horizontal scrolling inside the calendar.

## Steps to Reproduce

1. Open `/activities` at 390×844 in Calendar view.
2. Find a planned workout with a mini chart and drag handle.
3. Inspect the right edge of the card.

## Actual Behavior

- Several drag handles were positioned at x=389–393 with a 24px width, outside the 390px viewport.
- The mini chart and the right edge of workout cards are visibly cut off.
- The mobile calendar inherits `overflow-x-auto`, so the defect presents as a subtle inner horizontal scroll rather than a page-level overflow warning.
- Comparison and drag targets are 24px square and tightly adjacent to the chart.

## Affected Files

- `app/pages/activities.vue` (calendar overflow container, lines 264–277)
- `app/pages/activities.vue` (mobile activity cards, lines 559–667)

## Suggested Fix

Give the mobile list its own `overflow-x-hidden` layout and move secondary actions to a second row or overflow menu. Reduce or hide the mini chart at very narrow widths, while keeping comparison and reschedule actions reachable with larger hit areas.

## Acceptance Criteria

- [ ] No mobile card child extends outside the calendar viewport at 360px or 390px.
- [ ] Comparison and reschedule actions remain visible and comfortably tappable.
- [ ] The mobile list does not require horizontal scrolling.
- [ ] Long titles and full TSS/duration/distance metadata degrade predictably.
