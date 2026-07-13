---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.3: Site Page Seed and Migration

Status: done

<!-- Ultimate context engine analysis completed — FR-17 migration safety for existing deployments -->

## Story

As an operator on an existing deployment,
I want my current landing page preserved when Website Builder ships,
So that thesocialcollectivesg.com never goes blank.

## Acceptance Criteria

1. **AC-9.3.1 — Seed from landing defaults (FR-17)**
   - **Given** no published Site Page exists (`SitePages` row missing OR `PublishedSectionsJson` is null)
   - **When** API startup seed runs after EF migrations
   - **Then** draft and published JSON are created from `site-landing-page.tsx` hardcoded defaults merged with API `SiteLanding` config (`LANDING_*` / `SiteLanding__*` env values)
   - **And** seeded document includes sections: `hero`, `highlights`, `upcomingActivities`, `howItWorks`, `footer` (schema version 1)

2. **AC-9.3.2 — Auto-publish on seed**
   - **Given** seed creates the initial Site Page
   - **When** seed completes
   - **Then** `PublishedSectionsJson` equals draft content, `PublishedAt` is set, and Redis published-site cache is write-through populated
   - **And** `GET /api/v1/public/site` returns 200 immediately after deploy (no manual publish required)

3. **AC-9.3.3 — Idempotent re-deploy (FR-17)**
   - **Given** a Site Page with non-null `PublishedSectionsJson` OR operator-edited draft (non-empty default)
   - **When** seed runs again on subsequent deploy/restart
   - **Then** existing draft and published payloads are **not** overwritten

4. **AC-9.3.4 — Config parity with web landing**
   - **Given** `LANDING_SITE_NAME`, `LANDING_TAGLINE`, `LANDING_EYEBROW`, `LANDING_DESCRIPTION`, `LANDING_OPERATOR_CTA` set on API container
   - **When** seed runs on fresh DB
   - **Then** hero `siteName`, `headline` (tagline), `eyebrow`, `description`, and operator CTA label match those values (same defaults as `web/lib/site-landing-config.ts`)

5. **AC-9.3.5 — Deploy docs note**
   - **Given** Website Builder is live
   - **When** operator reads deploy docs
   - **Then** `LANDING_*` vars are documented as **fallback-only** for pre-seed / disaster recovery (primary homepage source is published Site Page)

## Tasks / Subtasks

- [x] **Task 1: Seed settings + document builder** (AC: 9.3.1, 9.3.4)
  - [x] Add `SiteLandingSeedSettings` (`SiteName`, `Tagline`, `Description`, `Eyebrow`, `OperatorCtaLabel`, `AccentColor` optional)
  - [x] Bind section `SiteLanding` in `appsettings.json`; support env overrides `SiteLanding__SiteName` and document mapping from existing `LANDING_*` docker vars on **api** service
  - [x] Add `SitePageSeedDocumentBuilder` — builds `SiteSectionsDocument` matching addendum §2 + `site-landing-page.tsx` content (hero, 3 highlight cards, upcomingActivities, howItWorks, footer)

- [x] **Task 2: SitePageSeeder** (AC: 9.3.1–9.3.3)
  - [x] Add `SitePageSeeder.SeedAsync(IServiceProvider)` in `Infrastructure/Seed/`
  - [x] Skip when `PublishedSections` already set
  - [x] Skip when row exists with **non-default draft** (draft has non-empty `siteName` OR any sections — operator edited via admin)
  - [x] Otherwise insert/update singleton row: set draft + published to built document, set `PublishedAt`, `SchemaVersion = 1`
  - [x] Call `RedisPublishedSiteCache.SetAsync` after seed (reuse Story 9.2 cache)

- [x] **Task 3: Wire startup** (AC: 9.3.1, 9.3.2)
  - [x] Register settings in `DependencyInjection.cs`
  - [x] Invoke `await SitePageSeeder.SeedAsync(app.Services)` in `Program.cs` after `ApplyMigrationsAsync` and `OperatorSeeder` (before app accepts traffic)

