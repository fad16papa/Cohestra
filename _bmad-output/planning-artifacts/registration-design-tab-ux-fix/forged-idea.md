# Forged idea — Layout preset must not resize brand controls

**Idea:** Registration Design tab treats layout preset and community brand as independent operator controls.  
**Verdict:** **HARDENED**  
**Date:** 2026-08-15

## Load-bearing locks

- **LOCK:** Changing layout preset updates live preview and saved `registrationTheme.preset` only — never the brand panel dimensions or fields.
- **LOCK:** "Inherit community brand" + accent/hero overrides are always visible and stable; they resolve into preview via `previewResolved`, not via layout coupling.
- **LOCK:** Grid columns use `items-start` so preview height (e.g. immersive `min-h-[40vh]` hero) does not stretch the brand card.
- **LOCK:** "Layout preset" label uses consistent vertical rhythm (`space-y-4`) before the preset tile grid.

## Killed

- **KILL:** Stretching brand panel to match preview height — accidental `align-items: stretch` default; operators misread as coupled settings.
- **KILL:** Hiding or collapsing brand overrides per preset — no spec or PRD requirement; would hide WCAG accent warning and hero upload.

## Cracks that held (monitor)

- Tall immersive preview can still push page scroll — acceptable; optional P1 is preview `max-h` + internal scroll.
- Operators may still wonder *why* hero looks taller — mitigated by preset tile descriptions, not by resizing brand UI.

## Handoff

Implementation: `web/components/activities/activity-design-tab.tsx` — grid `lg:items-start`, brand card `self-start`, preset section spacing.
