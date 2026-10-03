---
id: 40.1
key: 40-1-dashboard-relationship-command-center
title: Dashboard as relationship command center
status: done
epic: 40
created: 2026-10-03
baseline_commit: 2350bdbd46003bea215a7eaa26bcb1f49c1d98f6
accepted_commit: 4961dde68844c1b96702a90767dcf1d38e3bbb36
implementation_merge_sha: e269afc69a6661bfb653df17212dfbe2260d0f19
---

# Story 40.1: Dashboard as relationship command center

Status: done (ACCEPTED/CLOSED)

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a tenant operator,
I want Dashboard to lead with what needs attention and today’s work, with URL-addressable views,
so that I start Monday in a command center instead of a widget pile, and shared/history URLs open the same view.

## Scope delta vs the execution prompt

Canonical backlog §40.1, DESIGN.md **D18 / D19 / §3.5**, and Stories 39.1 + 39.4 are authoritative.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Invent a new Dashboard API | **No.** Existing metrics, clients, intelligence, activities, and communities APIs are sufficient. |
| Implement `/ai` room content | **Forbidden.** 41.2. |
| Move AI-generation logic | **Forbidden.** |
| Hide supporting metrics | **Forbidden.** Reposition only. |
| `?view=` as a path segment | **Forbidden.** Query only. |
| Start Story 40.2 | **Forbidden.** Link to `/follow-up`; do not build the Follow-up room. |
| Weaken 39.4 44px assertion | **Forbidden.** |
| Start Epic 41 | **Forbidden.** |

**In scope:**

1. Hierarchy: Needs attention (section) → Needs follow-up (links to `/follow-up`) → today/current work → supporting metrics and activity performance.
2. Document h1 remains exactly `Dashboard`. Greeting remains supporting `<p>` copy.
3. URL views: `?view=overview|graphs|table`. Default may omit the parameter. Query overrides stored preference. Preference only when `view` is absent. Invalid → overview.
4. History and shared URLs restore/open the requested view. Query-only changes do not trigger Epic 37 pathname enter.
5. Honest loading / populated / empty / error per view. Widget failure must not render “all caught up.”
6. 390 stacked, no page overflow, no graph min-width trap. 1440 restrained two-column. View controls ≥44×44.
7. One `main#main-content`, one h1, skip link, named view selector with selected state exposed.

**Out of scope:** 40.2 Follow-up room, 41.2 AI room, nav/entitlement/API/Paddle/schema changes, `loading.tsx`, production deploy.

## Acceptance Criteria

1. `/dashboard` h1 is exactly `Dashboard`. Greeting is supporting copy, not h1/h2.
2. Overview hierarchy is Needs attention → Needs follow-up → today/work → supporting metrics. “Needs attention” is a section, not a room.
3. Needs follow-up primary action goes to `/follow-up`.
4. `?view=overview` (or omitted) / `graphs` / `table` resolve correctly. Invalid view → overview. Query beats stored preference. Preference applies only when query is absent.
5. Overview → Graphs → browser Back restores Overview. Direct `?view=table` opens Table. Query-only view change does not replay pathname route-enter.
6. Each view has loading, populated, empty, and error. Brief/queue failure is not “all caught up.”
7. Onboarding, plan, role, and partial-data behavior remain. Metrics stay visible as supporting information when data exists.
8. 390: stacked, no horizontal overflow, readable labels, view controls ≥44×44. 1440: optional two-column, no nested-card theater.
9. One main, one h1, skip link works, view selector is tabs (or equivalent) with programmatic selected state, keyboard works, status not color-only.
10. Protected 38.4–38.6 and 39.1–39.5 plus Epic 37 pathname-only motion. No 40.2. No production claim.

## Architecture

See `_bmad-output/planning-artifacts/evidence/px2-40-1/architecture.md`.

## Readiness

See `_bmad-output/planning-artifacts/evidence/px2-40-1/readiness.md`.

## Tasks / Subtasks

