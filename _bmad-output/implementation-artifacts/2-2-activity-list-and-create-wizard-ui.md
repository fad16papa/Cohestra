---
baseline_commit: 4daa64a
---

# Story 2.2: Activity List and Create Wizard UI

Status: done

## Story

As an operator,
I want to browse Activities and start a create wizard,
So that I can launch new lead engines quickly.

## Acceptance Criteria

1. **AC-2.2.1 — Activities list (UX-DR7)**
   - **Given** I am on `/activities`
   - **When** the page loads
   - **Then** I see a searchable/filterable Activity list with ActivityCard components
   - **And** a "New activity" CTA navigates to `/activities/new`

2. **AC-2.2.2 — Create metadata step (UX-DR25 step A)**
   - **Given** I am on `/activities/new`
   - **When** I complete metadata step (name, community, category, schedule, location, draft status)
   - **Then** the Activity is saved as draft

## Tasks / Subtasks

- [x] **Task 1: Activities API client** (AC: 2.2.1, 2.2.2)
  - [x] `lib/activities-api.ts` with list, get, create helpers using `authFetch`

- [x] **Task 2: ActivityCard + list page** (AC: 2.2.1)
  - [x] `ActivityCard` with name, community tag, status pill, registration count placeholder
  - [x] `/activities` with search, status filter, category filter, grid layout
  - [x] "New activity" CTA

- [x] **Task 3: Create wizard step A** (AC: 2.2.2)
  - [x] `/activities/new` metadata form posts draft activity
  - [x] Redirect to `/activities/{id}` on success

- [x] **Task 4: Dashboard + detail wiring** (AC: 2.2.1 partial)
  - [x] Dashboard empty state only when `totalCount === 0`
  - [x] Minimal `/activities/[id]` detail shell for post-create navigation

- [x] **Task 5: Verify build** (AC: all)
  - [x] `npm run build` and `npm run lint` pass

## Dev Notes

- Client-side search filters the loaded result set (max 100 most recently updated); server search and pagination ship in a later story
- Registration counts show `0` until Epic 3 ingestion exists
- Form configuration wizard steps B/C ship in Stories 2.3–2.6

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Activity list uses authenticated admin activities API with status/category filters
- Create form saves draft via POST and routes to activity detail placeholder
- Dashboard checks activity count before showing empty state

### File List

- `web/lib/activities-api.ts`
- `web/components/activities/activity-card.tsx`
- `web/components/activities/activity-status-badge.tsx`
- `web/components/activities/activities-list-page.tsx`
- `web/components/activities/create-activity-form.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/components/dashboard/dashboard-page-client.tsx`
- `web/app/(admin)/activities/page.tsx`
- `web/app/(admin)/activities/new/page.tsx`
- `web/app/(admin)/activities/[id]/page.tsx`
- `web/app/(admin)/dashboard/page.tsx`

### Change Log

- 2026-06-18: Story 2.2 implemented — activity list, create wizard step A, dashboard empty-state wiring

### Review Findings

- [x] [Review][Decision] Search scope for AC-2.2.1 — resolved **C (MVP)**: client-only search on loaded page; banner when `totalCount > 100`
- [x] [Review][Patch] List loads only first 100 activities — MVP cap notice + helper text added [web/components/activities/activities-list-page.tsx]
- [x] [Review][Patch] Category filter refetches on every keystroke — 300ms debounce before API fetch [web/components/activities/activities-list-page.tsx]

- [x] [Review][Defer] Registration counts hardcoded to 0 on ActivityCard — Epic 3 ingestion not built yet [web/components/activities/activity-card.tsx:22]
