---
id: 40.5
key: 40-5-cross-module-continuity
title: Cross-module continuity
status: in-progress
epic: 40
created: 2026-10-04
baseline_commit: 479b181361357eb9d96909e99076eadab5d57524
---

# Story 40.5: Cross-module continuity

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a TenantAdmin or TenantMember on any plan,
I want Dashboard or Follow-up → Client → Registration → Activity to keep a truthful return path and breadcrumb,
so that refresh, Back/Forward, and mobile Back restore the originating work context without fabricating activity links or leaving the tenant.

## Scope delta vs the execution prompt

Canonical backlog §40.5, DESIGN.md D1 / D2 / D16, Stories 38.6 / 39.4 / 40.1–40.4, and the inventoried routes are authoritative.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Arbitrary `returnTo` string as the primary mechanism | **Rejected.** Typed `ctx` reconstructed by known href builders. |
| Fabricate Activity URL from `lastActivityName` | **Forbidden.** Follow-up list has no activity id. |
| Guess via search | **Forbidden.** |
| `sessionStorage` as the only return stack | **Forbidden.** |
| Module-global cache | **Forbidden.** |
| Blind `history.back()` | **Forbidden** when safe context is missing. |
| New rooms / `/opportunities` / tenant switcher | **Forbidden.** |
| Start Epic 41 or close Epic 40 | **Forbidden.** |
| Claim production | **Forbidden.** |

**In scope**

1. Typed continuity context in the URL (`ctx`) plus room-owned query persistence (Clients sort/page, Activities page, Activity `tab` write-through).
2. Compositional breadcrumb / mobile Back from that context.
3. Truthful Client registration → Activity link using existing `activityId`.
4. Command-palette and onboarding labels match canonical rooms.
5. Safe fallback when `ctx` is missing, invalid, or external.

**Out of scope:** Epic 41, `/opportunities`, scoring, entitlements, billing, Form Studio composition, Epics 35–39 reopen, production deploy.

## Acceptance Criteria

1. Follow-up Due now / At risk / Opportunity / Healthy → Client → Back restores the exact Follow-up category and page.
2. Clients filtered/sorted/paged list → Profile → Back restores the exact Clients query.
3. Dashboard `?view=graphs|table` → Client or Activity → Back restores that view.
4. Client registration history links to `/activities/{activityId}` only when the DTO provides a real activity id. No name-derived URLs.
5. Hard refresh on Client or Activity keeps truthful crumbs/Back.
6. Browser Back/Forward restores the previous room and query. Query-only changes do not replay Epic 37 pathname enter motion.
7. Invalid, absolute, protocol-relative, encoded-external, JavaScript/data, malformed, or oversized return values fall back to the canonical parent and never leave the app or tenant host.
8. Continuity never authorizes a route, entitlement, or foreign tenant row.
9. Desktop/tablet: semantic `<nav aria-label="Breadcrumb">` with list semantics, named links, `aria-current="page"` on the current crumb. One `main#main-content`, one document `h1`.
10. 390px: one meaningful Back control, ≥44×44, no horizontal overflow. Label names the destination when known.
11. Command palette primary destinations: Follow-up `/follow-up`, Analytics `/analytics`, Cohestra AI `/ai`, Website `/dashboard/website`, Campaigns `/campaigns`, Clients `/clients`, Activities `/activities`. Story 38.6 overlay contract unchanged.
12. Form Studio unsaved draft is not destroyed by continuity query or tab write-through.
13. Protected 38.5–40.4 remain intact. No Epic 41. No production claim.

## Architecture

See `_bmad-output/planning-artifacts/evidence/px2-40-5/`.

Locked: typed `ctx` + room-owned query. Rejected: raw `returnTo`, storage-only stacks, name-guessed activity links.

## Readiness

See `_bmad-output/planning-artifacts/evidence/px2-40-5/readiness.md`. Disposition: **READY**.

## Tasks / Subtasks

