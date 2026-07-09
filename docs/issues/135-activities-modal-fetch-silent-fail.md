# 135 — Activities Modal Fetch Silent Fail

**Type:** UI  
**Priority:** Medium  
**Area:** `activities, ui/ux`  
**Status:** Fixed

## Description

Calendar modals catch errors with console.error only.

## Steps to Reproduce

Click deleted activity; no toast.

## Affected Files

- `app/pages/activities.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
