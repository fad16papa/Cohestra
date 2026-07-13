---
baseline_commit: b4fba25
---

# Story 4.6: CSV Export

Status: done

## Story

As an operator,
I want to export filtered report data as CSV,
So that I can share monthly reviews with stakeholders (UJ-4).

## Acceptance Criteria

1. **AC-4.6.1 — Export CSV (FR-11, SM-2)**
   - **Given** active report filters
   - **When** I click Export CSV
   - **Then** a downloadable CSV file is generated matching filtered data

2. **AC-4.6.2 — Row count reconciliation**
   - **And** export reconciles row counts to displayed summary

## Tasks / Subtasks

- [x] **Task 1: CSV export API** (AC: 4.6.1, 4.6.2)
  - [x] `GET /api/v1/admin/reports/export` with same filter query params as report summary
  - [x] CSV includes summary metrics plus one row per filtered registration
  - [x] `X-Registration-Row-Count` header matches summary registrations

- [x] **Task 2: Export CSV UI** (AC: 4.6.1)
  - [x] Export CSV button on `/reports` respecting active filters
  - [x] Disabled when custom dates incomplete or no registrations
  - [x] Toast confirms exported registration count

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- CSV uses UTF-8 BOM for Excel compatibility
- Summary section mirrors on-screen report metrics; detail rows reconcile to Registrations tile
- Export reuses `ReportQuery` validation and filter semantics from Story 4.5

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Filtered report CSV export endpoint and reports page Export CSV button

### File List

- `src/Contracts/Reports/ReportCsvExportResponse.cs`
- `src/Application/Reports/IReportService.cs`
- `src/Infrastructure/Reports/ReportService.cs`
- `src/Api/Controllers/V1/ReportsController.cs`
- `src/Api/Api.http`
- `web/lib/reports-api.ts`
- `web/components/reports/reports-page-client.tsx`

### Change Log

- 2026-06-16: Story 4.6 implemented — CSV export for filtered reports
- 2026-06-16: Epic 4 review patches — export guard, toast fix, CSV row-count consistency

### Review Findings

- [x] [Review][Patch] Export enabled while report summary is stale after filter change [`reports-page-client.tsx:119-124`]
- [x] [Review][Patch] Export toast falls back to stale `report.registrations` [`reports-page-client.tsx:137-140`]
- [x] [Review][Patch] Disable export while report fetch is in flight [`reports-page-client.tsx:74-111`]
- [x] [Review][Patch] CSV reconciliation `InvalidOperationException` uncaught → HTTP 500 [`ReportService.cs:123-127`, `ReportsController.cs:81-90`]
