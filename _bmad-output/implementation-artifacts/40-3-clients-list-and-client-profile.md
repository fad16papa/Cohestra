---
id: 40.3
key: 40-3-clients-list-and-client-profile
title: Clients list and client profile
status: in-progress
epic: 40
created: 2026-10-04
baseline_commit: 7e7c3c0773fe036a06338167e37f17e69708b9a2
---

# Story 40.3: Clients list and client profile

Status: ready-for-dev

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a TenantAdmin or TenantMember on any plan,
I want `/clients` and `/clients/{id}` to be a responsive, accessible relationship workspace,
so that I can read full status labels, use a valid table, open a due person in the Follow-up room, and keep existing search, export, campaign, and isolation behavior.

## Scope delta vs the execution prompt

Canonical backlog §40.3, Stories 38.6 / 39.4 / 40.2, and DESIGN.md D2 / D16 are authoritative.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| New Clients API | **Forbidden.** Preserve `GET /api/v1/admin/clients` semantics. |
| Persist Follow-up categories on the client | **Forbidden.** |
| `?clientId=` on `/follow-up` | **Forbidden.** CTA opens canonical `/follow-up` (Due now default). |
| Revive `ClientFollowUpPanel` | **Forbidden.** |
| Shared design-system table for Epic 41 | **Not required.** Clients owns a local semantic `<table>`. |
| Put sort/page in the URL | **Not in this story** (40.5). Remove remount-reset instead. |
| Change lead-status / merge algorithm | **Forbidden.** |
| Start 40.4 / 40.5 / Epic 41 | **Forbidden.** |
| Weaken 44px or Calendar FAB name (43.5) | **Forbidden.** |
| Claim production | **Forbidden.** |

**In scope**

1. Clients presentation + a11y. Same room, same API, same filters/export/campaign/merge-suspect.
2. Cards below 768px. Semantic HTML table at `md+`. No `min-w-[42rem]` page trap.
3. 44px chips with full labels (wrap or scroll, no clip).
4. Valid table semantics (no `role="row"` without table/grid).
5. Profile: person-name `h1`, 160ms expand, `Open in Follow-up` when Due now membership.
6. Messenger confirms stay on Story 38.6 `AlertDialog`.
7. Honest loading / empty / no-match / error / denied / populated.

**Out of scope:** 40.4 Activities, 40.5 crumbs, `/opportunities`, schema rewrite, automated messaging, billing math, deploy, Calendar FAB name.

## Acceptance Criteria

1. `/clients` has one `main#main-content` and one document `h1` `Clients`. Shared `PageHeader`. Skip link unchanged.
2. `/clients/{id}` populated `h1` equals the client name. Loading/error keep page ownership (`Client`). Missing optional fields stay `Not provided` / `No notes yet` or the existing accepted equivalent. Status is visible text, not color-only.
3. Search, lead-status, nationality, follow-up-due, merge-suspect, registered/created windows, activity filter, export, bulk select, and campaign handoff keep current API and entitlement behavior. URL filter keys already implemented stay. Changing a filter does not remount the list or silently clear operator filters.
4. Below 768px: cards. At 768px: no 42rem min-width trap and no page overflow. Desktop table at `md+`. 390px chips fully readable. Chip/result/action targets ≥44px. Calendar FAB and mobile nav do not cover results.
5. Desktop Clients list is a semantic `<table>` with `thead`/`tbody`/`tr`/`th`/`td` (or a complete grid). No mixed native-table + incomplete ARIA. No `aria-required-children` / `aria-required-parent` from Clients. Column headers are meaningful. Row actions are keyboard reachable and named.
6. When the profile is Due now (`isFollowUpDue` **or** `new` with no recorded outreach), primary actions include `Open in Follow-up` → `/follow-up`. No competing Follow-up tab. No category persistence. 40.2 server rules unchanged.
7. Profile expand/collapse uses Epic 37 `motion-local` 160ms and is instant under reduced motion. No 200ms local interaction in touched profile scope. Route-enter 280ms and press 100ms unchanged. Query-only changes do not remount route motion.
8. WhatsApp/Viber confirmation uses Story 38.6 dialog: title, description, focus trap, Escape, restore focus, inert background, reduced motion. QA does not send real messages.
9. TenantAdmin and TenantMember on Basic/Core/Pro/Enterprise keep the recorded entitlement matrix. Basic export remains hint-not-crash (full list). Campaign handoff stays Pro+. Member does not gain admin settings. Server auth remains authoritative. No cross-tenant data.
10. Protected 38.4–39.5, 40.1, and 40.2 remain intact. No 40.4. No production claim.

