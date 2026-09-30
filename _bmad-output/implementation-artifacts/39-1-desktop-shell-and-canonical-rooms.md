---
id: 39.1
key: 39-1-desktop-shell-and-canonical-rooms
title: Desktop shell and canonical rooms
status: in-progress
epic: 39
created: 2026-09-30
baseline_commit: cde63ba4b13ee6884c7bb73939715f8e785de363
readiness: ready
---

# Story 39.1: Desktop shell and canonical rooms

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a tenant operator on desktop,
I want the rail, labels, and routes to match the product cinema (Follow-up, Analytics, Cohestra AI, Website Studio),
so that bookmarks, breadcrumbs, and footer destinations land on the rooms marketing already taught.

## Scope delta vs the execution prompt

Canonical backlog §39.1 and DESIGN.md **D1 / D14 / D15 / §3.1** are authoritative.

| Prompt assumption | Canonical contract |
| --- | --- |
| Stub every new room including Analytics | **Follow-up** and **Cohestra AI** are stubs until Epics 40–41. **Analytics relocates the existing Reports UI** to `/analytics` so `/reports?preset=weekly` still shows the weekly report. Do not rebuild Analytics features. |
| Change mobile tab order | **No.** 39.2 owns tabs. More-sheet inherits shared `adminNavItems`. Do not add a Follow-up tab. |
| Entitlement lock glyphs | **39.3.** Keep current visibility. |
| Page-header / Website toolbar restyle | **39.4.** This story only changes the Website **breadcrumb** to Website Studio. |
| App Router `error.tsx` / `not-found.tsx` | **39.5.** |

**In scope:**

1. Desktop rail order and labels per DESIGN.md §3.1 (≥768).
2. Canonical routes `/follow-up`, `/analytics`, `/ai` (visible AI label **Cohestra AI**).
3. Compatibility redirects: `/reports` → `/analytics` (preserve query); `/intelligence` and `/needs-attention` → `/ai`.
4. Website breadcrumb **Website Studio**. Rail label stays **Website**.
5. Footer: Settings → `/settings/profile`, Team → `/settings/team`, Billing → `/settings/billing`. `/settings` compatibility-redirects to `/settings/profile`.
6. Honest empty / loading / error placeholders on Follow-up and Cohestra AI only.
7. Preserve one nav landmark, `aria-current`, one `h1`, skip-link, Epic 37 pathname-key motion.

## Acceptance Criteria

1. Desktop primary rail order is Dashboard, Clients, Activities, Follow-up, Analytics, Cohestra AI, Website, Campaigns. Labels match DESIGN.md §3.1.
2. `/follow-up`, `/analytics`, and `/ai` exist. Cohestra AI visible label is exactly **Cohestra AI**.
3. `/reports` (including `?preset=` and other queries) compatibility-redirects to `/analytics` with the same search string. No silent 404.
4. `/intelligence` and `/needs-attention` compatibility-redirect to `/ai`. Do not invent `/opportunities`.
5. Follow-up and Cohestra AI use `ProductEmptyState` (empty), a loading skeleton as Suspense fallback, and `ProductErrorState` available for the error presentation. They do not ship Epic 40–41 features.
6. Analytics room `h1` is **Analytics**. Existing report filters, presets, export, and Basic UpgradePanel still work at `/analytics`.
7. Website breadcrumb current crumb is **Website Studio**. Rail item remains **Website** → `/dashboard/website`.
8. TenantAdmin footer: Settings `/settings/profile`, Team `/settings/team`, Billing `/settings/billing` (Billing visibility unchanged). TenantMember footer: Settings `/settings/profile` only. `/settings` redirects to `/settings/profile` preserving query.
9. One `nav` landmark labelled admin navigation; current room has `aria-current="page"`. Dashboard is current only on `/dashboard`. Analytics is current on `/analytics` (and `/reports` hop). Cohestra AI current on `/ai`. Follow-up current on `/follow-up`.
10. Each new/relocated room has exactly one page-level `h1`. Skip link still targets `#main-content`.
11. Compact rail 768–1023 and expanded ≥1024 keep existing width tokens (`w-16` / `lg:w-60`). No extra nav motion beyond Epic 37 `motion-press` / pathname-key enter.
12. Command palette Navigate items follow the new hrefs and labels (Analytics keywords include reports).
13. Protected: no mobile tab IA (39.2), no entitlement hiding (39.3), no PageHeader redesign (39.4), no error/404 pages (39.5), no backend, no cinema restyle, no Epic 37 pathname-key change.

## Architecture (Grok-owned)

See `_bmad-output/planning-artifacts/evidence/px2-39-1/architecture.md`.

## Tasks / Subtasks

- [x] Canonical routes + redirects (AC 2–4, 8)
- [x] Desktop rail + active rules + breadcrumbs (AC 1, 7, 9)
- [x] Footer destinations + settings profile (AC 8)
- [x] Follow-up / AI stubs (AC 5, 10)
- [x] Relocate Reports UI to Analytics (AC 3, 6)
- [x] Tests + evidence (AC 9–13)

## Dev Notes

### Must preserve

- Reports filter/export/Basic lock behavior (new URL only)
- Epic 38.5 skip / one main / one h1
- Epic 38.6 overlay contract
- Epic 37 `adminRouteTransitionKey` pathname-only
- Mobile tab **order** (Home, Activities, Clients, More) — 39.2
- Website path `/dashboard/website`

### Testing

- Vitest: nav order, active rules, breadcrumb, redirect helpers, stub presentations
- Playwright desktop 1440 / 1024 / 768: rail labels, `aria-current`, `/reports?preset=weekly` → `/analytics?preset=weekly`, footer hrefs, skip + one h1
- Regression: landmarks-38-5 Analytics heading; overlay palette still works

### Previous story intelligence (38.6)

- Command palette is `ui/dialog`; update items via `adminNavItems`
- More sheet already uses `AdminNavLinks` + footer — href changes flow through
- Do not commit regenerated 38.4/38.5 viewport PNGs

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 not used unless a later bounded visual is declared.

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-09-30: Created Story 39.1 after Epic 38 close `cde63ba4`. Canonical D1/D14/D15 + backlog §39.1.
