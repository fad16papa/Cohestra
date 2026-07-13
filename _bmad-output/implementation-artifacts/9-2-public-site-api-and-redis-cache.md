---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.2: Public Site API and Redis Cache

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide for Epic 9 public read path -->

## Story

As a visitor,
I want the homepage configuration served quickly from a public API,
So that content updates without rebuilding the web container.

## Acceptance Criteria

1. **AC-9.2.1 — Public GET returns published site only (FR-2)**
   - **Given** a Site Page with published JSON
   - **When** `GET /api/v1/public/site` is called without authentication
   - **Then** response contains **published** sections document and `publishedAt` metadata only (never draft)
   - **And** endpoint is `[AllowAnonymous]`

2. **AC-9.2.2 — No published site returns 404**
   - **Given** no published Site Page (`PublishedSectionsJson` is null)
   - **When** `GET /api/v1/public/site` is called
   - **Then** API returns 404 (web env fallback is Story 9.4 — not this story)

3. **AC-9.2.3 — Redis cache with publish invalidation (FR-3, AD-4)**
   - **Given** a published Site Page
   - **When** public site is read repeatedly
   - **Then** published **sections** payload is served from Redis key `public:site:published` on cache hit
   - **And** cache entry uses 15-minute TTL with camelCase JSON (same serializer style as `RedisPublicActivityCache`)
   - **And** `POST /api/v1/admin/site/publish` invalidates the key and write-through refreshes cache on successful publish

4. **AC-9.2.4 — Upcoming activities in one round-trip (FR-11, AD-6)**
   - **Given** published activities with `ShowOnHomepage = true` and `Status = Published`
   - **When** `GET /api/v1/public/site` is called
   - **Then** response includes `upcomingActivities[]` with card fields (slug, name, schedule, location, communityLabel, heroImageUrl, accentColor)
   - **And** draft/archived/unpublished activities are excluded
   - **And** activities with `ShowOnHomepage = false` are excluded
   - **And** limit is read from enabled `upcomingActivities` section `props.limit` (default 6, clamp 3–12); if section disabled/missing, default limit 6
   - **And** upcoming activities are **always queried fresh from PostgreSQL** on each request (not stored in Redis) so homepage feed stays correct when activities change without republishing site

5. **AC-9.2.5 — Cache-Control header**
   - **Given** a successful public site response
   - **When** response is returned
   - **Then** `Cache-Control: public, max-age=60` is set (browser/CDN hint; Redis is authoritative app cache)

## Tasks / Subtasks

- [x] **Task 1: Contracts** (AC: 9.2.1, 9.2.4)
  - [x] Extend `PublicSiteResponse` with `UpcomingActivities` list
  - [x] Add `PublicHomepageActivityDto` (slug, name, schedule, location, communityLabel, heroImageUrl, accentColor)
  - [x] Keep existing `SiteSectionsDocumentDto Published` + `PublishedAt` fields

- [x] **Task 2: RedisPublishedSiteCache** (AC: 9.2.3)
  - [x] Add `src/Infrastructure/Site/RedisPublishedSiteCache.cs`
  - [x] Key: `public:site:published` (single-tenant; no deployment suffix for MVP)
  - [x] Methods: `GetAsync`, `SetAsync` (with 15-min TTL), `InvalidateAsync`
  - [x] Cache **published sections + publishedAt only** — not upcoming activities (see AC-9.2.4)
  - [x] Register singleton in `DependencyInjection.cs` (mirror `RedisPublicActivityCache`)

- [x] **Task 3: SitePageService public read** (AC: 9.2.1–9.2.4)
  - [x] Add `GetPublicAsync` to `ISitePageService` → returns `PublicSiteResponse?`
  - [x] Load singleton row; return null if `PublishedSections` is null (404 at controller)
  - [x] Cache-first for published sections; on miss load DB and `SetAsync`
  - [x] Add `LoadUpcomingActivitiesAsync` — query `Activities` where `Status == Published && ShowOnHomepage`, order by `UpdatedAt` descending (schedule is free-text; document in code comment), take limit from section props
  - [x] Parse `upcomingActivities` section limit from published JSON via `JsonElement` props (`limit` int)

- [x] **Task 4: Publish cache bust** (AC: 9.2.3)
  - [x] Inject `RedisPublishedSiteCache` into `SitePageService`
  - [x] On successful publish (including non-idempotent path): `InvalidateAsync` then write-through `SetAsync` with new published payload
  - [x] Idempotent publish (draft equals published) may skip cache write if already cached — optional optimization

