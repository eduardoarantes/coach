# 189 — Profile Watcheffect Clobbers Edits

**Type:** Bug  
**Priority:** Medium  
**Area:** `profile, ui/ux`  
**Status:** Fixed

## Description

watchEffect re-merges server profile on refresh overwriting in-progress edits on other tabs.

## Steps to Reproduce

Edit basic tab; save nutrition; basic edits lost.

## Affected Files

- `app/pages/profile/settings.vue`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Appropriate fix verified
