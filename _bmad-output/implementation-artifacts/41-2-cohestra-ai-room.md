---
id: 41.2
key: 41-2-cohestra-ai-room
title: Cohestra AI room
status: review
epic: 41
created: 2026-10-04
baseline_commit: bb420f89446ef78445fbdd4f655b6752cfd7d713
---

# Story 41.2: Cohestra AI room

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a TenantAdmin or TenantMember,
I want the existing intelligence brief presented as the canonical Cohestra AI room,
so that Cinema, nav, and `/ai` agree, Dashboard keeps Needs attention, and every insight stays grounded, actionable, and safe.

## User problem and evidence

Cinema and nav say **Cohestra AI**. Production still shows a Dashboard panel named Needs attention. `/ai` is a CanonicalRoomStub that says the brief ships later. Evidence: backlog §41.2, D1, D15, IA §4.9, Stories 39.1 / 39.4 / 40.1 / 40.5 / 41.1, `DashboardIntelligenceBrief`.

## Current API and frontend inventory

See `_bmad-output/planning-artifacts/evidence/px2-41-2/inventory.md`.

Authoritative surfaces:

- `GET /api/v1/admin/intelligence/brief`
- Fields: `generatedAt`, `timeZoneId`, `mode`, `insights[]`, `insufficientData`
- Insight: `id`, `kind`, `priority`, `title`, `whyItMatters`, optional `whatChanged`, `evidence[]`, one `recommendedAction`
- Composer modes: `deterministic` (default) and `synthesized` only after `Intelligence:SynthesisEnabled` + API key + successful guarded wording
- Frontend: `web/lib/intelligence-api.ts`, `DashboardIntelligenceBrief`
- Route `/ai` → stub; `/intelligence` and `/needs-attention` → `destinationWithSearch(AI_PATH, searchParams)`

## Roles, plans, routes, and states

See `role-plan-state-matrix.md` and `mode-state-matrix.md`. TenantOperator (Admin + Member). Room is unlocked on every recognized plan. Missing/unknown plan stays conservative. 403 is denied, never UpgradePanel. No new plan lock.

## Architecture decision

**Replace the `/ai` stub with the existing brief.** Reuse `GET /api/v1/admin/intelligence/brief`, the typed parser, PageHeader, ProductErrorState, and shared insight presentation extracted from the Dashboard panel. Dashboard keeps the section name Needs attention and a compact summary that links to `/ai`.

Rejected: new intelligence endpoint; new KPIs or scoring; free-form chat; enabling synthesis by default; module-global brief cache; renaming the room to AI / Copilot / Assistant / Needs attention; moving generation into the browser.

Fetch architecture: Dashboard and `/ai` fetch independently. They do not mount on the same route. No module-global cache. Freshness and tenant boundaries stay request-scoped.

Unsafe recommended-action hrefs are neutralized (`href: null`) and rendered as a non-clickable unavailable action. They do not discard the rest of the brief.

## Explicit non-goals

Story 41.3, chat, autonomous writes, bulk follow-up, new endpoint/schema/KPI, opportunity scoring, Follow-up category changes, synthesis-on-by-default, new AI provider, production API keys, Analytics/Dashboard/cinema redesign, billing/plan/checkout/role changes, migrations, production fixtures, DigitalOcean, production claim.

## Acceptance Criteria

1. `/ai` has exactly one `main#main-content` and one document `h1` named Cohestra AI.
2. `/intelligence` and `/needs-attention` compatibility-redirect to `/ai` and keep safe query parameters.
3. Dashboard section remains Needs attention and links to `/ai`. Views are not merged.
4. Deterministic, synthesized, insufficient-data, error, denied, malformed, and unavailable-action states are distinct and truthful.
5. Synthesis stays off by default. Provider failure falls back to deterministic facts. Unknown mode never claims synthesis.
6. Every populated insight shows what, why, evidence, source mode, and exactly one next action (or a named unavailable action).
7. Unsafe action/evidence hrefs are rejected or non-clickable. Safe actions land on existing authorized routes.
8. 390–1440: no overflow, readable first fold, actions ≥44px, no dock/FAB overlap.
9. Insights are semantic; evidence is a named list; no color-only mode/priority; no serious/critical Axe landmark/heading/link-name/list/contrast violations.
10. Report values, tenant isolation, and Stories 34 / 38–41.1 stay intact. Story 41.3 is not started.

## Responsive / accessibility / security

See evidence contract. Focus rings stay Story 38.4 opaque tokens. Forced colors and dark mode remain perceivable. Reduced motion uses existing tokens. No continuous “AI thinking” animation.

## Protected Story 34 and Epic 38–41.1 contracts

34.1 deterministic brief API, 34.2 Dashboard brief, 34.3 synthesis fallback, 38.4–38.6, 39.1–39.5, 40.1–40.5, 41.1 Analytics. Do not reopen them.

## Automated and visual QA

Affected + full Vitest, `tsc`, Next production build, targeted ESLint, intelligence service/composer/guard units, intelligence + isolation integration, Story 41.2 Playwright + protected 34 / 38–41.1. Evidence under `px2-41-2/`.

## Rollout risks

Duplicate Dashboard vs `/ai` fetch (accepted: independent, no shared cache). Tightening `isSafeAdminHref` must still accept `/reports` (existing wow action; compatibility → Analytics). Changing parse fail-closed on unsafe actions would hide a valid brief.

## Exact stop gate

Story 41.2 `review`. Epic 41 `in-progress`. 41.1 remains `done`. 41.3 not started. One draft unmerged PR. Production not claimed.

## Tasks / Subtasks

- [x] Inventory and contracts recorded
- [x] Shared typed insight presentation + allowlisted hrefs
- [x] `/ai` room states + Dashboard Needs attention preserved
- [x] Unit + Playwright 41.2 + protected 34 / 38–41.1

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 unused.

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-41-2/test-results.md` and `review.md`.

### Completion Notes List

- Existing intelligence brief is the Cohestra AI room. No new backend, KPIs, chat, or provider.
- Dashboard section remains Needs attention and links to `/ai`.
- Story 41.2 is `review`. Epic 41 stays `in-progress`. Story 41.1 remains done. Story 41.3 was not started.
- Production is not claimed.

### File List

- `_bmad-output/implementation-artifacts/41-2-cohestra-ai-room.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-41-2/**`
- `web/app/(admin)/ai/page.tsx`
- `web/components/dashboard/dashboard-intelligence-brief.tsx`
- `web/components/intelligence/cohestra-ai-page-client.tsx`
- `web/components/intelligence/intelligence-insight-card.tsx`
- `web/e2e/ai-41-2.spec.ts`
- `web/lib/intelligence-api.ts`
- `web/lib/intelligence-api.test.ts`

### Change Log

- 2026-10-04: Created Story 41.2 from main `bb420f89`. Epic 41 in-progress. Story 41.1 remains done. Story 41.3 not started.
- 2026-10-04: Implementation + QA + four-layer review. Tracker moved to `review`. Draft PR #379.