- [x] **Task 5: PublicSiteController** (AC: 9.2.1, 9.2.2, 9.2.5)
  - [x] Add `src/Api/Controllers/V1/PublicSiteController.cs` → route `api/v1/public/site`
  - [x] `[AllowAnonymous]`, `[Produces("application/json")]`
  - [x] GET → `GetPublicAsync`; 404 when null; set Cache-Control header
  - [x] Follow `PublicActivitiesController` minimal style

- [x] **Task 6: Tests** (AC: all)
  - [x] Unit: upcoming activities filter (ShowOnHomepage, Published only) — in-memory EF
  - [x] Unit or integration: cache invalidate called on publish (mock/spy or integration with Redis if available)
  - [x] Integration: `GET /api/v1/public/site` returns 404 before publish, 200 after publish with activities
  - [x] `dotnet build`; run Infrastructure.Tests

## Dev Notes

### Architecture compliance (AD-4, AD-6)

- Redis key **`public:site:published`** — invalidate on site publish [Source: architecture-website-builder-epic-9-2026-07-06/ARCHITECTURE-SPINE.md AD-4]
- **Do not cache upcoming activities in Redis** — prevents stale unpublished activities on homepage (FR-11 / SM-2). Compose activities fresh each request.
- Public API reads **published column only** — never draft [AD-1]

### Cache design (differs slightly from activity cache)

| Aspect | Activity cache (2.11) | Site cache (9.2) |
|--------|----------------------|------------------|
| Key | `public:activity:{slug}` | `public:site:published` |
| TTL | None (explicit invalidation) | **15 minutes** + explicit invalidation on publish [addendum §4] |
| Payload | Full public activity | Published sections + `publishedAt` only |
| Invalidate on | Activity writes | Site **PublishAsync** |

Reuse patterns from `RedisPublicActivityCache.cs` — camelCase JSON, `WaitAsync(cancellationToken)`, corrupt JSON → delete key.

### Upcoming activities query (FR-11)

```csharp
// Pseudocode — implement in SitePageService or small helper
dbContext.Activities
  .Where(a => a.Status == ActivityStatus.Published && a.ShowOnHomepage)
  .OrderByDescending(a => a.UpdatedAt)  // schedule is display string; newest first acceptable for MVP
  .Take(limit)
```

Resolve `limit` from published sections JSON:

```json
{ "type": "upcomingActivities", "enabled": true, "props": { "limit": 6 } }
```

Clamp: `Math.Clamp(limit, 3, 12)`; default 6 when section absent/disabled.

Map to `PublicHomepageActivityDto`; reuse hero URL resolution if public activity responses use resolver — check `ActivityHeroImageUrlResolver` for absolute URLs on cards.

### Files from Story 9.1 — extend, do not duplicate

**Modify:**
- `src/Application/Site/ISitePageService.cs` — add `GetPublicAsync`
- `src/Infrastructure/Site/SitePageService.cs` — public read + publish cache hook
- `src/Contracts/Site/PublicSiteResponse.cs` — add upcoming activities
- `src/Infrastructure/DependencyInjection.cs` — register cache

**New:**
- `src/Infrastructure/Site/RedisPublishedSiteCache.cs`
- `src/Infrastructure/Site/PublishedSiteCacheEntry.cs` (optional internal DTO for cached sections+timestamp)
- `src/Contracts/Site/PublicHomepageActivityDto.cs`
- `src/Api/Controllers/V1/PublicSiteController.cs`
- `src/Infrastructure.Tests/Site/SiteUpcomingActivitiesQueryTests.cs` (or similar)
- `src/Api.IntegrationTests/PublicSiteIntegrationTests.cs`

### Previous story intelligence (9.1)

- Singleton access via `SitePage.SingletonId` and `GetOrCreateSingletonAsync` with **DbUpdateException retry** — public read should **not** create rows; use `FirstOrDefaultAsync` only, no insert on public path
- `SiteSectionsDocumentJson.SerializerOptions` for JSON parity
- `PublishAsync` already idempotent — add cache bust after `SaveChangesAsync`
- Integration tests use `SkipIfUnavailable`; clone `JsonElement` when building test DTOs

### Out of scope for 9.2

- Preview token endpoint `GET /api/v1/public/site/preview?token=` — Story 9.4
- Seed/migration from landing env — Story 9.3
- Next.js `/` runtime render — Story 9.4
- Website builder UI — Story 9.5
- Invalidating site cache on activity publish/unpublish — **not required** because activities are not cached in site Redis payload

### Testing

