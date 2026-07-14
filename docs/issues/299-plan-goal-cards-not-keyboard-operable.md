# 299 — Plan goal cards are not keyboard operable

**Priority:** Medium  
**Type:** Accessibility  
**Status:** Open  
**Area:** `plans, wizard, forms`

## Summary

Existing goals in the first plan-wizard step are clickable `<div>` cards with no interactive role, accessible name, keyboard focus, or selected state.

## Steps to Reproduce

1. Open `/plan` and start **Create Training Plan**.
2. Navigate the Goal step with Tab or a screen reader.
3. Try to select an existing goal without pointer input.

## Actual Behavior

The Create New Goal control is a real button, but every existing goal is a generic element with `cursor-pointer` and an `@click` handler. Keyboard and assistive-technology users cannot discover or activate those choices.

## Affected Files

- `app/components/plans/PlanWizard.vue` (existing goal cards, lines 184–240)

## Suggested Fix

Model the choices as a labeled radio group, or use buttons with `aria-pressed`/`aria-selected` and visible focus styling. Preserve the card appearance while exposing one coherent name per goal.

## Acceptance Criteria

- [ ] Every goal choice is reachable and selectable with keyboard input.
- [ ] A screen reader announces the goal name, group context, and selected state.
- [ ] Selection has a visible focus and selected treatment.
- [ ] Pointer and touch behavior remains unchanged.
