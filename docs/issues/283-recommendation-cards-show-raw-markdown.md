# 283 — Recommendation cards show raw Markdown syntax

**Priority:** Medium  
**Type:** UI / Content  
**Status:** Open  
**Area:** `recommendations`

## Summary

Recommendation descriptions are rendered as plain interpolated text on the index page even though generated recommendations can contain Markdown. Users therefore see syntax such as `**linking water consumption to your existing habits**` instead of formatted emphasis.

## Steps to Reproduce

1. Open `/recommendations`.
2. Find a generated recommendation whose description contains Markdown emphasis.

## Actual Behavior

The card prints the raw asterisks. Recommendation detail pages use richer text handling, so the same content is represented inconsistently between list and detail views.

## Affected Files

- `app/components/recommendations/RecommendationCard.vue` (lines 56–61)
- `app/pages/recommendations/[id].vue` (reference implementation using `GlossaryText`)

## Suggested Fix

Render descriptions through the app's safe Markdown/content component, with links and unsafe HTML constrained appropriately. Preserve the existing four-line clamp in the card.

## Acceptance Criteria

- [ ] Supported Markdown is formatted consistently in recommendation cards and details.
- [ ] Raw Markdown delimiters are not visible.
- [ ] Generated HTML is sanitized.
- [ ] Card clamping and mobile layout remain intact.
