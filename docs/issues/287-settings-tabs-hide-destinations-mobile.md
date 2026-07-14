# 287 — Settings tabs hide destinations without a mobile affordance

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `settings, mobile`

## Summary

The top-level Settings navigation repeats the same hidden-scrollbar pattern as Profile Settings. At 390px, Connected Apps and AI Coach are visible, Billing is clipped, and Developer and Danger Zone are completely off-screen.

## Steps to Reproduce

1. Open `/settings/apps` at 390×844.
2. Inspect the toolbar without swiping horizontally.

## Actual Behavior

- The toolbar uses `overflow-x-auto` with `no-scrollbar`.
- Billing is displayed as a clipped fragment.
- Developer and the destructive Danger Zone destination have no visible discoverability cue.
- The controls are 32px high.
- The same 641px-wide strip is reused on `/settings/ai`, `/settings/billing`, `/settings/developer`, `/settings/danger`, and `/settings/changelog`; its visible container is only 358px wide at 390px.

## Affected Files

- `app/pages/settings.vue` (lines 10–78)

## Suggested Fix

Use a responsive select/overflow menu or add edge fades, snapping, and explicit next/previous affordances. Automatically bring the active destination into view after route navigation.

## Acceptance Criteria

- [ ] All Settings destinations are discoverable at 360px and 390px.
- [ ] No tab label is shown as a misleading clipped fragment.
- [ ] The active route is visible when opened by deep link.
- [ ] Danger Zone is reachable without guessing a horizontal swipe gesture.
