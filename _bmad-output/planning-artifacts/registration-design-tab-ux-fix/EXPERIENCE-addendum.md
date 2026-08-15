# EXPERIENCE addendum — Design tab layout/brand independence

**Parent:** `{planning_artifacts}/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md`  
**Status:** addendum  
**Date:** 2026-08-15

## Change summary

Clarifies Design tab behavior when operators switch layout presets. No new surfaces.

## Component pattern update — Design tab

### Layout preset section

- **Label:** "Layout preset" with `{spacing.md}` (16px) gap before tile grid.
- **Tiles:** Four presets; selection updates draft preset and live preview immediately.
- **Scope:** Preset controls **public page structure only** (hero prominence, form placement).

### Inherit community brand panel

- **Position:** Left column in brand + preview grid (unchanged).
- **Height:** **Content-driven** — must not stretch to match preview column height when immersive/compact presets change preview size.
- **Grid:** Parent uses `items-start`; brand card uses `self-start`.
- **Fields:** Inherit toggle, accent override, hero override — always shown (unchanged from Story 25.4).

### Live preview column

- **Position:** Right column; may grow taller for immersive preset.
- **Viewport toggle:** Mobile / Desktop (unchanged).
- **Independence:** Preview reflects combined `{preset + resolved brand}`; resizing preview must not reflow brand panel height.

## State pattern

| Event | Brand panel | Preview |
|-------|-------------|---------|
| Preset change | No layout/size change | Re-renders with new structure |
| Inherit toggle | Fields unchanged | Logo/accent/hero resolve changes |
| Accent/hero override | Inline validation (contrast) | Updates immediately |

## Accessibility

- Preset tiles remain keyboard-focusable buttons with selected state (`ring` + border).
- Brand panel height stability prevents focus target jump when switching presets.

## Acceptance check

1. Select Immersive Hero → brand card height stays same as Classic.
2. "Layout preset" label has visible gap above tile row.
3. Preview still updates for all four presets.
