---
baseline_commit: b4fba25
---

# Story 3.10: Activity Detail Registrations Tab

Status: done

## Story

As an operator,
I want to see registrations for a specific Activity,
So that I can monitor incoming sign-ups in real time.

## Acceptance Criteria

1. **AC-3.10.1 — Registrations table (UX-DR27)**
   - **Given** I am on Activity detail Registrations tab
   - **When** registrations exist
   - **Then** table lists registrants with submission date and links to Client profile
   - **And** table loading shows spinner in body only (UX-DR27)

## Tasks / Subtasks

- [x] **Task 1: Registrations list API** (AC: 3.10.1)
  - [x] `GET /api/v1/admin/activities/{id}/registrations` returns registrant name, client id, submission date

- [x] **Task 2: Registrations tab UI** (AC: 3.10.1)
  - [x] Registrations tab on activity detail with lazy fetch
  - [x] Table header always visible; spinner in tbody while loading

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Ordered newest registration first (`CreatedAt` desc)
- Links route to `/clients/{clientId}`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Added activity registrations list endpoint and tab UI with in-table loading spinner

### File List

- `src/Contracts/Activities/ActivityRegistrationListResponse.cs`
- `src/Application/Activities/IActivityService.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Api/Api.http`
- `web/lib/activities-api.ts`
- `web/components/activities/activity-registrations-tab.tsx`
- `web/components/activities/activity-detail-page-client.tsx`

### Change Log

- 2026-06-16: Story 3.10 implemented — activity detail registrations tab
- 2026-06-16: Code review patch — CardDescription error-state copy

### Review Findings

- [x] [Review][Patch] CardDescription shows empty-state copy on fetch error [`activity-registrations-tab.tsx:81-85`]
- [x] [Review][Defer] Unbounded registration list — no pagination; acceptable for MVP until high-volume activities [`ActivityService.cs:346-355`]
- [x] [Review][Defer] No API/integration tests for registrations endpoint — Epic 3 defer pattern [`ActivityService.cs:333-358`]
- [x] [Review][Defer] Tab list lacks `tabpanel`/`aria-controls` wiring — pre-existing activity detail pattern [`activity-detail-page-client.tsx:96-118`]
- [x] [Review][Dismiss] Client link uses visible name only vs ClientRow `aria-label` — link text satisfies accessible name [`activity-registrations-tab.tsx:147-154`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — patch applied.**

- CardDescription now shows error copy when fetch fails; empty-state copy no longer shown on API errors
- All AC-3.10.1 satisfied; defer items remain acceptable for MVP
