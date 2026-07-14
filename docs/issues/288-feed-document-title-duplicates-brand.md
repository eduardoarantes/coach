# 288 — Several pages duplicate the product name in document titles

**Priority:** Low  
**Type:** UI / Metadata  
**Status:** Open  
**Area:** `feed, library, coaching, metadata`

## Summary

Several pages supply `Coach Watts` in their local/default title even though the global title template appends the product name. Titles therefore duplicate the brand and some routes lose a meaningful page name entirely.

## Actual Behavior

- `/feed`: `Activity Feed | Coach Watts - Coach Watts`
- `/library/workouts`, `/library/exercises`, and `/library/plans`: `Coach Watts - Coach Watts`
- `/coaching/calendar`: `Coach Watts - Coach Watts`

## Affected Files

- `app/pages/feed.vue` (`useHead`, lines 185–193)
- Library page metadata/default title handling
- `app/pages/coaching/calendar.vue`

## Suggested Fix

Give each route a concise page-local title and allow the global title template to add the brand once.

## Acceptance Criteria

- [ ] The browser title contains the product name once.
- [ ] The title follows the same separator convention as other authenticated pages.
- [ ] Library and Coaching Calendar titles identify the current page rather than only the product.
