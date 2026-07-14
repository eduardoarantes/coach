# 291 — Mobile sidebar footer crowds out core navigation

**Priority:** Medium  
**Type:** UI / UX  
**Status:** Open  
**Area:** `sidebar, navigation, mobile`

## Summary

The fixed mobile sidebar footer gives permanent space to four external links, three account controls, and the build version. It consumes roughly 215px of a 844px-tall viewport and materially reduces the space available for core navigation.

## Steps to Reproduce

1. Open any authenticated page at 390×844.
2. Open the mobile sidebar.
3. Compare the fixed footer height with the scrollable navigation region.

## Actual Behavior

- Strava and Garmin attribution links occupy one row.
- Discord and GitHub occupy a second full row with separators.
- Avatar, user name, Sign out, and theme toggle occupy another padded row.
- The version/changelog link occupies an additional row.
- Together, the fixed footer occupies approximately y=629–844 while the much longer app navigation is confined to the remaining 565px scroll region.

Low-frequency promotional, community, and account actions therefore have more persistent mobile space than several primary app destinations. The separate Sign out link also makes the account block taller than necessary.

## Affected Files

- `app/layouts/default.vue` (sidebar footer, lines 887–1020)

## Suggested Fix

Use a compact mobile-specific footer:

- Replace the avatar/name/Sign out/theme cluster with one account row that opens a menu containing Profile, theme, and Sign out.
- Move Discord and GitHub under Help/About or a compact overflow menu.
- Keep required Strava/Garmin attribution, but confirm provider requirements and place it in Connected Apps/About or a compact non-fixed area when permitted.
- Move the version into About/Changelog rather than reserving its own fixed row.
- If links must remain in the drawer, include them in the drawer's normal scroll flow so they cannot crowd out navigation.

## Acceptance Criteria

- [ ] The fixed mobile footer uses no more than one compact row.
- [ ] External/community links remain discoverable without permanently reducing the navigation viewport.
- [ ] Profile, theme, and Sign out remain reachable from a clearly labeled account control.
- [ ] Required integration attribution remains compliant and accessible.
- [ ] The sidebar works without content overlap at 360×800 and 390×844.
