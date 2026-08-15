# EXPERIENCE — Website Builder responsive

**Date:** 2026-08-15  
**Form factor:** Web responsive (admin dashboard)

## Breakpoints

| Range | Layout |
|-------|--------|
| `< lg` (<1024px) | Workspace toggle: **Edit** \| **Preview** |
| `≥ lg` | Two-column: editor rail (scrollable) + sticky live preview |

## Mobile workspace (< lg)

- **Edit:** Design / Sections / Templates tabs + all editor panels
- **Preview:** Live preview full width, `fillViewport` height, defaults to **Phone** device mode
- Toolbar: Save draft + Publish always labeled; secondary actions icon-first

## Desktop (≥ lg)

- Grid `0.92fr / 1.08fr` — aligned with activity Design tab
- Editor column: `max-h-[calc(100dvh-11rem)] overflow-y-auto`
- Preview: sticky `top-4`, progressive min-heights by breakpoint

## Section list (mobile)

- Section row stacks: title block then visible/actions row
- Drag handle + title remain on first row

## Accessibility

- Workspace toggle uses `role="tablist"` with `aria-selected`
- Toolbar icon buttons retain `sr-only` labels on mobile
