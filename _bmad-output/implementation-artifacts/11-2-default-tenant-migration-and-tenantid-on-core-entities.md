---
baseline_commit: acebe70826445eb951fce203fd1e2570d28c202a
---

# Story 11.2: Default-tenant migration and TenantId on core entities

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a developer preserving Platform 0 data,
I want a safe migration that seeds a `default` tenant and backfills `TenantId`,
so that existing rows stay usable and all business entities become tenant-owned.

## Acceptance Criteria

1. **Given** a database with Platform 0 tables and no tenancy on business rows  
   **When** the migration runs  
   **Then** a seeded `default` tenant exists in `tenants` (`Slug = "default"`)  
   **And** core business tables gain nullable `TenantId`, all existing rows backfill to that default tenant, then `TenantId` becomes NOT NULL

2. **Given** entities that must be tenant-scoped (Activity, Client, Registration, Campaign, Community, Category, SitePage, EmailTemplate, **and** CampaignAsset, CampaignRecipient, ClientTimelineEvent, SiteHomepageTemplate)  
   **When** the migration completes  
   **Then** each has a non-nullable `TenantId` FK → `tenants`  
   **And** composite unique constraints that need tenant scope include `TenantId` (e.g. Activities `(TenantId, Slug)`)

3. **Given** SitePage previously treated as a singleton  
   **When** tenancy is applied  
   **Then** `UNIQUE (TenantId)` applies on SitePages (Epic 9 singleton retired per AD-4)  
   **And** app code stops relying on `SitePage.SingletonId` as the sole lookup key (tenant-scoped get-or-create using default tenant for Platform 0 continuity)

4. **Given** local Docker / `cohestra-infra`  
   **When** migrate + app start against existing data  
   **Then** the stack still boots with the default tenant  
   **And** no destructive wipe of prior rows

5. **Given** EF Core configuration after migration  
   **When** `ITenantScoped` (or equivalent) is introduced  
   **Then** tenant-owned entities implement it / carry `TenantId`  
   **And** they are ready for global query filters in Epic 13 **without another schema rewrite**  
   **And** global query filters are **NOT enabled** in this story

## Tasks / Subtasks

- [x] Domain: `TenantId` + `ITenantScoped` (AC: 2, 5)
  - [x] Add `src/Domain/Tenants/ITenantScoped.cs` with `Guid TenantId { get; set; }`
  - [x] Add `TenantId` to: Activity, Client, Registration, Campaign, Community, Category, SitePage, EmailTemplate, CampaignAsset, CampaignRecipient, ClientTimelineEvent, SiteHomepageTemplate
  - [x] Implement `ITenantScoped` on those entities
  - [x] Do **not** add TenantId to `Tenant` itself; do **not** enable EF global filters

- [x] Seed default tenant + migration (AC: 1, 2, 3, 4)
  - [x] Define a stable well-known default tenant Guid (document constant e.g. `TenantIds.Default` or seed Guid in Domain/Infrastructure) — used by migration backfill and seeders
  - [x] New EF migration after `20260720153445_AddTenants` that:
    1. Inserts `default` tenant row if missing (`Slug=default`, `Name` sensible e.g. "Default", `Plan=Basic`, `Status=Active`, `BillingStatus=Free`, timestamps UTC now)
    2. Adds nullable `TenantId` columns to all business tables
    3. Backfills all rows to default tenant Id
    4. Sets NOT NULL + FK to `tenants`
    5. Drops global unique indexes that must become tenant-scoped; creates composites (see Dev Notes table)
    6. Adds `UNIQUE (TenantId)` on `site_pages`
  - [x] Prefer a carefully authored migration (or `dotnet ef migrations add` then edit `Up` for InsertData/backfill order) — verify Up/Down order is safe