## Architecture

See `_bmad-output/planning-artifacts/evidence/px2-40-3/`.

Locked decisions:

- Presentation-only. No API/schema/entitlement math changes.
- Semantic HTML table at `md+`; cards below `md`.
- Remove `key={searchParams}` remount on `/clients`.
- `Open in Follow-up` href is `FOLLOW_UP_PATH` (`/follow-up`).
- Due CTA uses 40.2 Due-now membership, not a new category store.
- Do not revive `ClientFollowUpPanel` or `ClientLeadStatusControl`.

## Tasks / Subtasks

- [x] Inventory and evidence recorded (AC: all)
- [x] Clients list composition + chips + error/empty (AC: 1, 3, 4)
- [x] Semantic table + 44px row actions (AC: 4, 5)
- [x] Profile motion, Follow-up CTA, missing-info honesty (AC: 2, 6, 7)
- [x] Messenger 38.6 verification (AC: 8)
- [ ] Tests: unit, Playwright 40.3, 40.1/40.2 + 38.4–39.5 (AC: 9, 10) — unit/tsc green; live Playwright pending on this HEAD

## Dev Notes

- List owner: `web/components/clients/clients-list-page.tsx`
- Table layout: `web/components/clients/clients-table-layout.ts`
- Row: `web/components/clients/client-row.tsx`
- Chips: `web/components/clients/client-lead-queue-header.tsx`
- Profile: `client-profile-page.tsx`, `client-profile-header.tsx`, `client-profile-motion.tsx`
- Follow-up href helpers: `web/lib/follow-up-category.ts`
- Overlay: `web/components/ui/alert-dialog.tsx` via `messenger-open-confirm-dialog.tsx`
- Export: Basic unfiltered; Core+ filtered. Backend `ExportListCsvAsync`.
- Campaign: `isProPlan` + `/campaigns/new?clientIds=`
- 39.4 axe classifier currently excuses Clients `role="row"`; after this story those IDs must not fire on `/clients`.

### Project Structure Notes

Frontend-only unless a regression proves an API bug. Do not add `followUpCategory` to the Clients room UI.

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §40.3]
- [Source: `_bmad-output/planning-artifacts/evidence/px2-40-2/architecture.md`]
- [Source: `_bmad-output/planning-artifacts/evidence/px2-40-3/`]

## Dev Agent Record

### Agent Model Used

Grok 4.6

### Debug Log References

### Completion Notes List

- Presentation-only Clients list + profile. Semantic `<table>` at `md+`, cards below 768. Removed `key={searchParams}` remount. `Open in Follow-up` uses Due-now membership → `/follow-up`. Profile expand is `motion-local` 160ms. Messenger stays on 38.6 `AlertDialog`.
- Composer 2.5 unused. Story 40.4 not started.

### File List

- `_bmad-output/implementation-artifacts/40-3-clients-list-and-client-profile.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-40-3/`
- `web/app/(admin)/clients/page.tsx`
- `web/components/clients/*` (list, row, table layout, chips, profile, motion, messenger consumers)
- `web/lib/follow-up-category.ts`
- `web/lib/clients-api.ts`
- `web/lib/clients-40-3-contract.test.ts`
- `web/e2e/clients-40-3.spec.ts`

### Change Log

- 2026-10-04: Created Story 40.3 from main `7e7c3c07`. Inventory and contracts locked. 40.4 not started.
- 2026-10-04: Implemented Clients list/profile presentation. Unit + tsc green. Playwright and four-layer review pending.
