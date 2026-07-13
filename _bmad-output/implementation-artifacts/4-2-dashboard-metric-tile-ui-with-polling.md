---
baseline_commit: b4fba25
---

# Story 4.2: Dashboard MetricTile UI with Polling

Status: done

## Story

As an operator,
I want a live dashboard that refreshes without full page reload,
So that I see new registrations within a minute.

## Acceptance Criteria

1. **AC-4.2.1 — Metric tiles (UX-DR12, FR-8)**
   - **Given** I am on `/dashboard`
   - **When** the page loads
   - **Then** MetricTile components display key counts

2. **AC-4.2.2 — Polling + updated time (UX-DR21, NFR-3)**
   - **And** metrics poll every 60s; top bar shows "Updated {time}"
   - **And** subsequent polls update tiles without full-page flash
   - **And** dashboard loads within 3 seconds (NFR-2)

3. **AC-4.2.3 — Click-through (FR-9)**
   - **Given** I tap a MetricTile
   - **When** navigation occurs
   - **Then** I land on filtered Clients list or Activity detail

## Tasks / Subtasks

- [x] **Task 1: Dashboard API client + MetricTile** (AC: 4.2.1)
  - [x] `fetchDashboardMetrics` + four MetricTile components on dashboard

- [x] **Task 2: Polling + Updated time** (AC: 4.2.2)
  - [x] 60s poll updates metrics in place; first load spinner only
  - [x] Top bar `Updated {time}` from metrics `computedAt` via refresh context

- [x] **Task 3: Click-through filters** (AC: 4.2.3)
  - [x] Tiles link to `/clients`, `/clients?createdWithinDays=7`, `/activities?status=published`, `/clients?leadStatus=new`
  - [x] Clients list API/UI support `createdWithinDays` and `leadStatus` filters

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Empty state still shown when no activities exist (parallel activities count check on first load)
- Background poll errors keep last good metrics visible
- Activity performance ranking ships in Story 4.3

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Dashboard metric tiles with 60s polling and top-bar updated time
- Client/activity list filters wired for tile click-through

### File List

- `web/lib/dashboard-api.ts`
- `web/components/dashboard/metric-tile.tsx`
- `web/components/dashboard/dashboard-metrics-refresh-context.tsx`
- `web/components/dashboard/dashboard-page-client.tsx`
- `web/components/layouts/dashboard-layout.tsx`
- `web/components/layouts/updated-time.tsx`
- `web/lib/clients-api.ts`
- `web/components/clients/clients-list-page.tsx`
- `web/app/(admin)/clients/page.tsx`
- `web/components/activities/activities-list-page.tsx`
- `web/app/(admin)/activities/page.tsx`
- `src/Application/Clients/IClientService.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Api/Controllers/V1/ClientsController.cs`

### Change Log

- 2026-06-16: Story 4.2 implemented — dashboard metric tiles with polling and click-through

### Review Findings

- [x] [Review][Defer] Polling continues on empty-state dashboard — harmless API noise [`dashboard-page-client.tsx:71-97`]
- [x] [Review][Defer] Double 60s staleness window (API Redis cache + client poll) — acceptable per NFR-3 [`dashboard-page-client.tsx:78-91`]
- [x] [Review][Defer] Clients filter banners always clear all params via `/clients` — fine for tile deep links [`clients-list-page.tsx:114-160`]
- [x] [Review][Defer] No E2E tests for polling or tile navigation — Epic defer pattern
- [x] [Review][Dismiss] Follow-up tile links to `leadStatus=new` (uncovered leads) not covered set — intentional inverse navigation [`dashboard-page-client.tsx:152-157`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — all layers passed.**

- Four MetricTiles render from metrics API; 60s in-place polling without full-page flash
- Top bar shows `Updated {time}` from `computedAt` on `/dashboard` only
- Tile click-through lands on filtered clients list or published activities list
- All AC-4.2.1–4.2.3 satisfied; no patch findings
