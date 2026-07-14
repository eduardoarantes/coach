# 296 — Integration credential fields have unassociated labels

**Priority:** Medium  
**Type:** Accessibility / UX  
**Status:** Open  
**Area:** `integrations, forms, mobile`

## Summary

Manual connection forms visually label credentials, but several labels are not programmatically associated with their inputs. Mobile screen readers announce placeholder text instead of the field purpose, and some forms omit useful autofill metadata.

## Steps to Reproduce

1. Open `/connect-intervals`, `/connect-yazio`, or `/connect-hevy` at 390×844.
2. Move screen-reader focus to each credential input.
3. Inspect its accessible name and autofill metadata.

## Actual Behavior

The forms render plain `<label>` elements without `for`, while `UInput` receives no corresponding `id` or accessible label. Intervals.icu and Hevy also omit autocomplete guidance for their credential fields. Yazio supplies autocomplete values, but its labels remain detached.

## Affected Files

- `app/pages/connect-intervals.vue` (Athlete ID and API Key, lines 66–90)
- `app/pages/connect-yazio.vue` (username and password, lines 66–90)
- `app/pages/connect-hevy.vue` (API Key, lines 64–77)

## Suggested Fix

Use `UFormField` or stable input IDs with matching `for` attributes. Preserve `autocomplete="username"` and `autocomplete="current-password"` for Yazio, and explicitly choose suitable autocomplete behavior for athlete IDs and API keys.

## Acceptance Criteria

- [ ] Every credential input is announced with its visible label and required state.
- [ ] Labels focus their corresponding inputs when tapped.
- [ ] Password managers and mobile autofill receive intentional metadata.
- [ ] Placeholder text remains an example or hint, not the only accessible name.