- [x] URL/preference resolver + Vitest lock (AC 4, 5)
- [x] View switcher tabs ≥44px; `table` not `tables` (AC 4, 8, 9)
- [x] Wire query + history on Dashboard without remounting data (AC 4, 5)
- [x] Command-center hierarchy, `/follow-up` link, honest widget errors (AC 1–3, 6, 7)
- [x] 390/1440 overflow and table min-width containment (AC 8)
- [x] Playwright 40.1 + protected regressions (AC 5, 8–10) — 39.4 43.999px residual remains classification D

## Dev Notes

Current Dashboard already has localStorage view mode (`overview|graphs|tables`) and a button group. It does **not** read `?view=`. Follow-up queue “View queue” still points at `/clients`. Queue fetch errors collapse to an empty success. Intelligence brief already uses the section title “Needs attention”.

Rename stored `tables` → `table` on read. Legacy `?view=tables` is invalid and resolves to overview.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 unused unless a later bounded visual is declared.

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/40-1-dashboard-relationship-command-center.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-40-1/architecture.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-1/readiness.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-1/po-correction-2026-10-03.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-1/checks.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-1/role-plan-state-matrix.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-1/viewports/`
- `web/app/(admin)/dashboard/page.tsx`
- `web/components/dashboard/dashboard-activity-performance-graph.tsx`
- `web/components/dashboard/dashboard-chart-card.tsx`
- `web/components/dashboard/dashboard-community-pulse.tsx`
- `web/components/dashboard/dashboard-follow-up-queue.tsx`
- `web/components/dashboard/dashboard-greeting-header.tsx`
- `web/components/dashboard/dashboard-lead-status-chart.tsx`
- `web/components/dashboard/dashboard-metrics-graphs.tsx`
- `web/components/dashboard/dashboard-metrics-table.tsx`
- `web/components/dashboard/dashboard-page-client.tsx`
- `web/components/dashboard/dashboard-page-fallback.tsx`
- `web/components/dashboard/dashboard-registrations-trend-chart.tsx`
- `web/components/dashboard/dashboard-today-strip.tsx`
- `web/components/dashboard/dashboard-view-switcher.tsx`
- `web/e2e/dashboard-40-1.spec.ts`
- `web/lib/admin-route-motion.test.ts`
- `web/lib/dashboard-view-mode.ts`
- `web/lib/dashboard-view-mode.test.ts`

### Change Log

- 2026-10-03: Created Story 40.1 from main `2350bdbd` (Epic 39 close). Canonical D18/D19. Story 40.2 not started.
- 2026-10-03: Implementation revision — query views, command-center hierarchy, honest follow-up errors. QA pending.
- 2026-10-03: History pin for query-less Back; Playwright 40.1 4/4; protected 38.5–39.5 green except known 39.4 43.999px residual.
- 2026-10-03: Review patch — same-view no-op, live-search pin, loading tabpanel, follow-up empty-error fallback, Today chip → `/follow-up`. 38.4 tokens/a11y green.
- 2026-10-03: Independent reviews on `580ea29e` — no remaining BLOCKER/MAJOR. Tracker → review. Not done. Not merged.
- 2026-10-03: PO correction — retarget PR #367 to `main`; active-view re-selection is a true no-op (no history, URL, preference write, or event).
- 2026-10-03: Move Suspense fallback to a client module so production prerender can pass an inert view switcher.
- 2026-10-03: PO-correction review on `4961dde6` — no remaining in-scope BLOCKER/MAJOR. Rapid-double-click stale `viewMode` stays deferred.
- 2026-10-03: PR #367 merged as `e269afc6` (accepted implementation `4961dde6`). Required main CI `37133892588` 5/5 success. Post-merge: view-mode Vitest 9/9; Playwright 40.1 5/5 plus 38.5/38.6/39.1/39.2/39.5. 39.4 43.999px classified D; assertion not weakened. ACCEPTED/CLOSED. Epic 40 remains in-progress. Story 40.2 not started.
