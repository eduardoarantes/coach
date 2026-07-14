# 295 — Onboarding consent controls are unnamed and ambiguous

**Priority:** Medium  
**Type:** Accessibility / UX  
**Status:** Open  
**Area:** `onboarding, consent, mobile`

## Summary

The first-time consent screen exposes two unnamed checkboxes to assistive technology, and the required health-data consent is presented as “Enable Health Insights,” which reads like an optional preference.

## Steps to Reproduce

1. Open `/onboarding?testing=1` at 390×844.
2. Inspect the checkbox names with a screen reader or accessibility tree.
3. Try to continue without selecting “Enable Health Insights.”

## Actual Behavior

Both controls are announced only as `checkbox`; their adjacent `<label>` elements have no matching `for`/`id`. The Continue button also requires both values, although only the legal card clearly communicates an agreement and neither card is marked Required.

## Affected Files

- `app/pages/onboarding.vue` (consent cards and checkboxes, lines 21–110)

## Suggested Fix

Associate each checkbox with its visible label through `UFormField` or matching `id`/`for`, and explicitly mark required consent. Reword the health card so users understand that consent is required for the product, or offer a non-health-data mode if that is supported.

## Acceptance Criteria

- [ ] Each checkbox is announced with its visible name and required state.
- [ ] Tapping either the checkbox or its label toggles exactly once.
- [ ] The screen clearly distinguishes required consent from optional preferences.
- [ ] Validation explains what remains incomplete before Continue can be used.
