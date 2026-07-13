---
baseline_commit: 4daa64a
---

# Story 2.1: Activity Entity and Admin CRUD API

Status: done

## Story

As an operator,
I want to create, read, update, and archive Activities via the API,
So that I can manage my lead engines programmatically and from the UI.

## Acceptance Criteria

1. **AC-2.1.1 — Create activity (FR-1)**
   - **Given** I am authenticated
   - **When** I POST to create an Activity with name, category, schedule, location, status, and community label
   - **Then** the Activity is persisted with a stable UUID and unique slug for public URL
   - **And** archived Activities retain historical data but cannot accept new registrations

2. **AC-2.1.2 — List activities (FR-1)**
   - **Given** Activities exist
   - **When** I GET the activities list with status or category filters
   - **Then** results are paginated and filterable

## Tasks / Subtasks

- [x] **Task 1: Activity domain + persistence** (AC: 2.1.1)
  - [x] `Activity` entity with status enum (draft, published, archived)
  - [x] EF migration `AddActivities` with unique slug index

- [x] **Task 2: Activity service** (AC: 2.1.1, 2.1.2)
  - [x] Create with slug generation and collision suffix
  - [x] Get by id, paginated list with status/category filters
  - [x] Update metadata (blocked when archived)
  - [x] Archive endpoint sets status without deleting row

- [x] **Task 3: Admin API** (AC: 2.1.1, 2.1.2)
  - [x] `POST/GET/PUT /api/v1/admin/activities`
  - [x] `POST /api/v1/admin/activities/{id}/archive`
  - [x] JWT `[Authorize(Roles = Admin)]`

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build` succeeds

## Dev Notes

- Public registration rejection for archived activities ships with Epic 2/3 public endpoints
- Form schema JSONB column ships in Story 2.3
- Publish status machine refinements in Story 2.6

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Activities table with slug, metadata fields, and status
- Admin CRUD + archive under `/api/v1/admin/activities`
- Paginated list filters: `status`, `category`, `page`, `pageSize` (default 25)

### File List

- `src/Domain/Activities/Activity.cs`
- `src/Domain/Activities/ActivityStatus.cs`
- `src/Contracts/Activities/*.cs`
- `src/Application/Activities/IActivityService.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/ActivitySlugGenerator.cs`
- `src/Infrastructure/Activities/ActivityMapper.cs`
- `src/Infrastructure/Persistence/Configurations/ActivityConfiguration.cs`
- `src/Infrastructure/Persistence/LeadGenerationCrmDbContext.cs`
- `src/Infrastructure/Persistence/Migrations/*AddActivities*`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Api/Api.http`
- `README.md`

### Change Log

- 2026-06-18: Story 2.1 implemented — Activity entity and admin CRUD API

### Review Findings

- [x] [Review][Patch] Category filter is exact match and case-sensitive — `Category == normalizedCategory` misses `Tennis` vs `tennis` [src/Infrastructure/Activities/ActivityService.cs:77-80]
- [x] [Review][Patch] Unique slug constraint violation surfaces as 500 — concurrent creates with same slug race `EnsureUniqueSlugAsync` and throw unhandled `DbUpdateException` [src/Infrastructure/Activities/ActivityService.cs:41-42]

- [x] [Review][Defer] POST create accepts `status=published` without publish gate — Story 2.6 owns publish workflow [src/Infrastructure/Activities/ActivityService.cs:18]
- [x] [Review][Defer] Slug not regenerated when activity name changes — public URL stability; rename UX deferred [src/Infrastructure/Activities/ActivityService.cs:114]
- [x] [Review][Defer] AC-2.1.1 archived activities cannot accept registrations — enforcement ships with Epic 2/3 public registration endpoints
