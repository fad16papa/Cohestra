# Story 41.1 accessibility findings

## Hierarchy

- One `main#main-content`
- One document `h1`: Analytics (loading, populated, empty, error, denied, Basic lock)
- Filters `h2`
- Chart panels `h3` (Top activities, Community ranking, Follow-up pipeline, Lead growth)

## Charts

- Daily trend: semantic `sr-only` table (`Date`, `Registrations`, `New clients`)
- Rankings / follow-up / lead growth: visible lists and `dl` with names and counts (not color-only)
- Chart grids: `md:grid-cols-2` so they stack below 768px

## Controls

- Filter selects/inputs/chips: `min-h-11`
- Export CSV: `min-h-11` + `aria-describedby` when disabled
- Disabled reasons are visible text
- Stale copy is `aria-live="polite"` (not `role="alert"`)
- Recoverable error uses `ProductErrorState` (`role="alert"` once) + Try again
- 403 uses denied copy, never UpgradePanel
- Focus rings remain Story 38.4 opaque `ring-ring` tokens

## Axe

Populated Analytics and dark Analytics (appearance menu closed): no serious/critical `color-contrast`, `landmark-one-main`, `page-has-heading-one`, or table-semantics violations.

A first dark scan hit a serious contrast finding on the still-open appearance radio (`bg-primary` / `text-primary-foreground`). That is the shell theme menu, not Analytics content. The spec now closes the menu before scanning.
