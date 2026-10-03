---
id: 40.2
key: 40-2-follow-up-primary-room
title: Follow-up primary room
status: ready-for-dev
epic: 40
created: 2026-10-03
baseline_commit: dc9e42f6f283c72b0be290768730bfcbe88b58b4
---

# Story 40.2: Follow-up primary room

Status: ready-for-dev

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a TenantAdmin or TenantMember on any plan,
I want `/follow-up` to be Cohestra’s primary Follow-up room with Due now, At risk, Opportunity, and Healthy,
so that Dashboard “View all” lands in a working list, Opportunity has a home that is not a sales room, and I can open a truthful client profile without a second queue.

## Scope delta vs the execution prompt

Canonical backlog §40.2, DESIGN.md **D2 / D16**, content-language §4, IA §4.6, and Stories 39.1 + 40.1 are authoritative.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Invent a Follow-up API | **No.** Existing `GET /api/v1/admin/clients` + shared client-side resolver. |
| Import cinema 6/7/4/17, 72h, 21d, notes/referral predicates | **Forbidden.** |
| Create `/opportunities` | **Forbidden.** |
| Opportunity as a sales stage or activity type | **Forbidden.** |
| Dual-write follow-up state / second queue | **Forbidden.** |
| New plan lock or entitlement | **Forbidden.** |
| Rewrite follow-up-date schemas | **Forbidden.** |
| Change client lead-status semantics | **Forbidden.** |
| Start Story 40.3 / 40.4 / 40.5 / Epic 41 | **Forbidden.** |
| Fix deferred 40.1 items or weaken 39.4 44px | **Forbidden.** |
| Claim production deployment | **Forbidden.** |
| URL category filters | **Yes** — existing Cohestra list/view pattern. Rules locked below. No localStorage. |

**In scope:**

1. Replace the Epic 39 `CanonicalRoomStub` on `/follow-up` with the primary Follow-up room.
2. Shared `PageHeader`, exactly one `main#main-content`, exactly one document h1 `Follow-up`, existing skip-link contract.
3. Accessible category filters: Due now, At risk, Opportunity, Healthy.
4. Results identify the client, show category in text, show only truthful follow-up/outreach context, link to `/clients/{id}`.
5. Distinguish global empty, selected-filter empty, loading, recoverable fetch error, permission denial, populated.
6. Healthy is listable and excluded from needs-follow-up / needs-attention totals.
7. Dashboard 40.1 continuity: View all stays `/follow-up`; queue stays a concise preview; room owns the full list; dashboard `?view=` / preference / Epic 37 pathname rules unchanged.
8. Responsive cards / composition / table; 44px touch floor; mobile Follow-up current state; FAB/dock must not cover results.

**Out of scope:** 40.3 Clients redesign, 40.4 Activities, 40.5 continuity crumbs, `/opportunities`, automated messaging, cinema scoring, entitlement changes, deployment, credentials.

## Acceptance Criteria

1. `/follow-up` h1 is exactly `Follow-up`. One `main#main-content`. Skip link still targets `#main-content`. No nested `main` or competing h1.
2. The stub is replaced honestly. Loading, error, empty, and populated are distinct. A fetch error never renders “No one needs follow-up.” or any success-like empty. Retry is a named action when recovery is possible.
3. Category filters exist for **Due now**, **At risk**, **Opportunity**, **Healthy**. Names are visible text. Selected state is not color-only. Controls are at least 44×44 on touch viewports. Full labels remain readable at 390px (scroll OK, clip not OK).
4. Category derivation uses the locked contract in `evidence/px2-40-2/category-derivation.md`. No cinema predicates, numeric windows, or persisted scores. Filtering never writes client data.
5. Healthy is listable. Needs-follow-up / needs-attention totals exclude Healthy.
6. Each result identifies the client, shows the category in text, shows only truthful available follow-up/outreach context, and links to `/clients/{id}`. No implied sent message. No automated outreach.
7. TenantAdmin and TenantMember on Basic, Core, Pro, and Enterprise can open the room. Members may open permitted client profiles. Members do not gain workspace-setting or admin privileges. Server authorization remains authoritative. No new plan lock.
8. Dashboard “View all” / “Open Follow-up” still open `/follow-up`. Dashboard Needs follow-up remains a 5-row preview. `/follow-up` owns the full working list. Dashboard `?view=` / preference / true no-op / Epic 37 pathname-only motion are unchanged.
9. Below 768px: readable cards. 768–1023px: responsive list/card composition without horizontal page overflow. ≥1024px: table presentation is allowed. Category controls and actionable rows meet the 44px floor. Calendar FAB and mobile dock do not cover results. Mobile and desktop nav still mark Follow-up current.
10. Keyboard users can reach every filter and result. Focus uses the opaque Story 38.4 ring. Filter/list transitions use Epic 37 `motion-local` 160ms or become instant under reduced motion. No new motion tokens.
11. Protected 38.4–39.5 and 40.1 remain intact. No 40.3. No production claim.