- [x] **Task 4: Docker / config** (AC: 9.3.4, 9.3.5)
  - [x] Pass `SiteLanding__*` env vars to **api** service in `docker-compose.yml` and `docker-compose.uat.yml` (mirror existing `LANDING_*` values used by web)
  - [x] Update `docs/deploy/client-domain-thesocialcollectivesg.md` — `LANDING_*` fallback-only note

- [x] **Task 5: Tests** (AC: all)
  - [x] Unit: `SitePageSeedDocumentBuilder` maps settings → expected hero headline/eyebrow
  - [x] Unit: `SitePageSeeder` seeds when no row; skips when published exists; skips when draft edited
  - [x] Integration (optional/skippable): after fresh migrate + seed, `GET /api/v1/public/site` returns seeded site name
  - [x] `dotnet build`; run Infrastructure.Tests

## Dev Notes

### Seed idempotency rules (critical)

| DB state | Seeder action |
|----------|---------------|
| No `SitePages` row | Insert singleton with draft + published |
| Row exists, `PublishedSections` null, draft is **empty default** (`siteName` empty, `sections` empty — from Story 9.1 `GetOrCreateSingletonAsync`) | Populate draft + published |
| Row exists, `PublishedSections` set | **Skip** |
| Row exists, draft has content (operator saved via admin) | **Skip** — preserves AC-9.3.3 |

Empty-default detection should match Story 9.1 `CreateEmptyDraft()` shape.

### Document content source map

| `site-landing-page.tsx` | Site Page JSON |
|-------------------------|----------------|
| `config.siteName` | root `siteName` |
| `config.heroEyebrow` | hero `props.eyebrow` |
| `config.tagline` | hero `props.headline` |
| `config.description` | hero `props.description` |
| `config.operatorCtaLabel` | hero `secondaryCta` → `/login` |
| (default) "Browse events" | hero `primaryCta` → `scroll-upcoming` |
| `highlights[]` array (3 cards) | `highlights` section |
| — | `upcomingActivities` section (title, limit 6, emptyMessage) |
| "For community operators" block | `howItWorks` section (seed 3 steps from copy) |
| `poweredByLabel` | `footer` section |

Use `#c45c26` accent / `presetId: "community"` to match existing brand unless env override added later.

### Startup order (Program.cs today)

```csharp
await ApplyMigrationsAsync(app);
await OperatorSeeder.SeedAsync(app.Services);
// ADD: await SitePageSeeder.SeedAsync(app.Services);
```

Seeder must run **before** first public/admin request so empty singleton from admin GET does not block seed incorrectly — empty-default branch handles admin-created empty row.

### Previous story intelligence

- **9.1:** Singleton id `SitePage.SingletonId`; empty draft shape; `DbUpdateException` retry pattern for insert
- **9.2:** `RedisPublishedSiteCache` write-through on publish — seed must populate cache so public GET is warm
- **9.2 review:** `ClearPublishedSiteAsync` pattern in integration tests for resetting published state

### Files likely touched

**New:**
- `src/Infrastructure/Seed/SiteLandingSeedSettings.cs`
- `src/Infrastructure/Seed/SitePageSeedDocumentBuilder.cs`
- `src/Infrastructure/Seed/SitePageSeeder.cs`
- `src/Infrastructure.Tests/Seed/SitePageSeederTests.cs`
- `src/Infrastructure.Tests/Seed/SitePageSeedDocumentBuilderTests.cs`

**Modified:**
- `src/Api/Program.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/appsettings.json`
- `docker-compose.yml`, `docker-compose.uat.yml`
- `docs/deploy/client-domain-thesocialcollectivesg.md`

### Out of scope for 9.3

