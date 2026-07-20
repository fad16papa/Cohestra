---
baseline_commit: fd50bef1acc2c756d60eede7998d6fdc30d09259
---

# Story 11.1: Tenant entity with dual status dials

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Platform operator,
I want a Tenant domain model with operational Status and BillingStatus,
so that every workspace has a clear lifecycle and access can be computed from Status ∩ BillingStatus.

## Acceptance Criteria

1. **Given** the Domain layer  
   **When** `Tenant` is introduced  
   **Then** it includes at least: `Id`, `Slug` (unique), `Name`, `Plan` ∈ {Basic, Core, Pro, Enterprise}, `Status` ∈ {Active, Suspended, Archived}, `BillingStatus` ∈ {Free, Trialing, Active, PastDue, OnHold, Canceled}, and nullable Stripe/billing fields (`StripeCustomerId`, `StripeSubscriptionId`, `BillingInterval`, `TrialEndsAt`, `DelinquencyStartedAt`) ready for later epics without requiring Stripe wiring yet  
   **And** slug uniqueness is enforced at the model/persistence level

2. **Given** an access-evaluation helper (or documented matrix implementation)  
   **When** Status/BillingStatus combinations are evaluated  
   **Then** they match PRD FR-3: Active + Free/Trialing/Active/PastDue → full access (PastDue may show settle banner later); Active + OnHold → read-only; Suspended + any → blocked; Archived + any → blocked  
   **And** Suspended always wins over billing

3. **Given** a new Tenant is created in code/tests  
   **When** defaults are applied  
   **Then** `Status=Active` and Basic tenants default `Plan=Basic` / `BillingStatus=Free` unless otherwise specified

4. **Given** unit tests for the access matrix  
   **When** the suite runs  
   **Then** Suspended blocks admin/public access regardless of `BillingStatus=Active`  
   **And** OnHold does not change `Status` away from Active

## Tasks / Subtasks

- [x] Domain model (AC: 1, 3)
  - [x] Add `src/Domain/Tenants/Tenant.cs` — POCO matching existing Domain style (`Guid Id`, no EF attributes)
  - [x] Add enums: `TenantPlan`, `TenantStatus`, `BillingStatus`, `BillingInterval` (files per spine: `Tenants/TenantPlan.cs`, `Tenants/TenantStatus.cs`, `Billing/BillingStatus.cs`, `Billing/BillingInterval.cs` or co-locate under `Tenants/` if Billing folder feels empty — prefer spine paths)
  - [x] Property defaults: `Status=Active`; for Basic path `Plan=Basic`, `BillingStatus=Free`; `CreatedAt`/`UpdatedAt` as `DateTimeOffset`
  - [x] Nullable billing foreshadow only: `StripeCustomerId`, `StripeSubscriptionId`, `BillingInterval?`, `TrialEndsAt?`, `DelinquencyStartedAt?` — **no Stripe.NET package**
  - [x] Do **not** add `IsComplimentary` here (Story 11.5); do **not** add `TenantMembership` (Epic 12); do **not** add `TenantId` to Activity/Client/etc. (Story 11.2)

- [x] Access matrix helper (AC: 2, 4)
  - [x] Add pure Domain evaluator e.g. `TenantAccessEvaluator` / `TenantAccess.Evaluate(TenantStatus, BillingStatus)` returning admin access + public registration allowance (and preferably public surface mode: Available / Maintenance / NotFound)
  - [x] Encode FR-3 table exactly; Suspended wins over any `BillingStatus`
  - [x] Do **not** mutate `Tenant.Status` when evaluating OnHold — OnHold is billing-only read-only while Status stays Active
  - [x] `ReadOnly_OverLimit` (FR-24) is **out of scope** for this matrix — document as future access overlay, do not invent a fake BillingStatus value

- [x] Persistence (AC: 1)
  - [x] Add `DbSet<Tenant> Tenants` to `CohestraDbContext`
  - [x] Add `TenantConfiguration : IEntityTypeConfiguration<Tenant>` → table `"tenants"`, unique index on `Slug`, enum → string conversions (match `ActivityConfiguration`)
  - [x] EF migration for `tenants` table only (not TenantId backfill — that is 11.2)
  - [x] Optional: InMemory unique-slug smoke test or configuration assertion — not required if migration + unique index are clear

- [x] Unit tests (AC: 2, 3, 4)
  - [x] Add `src/Infrastructure.Tests/Tenants/TenantAccessEvaluatorTests.cs` (preferred — matches existing test home; Domain.Tests project does not exist)
  - [x] Theory/matrix cases: every Status × BillingStatus combo that matters; Suspended + BillingStatus.Active → blocked; Active + OnHold → read-only admin, public reg false, Status remains Active; Active + PastDue → full (banner later)
  - [x] Default construction test: new Tenant → Active + Basic + Free
  - [x] Run `dotnet test src/Infrastructure.Tests/Infrastructure.Tests.csproj --filter Tenants` (or full unit suite)

