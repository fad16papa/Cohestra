# Brainstorm Intent — Story 21.3 Viber coverage parity

**Date:** 2026-08-09  
**Story:** 21.3 Multi-channel follow-up coverage includes Viber  
**Epic:** 21 Viber messenger  
**Depends on:** 21.1 (ViberInitiated), 21.2 (ViberFollowUpRecorded) — merged

## Problem

Dashboard `followUpCoveragePercent` and report `BuildFollowUpStatusAsync` count only email + WhatsApp timeline events. Viber events exist in the timeline and ClientService filters but **do not** affect coverage metrics — operators see understated follow-up coverage.

## Root cause (confirmed)

Two duplicated predicate blocks omit `ViberInitiated` and `ViberFollowUpRecorded`:

| File | Location |
|------|----------|
| `src/Infrastructure/Dashboard/DashboardService.cs` | `followedUpLeads` query (~L76–78) |
| `src/Infrastructure/Reports/ReportService.cs` | `BuildFollowUpStatusAsync` (~L426–428) |

`ClientService.OutreachEventTypes` already includes Viber → clients list, `withoutOutreach` filter, and Last outreach column are likely correct. **Fix the metrics, not the queue.**

## Recommendation

**Extract shared `FollowUpCoverageEventTypes`** (Application or Domain layer) and use `Contains` in Dashboard + Report + ClientService — same PR, tiny diff, prevents future channel drift.

Fallback if scope-pressured: add two OR clauses mirroring WhatsApp in both services only.

## AC mapping

| AC | Action |
|----|--------|
| AC1 Dashboard coverage counts Viber-only clients | Update `DashboardService` predicate |
| AC2 Report coverage/filters include Viber | Update `ReportService.BuildFollowUpStatusAsync` |
| AC3 Timeline labels "Viber initiated" / "Viber follow-up recorded" | **Verify-only** — `ClientTimelineBuilder` + 21.1/21.2 tests already ship this |

## Out of scope

- Frontend changes (metrics flow through existing API)
- Channel-weighted coverage (AC requires equal weight to WhatsApp)
- Story 21.4 share-kit (parked)

## Test plan

1. **Dashboard:** 2 New leads, 1 with only `ViberInitiated` → coverage 50%
2. **Report:** cohort client with only `ViberFollowUpRecorded` → included in followed-up count
3. **Regression:** email-only and WhatsApp-only clients still count
4. **No double-count:** client with WhatsApp + Viber counts once

Use InMemory DbContext pattern from `ClientServiceListFilterTests` or `ReportDashboardTenantIsolationTests`.

## Implementation order

1. Shared `FollowUpCoverageEventTypes` array (+ wire ClientService)
2. `DashboardService.cs`
3. `ReportService.cs`
4. 2–4 unit tests in `Infrastructure.Tests`
5. Manual spot-check: demo seed dashboard coverage increases

## Next BMad step

`bmad-create-story 21-3` → `bmad-dev-story 21-3`
