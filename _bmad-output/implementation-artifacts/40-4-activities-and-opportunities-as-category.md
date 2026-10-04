---
id: 40.4
key: 40-4-activities-and-opportunities-as-category
title: Activities and opportunities-as-category
status: review
epic: 40
created: 2026-10-04
baseline_commit: 327c0a4ace6864d83307c7e907cec54f22d7965d
---

# Story 40.4: Activities and opportunities-as-category

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a TenantAdmin or TenantMember on any plan,
I want the default Activities list to show Draft and Published work before Archived, with a truthful activity name as `h1` and a shared destructive archive dialog,
so that I open an actionable activity instead of a read-only archived Form Studio, while Opportunity stays a Follow-up category and archived records remain discoverable.

## Scope delta vs the execution prompt

Canonical backlog §40.4, DESIGN.md **D2 / D16**, Stories 38.6 / 39.4 / 40.2 / 40.3, and the investigated Activities API are authoritative.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Client-only reorder of the current page | **Forbidden.** List is server-paged (`pageSize` 20 UI / 25 API default / 100 max). |
| Hard Draft-then-Published-then-Archived three-bucket sort | **Rejected.** Investigated contract has no Draft-before-Published partition. |
| Default filter that hides Archived | **Forbidden.** Archived stays on All statuses, last. |
| New `sortBy=status` query or reset endpoint | **Forbidden.** |
| New LastActivityId / source API field | **Forbidden.** Follow-up list has `lastActivityName` only. |
| Opportunity as Activities tab, filter, route, or stage | **Forbidden.** |
| Start Story 40.5 crumbs / URL page persistence | **Forbidden.** Page stays local React state. |
| Change Design/Form entitlements, composition, publish confirm | **Forbidden.** |
| Claim production | **Forbidden.** |

**In scope**

1. Server-authoritative default order: actionable (Draft + Published) first, Archived last, then requested sort, then unique `Id`.
2. Activities list presentation: honest empty / no-match / loading / error / denied / cap; 44px filters; no remount on query change.
3. Activity detail: populated `h1` = activity name; loading / denied / not-found / error keep page ownership (`Activity`) and one document `h1`.
4. Archive uses Story 38.6 `AlertDialog` for Draft and Published. No optimistic disappearance. Success updates local state without remounting the route.
5. Opportunity boundary: Follow-up remains the room. No fabricated source links.

**Out of scope:** Story 40.5, `/opportunities`, scoring, studio redesign, Website Studio, Campaigns, Dashboard/Follow-up/Clients IA, Epic 37 pathname motion, billing/plans/Paddle, production seed mutation.

## Acceptance Criteria

1. Default `GET /api/v1/admin/activities` (no `status` filter) never places an Archived row ahead of an available Draft or Published row on any page. Filtered Archived / Draft / Published views remain truthful.
2. Ordering is deterministic: requested primary sort, then unique activity `Id` ascending. Equal `UpdatedAt` / name / registration-count ties do not reshuffle across refresh or pages.
3. Existing filters (`status`, `search`, `community`, `category`, `sortBy`/`sortDirection`) still hit the server. Changing a filter resets local page to 1 and refetches even when already on page 1. No client-only reorder. No `key={searchParams}` remount.
4. `/activities` has one `main#main-content` and one document `h1` `Activities`. Shared `PageHeader`. Skip link unchanged. Empty, no-match, loading, error, denied, populated, and cap-warning states are distinct. No “all caught up” or similar success claim.
5. `/activities/{id}` populated `h1` equals the activity name. Loading, denied, not-found, and error keep `h1` `Activity`. Section headings begin at `h2`. Status is visible text, not color alone. One `main#main-content`.
6. Archive uses Story 38.6 `AlertDialog` (including Draft): accessible name and description, focus trap, Escape closes when allowed, Cancel/completion restore focus, destructive confirm is explicit. Failure keeps the record visible. Success updates status and list order without a full-page remount.
7. TenantAdmin and TenantMember keep existing `TenantOperator` permissions. Cap warning stays server-authoritative from tenant shell dials, not visible list length. Authorization failures are not converted into upgrade panels.
8. Opportunity is not an Activities tab, filter, route, or sales stage. Follow-up category rules from Story 40.2 are unchanged. Do not fabricate activity-source links from `lastActivityName`. Existing `/clients?activityId=` and `/clients/{id}` destinations stay tenant-scoped.
9. Form Studio remains editable for Draft/Published per the existing contract and read-only for Archived. Design tab, publish confirm, composition schema, and studio experiences are unchanged.
10. Protected 38.5, 38.6, 39.1–39.5, and 40.1–40.3 remain intact. No 40.5. No production claim.

## Architecture

See `_bmad-output/planning-artifacts/evidence/px2-40-4/`.

Locked decisions:

- Server status-group on unfiltered list: `Archived last`, then requested sort, then `Id`.
- Draft vs Published stay intermixed by the requested sort (default `updatedAt desc`).
- When `status` is set, no group key — requested sort + `Id` only.
- Remove Activities `key={searchParams}` remount; fix page-1 filter refetch.
- Archive dialog for Draft and Published. No new API/schema.
- No Follow-up source-link invention.

## Readiness

See `_bmad-output/planning-artifacts/evidence/px2-40-4/readiness.md`. Disposition: **READY**.

## Tasks / Subtasks

- [x] Inventory and evidence recorded (AC: all)
- [x] Server Archived-last + Id tie-break + unit tests (AC: 1, 2)
- [x] List remount removal, honest states, 44px filters (AC: 3, 4)
- [x] Detail heading / denied / not-found / error taxonomy (AC: 5)
- [x] Archive dialog for Draft + 38.6 contract (AC: 6)
- [x] Opportunity boundary + no fabricated source links (AC: 8)
- [x] Tests: unit, backend, Playwright 40.4, protected 38.5–40.3 (AC: 7, 9, 10)

