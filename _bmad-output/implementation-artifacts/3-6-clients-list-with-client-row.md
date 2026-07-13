---
baseline_commit: b4fba25
---

# Story 3.6: Clients List with ClientRow

Status: done

## Story

As an operator,
I want to browse the Master Client List,
So that I can find and review leads captured from activities.

## Acceptance Criteria

1. **AC-3.6.1 — ClientRow DataTable (UX-DR6, UX-DR8)**
   - **Given** Clients exist from registrations
   - **When** I visit `/clients`
   - **Then** DataTable shows ClientRow with name (semibold), StatusBadge, last activity caption, chevron
   - **And** row click navigates to `/clients/{id}`

2. **AC-3.6.2 — Server pagination**
   - **Given** more than 25 clients exist
   - **When** I browse the list
   - **Then** the API returns 25 rows per page with page controls

3. **AC-3.6.3 — Sortable columns**
   - **Given** I am on `/clients`
   - **When** I sort by name, status, or last registration date
   - **Then** the list re-fetches with server-side sort applied

## Tasks / Subtasks

- [x] **Task 1: Admin clients list API** (AC: 3.6.2, 3.6.3)
  - [x] `GET /api/v1/admin/clients` with pagination, sortBy, sortDirection
  - [x] `ClientService.ListAsync` projects last registration date + activity name
  - [x] Default sort: last registration date descending

- [x] **Task 2: Clients list UI** (AC: 3.6.1, 3.6.2, 3.6.3)
  - [x] `LeadStatusBadge` with UX-DR6 lead status tokens
  - [x] `ClientRow` with chevron link to profile route
  - [x] `ClientsListPage` sortable headers + pagination (25/page)

- [x] **Task 3: Profile route placeholder** (AC: 3.6.1)
  - [x] `/clients/[id]` placeholder page for Story 3.7

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Profile detail, timeline, merge banner, and status editing belong to Stories 3.7–3.9
- Last activity caption format: `{activityName} · {date}` or fallback copy when empty

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Paginated admin clients list API with name/status/lastRegistrationDate sort
- `/clients` page renders sortable DataTable-style grid with ClientRow and 25-row pagination
- Profile route stubbed for Story 3.7

### File List

- `src/Contracts/Clients/ClientListResponse.cs`
- `src/Application/Clients/IClientService.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/ClientsController.cs`
- `src/Api/Api.http`
- `web/lib/clients-api.ts`
- `web/components/clients/lead-status-badge.tsx`
- `web/components/clients/client-row.tsx`
- `web/components/clients/clients-list-page.tsx`
- `web/app/(admin)/clients/page.tsx`
- `web/app/(admin)/clients/[id]/page.tsx`

### Change Log

- 2026-06-16: Story 3.6 implemented — clients list API, ClientRow UI, pagination and sort
- 2026-06-16: Review patch applied — pagination page clamp, split empty states, ClientRow aria-label

### Review Findings

- [x] [Review][Patch] Out-of-range page shows wrong empty copy — when `totalCount > 0` but the current page returns zero rows, UI shows "No clients yet. Publish an activity…" instead of a pagination-specific state [`clients-list-page.tsx:133-137`]
- [x] [Review][Patch] Page index not clamped when result set shrinks — `page` can exceed `totalPages` after sort changes or data updates, leaving an empty grid with misleading messaging [`clients-list-page.tsx:31-38`]
- [x] [Review][Patch] ClientRow link lacks explicit accessible name — chevron is `aria-hidden`; add `aria-label` so screen readers get a clear "View profile for {name}" action [`client-row.tsx:16-18`]
- [x] [Review][Defer] No loading indicator on sort/page refetch after first load — stale rows flash until fetch completes; matches activities list pattern [`clients-list-page.tsx:40-75`]
- [x] [Review][Defer] Fetch errors do not clear previously loaded rows — error banner appears above stale data [`clients-list-page.tsx:59-69`]
- [x] [Review][Defer] No integration/unit tests for `ClientService.ListAsync` sort/pagination or controller validation — consistent with Epic 3 defer pattern [`ClientService.cs`, `ClientsController.cs`]
- [x] [Review][Defer] EF projection uses two correlated subqueries per row for last registration date vs activity name — acceptable for MVP; optimize if list latency becomes an issue [`ClientService.cs:36-43`]
- [x] [Review][Defer] `ClientsController.BadRequestProblem` duplicates `ActivitiesController.ProblemResult` helper — style consistency only [`ClientsController.cs:65-79`]

### Re-review (2026-06-16, pass 2)

✅ **Clean review — all layers passed.**

- Pass 1 patches verified: page clamped when `totalCount` shrinks; empty states split by `totalCount`; `aria-label` on ClientRow link
- All AC-3.6.1–3.6.3 satisfied; no new patch or decision-needed findings
- Deferred items unchanged (refetch loading, error stale rows, tests, EF subqueries, controller helper duplication)