- [x] Out of scope guardrails
  - [x] No Platform Admin API / UI
  - [x] No middleware / JWT / Redis tenancy
  - [x] No web / Midnight Atelier work
  - [x] No seed of `default` tenant yet (11.2) — entity + empty table is enough

### Review Findings

- [x] [Review][Patch] Active+Canceled → Blocked (fail-closed) — decided 2026-07-20; remove Canceled from Full OR-group; update tests [TenantAccessEvaluator.cs]
- [x] [Review][Patch] Null-tenant guard on `Evaluate(Tenant)` [TenantAccessEvaluator.cs:21]
- [x] [Review][Patch] Undefined `TenantStatus` (non-defined enum cast) falls into Active billing matrix — fail-closed Blocked [TenantAccessEvaluator.cs:26-71]
- [x] [Review][Patch] Add unit test for unknown/`_` BillingStatus arm on Active [TenantAccessEvaluatorTests.cs]
- [x] [Review][Defer] Empty/whitespace slug format validation [Tenant.cs / TenantConfiguration.cs] — deferred, pre-existing (FR-1 signup / 11.3 provision)
- [x] [Review][Defer] CreatedAt/UpdatedAt auto-stamp on insert [Tenant.cs] — deferred, pre-existing (write path in 11.2/11.3; matches Activity pattern)
- [x] [Review][Defer] StripeCustomerId/SubscriptionId unique indexes [TenantConfiguration.cs] — deferred, pre-existing (Epic 14 billing)

## Dev Notes

### Epic context

Epic 11 establishes tenant workspaces and Platform Control. **11.1 is the domain foundation** — dual dials and access math — before migration (11.2), Platform Admin lifecycle (11.3), directory (11.4), and complimentary flag (11.5). Later epics depend on these types; wrong enum names or access semantics will cascade.

### Architecture compliance (must follow)

| AD | Implication for 11.1 |
|----|----------------------|
| AD-1 | Tenants table is the FK target for later `TenantId` columns — design `Tenant.Id` as `Guid` |
| AD-8 | `TenantPlan` ∈ Basic, Core, Pro, Enterprise |
| AD-11 | Dual dials: access = `Status` ∩ `BillingStatus`; Suspended always wins; OnHold keeps Status=Active |
| Structural seed | `Domain/Tenants/Tenant.cs`, `TenantPlan.cs`, `Billing/BillingStatus.cs` |

[Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-1, AD-8, AD-11, Structural Seed]

### FR-3 access matrix (implement exactly)

| Tenant.Status | BillingStatus | Admin | Public registration | Public surface |
|---------------|---------------|-------|---------------------|----------------|
| Active | Free / Trialing / Active / PastDue | Full | Yes | Available |
| Active | OnHold | Read-only | No | Available (or blocked for reg only — admin read-only) |
| Suspended | *any* | Blocked | No | Maintenance |
| Archived | *any* | Blocked | No | NotFound (404) |

PastDue: full access now; settle banner is Epic 14 UI — evaluator may expose a flag `ShowSettleBanner` for PastDue or leave that to later.

### Brownfield code patterns (match these)

**Domain entity style** — plain POCO, no EF attributes:

```csharp
// Pattern from src/Domain/Activities/Activity.cs
public class Tenant
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TenantPlan Plan { get; set; } = TenantPlan.Basic;
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public BillingStatus BillingStatus { get; set; } = BillingStatus.Free;
    // nullable Stripe foreshadow...
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
```

**EF configuration style** — `internal sealed`, snake table, string enums, unique slug:

- Mirror `src/Infrastructure/Persistence/Configurations/ActivityConfiguration.cs`
- Register via existing `ApplyConfigurationsFromAssembly` — no manual OnModelCreating listing

**DbContext** — add `DbSet` next to other sets in `src/Infrastructure/Persistence/CohestraDbContext.cs`

**Tests** — xUnit in `Infrastructure.Tests`; project already references Infrastructure → Domain. Pure Domain helper can be tested without InMemory DB.

### Suggested type names (avoid collisions)

| Concept | Prefer | Avoid |
|---------|--------|-------|
| Operational status | `TenantStatus` | `Status` as type name (clashes mentally with ActivityStatus) |
| Plan | `TenantPlan` | `Plan` alone if ambiguous |
| Billing money state | `BillingStatus` in `Cohestra.Domain.Billing` | Reusing `TenantStatus` |
| Access result | `TenantAccessMode` { Full, ReadOnly, Blocked } | Encoding access as BillingStatus |

`BillingStatus.Active` and `TenantStatus.Active` are both valid — always qualify in code.

### Slug uniqueness & reserved list

- Persistence: unique index on `Slug` (AC).
- Reserved slugs (www, api, admin, …) are **FR-1 / signup validation** — optional constant list on Domain for reuse later; **not required** to enforce in 11.1 beyond documenting. Do not block migration if reserved list is a static helper only.