## Dev Notes

### Current state (must read before coding)

- List API: `GET /api/v1/admin/activities` — server filter/sort/page. Default `updatedAt desc`. **No status group. No Id tie-break.** `ArchiveAsync` sets `UpdatedAt = UtcNow`, so Archived can lead page 1.
- UI: `activities-list-page.tsx` does **not** re-sort. `ACTIVITY_PAGE_SIZE = 20`. `web/app/(admin)/activities/page.tsx` remounts via `key={searchParams.toString()}`. That remount is why page-1 filter changes refetch; removing it without fixing the effect drops the refetch.
- Detail populated h1 is already the activity name. Loading/error share `h1` `Activity` and do not distinguish 404 vs 403.
- Archive dialog exists for Published only. Draft calls `performArchive()` immediately.
- Cap banner: `getActivitiesAtCapBannerState(shell)` from published/registrations dials.
- Form Studio: Archived read-only (`activity-form-tab.tsx`). Design tab disables when archived.
- Follow-up list: `lastActivityName` caption only. No `ActivityId`. Client registration history shows `activityName` as text, not a link.
- Opportunity lives only on Follow-up (`?category=opportunity`). No `/opportunities`.

### Data contract

Unfiltered list sort:

1. `Status == Archived ? 1 : 0`
2. requested primary (`updatedAt`/`createdAt`/`name`/`registrationCount`)
3. `Id` ascending

Filtered list (`status=draft|published|archived`): steps 2–3 only.

Do not add query params. Do not change page-size caps. Do not mutate production fixtures.

### Copy

| State | Copy |
| --- | --- |
| Global empty | Existing **No activities yet** |
| No-match | Existing **No activities match…** + Clear filters |
| Loading | Named skeleton; h1 **Activities** / **Activity** |
| Recoverable fetch error | **Could not load activities.** / **Could not load activity.** What happened / **Try again**. Never empty-success. |
| Denied (401/403) | **You don’t have access to Activities.** / **You don’t have access to this activity.** |
| Not found | **Activity not found.** |
| Cap | Existing named banner + Free a slot / Review published |

### Testing

- Backend unit: Archived cannot precede actionable rows; paging; ties; filtered Archived truthful; existing name/count/default tests stay green.
- Frontend unit: list-state classification; sort URL helpers unchanged; no Opportunity keys; archive dialog variants; no first-card assumption.
- Playwright: default order; Archived filter; filter page reset; detail h1; empty/no-match/error/denied/not-found/cap distinct; archive dialog trap/Escape/cancel/fail/success; member; 390/767/768/1024/1440 no overflow; 44px; Form Studio archived read-only; Opportunity absent; protected 38.5–40.3.
- Do not weaken assertions, inflate timeouts, or skip deterministic failures.

### Project Structure Notes

- Update: `ActivityService.ApplyListSort`, `ActivityServiceListSortTests`
- Update: `activities/page.tsx` remount, `activities-list-page.tsx`, `activity-detail-page-client.tsx`, `activity-publish-controls.tsx`, `archive-activity-dialog.tsx`, `activities-api.ts`
- New: `web/lib/activities-40-4-contract.ts` + tests; `web/e2e/activities-40-4.spec.ts`
- Evidence: `_bmad-output/planning-artifacts/evidence/px2-40-4/`
- Do not edit Follow-up category derivation, studio composition, billing, or 40.5 crumbs.

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §40.4]
- [Source: `docs/DESIGN.md` D2 / D16]
- [Source: `_bmad-output/implementation-artifacts/40-2-follow-up-primary-room.md`]
- [Source: `_bmad-output/implementation-artifacts/40-3-clients-list-and-client-profile.md`]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Previous story intelligence

- 40.2: paged lists must sort on the server with a unique tie-break; client-only reorder lies across pages.
- 40.3: remove `key={searchParams}` remount; keep URL filters; distinguish empty vs no-match vs error vs denied.
- 40.1: query-only changes must not remount pathname motion.
- 38.6: `AlertDialog` trap, Escape, restore, inert, reduced motion.

## Dev Agent Record

### Agent Model Used

Grok 4.6

### Debug Log References

### Completion Notes List

- Server unfiltered list: Archived last, requested sort, Id tie-break. Draft vs Published stay on the requested sort. No new API.
- Removed Activities `key={searchParams}` remount. Filter handlers reset page to 1 and refetch.
- List/detail distinguish empty, no-match, error, denied, not-found. Cap stays shell-dial authoritative.
- Archive dialog covers Draft and Published. Failure keeps the record.
- Opportunity stays on Follow-up. No fabricated source links. Composer 2.5 unused. Story 40.5 not started.

### File List

- `_bmad-output/implementation-artifacts/40-4-activities-and-opportunities-as-category.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-40-4/`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure.Tests/Activities/ActivityServiceListSortTests.cs`
- `web/app/(admin)/activities/page.tsx`
- `web/components/activities/activities-list-page.tsx`
- `web/components/activities/activity-card.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/components/activities/activity-publish-controls.tsx`
- `web/components/activities/activity-status-badge.tsx`
- `web/components/activities/archive-activity-dialog.tsx`
- `web/lib/activities-api.ts`
- `web/lib/activities-40-4-contract.ts`
- `web/lib/activities-40-4-contract.test.ts`
- `web/e2e/activities-40-4.spec.ts`

### Change Log

- 2026-10-04: Created Story 40.4 from main `327c0a4a`. Inventory and contracts locked. Story 40.5 not started.
- 2026-10-04: Implemented server Archived-last sort, list/detail honesty, Draft archive dialog. Tests recorded. Status `review`.