## Architecture

See `_bmad-output/planning-artifacts/evidence/px2-40-2/architecture.md`.

Selected data contract: existing `fetchClients` (paginate `pageSize=100`) + shared client-side resolver `resolveFollowUpCategory` over `nextFollowUpAt`, `lastOutreachAt`, and `leadStatus`. No new API.

Rejected alternatives, category derivation, URL rules, and ownership are recorded in evidence before implementation.

## Readiness

See `_bmad-output/planning-artifacts/evidence/px2-40-2/readiness.md`. Disposition: **READY**.

## Tasks / Subtasks

- [ ] Shared category resolver + Vitest (AC 4, 5)
- [ ] URL category resolver (query > default Due now; invalid → Due now; no localStorage; replace; re-select no-op) (AC 3)
- [ ] Replace `/follow-up` stub with PageHeader room, filters, honest states (AC 1–3, 6)
- [ ] Cards <768, composition 768–1023, table ≥1024; 44px; no overflow (AC 9)
- [ ] Dashboard continuity unchanged (AC 8)
- [ ] Playwright 40.2 + protected 38.4–39.5 and 40.1 regressions (AC 7, 10, 11)

## Dev Notes

### Current state (must read before coding)

- `web/app/(admin)/follow-up/page.tsx` is still `CanonicalRoomStub` (“Follow-up queue comes next”). Keep unmatched `[...unmatched]` → `InvokeNotFound`.
- Dashboard queue (`dashboard-follow-up-queue.tsx`) already links to `/follow-up` and fetches `followUpDue` + `leadStatus=new&withoutOutreach` for a 5-row preview. Do not change that data contract in 40.2.
- `ClientFollowUpPanel` is unused. Do not revive it as a competing model. Reuse queue/profile concepts: name, category text, next follow-up date, last outreach caption, `/clients/{id}`.
- Production has **no** category helper. Cinema `getTriageBucket` in `web/lib/marketing/marketing-demo-club.ts` is **not** importable.
- `GET /api/v1/admin/clients` is `[Authorize(Policy = TenantOperator)]` — Admin and Member. Follow-up nav is `ALWAYS_UNLOCKED`.
- Reuse: `PageHeader`, `ListSkeleton`, `ProductEmptyState`, `ProductErrorState`, `PersonAvatar`, `formatNextFollowUpDate`, `formatLastOutreachCaption`, `formatLastActivityCaption`, `isFollowUpDue`, `useAuth().authFetch`, `useTenantShell().registrationTimeZoneId`.
- Do not reuse `ClientRow` wholesale — it includes Mark contacted / WhatsApp / Viber actions that would imply outreach from this room.

### Data contract (locked)

1. Fetch the tenant client list through existing `fetchClients`, paging at `pageSize=100` until exhausted.
2. Derive one presentation category per client with `resolveFollowUpCategory` (see category-derivation evidence).
3. Filter in memory. Never PATCH lead status, next follow-up, or outreach from this room.
4. Needs-attention count = Due now + At risk + Opportunity. Healthy excluded.
5. No second queue. Dashboard preview stays on its existing two queries.

### URL category (locked — existing list/view pattern, not a new invention)

| `category` query | Resolved filter |
| --- | --- |
| absent (`null` or `""`) | `due-now` |
| `due-now` / `at-risk` / `opportunity` / `healthy` | that category |
| any other string | `due-now` |

- Query is the only source. **No localStorage.** Dashboard view preference must not be read or written here.
- Chip change: `router.replace` with other query keys preserved. `due-now` may be omitted from the serialized URL (same as dashboard `overview`).
- Re-selecting the already resolved category is a **true no-op** (no history, no URL write).
- Refresh keeps the query. Back from `/clients/{id}` returns to the same `/follow-up` URL.
- Invalid values do not 404; they resolve to Due now.

### Copy

| State | Copy |
| --- | --- |
| Global empty (needs-attention count is 0) | h2 **No one needs follow-up.** Supporting: people may still exist under Healthy. |
| Selected-filter empty (needs-attention > 0, selected category 0) | **No one in {Category}.** Supporting: this filter does not change client records. |
| Loading | Named busy region; keep h1 Follow-up |
| Recoverable fetch error | **Could not load Follow-up.** What happened / list unchanged / **Try again**. Never empty-success. |
| Permission denial (401/403) | **You don’t have access to Follow-up.** No fake empty. |