- Follow `AdminSiteIntegrationTests` + `CommunityCatalogIntegrationTests` patterns
- Minimum: unit tests for activity filter/limit; `dotnet build`
- Integration tests skip locally without stack — acceptable per project pattern

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 9.2]
- [Source: _bmad-output/planning-artifacts/prds/prd-website-builder-2026-07-06/prd.md — FR-2, FR-3, FR-11]
- [Source: _bmad-output/planning-artifacts/prds/prd-website-builder-2026-07-06/addendum.md — §3 API, §4 Caching]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-website-builder-epic-9-2026-07-06/ARCHITECTURE-SPINE.md — AD-4, AD-6]
- [Source: _bmad-output/implementation-artifacts/9-1-sitepage-entity-and-admin-api.md]
- [Source: _bmad-output/implementation-artifacts/2-11-redis-cache-for-published-activities.md]
- [Source: src/Infrastructure/Activities/RedisPublicActivityCache.cs]

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Added `GET /api/v1/public/site` via `PublicSiteController` with `Cache-Control: public, max-age=60`.
- `RedisPublishedSiteCache` caches published sections + `publishedAt` at key `public:site:published` (15-min TTL); invalidate + write-through on site publish.
- `GetPublicAsync` reads cache-first for sections; upcoming activities always loaded fresh from PostgreSQL via `SiteUpcomingActivitiesResolver`.
- Extended `PublicSiteResponse` with `UpcomingActivities` and `PublicHomepageActivityDto`; hero URLs resolved via `ActivityHeroImageUrlResolver`.
- Unit tests: 5 resolver tests + existing 6 validator tests (11 total Site tests passing). Integration tests added in `PublicSiteIntegrationTests`.
- `dotnet build` succeeds; full Infrastructure.Tests suite passes.
- Code review patches (2026-07-06): `ClearPublishedSiteAsync` for deterministic 404 test; robust Cache-Control assertions.

- Code review patches (2026-07-06): `ClearPublishedSiteAsync` for deterministic 404 test; robust Cache-Control assertions.

### File List

- src/Contracts/Site/PublicHomepageActivityDto.cs
- src/Contracts/Site/PublicSiteResponse.cs
- src/Application/Site/ISitePageService.cs
- src/Infrastructure/Site/PublishedSiteCacheEntry.cs
- src/Infrastructure/Site/RedisPublishedSiteCache.cs
- src/Infrastructure/Site/SiteUpcomingActivitiesResolver.cs
- src/Infrastructure/Site/SitePageService.cs
- src/Infrastructure/DependencyInjection.cs
- src/Api/Controllers/V1/PublicSiteController.cs
- src/Infrastructure.Tests/Site/SiteUpcomingActivitiesResolverTests.cs
- src/Api.IntegrationTests/PublicSiteIntegrationTests.cs

### Change Log

- 2026-07-06: Story 9.2 — public site API, Redis cache, upcoming activities composition, tests.
- 2026-07-06: Code review patches — integration test DB/cache reset, Cache-Control assertions.

## Senior Developer Review (AI)

**Review date:** 2026-07-06  
**Review outcome:** Approved (review patches applied 2026-07-06)  
**Scope:** Story 9.2 implementation files

### Review Findings

- [x] [Review][Patch] `PublicSite_Get_Returns404BeforePublish` is order-dependent on shared test DB [`src/Api.IntegrationTests/PublicSiteIntegrationTests.cs:19-27`] — fixed with `ClearPublishedSiteAsync` helper (clears DB published state + Redis cache).

- [x] [Review][Patch] Cache-Control integration assertion may be brittle [`src/Api.IntegrationTests/PublicSiteIntegrationTests.cs:79`] — fixed to assert `Public` and `MaxAge == 60`.

- [x] [Review][Defer] Upcoming activities returned when `upcomingActivities` section disabled [`SiteUpcomingActivitiesResolver.cs`] — AC 9.2.4 uses default limit when disabled; web render gating deferred to Story 9.4.

- [x] [Review][Defer] No dedicated unit test for `RedisPublishedSiteCache` corrupt-json/TTL — integration test covers populate path; acceptable MVP defer pattern.

### Action Items

- [x] [AI-Review][Medium] Harden 404-before-publish integration test for shared DB
- [x] [AI-Review][Low] Fix Cache-Control header assertion

### Acceptance Auditor Summary

| AC | Verdict |
|----|---------|
| 9.2.1 Published-only public GET | Pass |
| 9.2.2 404 when unpublished | Pass (logic correct; test setup fragile) |
| 9.2.3 Redis cache + publish invalidation | Pass |
| 9.2.4 Upcoming activities one round-trip | Pass |
| 9.2.5 Cache-Control header | Pass |