- Next.js `/` runtime fetch (Story 9.4)
- Website builder UI (Story 9.5)
- Removing `getSiteLandingConfig()` from web (Story 9.4 keeps env fallback until runtime render ships)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 9.3]
- [Source: _bmad-output/planning-artifacts/prds/prd-website-builder-2026-07-06/prd.md — FR-17]
- [Source: _bmad-output/planning-artifacts/prds/prd-website-builder-2026-07-06/addendum.md — §5 Migration]
- [Source: web/lib/site-landing-config.ts]
- [Source: web/components/marketing/site-landing-page.tsx]
- [Source: src/Infrastructure/Auth/OperatorSeeder.cs — skip-if-exists pattern]
- [Source: _bmad-output/implementation-artifacts/9-2-public-site-api-and-redis-cache.md]

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Seeded landing defaults from `SiteLandingSeedSettings` (config + `LANDING_*` env fallback) into singleton Site Page on API startup
- Auto-publishes on first seed with Redis write-through via `IPublishedSiteCache`
- Idempotent: skips when published exists or operator draft is non-empty
- Added `IPublishedSiteCache` abstraction for testability (Redis impl unchanged)
- 13 seed-related unit tests pass; integration test deferred (optional per story)
- Code review (2026-07-06): race retry on concurrent insert, cache warm failure non-fatal, operator-focused howItWorks steps; 15 unit tests pass

### File List

- `src/Infrastructure/Seed/SiteLandingSeedSettings.cs` (new)
- `src/Infrastructure/Seed/SitePageSeedDocumentBuilder.cs` (new)
- `src/Infrastructure/Seed/SitePageSeeder.cs` (new)
- `src/Infrastructure/Site/IPublishedSiteCache.cs` (new)
- `src/Infrastructure/Site/RedisPublishedSiteCache.cs` (modified)
- `src/Infrastructure/Site/SitePageService.cs` (modified)
- `src/Infrastructure/DependencyInjection.cs` (modified)
- `src/Api/Program.cs` (modified)
- `src/Api/appsettings.json` (modified)
- `docker-compose.yml` (modified)
- `docker-compose.uat.yml` (modified)
- `docs/deploy/client-domain-thesocialcollectivesg.md` (modified)
- `src/Infrastructure.Tests/Seed/SitePageSeedDocumentBuilderTests.cs` (new)
- `src/Infrastructure.Tests/Seed/SitePageSeederTests.cs` (new)

### Change Log

- 2026-07-06: Story 9.3 — site page seed from landing defaults, auto-publish, Redis cache warm, deploy docs
- 2026-07-06: Code review patches — insert race retry, resilient cache warm, operator howItWorks copy

### Review Findings

- [x] [Review][Patch] Race catch should retry seed update instead of rethrowing [src/Infrastructure/Seed/SitePageSeeder.cs:62-74] — On concurrent INSERT, loser reloads an empty-draft row from another instance and re-throws `DbUpdateException`, crashing startup instead of falling through to the update path.
- [x] [Review][Patch] Cache write failure must not crash startup after successful DB seed [src/Infrastructure/Seed/SitePageSeeder.cs:77-80] — Unhandled exception from `SetAsync` after `SaveChangesAsync` succeeds leaves DB seeded but aborts host boot; wrap cache calls in try/catch with warning log (DB self-heals on next GET).
- [x] [Review][Patch] `howItWorks` steps copy consumer highlights text [src/Infrastructure/Seed/SitePageSeedDocumentBuilder.cs:63-89] — Steps duplicate highlights card copy under "For community operators" heading; should use operator-focused step copy per story content map.
- [x] [Review][Defer] No integration test for startup seed → `GET /api/v1/public/site` 200 — optional/skippable per story Task 5; defer to CI Postgres/Redis stack.
- [x] [Review][Defer] `DbUpdateException` retry branch untestable with InMemory EF — requires Postgres integration test or test double; defer with EC-09 pattern from 9-1/9-2.
- [x] [Review][Defer] `PoweredByLabel` / `AccentColor` have no flat `LANDING_*` fallback — not listed in AC-9.3.4; docker-compose sets `SiteLanding__*` literals; defer unless operators need flat env parity.
