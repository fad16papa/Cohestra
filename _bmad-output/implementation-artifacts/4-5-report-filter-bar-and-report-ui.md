---
baseline_commit: b4fba25
---

# Story 4.5: ReportFilterBar and Report UI

Status: done

## Story

As an operator,
I want to filter reports by date, activity, community, status, and referral source,
So that I can answer specific business questions.

## Acceptance Criteria

1. **AC-4.5.1 — ReportFilterBar (UX-DR23, FR-11)**
   - **Given** I am on `/reports`
   - **When** I use ReportFilterBar
   - **Then** I can set week/month/custom date presets plus Activity, Community, Lead Status, Referral Source filters with AND semantics

2. **AC-4.5.2 — Filter chips and empty state (UX-DR27)**
   - **And** filter chips clear individually; "Clear all" resets
   - **And** empty period shows "No registrations in this period." with adjust-filters hint

## Tasks / Subtasks

- [x] **Task 1: Filtered reports API** (AC: 4.5.1)
  - [x] Extend `GET /api/v1/admin/reports` with `custom` preset, `from`/`to`, and conjunctive filters

- [x] **Task 2: ReportFilterBar + URL state** (AC: 4.5.1, 4.5.2)
  - [x] Date preset, activity, community, lead status, referral source controls
  - [x] Active filter chips with individual clear and Clear all

- [x] **Task 3: Report UI** (AC: 4.5.2)
  - [x] `/reports` page loads filtered report summary and rankings
  - [x] Empty period copy per UX-DR27

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Filter state synced to URL query params for shareable report views
- Metrics derive from filtered registration cohort (AND semantics)
- CSV export ships in Story 4.6

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Reports page with filter bar, chips, and summary UI wired to filtered aggregation API

### File List

- `src/Contracts/Reports/ReportQuery.cs`
- `src/Application/Reports/IReportService.cs`
- `src/Infrastructure/Reports/ReportService.cs`
- `src/Api/Controllers/V1/ReportsController.cs`
- `src/Api/Api.http`
- `web/lib/reports-api.ts`
- `web/components/reports/report-filter-bar.tsx`
- `web/components/reports/report-results.tsx`
- `web/components/reports/reports-page-client.tsx`
- `web/app/(admin)/reports/page.tsx`

### Change Log

- 2026-06-16: Story 4.5 implemented — report filter bar and report UI
- 2026-06-16: Code review patches — skip fetch for incomplete custom dates; debounce referral source filter

### Review Findings

- [x] [Review][Patch] Custom preset fetches before dates are complete [`reports-page-client.tsx:64-97`, `report-filter-bar.tsx:195-215`]
- [x] [Review][Patch] Referral source filter refetches on every keystroke [`report-filter-bar.tsx:271-280`]
- [x] [Review][Defer] Stale report shown while refetching after filter change — matches clients list pattern [`reports-page-client.tsx:64-97`]
- [x] [Review][Defer] Activity/community dropdown options capped at first 100 activities [`reports-page-client.tsx:47`]
- [x] [Review][Defer] Many sequential DB queries per filtered report — inherited from 4.4 [`ReportService.cs:27-98`]
- [x] [Review][Defer] Lead status and referral filters use current client fields, not registration-time snapshot [`ReportService.cs:116-126`]
- [x] [Review][Defer] No API/UI tests for filter semantics or empty state — Epic defer pattern
- [x] [Review][Defer] Report MetricTile links omit report filter context — not in AC; dashboard tiles use fixed deep links [`report-results.tsx:52-75`]
