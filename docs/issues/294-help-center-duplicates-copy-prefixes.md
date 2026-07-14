# 294 — Help Center duplicates Try and Tip prefixes

**Priority:** Low  
**Type:** UI / Content  
**Status:** Open  
**Area:** `help-center, i18n`

## Summary

The AI Ticket Assistant repeats localized prefixes, rendering `Try: Try:` twice and `Tip: Tip:` once.

## Steps to Reproduce

1. Open `/help-center`.
2. Scroll to the AI Ticket Assistant card.

## Actual Behavior

The template renders separate localized `help_try_prefix` and `help_tip_prefix` values, but the English assistant example strings already begin with the same prefixes.

## Affected Files

- `app/pages/help-center.vue` (assistant examples, lines 214–226)
- `app/i18n/en/common.json` (`help_ai_assistant_try_1`, `help_ai_assistant_try_2`, and `help_ai_assistant_tip`)

## Suggested Fix

Keep prefixes in one place. Prefer prefix-free example strings so the separately styled localized prefix remains reusable and consistent across languages.

## Acceptance Criteria

- [ ] Each example displays exactly one `Try:` or `Tip:` prefix.
- [ ] Prefix punctuation and spacing remain correct in every supported locale.
