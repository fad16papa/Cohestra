---
baseline_commit: 793a2cd
---

# Story 6.2: Activities Catalog Filter Dropdowns

Status: done

## Story

As an operator,
I want community and category filters on All Activities to use my catalogs,
So that I can filter activities consistently without typing labels.

## Acceptance Criteria

1. **AC-6.2.1 — Category dropdown filter**
   - **Given** categories exist in the catalog
   - **When** I filter on `/activities`
   - **Then** category is a dropdown populated from the catalog

2. **AC-6.2.2 — Community dropdown filter**
   - **Given** communities exist in the catalog
   - **When** I filter on `/activities`
   - **Then** community is a dropdown and filters server-side via `community` query param

## Dev Agent Record

### Completion Notes

- `activities-list-page.tsx`: fetch catalogs, replace category text input, add community select
- `ActivitiesController` / `ActivityService`: optional `community` filter on list API
