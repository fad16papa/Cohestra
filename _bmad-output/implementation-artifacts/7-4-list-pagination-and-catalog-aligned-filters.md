---
baseline_commit: pending
---

# Story 7.4: List Pagination and Catalog-Aligned Filters

Status: done

## Story

As an operator,
I want activities list and report filters to scale beyond 100 rows,
So that large activity catalogs do not hide data.

## Acceptance Criteria

1. **AC-7.4.1 — Activities pagination / search**
   - **Given** more than 100 activities exist
   - **When** I use All Activities
   - **Then** pagination and server-side search apply (not a silent 100-row cap)

2. **AC-7.4.2 — Report catalog filters**
   - **Given** I filter reports by community
   - **When** I open the community dropdown
   - **Then** options come from the same community catalog as activity create

## Dev Agent Record

### File List

- `src/Application/Activities/IActivityService.cs` — `search` parameter on list
- `src/Infrastructure/Activities/ActivityService.cs` — server search filter
- `src/Api/Controllers/V1/ActivitiesController.cs` — `search` query param
- `web/lib/activities-api.ts` — `search` param + `fetchAllActivities` helper
- `web/components/activities/activities-list-page.tsx` — 25/page pagination, debounced server search
- `web/components/reports/report-filter-bar.tsx` — community catalog from API
- `web/components/reports/reports-page-client.tsx` — load all activities for activity filter via pagination

### Completion Notes

- Activities list uses 25/page with Previous/Next (matches clients list pattern)
- Removed deferred “100 most recent” banner
- Reports community dropdown uses `fetchCommunities`; activity dropdown loads all pages via `fetchAllActivities`