### Responsive / a11y / motion

- Filters: `role="radiogroup"` `aria-label="Follow-up category"`; each control `role="radio"` with `aria-checked` and visible label.
- Results: category name in text; client link accessible name includes the person (e.g. “Open {name}”).
- `<md` (768): cards. `md`–`lg`: stacked/responsive composition, no `min-w` page trap. `lg` (1024)+ : table allowed.
- `min-h-11 min-w-11` on filters and row links.
- `motion-local` on filter/list chrome; `motion-reduce` already zeros it in `globals.css`.
- Main already has mobile `pb-[calc(5.5rem+env(safe-area-inset-bottom))]`. Calendar FAB is `hidden md:block`. Do not reduce that padding.

### Testing

- Unit: category derivation, Healthy exclusion, URL parse/serialize/no-op, empty-state classification.
- Playwright: dashboard widget → room → profile; category filter; global vs filter empty; fetch failure + retry; TenantAdmin; TenantMember; 390 readable chips/cards no overflow; 1024/1440 table; keyboard/focus; reduced motion; one main/h1/skip; mobile+desktop nav current.
- Tenant isolation: existing clients API remains tenant-scoped; do not add a cross-tenant fetch. Playwright/isolation coverage may reuse 38.3 patterns if a live second tenant is available; otherwise document the server-authoritative boundary in evidence.
- Run affected unit tests, full Vitest, `npx tsc --noEmit`, production Next build, targeted ESLint, Story 40.2 Playwright, regressions 38.4–39.5 and 40.1.
- If server behavior does **not** change, skip new .NET tests. If a server extension is later proven necessary, add .NET unit/integration then — that is not the selected contract.
- Do not weaken assertions, inflate timeouts, or add skips to go green. Classify unrelated/flaky failures under the Mandatory Code Review Loop (39.4 43.999px remains D; DigitalOcean empty SSH remains C; ClientDedup phone-hex remains pre-existing flake).

### Project Structure Notes

- New: `web/lib/follow-up-category.ts` + `.test.ts` (resolver + URL helpers).
- New: `web/components/follow-up/*` room client, filters, results, states.
- Update: `web/app/(admin)/follow-up/page.tsx` only — replace stub, keep Suspense if `useSearchParams` is used.
- New: `web/e2e/follow-up-40-2.spec.ts`.
- Evidence: `_bmad-output/planning-artifacts/evidence/px2-40-2/`.
- Do not edit `marketing-demo-club.ts`, dashboard view-mode, entitlements, or deployment files.

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §40.2]
- [Source: `_bmad-output/planning-artifacts/cohestra-content-language.md` §4]
- [Source: `_bmad-output/planning-artifacts/cohestra-information-architecture.md` §4.6 / D2 / D16]
- [Source: `_bmad-output/implementation-artifacts/40-1-dashboard-relationship-command-center.md`]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Previous story intelligence

- 40.1 taught: honest widget errors; query-only views must not remount pathname motion; selected-control re-click is a true no-op; production Next prerender cannot pass server event props into client children — keep Follow-up page thin and put interactivity in a client module.
- 39.4: room h1 stays on loading/empty/error. 44px assertion is classification D — do not weaken.
- 39.1: `/follow-up` stub is the feature owner for this story. Keep rail/tab wiring.

## Git intelligence

Baseline `main` `dc9e42f6` (40.1 docs close). Accepted 40.1 implementation `4961dde6` / merge `e269afc6`. `/follow-up` is still a stub on that HEAD.

## Latest tech information

Next.js 16.3 App Router + React 19. `useSearchParams` must stay inside a client child wrapped by `Suspense`. No new dependencies.

## Project context

Cohestra multi-tenant events + lead-gen. Server authorization is authoritative. Tenant isolation is non-negotiable. Do not modify deployment infrastructure or credentials.

## Dev Agent Record

### Agent Model Used

Grok 4.6 owns story definition, architecture, product semantics, implementation, testing, triage, and reporting. Composer 2.5 unused unless a later bounded mechanical task is explicitly declared. Auto mode disabled.

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/40-2-follow-up-primary-room.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-40-2/inventory.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-2/architecture.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-2/readiness.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-2/category-derivation.md`
- `_bmad-output/planning-artifacts/evidence/px2-40-2/role-plan-state-matrix.md`

### Change Log

- 2026-10-03: Created Story 40.2 from main `dc9e42f6`. Inventory and data-contract locked. Readiness READY. Implementation not started.
