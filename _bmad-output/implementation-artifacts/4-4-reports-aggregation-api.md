---
baseline_commit: b4fba25
---

# Story 4.4: Reports Aggregation API

Status: done

## Story

As an operator,
I want weekly and monthly report data from the API,
So that I can review business performance without spreadsheets.

## Acceptance Criteria

1. **AC-4.4.1 — Report presets (FR-10)**
   - **Given** I request a weekly or monthly report preset
   - **When** the API aggregates data
   - **Then** report includes activities hosted, registrations, new leads, follow-up status, activity ranking, lead growth, community ranking, repeat participants, inactive Clients, and campaign results where applicable
   - **And** data reconciles to underlying Registration and Client records

## Tasks / Subtasks

- [x] **Task 1: Report contracts + service** (AC: 4.4.1)
  - [x] `ReportResponse` with FR-10 summary blocks
  - [x] `IReportService` / `ReportService` aggregates from Registrations and Clients

- [x] **Task 2: Reports API** (AC: 4.4.1)
  - [x] `GET /api/v1/admin/reports?preset=weekly|monthly`

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`

## Dev Notes

- **Weekly preset:** UTC Monday 00:00 of current week through now
- **Monthly preset:** UTC first day of current month through now
- **Activities hosted:** distinct activities with ≥1 registration in period
- **Follow-up status:** lead status breakdown for clients who registered in period
- **Inactive clients:** system-wide `LeadStatus.Inactive` count at compute time
- **Repeat participants:** clients with ≥2 registrations in period
- **Campaign results:** `available: false` until Epic 5
- Filter UI and custom ranges ship in Story 4.5

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Weekly/monthly report aggregation endpoint with FR-10 fields

### File List

- `src/Contracts/Reports/ReportResponse.cs`
- `src/Application/Reports/IReportService.cs`
- `src/Infrastructure/Reports/ReportService.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/ReportsController.cs`
- `src/Api/Api.http`

### Change Log

- 2026-06-16: Story 4.4 implemented — reports aggregation API

### Review Findings

- [x] [Review][Defer] Many sequential DB queries per report request — acceptable for MVP; batch or cache if reports slow [`ReportService.cs:25-70`]
- [x] [Review][Defer] Weekly/monthly presets use calendar UTC windows, not dashboard rolling 7-day window — intentional for FR-10 [`ReportService.cs:86-106`]
- [x] [Review][Defer] `inactiveClients` is system-wide snapshot; follow-up cohort inactive count is period registrants only — documented dual semantics [`ReportService.cs:46-48`, `ReportService.cs:129-130`]
- [x] [Review][Defer] Follow-up status uses current lead status, not status at registration time [`ReportService.cs:116-121`]
- [x] [Review][Defer] No API/integration tests for preset ranges or reconciliation — Epic defer pattern
- [x] [Review][Dismiss] `newLeads` duplicated at top level and in `leadGrowth` — convenient response shape [`ReportResponse.cs:36-43`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — all layers passed.**

- `GET /api/v1/admin/reports?preset=weekly|monthly` returns all FR-10 blocks
- Counts reconcile to `registrations` and `clients`; campaign results marked unavailable until Epic 5
- All AC-4.4.1 satisfied; no patch findings
