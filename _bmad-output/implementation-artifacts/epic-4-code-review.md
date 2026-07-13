---
date: 2026-06-16
scope: Epic 4 — Operational Visibility & Business Reports (Stories 4.1–4.6)
frs: FR-8, FR-9, FR-10, FR-11
---

# Epic 4 Code Review

Status: review complete — patches applied 2026-06-16

## Epic FR Assessment

| FR | Verdict | Notes |
|----|---------|-------|
| **FR-8** Dashboard metrics | ✅ Met | API + Redis 60s TTL, MetricTiles, 60s poll, empty state, updated time |
| **FR-9** Activity performance | ✅ Met | Ranking on dashboard; click-through to activity detail and filtered lists |
| **FR-10** Weekly/monthly reports | ✅ Mostly met | All summary blocks implemented; campaign results stub until Epic 5 |
| **FR-11** Filter + export | ✅ Met | Filter bar + AND semantics + CSV; export guards applied |

**Overall:** Epic 4 patches applied. Remaining defer items are documented MVP tradeoffs or Epic 5 extensions.

---

## Patch (applied 2026-06-16)

- [x] [Review][Patch] Export enabled while report summary is stale after filter change [`reports-page-client.tsx`]
- [x] [Review][Patch] Export toast falls back to stale `report.registrations` [`reports-page-client.tsx`]
- [x] [Review][Patch] Disable export while report fetch is in flight [`reports-page-client.tsx`]
- [x] [Review][Patch] CSV reconciliation `InvalidOperationException` uncaught → HTTP 500 [`ReportService.cs`]

---

## Decision Needed

- [ ] [Review][Decision] Dashboard uses rolling 7-day window; reports use calendar UTC week/month — keep intentional split or align FR-9 wording? [`DashboardService.cs:34`, `ReportService.cs:268-303`]
  - Stories 4.3/4.4 documented as intentional. **Recommend:** defer/accept for MVP.

- [ ] [Review][Decision] Report `newLeads` = clients in registration cohort created in period, not all clients created in period [`ReportService.cs:38-45`]
  - **Recommend:** defer; cohort-scoped metrics match filtered report UX.

---

## Defer (logged — MVP acceptable)

- [x] [Review][Defer] Many sequential DB queries per dashboard/report request — batch/cache if latency matters
- [x] [Review][Defer] No API/integration/E2E tests for Epic 4 paths — consistent defer pattern
- [x] [Review][Defer] Follow-up coverage = `LeadStatus != New`; Epic 5 extends with WhatsApp/timeline
- [x] [Review][Defer] Lead status / referral filters use current client fields, not registration-time snapshot
- [x] [Review][Defer] Dashboard vs reports period semantics differ (rolling 7d vs calendar presets)
- [x] [Review][Defer] Activity/community filter dropdowns capped at first 100 activities
- [x] [Review][Defer] Stale report rows shown while refetching (matches clients list pattern)
- [x] [Review][Defer] Report MetricTile links omit active filter context — not in AC
- [x] [Review][Defer] Campaign results stub `{ available: false }` until Epic 5
- [x] [Review][Defer] CSV export loads all registration rows into memory — cap/stream if volume grows
- [x] [Review][Defer] Redis cache failure prevents dashboard metrics (no DB-only fallback) — compose treats Redis as required
- [x] [Review][Defer] Mobile hides dashboard “Updated {time}” below `sm` breakpoint

---

## Dismissed

- [x] [Review][Dismiss] 60s Redis TTL + 60s client poll double staleness — acceptable per NFR-3
- [x] [Review][Dismiss] Activity performance cards link to detail only (AC allows either path)
- [x] [Review][Dismiss] `newLeads` duplicated at top level and in `leadGrowth` — convenient API shape
- [x] [Review][Dismiss] Polling on empty-state dashboard — harmless API noise
- [x] [Review][Dismiss] Clients “Clear filter” resets all params — fine for tile deep links
- [x] [Review][Dismiss] CSV includes summary + registration rows (no ranking tables) — satisfies UJ-4 stakeholder export
- [x] [Review][Dismiss] Zero registrations hides all report blocks — matches AC-4.5.2 empty state
- [x] [Review][Dismiss] Campaign UI placeholder when unavailable — sufficient until Epic 5 enables data

---

## Story-by-Story Status

| Story | Status | Epic review notes |
|-------|--------|-------------------|
| 4.1 Dashboard Metrics API | done | Clean per-story review; epic defers inherited |
| 4.2 MetricTile UI + polling | done | Clean; click-through wired |
| 4.3 Activity ranking | done | Clean; detail-only cards OK |
| 4.4 Reports aggregation API | done | Clean; campaign stub expected |
| 4.5 ReportFilterBar + UI | done | Patches applied; stale-refetch defer stands |
| 4.6 CSV export | done | Epic review patches applied |

---

## Recommended patch order

1. Add `isReportLoading` and tie `canExport` to settled fetch + matching filters
2. Remove stale toast fallback; always use `exportResult.registrationRowCount`
3. Catch export reconciliation failure in controller → 409 with clear message, or single-query export path
4. Re-run `dotnet build`, `npm run lint`, `npm run build`