[Source: PRD FR-1 / Architecture Consistency Conventions — slug rules]

### Anti-patterns — do NOT

- Greenfield a new solution or Domain rewrite
- Add Stripe SDK / webhook / Checkout in this story
- Add `TenantId` to Platform 0 entities (11.2)
- Put access rules only in comments without executable helper + tests
- Use Suspend semantics for unpaid invoices (collections = FR-23 later)
- Trust UI for access later — this helper is the canonical matrix
- Create `Domain.Tests` project unless team asks — prefer `Infrastructure.Tests/Tenants/`
- Change `SitePage.SingletonId` behavior yet (11.2 / AD-4)

### Project Structure Notes

```text
src/Domain/Tenants/Tenant.cs
src/Domain/Tenants/TenantPlan.cs
src/Domain/Tenants/TenantStatus.cs
src/Domain/Tenants/TenantAccessEvaluator.cs   # or TenantAccess.cs
src/Domain/Billing/BillingStatus.cs
src/Domain/Billing/BillingInterval.cs        # Monthly | Annual
src/Infrastructure/Persistence/CohestraDbContext.cs          # UPDATE — DbSet
src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs  # NEW
src/Infrastructure/Persistence/Migrations/YYYYMMDDHHMMSS_AddTenants.cs # NEW
src/Infrastructure.Tests/Tenants/TenantAccessEvaluatorTests.cs        # NEW
```

No web/ changes. No Contracts/ API DTOs yet (11.3+).

### Testing requirements

- Unit: matrix Theories covering Suspended-wins and OnHold-without-Status-mutation
- Default values test
- After migration: `dotnet ef` / app still builds; existing Platform 0 unit tests must not be deleted (SM-4)
- Category Integration / TenantIsolation: **not** this story

### Project context reference

Read `_bmad-output/project-context.md` before coding:

- Brownfield extend-only; .NET 9; dual dials Suspended wins
- Unit tests live in `Infrastructure.Tests`
- No Stripe package until Epic 14

### Git intelligence

Recent commits are planning-only (project-context, IR, sprint-status). No Tenant code on branch yet — you are introducing the first Enterprise Domain types. Follow Activity/Client patterns, not invent new base classes.

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 11 / Story 11.1]
- [Source: `prds/prd-cohestra-enterprise-2026-07-15/prd.md` — FR-3 access matrix]
- [Source: `architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` — AD-1, AD-8, AD-11]
- [Source: `_bmad-output/project-context.md`]
- [Source: `src/Domain/Activities/Activity.cs`, `ActivityConfiguration.cs`, `CohestraDbContext.cs`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

- `dotnet test src/Infrastructure.Tests` — 136 passed (21 Tenant + 115 existing)
- `dotnet ef migrations add AddTenants` — tenants table only

### Completion Notes List

- Added Tenant dual-dial domain model (Plan/Status/BillingStatus) with nullable Stripe foreshadow fields; no Stripe SDK.
- Implemented `TenantAccessEvaluator` for FR-3 matrix; Suspended wins; OnHold → ReadOnly without mutating Status; PastDue exposes `ShowSettleBanner`.
- Persistence: `DbSet<Tenant>`, `TenantConfiguration` (unique Slug), migration `AddTenants`.
- Unit tests cover defaults, Suspended/Archived × all billing, Active full states, OnHold immutability, unique slug index.
- Out of scope held: no Platform API/UI, no TenantId backfill, no IsComplimentary, no middleware.
- ✅ Resolved review: Active+Canceled → Blocked; null-tenant guard; undefined TenantStatus fail-closed; unknown BillingStatus tests.

### File List

- src/Domain/Tenants/Tenant.cs
- src/Domain/Tenants/TenantPlan.cs
- src/Domain/Tenants/TenantStatus.cs
- src/Domain/Tenants/TenantAccessMode.cs
- src/Domain/Tenants/TenantPublicSurface.cs
- src/Domain/Tenants/TenantAccessEvaluator.cs
- src/Domain/Billing/BillingStatus.cs
- src/Domain/Billing/BillingInterval.cs
- src/Infrastructure/Persistence/CohestraDbContext.cs
- src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs
- src/Infrastructure/Persistence/Migrations/20260720153445_AddTenants.cs
- src/Infrastructure/Persistence/Migrations/20260720153445_AddTenants.Designer.cs
- src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs
- src/Infrastructure.Tests/Tenants/TenantAccessEvaluatorTests.cs
- src/Infrastructure.Tests/Tenants/TenantConfigurationTests.cs

## Change Log

- 2026-07-20: Story context created (ready-for-dev)
- 2026-07-20: Implemented Tenant entity, FR-3 access evaluator, EF tenants migration, unit tests — status → review
- 2026-07-20: Code review patches applied (Canceled fail-closed, null guard, undefined status, unknown billing tests) — status → done
