# 282 — Leaving Recovery can break the next route in a loading state

**Priority:** High  
**Type:** Bug  
**Status:** Open  
**Area:** `recovery, navigation, head`

## Summary

Navigating away from `/recovery` can throw from the page's head cleanup hook. The destination route renders its shell but can remain indefinitely in its skeleton state. A fresh direct load of the same destination succeeds.

## Steps to Reproduce

1. Open `/recovery` and wait for the timeline to load.
2. Navigate in the same tab to a completed workout detail route.
3. Wait for the workout request to finish.

## Actual Behavior

- Vue reports an unhandled error during the Recovery page `beforeUnmount` hook.
- `@unhead/vue` throws `Cannot read properties of undefined (reading 'dispose')`.
- The workout-detail header renders, but the body remains a skeleton with ten loading alerts after several seconds.
- Opening that workout URL in a fresh tab loads normally.

The Recovery page also produces a document title of `- Coach Watts`, indicating that the same reactive head setup is not providing a stable title value.

## Affected Files

- `app/pages/recovery/index.vue` (`useHead` is registered before `tr` and the Tolgee binding are initialized, lines 149–158)

## Suggested Fix

Initialize translation dependencies before registering `useHead`, and pass a stable computed/ref supported by the current Unhead integration. Add a route-transition test from Recovery to a data-heavy detail page and assert that unmount produces no console error.

## Acceptance Criteria

- [ ] Leaving `/recovery` produces no `beforeUnmount` or Unhead disposal error.
- [ ] The destination page completes loading in the same tab.
- [ ] Recovery's document title is `Recovery History - Coach Watts`.
- [ ] Repeated Recovery ↔ workout navigation remains stable.