- [x] EF configurations (AC: 2, 3, 5)
  - [x] Update each `*Configuration.cs` for `TenantId` required, FK, and new indexes
  - [x] Activity: unique `(TenantId, Slug)` — drop sole `Slug` unique
  - [x] Client: unique `(TenantId, NormalizedPhone)` / `(TenantId, NormalizedEmail)` with same null filters
  - [x] Community / Category: unique `(TenantId, Name)`
  - [x] Registration: unique `(TenantId, RegistrationNumber)`; keep `(ClientId, ActivityId)` unique
  - [x] SitePage: unique `(TenantId)` per AD-4
  - [x] CampaignRecipient: keep `(CampaignId, ClientId)` unique (parents already tenant-scoped)

- [x] Retire SingletonId usage (AC: 3, 4)
  - [x] Update `SitePageService` / `SitePageSeeder` to resolve SitePage by current/default `TenantId` (not only `SingletonId`)
  - [x] Keep or deprecate `SitePage.SingletonId` constant — if kept, document as legacy; new rows may keep that Id for the default tenant only if that eases migration, but lookups must be tenant-scoped
  - [x] Fix `Infrastructure.Tests/Seed/SitePageSeederTests` and `Api.IntegrationTests` SitePage assumptions

- [x] Seeders & tests (AC: 4)
  - [x] `DemoDataSeeder` (and any create paths in tests) set `TenantId` on inserts to default tenant
  - [x] Unit/integration tests that new entities without TenantId — compile/fix failures fixed
  - [x] Add focused test(s): after migrate (or InMemory model), Activity slug unique is per-tenant; SitePage has unique TenantId index
  - [x] Run `dotnet test src/Infrastructure.Tests` and relevant Api.IntegrationTests if stack available — do not delete Platform 0 tests (SM-4)

- [x] Out of scope
  - [x] No TenantResolutionMiddleware / JWT tenant_id (Epic 12–13)
  - [x] No EF global query filters enabled (Epic 13.2)
  - [x] No Platform Admin API / signup / Stripe
  - [x] No Midnight Atelier / web marketing work

### Review Findings

_Group A CR (domain / configs / SitePage / DbContext) — 2026-07-20 — patches applied._

- [x] [Review][Patch] Update `SitePage.SingletonId` XML doc to legacy/default-tenant wording [src/Domain/Site/SitePage.cs:7]
- [x] [Review][Patch] Set explicit `TenantId = TenantIds.Default` on `DemoDataSeeder` inserts [src/Infrastructure/Seed/DemoDataSeeder.cs] — story task claims done; ChangeTracker defaulting covers SaveChanges but seeder still omits TenantId
- [x] [Review][Defer] No parent/child `TenantId` alignment invariant [CampaignRecipient/Registration/ClientTimelineEvent] — deferred, Epic 13 filters / later integrity
- [x] [Review][Defer] SitePage create still hardcodes `SingletonId` PK — deferred, multi-tenant SitePage create beyond Platform 0 continuity
- [x] [Review][Defer] `ApplyDefaultTenantIds` does not cover `ExecuteUpdate`/bulk/raw SQL — deferred, known EF ChangeTracker gap
- [x] [Review][Defer] Parent `TenantId` change does not sync dependent children — deferred, no tenant-move story yet

_Group B CR (migration + tests) — 2026-07-20._

- [ ] [Review][Patch] After seeding `default` tenant, assert well-known Id exists before TenantId FKs [`20260720162131_AddTenantIdToBusinessEntities.cs:15-19`] — `ON CONFLICT (Slug) DO NOTHING` can skip insert when Slug exists with a different Id; column defaults still use `11111111-…`
- [ ] [Review][Patch] Drop PostgreSQL column `DEFAULT` on `TenantId` after backfill [`AddTenantIdToBusinessEntities` Up] — `AddColumn(..., defaultValue:)` leaves a DB default; AD-9 end state is NOT NULL without silent default (app uses `ApplyDefaultTenantIds`)
- [x] [Review][Defer] `Down()` does not delete seeded `default` tenant — deferred, safer than wipe; incomplete reverse of seed only
- [x] [Review][Defer] No PostgreSQL test executes migration SQL — deferred, story allows InMemory model tests
- [x] [Review][Defer] Model tests cover only Activity slug + SitePage unique TenantId — deferred, story-required coverage met; other composites untested
- [x] [Review][Defer] `Down()` recreating global uniques unsafe if multi-tenant rows exist — deferred, Platform 0 single-tenant rollback path only

