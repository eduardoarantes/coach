# 286 — Connected Apps exposes untranslated localization keys

**Priority:** Medium  
**Type:** UI / i18n  
**Status:** Open  
**Area:** `settings, connected-apps`

## Summary

The Connected Apps page displays localization identifiers verbatim in core controls and application-consent cards.

## Steps to Reproduce

1. Open `/settings/apps` with the English UI locale.
2. Scroll from the integration cards to the authorized applications section.

## Actual Behavior

Visible strings include `apps_ingestion_settings`, `apps_available_header`, `apps_available_description`, `apps_authorized_on`, `apps_website`, and `apps_disconnect`.

These appear in headings and destructive/account-management actions, so their meaning is not safely inferable from context.

## Affected Files

- `app/pages/settings/apps.vue` (lines 12–23, 81–86, 127–176)
- The locale namespace loaded by the settings page

## Suggested Fix

Add the missing keys to every supported locale or use the project's translation helper with English fallbacks. Add a development/test assertion that flags translation results identical to their key.

## Acceptance Criteria

- [ ] No `apps_*` identifiers are visible in the English UI.
- [ ] Website and Disconnect actions have clear localized labels.
- [ ] Authorized dates interpolate correctly.
- [ ] Missing secondary-locale values fall back to readable English.
