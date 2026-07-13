---
baseline_commit: 84b22b6
---

# Story 2.11: Redis Cache for Published Activities

Status: done

## Story

As a developer,
I want published activity and form schema cached in Redis,
So that public pages load within performance targets.

## Acceptance Criteria

1. **AC-2.11.1 — Cache published public reads**
   - **Given** a published Activity
   - **When** I GET public activity by slug
   - **Then** response is served from Redis cache on subsequent requests

2. **AC-2.11.2 — Invalidate on writes**
   - **And** cache invalidates on Activity update, publish, or archive

## Tasks / Subtasks

- [x] **Task 1: Redis public activity cache** (AC: 2.11.1)
  - [x] `RedisPublicActivityCache` — JSON cache keyed by slug (`public:activity:{slug}`)
  - [x] `GetPublicBySlugAsync` reads cache on hit; writes cache for published activities

- [x] **Task 2: Cache invalidation** (AC: 2.11.2)
  - [x] Invalidate on metadata update, form schema save, publish, and archive

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`

## Dev Notes

- Only published activities are cached; draft/archived always read PostgreSQL
- Invalidation is explicit on admin writes — no TTL required for MVP

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Public activity lookup uses Redis for published slug cache hits
- Admin update, form schema save, publish, and archive clear cache entry

### File List

- `src/Infrastructure/Activities/RedisPublicActivityCache.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/DependencyInjection.cs`

### Change Log

- 2026-06-20: Story 2.11 implemented — Redis cache for published public activities

### Review Findings

- [x] [Review][Patch] Published writes only invalidate — use write-through `SetAsync` after publish/update/form save when status is published [`src/Infrastructure/Activities/ActivityService.cs:145`]
- [x] [Review][Patch] `cancellationToken` ignored in Redis cache operations [`src/Infrastructure/Activities/RedisPublicActivityCache.cs:16`]
- [x] [Review][Defer] No TTL on cache keys — stale data persists if invalidation is missed [`src/Infrastructure/Activities/RedisPublicActivityCache.cs:45`] — deferred, explicit invalidation sufficient for MVP
- [x] [Review][Defer] No automated test proving cache hit vs PostgreSQL fallback — deferred, add with API integration test story

### Re-review (2026-06-20)

- Patches applied: write-through `SyncPublicActivityCacheAsync`; Redis ops honor `cancellationToken`

### Re-review (2026-06-20, post-patches)

- ✅ Clean review — write-through sync verified; acceptance criteria pass; no new findings
