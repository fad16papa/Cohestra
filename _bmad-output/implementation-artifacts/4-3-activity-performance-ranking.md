---
baseline_commit: b4fba25
---

# Story 4.3: Activity Performance Ranking

Status: done

## Story

As an operator,
I want to see which Activities drove the most registrations this week,
So that I know which lead engines to scale.

## Acceptance Criteria

1. **AC-4.3.1 — Ranked activity performance (FR-9)**
   - **Given** multiple Activities with registrations
   - **When** I view dashboard activity performance section
   - **Then** Activities rank by registration volume for selected period

2. **AC-4.3.2 — Click-through (FR-9)**
   - **And** click-through navigates to Activity detail or filtered Client list

## Tasks / Subtasks

- [x] **Task 1: Metrics API ranking** (AC: 4.3.1)
  - [x] Extend dashboard metrics with `activityPerformance` ranked by registrations in period

- [x] **Task 2: Dashboard UI** (AC: 4.3.1, 4.3.2)
  - [x] Activity performance section with ranked cards below metric tiles
  - [x] Cards link to `/activities/{id}`

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Uses same 7-day period as dashboard metrics (`periodDays`)
- Ranking included in Redis-cached metrics response (refreshes with 4.2 poll)
- Empty section copy when no registrations in period

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Activity performance ranking added to dashboard metrics and UI section

### File List

- `src/Contracts/Dashboard/DashboardMetricsResponse.cs`
- `src/Infrastructure/Dashboard/DashboardService.cs`
- `web/lib/dashboard-api.ts`
- `web/components/dashboard/activity-performance-card.tsx`
- `web/components/dashboard/activity-performance-section.tsx`
- `web/components/dashboard/dashboard-page-client.tsx`

### Change Log

- 2026-06-16: Story 4.3 implemented — dashboard activity performance ranking

### Review Findings

- [x] [Review][Defer] Period is fixed 7-day window — no dashboard period selector until reports/4.5 [`DashboardService.cs:34`]
- [x] [Review][Defer] Ranking returns all activities with registrations — no top-N cap [`DashboardService.cs:76-87`]
- [x] [Review][Defer] Tie-break sorts by `ActivityId` GUID, not name [`DashboardService.cs:85-86`]
- [x] [Review][Defer] Two-query ranking aggregation — acceptable at MVP scale [`DashboardService.cs:76-98`]
- [x] [Review][Defer] No API/UI tests for ranking order or click-through — Epic defer pattern
- [x] [Review][Dismiss] Cards link to activity detail only, not filtered clients list — AC allows either path [`activity-performance-card.tsx:23-24`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — all layers passed.**

- `activityPerformance` ranked by registration count in metrics period; section renders below tiles
- Cards navigate to `/activities/{id}`; empty state when no period registrations
- All AC-4.3.1–4.3.2 satisfied; no patch findings
