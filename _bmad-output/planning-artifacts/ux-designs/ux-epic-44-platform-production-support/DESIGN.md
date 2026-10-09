---
status: final
updated: 2026-10-08
altitude: epic
inherits:
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-spec-43-4-platform-administration.md
---

# DESIGN.md — Epic 44 Platform Production Support

## Brand & Style

No new brand. Platform remains the sparse staff console: ink header, gold wash, Midnight Atelier semantics via `--plat-*` aliases (Story 43.4). Do not invent a third palette. Do not flatten `--plat-*` class names.

## Colors

Use existing tokens only:

- Surface: `{color.plat.paper}` ← `--plat-paper` / `--paper`
- Ink header: `--plat-ink` with `--plat-header-muted` (`#8B939C`) — never `--text-muted` on ink
- Accent wash: `--plat-gold-soft`
- Danger: `--plat-danger` / `--plat-danger-bg`
- Status: banners/badges not color-only (NFR-12)

## Typography

`--font-plat-display` Fraunces; `--font-plat-body` Jakarta. Unchanged.

## Layout & Spacing

`max-w-5xl` platform main (`web/app/(platform)/layout.tsx`). New pages stay in that shell. Do not switch to tenant `AdminSidebar` width.

## Elevation & Depth

No new elevation system. Degraded banner is a semantic alert, not a dashboard card wall.

## Shapes

Existing `rounded-sm` platform controls. No decorative charts.

## Components

Reuse: `PlatformHeader`, `PlatformDataTable`, omni-search, AlertDialog, skip-link. Add: provenance KPI tile (source + freshness + observedAt visible), Operations in-page section nav, degraded directory banner.

## Do's and Don'ts

- Do inherit 43.4 focus rings on ink.
- Don't add `AdminRouteTransition` or Cinema.
- Don't display fake live metrics or spark-lines without a source.