## Dev Notes

### Previous story intelligence (11.1)

- `tenants` table + unique Slug already shipped (`AddTenants`). **Default tenant row was deferred to this story.**
- `Tenant` defaults: `Status=Active`, `Plan=Basic`, `BillingStatus=Free`.
- Access matrix lives in `TenantAccessEvaluator` — not needed for migration logic.
- CR decision: Active+Canceled is Blocked — irrelevant to backfill.
- Pattern: Domain POCOs, fluent configs, `dotnet ef` with `DOTNET_ROOT=/home/ubuntu/.dotnet` in this environment.

### Architecture compliance

| AD | Implication |
|----|-------------|
| AD-1 | Non-nullable `TenantId` FK on all tenant-owned tables |
| AD-4 | `UNIQUE (TenantId)` on SitePages; retire singleton model |
| AD-5 | `UNIQUE (TenantId, Slug)` on Activities |
| AD-9 | Nullable → backfill → NOT NULL; no destructive wipe |

[Source: `architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md`]

### Entities requiring TenantId (complete list)

| Entity | Table | Unique index change |
|--------|-------|---------------------|
| Activity | activities | Slug → `(TenantId, Slug)` |
| Client | clients | NormalizedPhone/Email → tenant-scoped + same filters |
| Registration | registrations | RegistrationNumber → `(TenantId, RegistrationNumber)` |
| Community | communities | Name → `(TenantId, Name)` |
| Category | categories | Name → `(TenantId, Name)` |
| Campaign | campaigns | TenantId FK + index optional |
| EmailTemplate | email_templates | TenantId FK; optional `(TenantId, Name)` unique |
| CampaignAsset | campaign_assets | TenantId FK |
| CampaignRecipient | campaign_recipients | TenantId FK; keep (CampaignId, ClientId) unique |
| ClientTimelineEvent | client_timeline_events | TenantId FK |
| SitePage | site_pages | **`UNIQUE (TenantId)`** |
| SiteHomepageTemplate | site_homepage_templates | TenantId FK |

### Recommended migration order (Up)

```text
1. INSERT default tenant (fixed Guid, Slug='default') — idempotent if exists
2. ADD COLUMN "TenantId" uuid NULL on each business table
3. UPDATE ... SET "TenantId" = @default WHERE "TenantId" IS NULL
4. ALTER COLUMN "TenantId" SET NOT NULL
5. ADD FK TenantId → tenants(Id)
6. DROP old unique indexes; CREATE tenant-scoped uniques
7. CREATE UNIQUE INDEX on site_pages (TenantId)
```

Use the **same Guid** in C# constant and SQL insert so seeders/tests match.

### SingletonId retirement strategy

Today `SitePageService` / `SitePageSeeder` use `SitePage.SingletonId`. After this story:

- Default tenant owns the existing singleton row: backfill sets its `TenantId` = default (row Id may remain `SingletonId` Guid — OK).
- Lookups: `Where(p => p.TenantId == tenantId)` (for now hardcode/resolvable default until Epic 13 middleware).
- Do not create a second SitePage for default tenant.

### Anti-patterns — do NOT

- Enable EF global query filters yet (breaks unscoped Platform 0 code until middleware lands)
- Schema-per-tenant
- Wipe DemoData / SitePage on migrate
- Leave Activity.Slug globally unique
- Skip CampaignAsset / Timeline / HomepageTemplate (orphan tables without TenantId)
- Add Stripe / Platform Admin APIs

### Project Structure Notes

```text
src/Domain/Tenants/ITenantScoped.cs          # NEW
src/Domain/Tenants/TenantIds.cs              # NEW optional well-known Default Guid
src/Domain/{Activities,Clients,...}/*.cs     # UPDATE + TenantId
src/Infrastructure/Persistence/Configurations/*.cs  # UPDATE indexes
src/Infrastructure/Persistence/Migrations/*AddTenantId*.cs  # NEW
src/Infrastructure/Site/SitePageService.cs   # UPDATE lookups
src/Infrastructure/Seed/SitePageSeeder.cs    # UPDATE
src/Infrastructure/Seed/DemoDataSeeder.cs    # UPDATE TenantId on create
src/Infrastructure.Tests/...                 # UPDATE / NEW index tests
```

