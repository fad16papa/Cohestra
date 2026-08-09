# Story 24.4 Intent — Activities list sort + URL-sync filters

**Epic:** Activities list — operator at scale  
**Story ID:** 24.4  
**Date:** 2026-08-09  
**Depends on:** Stories 24.1, 24.2, 24.3 — merged  
**Source:** Brainstorm session (memlog in this folder)

## Problem

After 24.1–24.3, operators can recover from caps and run quick actions from cards — but the list itself is still awkward at 50+ activities:

- **Only `status` is URL-synced** (24.1). Search, community, and category live in React state — back/forward breaks, links aren't shareable, refresh loses filters.
- **No sort control.** API always returns `UpdatedAt` descending. Operators can't sort by name or registration volume to find what they need.

The list should behave like **Clients** — filters in the URL, sort in the header, page in local state.

## Goal

Make `/activities` **bookmarkable and browser-navigable** for all filters, and add **server-side sort** with a visible control in the filter bar.

## In scope (Story 24.4)

### 1. Full URL-sync filters (frontend)

Derive all filter values from `searchParams` (same pattern as `clients-list-page.tsx`):

| Param | Example | Notes |
|-------|---------|-------|
| `status` | `published` | Already synced in 24.1 — extend pattern to others |
| `search` | `tennis` | Debounced commit → `router.replace` |
| `community` | `Northside` | Community label (matches API today) |
| `category` | `Fitness` | Category name |
| `sortBy` | `name` | New |
| `sortDirection` | `asc` / `desc` | New |

**Page stays local state** (matches clients — pagination not in URL).

**Clear filters** removes all params from URL and resets page to 1.

**Recovery chips (24.1)** continue to set/clear `status=published` via URL — no regression.

### 2. Sort control (UI)

Add sort to filter bar (5th control or row extension):

| Sort field | Label | Default direction |
|------------|-------|-----------------|
| `updatedAt` | Last updated | desc (current default) |
| `createdAt` | Created | desc |
| `name` | Name | asc |
| `registrationCount` | Registrations | desc |

**UX:** Select for field + toggle or paired asc/desc on repeat click (match clients table header pattern OR compact select + direction select — prefer **single select with implicit default direction per field** to minimize UI).

Clicking sort updates URL (`sortBy`, `sortDirection`) and resets page to 1.

### 3. Backend — sort params on activities list

Add optional `sortBy` and `sortDirection` to `GET /api/v1/admin/activities`:

- **Allowed `sortBy`:** `name`, `createdAt`, `updatedAt`, `registrationCount`
- **`sortDirection`:** `asc` | `desc` (default `desc` except `name` defaults `asc` when omitted)
- **Implementation:** `ActivityService.ListAsync` — apply sort before pagination; `registrationCount` requires join/subquery on registrations count (same pattern as list projection today)
- **Validation:** 400 on unknown sort field (mirror `ClientsController.ValidateListQuery`)
- **Test:** `ActivityServiceListSortTests` or extend existing activity list tests

### 4. Frontend API

- `fetchActivities` accepts `sortBy?: ActivitySortBy` and `sortDirection?: 'asc' | 'desc'`
- Pass through to API query string

### 5. Wire `activities-list-page.tsx`

- Replace local `search` / `categoryFilter` / `communityFilter` state with `searchParams` derivation
- `commitSearch` writes to URL (like clients)
- `updateCategoryFilter` / `updateCommunityFilter` write to URL
- Fetch effect depends on URL-derived values
- Selection reset on filter change (if any bulk select added later — N/A today)

## Out of scope

| Item | Story |
|------|-------|
| Page number in URL | Later / optional |
| Saved filter presets | Later |
| Table/list view toggle | Later |
| Sort by schedule string | Later (unstructured text) |
| Sort by status | Low value; skip v1 |
| EXPERIENCE.md operator doc | 24.5 |
| Dashboard activity table sort | Later |

## Acceptance criteria

1. **AC-24.4.1 — URL reflects all filters**  
   Given an operator sets search, status, community, category, and sort on `/activities`, the URL contains matching query params; refresh restores the same filtered view.

2. **AC-24.4.2 — Browser back/forward**  
   Given the operator changes filters and uses browser back, the list and controls match the previous URL state.

3. **AC-24.4.3 — Sort by name**  
   Given sort `name` asc, activities appear alphabetically by name across the full filtered set (server-side, paginated correctly).

4. **AC-24.4.4 — Sort by registrations**  
   Given sort `registrationCount` desc, highest-registration activities appear first.

5. **AC-24.4.5 — Default sort unchanged**  
   Given no sort params, list order matches today's `UpdatedAt` desc behavior.

6. **AC-24.4.6 — Recovery chips compatible**  
   Published-only / Free-a-slot chips still set `status=published` in URL without breaking other synced filters.

7. **AC-24.4.7 — Clear filters**  
   Clear resets URL to `/activities` (no query) and shows unfiltered list.

## Implementation notes

- **Files:** `activities-list-page.tsx`, `activities-api.ts`, `ActivityService.cs`, `IActivityService.cs`, `ActivitiesController.cs`, new/extended tests
- **Reference:** `clients-list-page.tsx` URL sync; 24.1 `syncStatusToUrl`
- **Types:** `ActivitySortBy = 'name' | 'createdAt' | 'updatedAt' | 'registrationCount'`

## Success metric

Operator bookmarks `/activities?status=published&sortBy=registrationCount&sortDirection=desc` and returns tomorrow to the same ranked view — or shares the link with a teammate.
