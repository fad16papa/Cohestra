---
epic: 21
story: 3
status: done
baseline_commit: 093678c263988c77e4873469c4bdb63ce0fa376a
---

# Story 21.3: Multi-channel follow-up coverage includes Viber

Status: done

## Story

As a **Tenant Admin**,
I want **dashboard and report follow-up coverage to count Viber outreach alongside WhatsApp and email**,
So that **coverage metrics reflect all messenger touch-points**.

## Context

- Brainstorm (#131): gap is duplicated predicates in Dashboard + Report; ClientService already includes Viber.
- User chose **Option 2**: extract shared `ClientOutreachCoverage.FollowUpCoverageEventTypes`.

## Acceptance Criteria

1. **Given** a Client with only `ViberInitiated` or `ViberFollowUpRecorded` (no email/WhatsApp outreach)  
   **When** dashboard follow-up coverage is computed  
   **Then** that Client counts as followed-up

2. **Given** report queries that include follow-up coverage  
   **When** Viber events exist in the cohort  
   **Then** Viber is included in the same predicates as WhatsApp timeline events

3. **Given** the client profile timeline  
   **When** Viber events render  
   **Then** labels read **Viber initiated** and **Viber follow-up recorded** (verify-only — shipped 21.1/21.2)

## Tasks / Subtasks

- [x] **Task 1 — Shared coverage types** (AC: 1, 2)
  - [x] Add `ClientOutreachCoverage.FollowUpCoverageEventTypes` in Application/Clients
  - [x] Wire `ClientService` list/outreach filters to shared array

- [x] **Task 2 — Dashboard + Report predicates** (AC: 1, 2)
  - [x] `DashboardService` followedUpLeads uses shared array
  - [x] `ReportService.BuildFollowUpStatusAsync` uses shared array

- [x] **Task 3 — Tests** (AC: 1, 2)
  - [x] Dashboard: ViberInitiated-only client → 50% coverage (2 leads)
  - [x] Report: ViberFollowUpRecorded-only cohort client counts
  - [x] Regression: WhatsApp + Viber same client counts once

- [x] **Task 4 — AC3 verify** (AC: 3)
  - [x] Confirmed `ClientTimelineBuilder` labels unchanged from 21.1/21.2

### Review Findings

- [x] [Review][Patch] Add dashboard test for `ViberFollowUpRecorded`-only client [`src/Infrastructure.Tests/Clients/FollowUpCoverageViberTests.cs`]
- [x] [Review][Patch] Add `withoutOutreach=true` test — Viber-only client excluded from queue [`src/Infrastructure.Tests/Clients/ClientServiceListFilterTests.cs`]
- [x] [Review][Defer] `LeadStatus != New` counts as followed-up without outreach events [`DashboardService.cs:74`, `ReportService.cs:424`] — deferred, pre-existing predicate preserved by design
- [x] [Review][Defer] Dashboard metrics cache 60s TTL may show stale coverage after Viber log [`RedisDashboardMetricsCache.cs`] — deferred, pre-existing accepted TTL
- [x] [Review][Defer] `withoutOutreach` filter ignores lead status (Contacted + no events still in queue) [`ClientService.cs:255`] — deferred, pre-existing design mismatch vs coverage metric

## Dev Agent Record

### Completion Notes List

- Extracted `ClientOutreachCoverage.FollowUpCoverageEventTypes` — single source for Dashboard, Report, and ClientService.
- No frontend changes; coverage flows through existing API fields.
- Three unit tests in `FollowUpCoverageViberTests.cs`.
- Code review patches: dashboard `ViberFollowUpRecorded`-only test; `withoutOutreach` queue filter test in `ClientServiceListFilterTests.cs`.

### File List

- `_bmad-output/implementation-artifacts/21-3-multi-channel-follow-up-coverage-includes-viber.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/Application/Clients/ClientOutreachCoverage.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Infrastructure/Dashboard/DashboardService.cs`
- `src/Infrastructure/Reports/ReportService.cs`
- `src/Infrastructure.Tests/Clients/FollowUpCoverageViberTests.cs`
- `src/Infrastructure.Tests/Clients/ClientServiceListFilterTests.cs`
