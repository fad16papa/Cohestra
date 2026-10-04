---
id: 41.1
key: 41-1-analytics-room
title: Analytics room
status: review
epic: 41
created: 2026-10-04
baseline_commit: 6d9c6af8b1ad8dc26e1c8e95722476e50736c3f8
---

# Story 41.1: Analytics room

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a TenantAdmin or TenantMember,
I want the existing Reports product presented as the canonical Analytics room,
so that Cinema, nav, and `/analytics` agree, Basic weekly stays usable, advanced stays plan-gated, and charts/export remain truthful and accessible.

## User problem and evidence

Cinema and nav say **Analytics**. The product is the relocated Reports page at `/analytics` with `/reports` as a compatibility redirect. Dashboard Graphs is a second, unnamed analytics surface. Basic weekly works; monthly/custom/filters show the Core UpgradePanel. Evidence: backlog §41.1, D1, D14, PX2-IA-001, Stories 39.1 / 39.3 / 39.4.

## Current API and frontend inventory

See `_bmad-output/planning-artifacts/evidence/px2-41-1/inventory.md`.

Authoritative surfaces:

- `GET /api/v1/admin/reports` and `GET /api/v1/admin/reports/export`
- Query: `preset`, `from`, `to`, `activityId`, `community`, `leadStatus`, `referralSource`
- `web/lib/reports-api.ts` + `web/components/reports/**`
- Route `/analytics` → `ReportsPageClient`; `/reports` → `destinationWithSearch(ANALYTICS_PATH, searchParams)`
- Presets: weekly / monthly / custom. Frontend treats monthly as Basic-advanced (stricter than API). Do not change plan math.

## Roles, plans, routes, and states

See `role-plan-state-matrix.md`. TenantOperator (Admin + Member). Analytics nav is always unlocked. Missing/unknown plan must not assume Basic. 403 is denied, never UpgradePanel.

## Architecture decision

**Improve the existing Reports-derived Analytics page.** Reuse the reports API, URL parsers, PageHeader, UpgradePanel, and entitlement resolver. Do not add a second room, saved views, new KPIs, or a new backend.

Rejected: rewrite as placeholder tiles; invent metrics; merge Dashboard Graphs into Analytics; use sessionStorage as route identity.

## Explicit non-goals

Story 41.2, Story 41.3, saved views, new metrics/forecasts, backend/schema redesign, billing/entitlement changes, new roles, production seeders, Dashboard redesign, Form Studio / Website Studio, DigitalOcean, production claim.

## Acceptance Criteria

1. `/analytics` has exactly one `main#main-content` and one document `h1` named Analytics.
2. `/reports?preset=weekly` redirects to `/analytics?preset=weekly`. Other supported query keys survive.
3. Basic weekly is usable without UpgradePanel. Basic monthly/custom/filters show the existing Core lock. Core/Pro/Enterprise keep existing capabilities.
4. Dashboard Graphs remains `/dashboard?view=graphs` and has a clear Analytics cross-link. Views are not merged.
5. Supported filters stay URL-authoritative. Refresh and Back/Forward restore them. Query-only changes do not replay Epic 37 pathname motion.
6. Loading, populated, stale/updating, empty period, recoverable error with retry, permission denied, Basic advanced lock, export available / disabled-with-reason / failure are truthful.
7. Charts stack below 768px. No document overflow. Filters/actions ≥44×44 where applicable.
8. Charts have a textual equivalent and do not rely only on color. Semantic tables/lists. No serious/critical Axe landmark/heading/table/contrast violations.
9. Report and export stay tenant-scoped. Frontend plan UI is not authorization.
10. Protected 38.4–40.5 remain intact. Stories 41.2 and 41.3 are not started.

## Responsive / accessibility / security

See execution prompt. Focus rings stay Story 38.4 opaque tokens. Forced colors and dark mode remain perceivable.

## Protected Story 38–40 contracts

38.4 tokens, 38.5 landmarks, 38.6 overlays, 39.1–39.5 shell/nav/entitlements/header/errors, 40.1–40.5 rooms and continuity. Do not reopen them.

## Automated and visual QA

Affected + full Vitest, `tsc`, Next production build, targeted ESLint, report-service / export isolation tests if touched, Story 41.1 Playwright + protected 38.4–40.5. Evidence under `px2-41-1/`.

## Rollout risks

Losing query on `/reports` redirect. Changing entitlements because the path changed (must not). Treating monthly API-allowed Basic as a product unlock (must not — keep existing frontend Core lock).

## Exact stop gate

Story 41.1 `review`. Epic 41 `in-progress`. 41.2 / 41.3 not started. One draft unmerged PR. Production not claimed.

## Tasks / Subtasks

- [x] Inventory and contracts recorded
- [x] Truthful states: retry, denied, export-disabled reason, stale live region
- [x] Chart summaries + stack below 768 + 44px filters
- [x] Dashboard Graphs named Analytics cross-link
- [x] Unit + Playwright 41.1 + protected 38.4–40.5

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 unused.

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-41-1/test-results.md` and `review.md`.

### Completion Notes List

- Existing Reports page is the Analytics room. No new backend, KPIs, or saved views.
- `/reports` remains a query-preserving compatibility redirect.
- Story 41.1 is `review`. Epic 41 stays `in-progress`. 41.2 and 41.3 were not started.
- Production is not claimed.

### File List

- `_bmad-output/implementation-artifacts/41-1-analytics-room.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-41-1/**`
- `web/components/dashboard/dashboard-metrics-graphs.tsx`
- `web/components/reports/report-filter-bar.tsx`
- `web/components/reports/report-registrations-trend-chart.tsx`
- `web/components/reports/report-results.tsx`
- `web/components/reports/reports-page-client.tsx`
- `web/e2e/analytics-41-1.spec.ts`
- `web/lib/admin-route-motion.test.ts`
- `web/lib/report-filter-bar-history.test.ts`
- `web/lib/reports-api.ts`
- `web/lib/reports-api.test.ts`

### Change Log

- 2026-10-04: Created Story 41.1 from main `6d9c6af8`. Epic 41 in-progress. Stories 41.2 and 41.3 not started.
- 2026-10-04: Implementation + QA + four-layer review. Tracker moved to `review`. Draft PR #377.
