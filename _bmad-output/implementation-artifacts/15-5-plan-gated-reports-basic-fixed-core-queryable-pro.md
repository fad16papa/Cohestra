---
baseline_commit: 60afb93
---

# Story 15.5: Plan-gated reports (Basic fixed / Core queryable / Pro+)

Status: done

## Story

As a Tenant Admin or Member, I want reports that match my plan depth, so that Basic stays simple with CSV while Core/Pro get real ops filtering.

## Acceptance Criteria

- [x] Basic: fixed simple report + CSV; advanced filters/custom preset rejected server-side
- [x] Core: queryable filters + aggregates/rankings + filtered CSV
- [x] Pro: Core depth + campaign analytics (server gate)
- [x] Dashboard metrics tenant-scoped via existing isolation
- [x] Web UpgradePanel when Basic uses advanced filters

## Dev Agent Record

- `ReportService.ValidateReportPlanAsync` — Basic blocks advanced filters + custom preset
- Basic gets empty activity rankings; campaign analytics Pro-only
- `reports-page-client.tsx` client UpgradePanel for advanced filters
- Isolation tests seed Core plan for custom-range queries

## Change Log

- 2026-07-22: DS 15.5 — plan-gated reports complete.
