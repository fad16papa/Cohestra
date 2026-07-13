---
baseline_commit: b4fba25
---

# Story 3.9: Merge-Suspect Flag Banner

Status: done

## Story

As an operator,
I want to see when a Client may be a duplicate,
So that I can review data quality without a merge UI in MVP.

## Acceptance Criteria

1. **AC-3.9.1 — Profile banner (UX-DR27, FR-6)**
   - **Given** a Client flagged merge-suspect by dedup rules
   - **When** I view their profile
   - **Then** subtle banner shows: "Possible duplicate — review suggested." with link to filtered list

2. **AC-3.9.2 — Filtered clients list**
   - **Given** I follow the banner link
   - **When** the clients list loads
   - **Then** only merge-suspect clients are shown

## Tasks / Subtasks

- [x] **Task 1: List filter API** (AC: 3.9.2)
  - [x] `GET /api/v1/admin/clients?mergeSuspect=true` filters `IsMergeSuspect`

- [x] **Task 2: Profile banner + list filter UI** (AC: 3.9.1, 3.9.2)
  - [x] `ClientMergeSuspectBanner` on profile when `isMergeSuspect`
  - [x] `/clients?mergeSuspect=true` with active filter state and clear control

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Flag is set at registration ingestion by `ClientDeduplicationService` (Story 3.3)
- No merge UI in MVP — banner + filtered list only

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Merge-suspect banner on client profile links to filtered clients list
- Clients list API and UI support `mergeSuspect=true` filter

### File List

- `src/Application/Clients/IClientService.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Api/Controllers/V1/ClientsController.cs`
- `src/Api/Api.http`
- `web/lib/clients-api.ts`
- `web/components/clients/client-merge-suspect-banner.tsx`
- `web/components/clients/client-profile-page.tsx`
- `web/components/clients/clients-list-page.tsx`
- `web/app/(admin)/clients/page.tsx`

### Change Log

- 2026-06-16: Story 3.9 implemented — merge-suspect banner and filtered clients list

### Review Findings

- [x] [Review][Defer] Clients list rows do not surface merge-suspect flag outside filtered view — profile banner only; acceptable for MVP scope [`client-row.tsx`]
- [x] [Review][Defer] URL filter requires exact `mergeSuspect=true` (case-sensitive) — `True` ignored [`clients-list-page.tsx:33`]
- [x] [Review][Defer] No API/integration tests for `mergeSuspect` list filter — Epic 3 defer pattern [`ClientService.cs:32-35`]
- [x] [Review][Dismiss] Banner link label "View merge-suspect clients" vs AC body text only — link presence satisfies AC intent [`client-merge-suspect-banner.tsx:17-22`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — all layers passed.**

- Profile banner shows exact AC copy with link to `/clients?mergeSuspect=true`
- API + list UI filter to `IsMergeSuspect` clients with clear-filter control and Suspense wrapper
- All AC-3.9.1–3.9.2 satisfied; no patch or decision-needed findings
