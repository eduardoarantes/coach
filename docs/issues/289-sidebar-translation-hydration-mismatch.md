# 289 — Sidebar translations regress to raw keys during hydration

**Priority:** Medium  
**Type:** Bug / i18n  
**Status:** Open  
**Area:** `navigation, hydration`

## Summary

The default layout renders readable fallback labels on the server, then replaces two of them with untranslated key names on the client. Vue reports hydration mismatches on every audited route.

## Steps to Reproduce

1. Load any authenticated route in development.
2. Open the sidebar or inspect the navigation DOM and console.

## Actual Behavior

- Server label: `Morning Check-in`; client label: `navigation_morning_checkin`.
- Server label: `Today's Wellness`; client label: `navigation_todays_wellness`.
- Vue reports hydration text mismatches and then logs `Hydration completed but contains mismatches.`
- The raw keys are visible when the sidebar is rendered/open.
- The mobile sidebar dialog also exposes `dashboardSidebar.title` and `dashboardSidebar.description` as its accessible title and description instead of readable localized text.
- Opening sidebar search exposes `dashboardSearch.title`, `dashboardSearch.description`, `navigation_search_morning_routine`, and the same raw morning/wellness keys in the command palette.

## Affected Files

- `app/layouts/default.vue` (navigation labels, lines 129–163; search labels, lines 514–539)
- `app/i18n/en/common.json` or the Tolgee key namespace used by the layout
- Nuxt UI dashboard sidebar locale/configuration used for the mobile dialog
- Nuxt UI dashboard search locale/configuration and command-palette groups

## Suggested Fix

Ensure the keys exist in the namespace loaded by the layout and make server/client readiness resolve to the same label. Prefer a translation helper that returns the readable fallback when Tolgee returns the key unchanged.

## Acceptance Criteria

- [ ] Sidebar labels remain readable after hydration.
- [ ] Server and client render identical initial navigation text.
- [ ] No navigation-related hydration mismatch is logged.
- [ ] Search/morning-routine groups use the same resolved labels.
- [ ] The mobile sidebar dialog has a readable localized accessible title and description.
- [ ] Sidebar search contains no raw key names in dialog metadata, group headings, or results.
