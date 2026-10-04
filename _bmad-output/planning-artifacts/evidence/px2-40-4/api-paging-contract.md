# Story 40.4 — API / paging contract

Date: 2026-10-04  
Baseline before: `updatedAt desc`, no status group, no `Id` tie-break.  
After (this story): unfiltered list is Archived-last, then requested sort, then `Id`.

## Authority

`ActivityService.ListAsync` + `ApplyListSort` is the only list order. The web client must render the requested page as returned.

## Unfiltered (`status` omitted)

```
ORDER BY
  CASE WHEN Status = Archived THEN 1 ELSE 0 END,
  <requested primary>,
  Id ASC
```

Default primary: `UpdatedAt DESC`.

## Filtered (`status=draft|published|archived`)

```
ORDER BY
  <requested primary>,
  Id ASC
```

Archived-only filter may lead with Archived. That is truthful.

## Paging

| Layer | pageSize |
| --- | --- |
| API default | 25 |
| API max | 100 |
| Activities UI | 20 |

`page < 1` → 1. If requested page is past the last page after a data change, reconcile to the last valid page (existing list effect). Filter/sort change resets page to 1 and refetches.

## Why not client-only reorder

Page size is 20. A newly archived activity with the newest `UpdatedAt` sits on page 1 while Draft/Published sit on later pages. Reordering only the current page leaves Archived first. Server grouping is required.

## Before / after (default All statuses)

| Setup | Before | After |
| --- | --- | --- |
| Archived updated last; Draft and Published exist | Archived page-1 first | Draft/Published first; Archived after all actionable rows |
| Two Published, same `UpdatedAt` | Unstable | `Id` ascending |
| `status=archived` | Archived by `UpdatedAt` | Unchanged meaning; `Id` tie-break added |
| `sortBy=name` unfiltered | Archived “Alpha” can lead | Actionable names first; Archived names after |

## PostgreSQL proof

`ActivityListOrderingIntegrationTests` calls the real authenticated `GET /api/v1/admin/activities` against `cohestra_test`. See `postgres-ordering.md`.

## Forbidden

- Client `.sort()` of one page
- Default `status` that drops Archived
- Production reset / fixture mutation endpoints
- New public `sortBy=status` value
