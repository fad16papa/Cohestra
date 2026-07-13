---
baseline_commit: b4fba25
---

# Story 4.1: Dashboard Metrics API with Redis Cache

Status: done

## Story

As an operator,
I want aggregated dashboard metrics from the API,
So that the dashboard loads quickly and stays current.

## Acceptance Criteria

1. **AC-4.1.1 — Dashboard metrics (FR-8)**
   - **Given** Clients and Registrations exist
   - **When** I GET dashboard metrics as authenticated operator
   - **Then** response includes total leads, new leads in period, active Activities count, follow-up coverage %
   - **And** aggregates are cached in Redis with ~60s TTL

## Tasks / Subtasks

- [x] **Task 1: Metrics contract + service** (AC: 4.1.1)
  - [x] `DashboardMetricsResponse` with total leads, new leads (7-day window), published activity count, follow-up coverage %
  - [x] `IDashboardService` / `DashboardService` aggregate from Clients and Activities

- [x] **Task 2: Redis cache + API** (AC: 4.1.1)
  - [x] `RedisDashboardMetricsCache` with 60s TTL
  - [x] `GET /api/v1/admin/dashboard/metrics`

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`

## Dev Notes

- **New leads in period:** clients created in the rolling last 7 days (`Client.CreatedAt`)
- **Active activities:** count of `ActivityStatus.Published`
- **Follow-up coverage:** share of clients with `LeadStatus != New` (WhatsApp events extend in Epic 5)
- UI wiring ships in Story 4.2

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Dashboard metrics endpoint with Redis-backed 60s cache

### File List

- `src/Contracts/Dashboard/DashboardMetricsResponse.cs`
- `src/Application/Dashboard/IDashboardService.cs`
- `src/Infrastructure/Dashboard/DashboardService.cs`
- `src/Infrastructure/Dashboard/RedisDashboardMetricsCache.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/DashboardController.cs`
- `src/Api/Api.http`

### Change Log

- 2026-06-16: Story 4.1 implemented — dashboard metrics API with Redis cache

### Review Findings

- [x] [Review][Defer] Four sequential COUNT queries on cache miss — combine when dashboard latency matters [`DashboardService.cs:36-52`]
- [x] [Review][Defer] No index on `clients.created_at` for period filter — acceptable at MVP scale [`ClientConfiguration.cs:63-64`]
- [x] [Review][Defer] No API/integration tests for metrics aggregation or cache TTL — Epic 4 defer pattern [`DashboardService.cs:16-27`]
- [x] [Review][Defer] Follow-up coverage uses `LeadStatus != New` only — WhatsApp timeline events extend in Epic 5 [`DashboardService.cs:50-56`]
- [x] [Review][Dismiss] Cache serves stale `computedAt` up to 60s — matches AC TTL intent [`RedisDashboardMetricsCache.cs:10`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — all layers passed.**

- `GET /api/v1/admin/dashboard/metrics` returns total leads, 7-day new leads, published activity count, follow-up coverage %
- Redis cache key `dashboard:metrics` with 60s TTL; corrupt entries self-heal on deserialize failure
- All AC-4.1.1 satisfied; no patch findings