### Testing requirements

- Model/index assertions (InMemory or migration test) for Activity `(TenantId,Slug)` and SitePage `(TenantId)` unique
- Existing Infrastructure.Tests must compile and pass after TenantId required
- SM-4: do not delete Platform 0 tests to go green
- Integration tests that create SitePage/Activity: set TenantId = default

### Project context reference

Read `_bmad-output/project-context.md`: brownfield extend-only; TenantId on entities; filters later; no greenfield rewrite.

### Git intelligence

- Latest: Story 11.1 done (`Tenant` + `AddTenants` + access evaluator patches).
- Next implementable after this story file: Dev Story 11.2.

### References

- [Source: `epics-cohestra-enterprise.md` — Story 11.2]
- [Source: `11-1-tenant-entity-with-dual-status-dials.md` — prior learnings]
- [Source: ARCHITECTURE-SPINE AD-1, AD-4, AD-5, AD-9]
- [Source: `addendum.md` migration strategy]
- [Source: Configurations under `src/Infrastructure/Persistence/Configurations/`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

- `dotnet test src/Infrastructure.Tests` — 142 passed
- `dotnet ef migrations add AddTenantIdToBusinessEntities` + seed default tenant SQL
- `dotnet build src/Api` — succeeded

### Completion Notes List

- Added `ITenantScoped` + `TenantIds.Default`; TenantId on all Platform 0 business entities.
- EF: composite uniques (Activity slug, Client contacts, Community/Category names, Registration number); SitePage UNIQUE(TenantId).
- Migration seeds `default` tenant then backfills TenantId via column default = Default Guid + FKs.
- SitePageService/Seeder resolve by TenantId (AD-4); legacy SingletonId kept as default-tenant row Id.
- DbContext SaveChanges fills empty TenantId with Default until Epic 12–13 context.
- Global query filters NOT enabled.

### File List

- src/Domain/Tenants/ITenantScoped.cs
- src/Domain/Tenants/TenantIds.cs
- src/Domain/Activities/Activity.cs
- src/Domain/Activities/Community.cs
- src/Domain/Activities/Category.cs
- src/Domain/Clients/Client.cs
- src/Domain/Clients/ClientTimelineEvent.cs
- src/Domain/Registrations/Registration.cs
- src/Domain/Campaigns/Campaign.cs
- src/Domain/Campaigns/EmailTemplate.cs
- src/Domain/Campaigns/CampaignAsset.cs
- src/Domain/Campaigns/CampaignRecipient.cs
- src/Domain/Site/SitePage.cs
- src/Domain/Site/SiteHomepageTemplate.cs
- src/Infrastructure/Persistence/CohestraDbContext.cs
- src/Infrastructure/Persistence/Configurations/*.cs (tenant-scoped entities)
- src/Infrastructure/Persistence/Migrations/20260720162131_AddTenantIdToBusinessEntities.cs
- src/Infrastructure/Persistence/Migrations/20260720162131_AddTenantIdToBusinessEntities.Designer.cs
- src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs
- src/Infrastructure/Site/SitePageService.cs
- src/Infrastructure/Seed/SitePageSeeder.cs
- src/Infrastructure/Seed/DemoDataSeeder.cs
- src/Infrastructure.Tests/Seed/SitePageSeederTests.cs
- src/Infrastructure.Tests/Tenants/TenantIdModelTests.cs
- src/Api.IntegrationTests/PublicSiteIntegrationTests.cs

## Change Log

- 2026-07-20: Story context created (ready-for-dev)
- 2026-07-20: Implemented default-tenant migration + TenantId on core entities — status → review
- 2026-07-20: Group A CR patches applied (SitePage doc + DemoDataSeeder TenantId); Group B CR still pending