- [x] Inventory and contracts recorded (AC: all)
- [x] Typed `ctx` parse/serialize/validate + unit tests (AC: 6, 7, 8)
- [x] Room query persistence: Clients sort/page, Activities page, Activity `tab` (AC: 2, 5, 12)
- [x] Journey hrefs carry `ctx`; registration uses real `activityId` (AC: 1–4)
- [x] Compositional breadcrumb / mobile Back (AC: 9, 10)
- [x] Palette + onboarding canonical rooms (AC: 11)
- [x] Playwright 40.5 + protected 38.5–40.4 (AC: 13)

## Dev Notes

### Current state

- Follow-up `category`/`page` already URL-authoritative. `followUpClientHref` is `/clients/{id}` with no return context.
- Clients filters are URL-authoritative. Sort/page parsers exist in `useClientsListFilters` but the list page keeps local state.
- Activities filters/sort are URL-authoritative. `page` is local. Detail `tab` is read from URL but tab clicks do not write it. Form Studio mode is React state; preview viewport is sessionStorage.
- Client registration history DTO already has `activityId` + `registrationId`. UI does not link.
- Follow-up list has `lastActivityName` only. Do not link that text.
- Dashboard `view` is URL-first; localStorage applies only when `view` is absent.
- Breadcrumbs are pathname-only (`getAdminBreadcrumbs`). No `returnTo`.
- Palette already uses canonical nav hrefs. Dashboard quick action still says “View reports”.
- `adminRouteTransitionKey` is pathname-only.

### Preserve

- Tenant host + JWT. No `X-Tenant-Id`.
- Story 38.6 palette trap/Escape/inert/restore.
- Epic 37 pathname-only motion.
- 40.1 `>= 44` assertions. Do not weaken.
- Opportunity is a Follow-up category. Needs attention stays a Dashboard section.

### Testing

- Unit: ctx parse/serialize, reject unsafe paths, breadcrumb/Back, palette labels, motion key.
- Playwright: journeys 1–14 from the execution prompt. Live stack. No skips for deterministic failures.

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §40.5]
- [Source: `_bmad-output/implementation-artifacts/40-2-follow-up-primary-room.md`]
- [Source: `_bmad-output/implementation-artifacts/40-3-clients-list-and-client-profile.md`]
- [Source: `_bmad-output/implementation-artifacts/40-4-activities-and-opportunities-as-category.md`]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Previous story intelligence

- 40.2: Follow-up category/page already in the URL; do not remount on query.
- 40.3: Clients filters in URL; sort/page persistence was deferred here. `activityId` exists on registration history.
- 40.4: Do not invent activity-source links from `lastActivityName`. Activities page stayed local.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 unused — no safe bounded presentational split after the contract was committed.

### Debug Log References

### Completion Notes List

- Typed `ctx` + room-owned query is the continuity mechanism. Composer 2.5 unused.
- Playwright 40.5 1/1. Full Vitest 605/605. `tsc` and Next production build pass.
- Protected 38.5–39.3, 39.5, 40.1–40.4 pass. 39.4 still fails only the pre-existing client-profile 768 clip.
- 390/430/767 show named mobile Back. 768/1024/1440 show semantic breadcrumbs.

### File List

- `web/lib/continuity-context.ts`
- `web/lib/continuity-context.test.ts`
- `web/components/layouts/admin-breadcrumbs.tsx`
- `web/components/layouts/admin-top-bar.tsx`
- `web/e2e/continuity-40-5.spec.ts`
- `_bmad-output/planning-artifacts/evidence/px2-40-5/`

### Change Log

- 2026-10-04: Created Story 40.5 from main `479b1813`. Inventory and contracts locked. Epic 40 remains in-progress. Epic 41 not started.
- 2026-10-04: Implemented typed continuity, QA evidence, and 390/430/767/768/1024/1440 proofs. Story remains in-progress pending four-layer review.
