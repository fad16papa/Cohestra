---
baseline_commit: 56d8a8be15d6a8d14deade597dcac83bed48226a
---

# Story 11.5: Complimentary / Sponsored tenant flag

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Platform Admin,
I want to mark a tenant complimentary and assign a Plan without Stripe,
so that pilots get Core/Pro limits without delinquency automation or self-serve paid signup.

## Acceptance Criteria

1. **Given** an authenticated Platform Admin  
   **When** they set `IsComplimentary=true` and assign `Plan` ∈ {Basic, Core, Pro}  
   **Then** `BillingStatus=Free`, no Stripe subscription is required  
   **And** FR-23 delinquency does not apply (flag is the skip signal for future jobs — no FR-23 jobs exist yet)  
   **And** the change is audited (actor, action, tenantId, timestamp; include plan + before/after in DetailsJson or Reason)

2. **Given** a complimentary Core or Pro tenant  
   **When** Basic dormancy rules are considered  
   **Then** the model documents that FR-25 dormancy does **not** apply to complimentary Core/Pro (only Basic+Free non-complimentary idle tenants). No dormancy job in this story — encode the rule in domain comments / access notes so Epic 14.8 can consume `IsComplimentary`.

3. **Given** a complimentary tenant converting to paid  
   **When** Platform Admin clears `IsComplimentary`  
   **Then** the clear is audited  
   **And** API/docs state that paid entitlements require Checkout (FR-19) before Stripe sync — **do not implement Checkout here**  
   **And** self-serve still cannot grant Core/Pro without Stripe (no self-serve plan upgrade API in this story)

4. **Given** only Platform Admin may set/clear complimentary  
   **When** a TenantAdmin JWT calls the complimentary endpoint(s)  
   **Then** the request is rejected (**403**)

5. **Given** `IsComplimentary=true`  
   **When** responses are returned (list item and/or detail)  
   **Then** `IsComplimentary` is exposed on platform tenant DTOs so Epic 14.5 can render SponsoredBadge beside PlanBadge  
   **And** this story may show a sparse “Sponsored / Complimentary” indicator on the platform detail surface only — **do not** build tenant-admin shell SponsoredBadge chrome (Epic 14.5)

## Tasks / Subtasks

- [x] Domain + migration (AC: 1, 2, 5)
  - [x] Add `bool IsComplimentary { get; set; }` to `Tenant` (default `false`) — document P12 / FR-2 in XML summary
  - [x] Configure column in `TenantConfiguration` (required bool, default false)
  - [x] EF migration: add `IsComplimentary` NOT NULL DEFAULT false; update snapshot
  - [x] Extend `PlatformAuditAction` with e.g. `ComplimentarySet` / `ComplimentaryCleared` (or single `ComplimentaryChanged` with DetailsJson) — do **not** reuse Suspend actions
  - [x] Note on `Tenant` or evaluator docs: FR-23 jobs MUST skip when `IsComplimentary`; FR-25 dormancy skips complimentary Core/Pro

- [x] Contracts + service (AC: 1, 3, 5)
  - [x] Extend `TenantResponse` / `TenantListItemResponse` / detail mapping with `IsComplimentary`
  - [x] Optional: `CreateTenantRequest` optional `IsComplimentary` (default false) — if true, require Plan ∈ Basic|Core|Pro and force `BillingStatus=Free`
  - [x] Add dedicated mutation, preferred: `POST /api/v1/platform/tenants/{id}/complimentary` with body e.g. `SetComplimentaryRequest(bool IsComplimentary, string? Plan, string? Reason)`
    - Set `true`: Plan required (named Basic|Core|Pro only — reject Enterprise/numeric); set Plan; `BillingStatus=Free`; do **not** create Stripe IDs; leave existing Stripe IDs unchanged unless product later clears them (document choice: **leave Stripe ids as-is** so conversion can reuse customer; do not invent subscription)
    - Set `false` (clear): `IsComplimentary=false`; do **not** invent Checkout; do **not** auto-change Plan; audit that Checkout (FR-19) is required before paid sync
  - [x] Reject unknown tenant → NotFound; validation → 400; illegal state → 409 if needed (e.g. Archived tenant — prefer **409** “Cannot change complimentary on Archived tenant”)
  - [x] Implement in `PlatformTenantService`; keep Suspend/BillingStatus separation (complimentary does not Suspend)

- [x] API routes (AC: 1, 3, 4)
  - [x] Extend `PlatformTenantsController` — same `[Authorize(Roles = PlatformAdmin)]`
  - [x] ProblemDetails helpers; TenantAdmin → 403 via role gate (integration test)
  - [x] Keep GET list/detail returning new flag

- [x] Web platform detail (AC: 1, 3, 5)
  - [x] `web/lib/platform-api.ts` — types + `setComplimentary` client
  - [x] Detail page (`web/app/(platform)/platform/tenants/[id]/page.tsx`): sparse control to set/clear complimentary + plan select (Basic/Core/Pro); show Sponsored/Complimentary label when true
  - [x] UX-DR16: no card walls/stat strips; break-glass Suspend copy unchanged; this is ops metadata not collections
  - [x] No tenant-admin dashboard SponsoredBadge (Epic 14.5)

- [x] Tests (AC: 1–4)
  - [x] Unit: set complimentary → Free + Plan + audit; clear → flag false + audit; reject invalid plan; Archived → conflict; list/detail include flag
  - [x] Integration: PlatformAdmin can set/clear; TenantAdmin JWT → **403**
  - [x] Run `dotnet test src/Infrastructure.Tests` (filter Platform/Tenant as appropriate)

- [x] Out of scope
  - [x] Stripe Checkout / Customer Portal / webhooks (Epic 14)
  - [x] FR-23 delinquency jobs / FR-25 dormancy jobs (document skip contract only)
  - [x] Tenant-admin SponsoredBadge / PlanBadge chrome (Story 14.5)
  - [x] Impersonation; TenantMembership; EF global filters
  - [x] Self-serve plan upgrades
  - [x] Complimentary Enterprise (AC limits to Basic/Core/Pro)

## Dev Notes

### Epic context

Epic 11 close-out: **11.1** dials · **11.2** TenantId · **11.3** lifecycle · **11.4** directory/console · **11.5 (this)** complimentary flag (P12). FR-2 complimentary path; UX-DR16 sparse console; SponsoredBadge data ready for Epic 14.

### Architecture compliance

| Source | Implication |
|--------|-------------|
| AD-7 / Identity | Platform routes: `PlatformAdmin` only — never authorize with `TenantAdmin` |
| P12 / FR-2 | Platform Admin sets `IsComplimentary` + Plan; `BillingStatus=Free`; no Stripe required |
| FR-3 | Dual dials unchanged — complimentary does not Suspend; Suspend still break-glass |
| FR-23 / FR-25 | Jobs not in repo yet — flag is the future skip signal; document in code comments |
| NFR-4 | No PII export |
| Contracts | Wire types in `Contracts/Platform` only |

[Source: `epics-cohestra-enterprise.md` Story 11.5, PRD FR-2/P12, `EXPERIENCE.md` SponsoredBadge, `ARCHITECTURE-SPINE.md` AD-7]

### Previous story intelligence (11.3 / 11.4)

- Extend `PlatformTenantService` + `PlatformTenantsController` in place — no new microservice
- Audit append pattern: `PlatformAuditLog` + `PlatformAuditAction` enum extension
- Pagination/list already returns Plan/BillingStatus — add `IsComplimentary` beside them
- Hard rule: `PlatformAdmin` ⊥ `TenantAdmin` (Identity role string is **`TenantAdmin`**, not `Admin`)
- Default tenant: keep suspend/archive blocked; complimentary on default is low value — **prefer 409** if setting complimentary on `TenantIds.Default` (ops clarity; Platform 0 is not a pilot)
- Deferred (do not reopen): append-only audit DB enforcement; optimistic concurrency; Stripe; SponsoredBadge chrome

### Current code state (UPDATE files)

| Area | Today | This story |
|------|--------|------------|
| `Tenant.cs` | No complimentary field | Add `IsComplimentary` |
| `CreateTenantRequest` | Plan + contact | Optional complimentary on create **and/or** dedicated POST |
| Lifecycle | create/suspend/reactivate/archive | + complimentary set/clear |
| `TenantAccessEvaluator` | Status ∩ BillingStatus only | Leave as-is unless a one-line comment; jobs land later |
| Platform detail UI | Lifecycle + audit | + complimentary control |
| FR-23 jobs | None | Document skip when `IsComplimentary` |

### Suggested API shape

```http
POST /api/v1/platform/tenants/{tenantId}/complimentary
Authorization: Bearer <PlatformAdmin>
Content-Type: application/json

{ "isComplimentary": true, "plan": "Pro", "reason": "Pilot pilot Q3" }
```

Clear:

```json
{ "isComplimentary": false, "reason": "Converting to paid — Checkout required" }
```

Response: `TenantResponse` including `IsComplimentary`.

### Project structure notes

- Brownfield extend-only on `Cohestra.sln` + `web/`
- Migration naming: follow existing timestamp style under `src/Infrastructure/Persistence/Migrations/`
- Do not touch `deploy/uat-bootstrap.sh` unless required (unrelated dirty file in agent env)

### Testing requirements

- Prove PlatformAdmin set/clear + audit
- Prove TenantAdmin → 403
- Prove Plan validation (reject Enterprise / numeric for complimentary path)
- Prove Archived → 409 (or documented choice)
- Do not delete Platform 0 / default-tenant tests (SM-4)

### Project context reference

Follow `_bmad-output/project-context.md`: ProblemDetails; Contracts wire types; Midnight Atelier on platform surfaces; no Suspend-as-collections; no greenfield platform service.

### Git intelligence

HEAD at story creation: `56d8a8be15d6a8d14deade597dcac83bed48226a` (11.4 done + TenantAdmin rename). Build on that; do not reinvent platform auth/console.

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Story 11.5]
- [Source: `_bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md` — FR-2, P12, A-31]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md` — SponsoredBadge / Platform Admin]
- [Source: `_bmad-output/implementation-artifacts/11-4-platform-tenant-directory-and-health.md` — console + auth patterns]
- [Source: `_bmad-output/implementation-artifacts/11-3-platform-admin-provision-suspend-reactivate-archive.md` — lifecycle + audit]

### Review Findings

- [x] [Review][Decision] Suspended tenants may set/clear complimentary — **resolved: allow (keep current)**; Suspend remains break-glass independent of complimentary; only Archived + default blocked
- [x] [Review][Patch] Platform detail: allow plan reassignment while Sponsored (show plan select + update) [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Patch] Hide/disable complimentary controls for default Platform 0 tenant [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Patch] Clear-path audit DetailsJson: include IsComplimentary before/after [`src/Infrastructure/Platform/PlatformTenantService.cs`]
- [x] [Review][Patch] Unit tests: assert ActorUserId on ComplimentarySet/Cleared audits [`src/Infrastructure.Tests/Tenants/PlatformTenantServiceTests.cs`]
- [x] [Review][Patch] Client-side reason max length 1000 to match API [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Patch] Initialize `Tenant.IsComplimentary = false` for consistency with other dials [`src/Domain/Tenants/Tenant.cs`]
- [x] [Review][Defer] Archive races with complimentary mutation — deferred, pre-existing (optimistic concurrency already deferred from 11.3)
- [x] [Review][Defer] DelinquencyStartedAt not cleared when forcing Free — deferred, pre-existing (FR-23 jobs not implemented; IsComplimentary is the skip signal)
- [x] [Review][Defer] Integration SkippableFact when stack unavailable — deferred, pre-existing (same pattern as 11.3/11.4)

### Post-patch Review Findings

- [x] [Review][Patch] Set-path audit DetailsJson: add `IsComplimentaryAfter=true` for before/after symmetry [`src/Infrastructure/Platform/PlatformTenantService.cs`]
- [x] [Review][Patch] `SetComplimentaryRequest.IsComplimentary` as `bool?` — reject omitted/null with 400 (missing bool currently defaults to clear) [`src/Contracts/Platform/PlatformTenantContracts.cs`]
- [x] [Review][Patch] Idempotent no-op when already complimentary on same plan (return Ok, no duplicate audit) [`src/Infrastructure/Platform/PlatformTenantService.cs`]
- [x] [Review][Patch] Unit test: update plan while already Sponsored [`src/Infrastructure.Tests/Tenants/PlatformTenantServiceTests.cs`]
- [x] [Review][Defer] Archive race / DelinquencyStartedAt / SkippableFact — still deferred (unchanged from prior CR)

### Post-patch Review Findings (round 3)

- [x] [Review][Patch] Reset complimentary form state (`compReason` / plan defaults) when `tenantId` changes so a typed reason cannot carry across tenants [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Defer] Archive race / DelinquencyStartedAt / SkippableFact — still deferred (restated; no new deferrals)

### Post-patch Review Findings (round 4)

- [x] [Review][Patch] On `tenantId` change: clear stale `tenant`, set `loading`, reset `busy`/`busyRef` so prior tenant cannot be mutated or painted under the new route before load completes [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Patch] Ignore `runAction` success updates when `updated.id` ≠ current `tenantId` (stale in-flight action after navigation) [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Defer] Archive race / DelinquencyStartedAt / SkippableFact — still deferred (restated; no new deferrals)

### Post-patch Review Findings (round 5)

- [x] [Review][Patch] Move `setCompReason("")` out of complimentary action lambdas into `runAction` success path (after stale checks) so a late A-response cannot clear B's typed reason [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Patch] Add `actionGenRef` (bump on tenantId change + each `runAction` start) so leave+return to the same tenantId cannot apply a stale in-flight result over a newer action [`web/app/(platform)/platform/tenants/[id]/page.tsx`]
- [x] [Review][Defer] Archive race / DelinquencyStartedAt / SkippableFact — still deferred (restated; no new deferrals)

### Post-patch Review Findings (round 6)

- [x] [Review][Patch] Same-plan complimentary idempotent no-op must also require `BillingStatus=Free`; otherwise drifted billing is left unrepaired instead of forcing Free [`src/Infrastructure/Platform/PlatformTenantService.cs`]
- [x] [Review][Defer] Archive race / DelinquencyStartedAt / SkippableFact — still deferred (restated; no new deferrals)

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

### Completion Notes List

- Domain: `Tenant.IsComplimentary` + XML/evaluator notes for FR-23 skip and FR-25 Core/Pro dormancy skip; `PlatformAuditAction.ComplimentarySet` / `ComplimentaryCleared`.
- Migration `20260721021843_AddTenantIsComplimentary` — NOT NULL DEFAULT false.
- `POST /api/v1/platform/tenants/{id}/complimentary` via `SetComplimentaryRequest`; set → Plan ∈ Basic|Core|Pro + `BillingStatus=Free`, Stripe IDs left unchanged; clear → flag false, Plan/Billing unchanged, audit notes Checkout (FR-19).
- Rejects: default tenant 409, Archived 409, clear-when-not-set 409, invalid plan 400; PlatformAdmin-only (TenantAdmin 403).
- Create path optional `IsComplimentary`; list/detail DTOs expose flag.
- Platform detail: sparse Complimentary section + Sponsored label; no tenant-admin SponsoredBadge chrome.
- Unit: 12 PlatformTenantService tests passed (incl. complimentary set/clear/validation). Integration complimentary test added (skippable when stack unavailable).
- CR patches: Sponsored plan update UI; hide complimentary on default tenant; clear-audit before/after; ActorUserId asserts; reason maxLength 1000; `IsComplimentary = false` initializer. Decision: Suspended may set/clear complimentary.
- Post-patch patches: set-audit `IsComplimentaryAfter`; `bool?` required flag; idempotent same-plan set; unit coverage for Sponsored plan bump.

### File List

- `src/Domain/Tenants/Tenant.cs`
- `src/Domain/Tenants/PlatformAuditAction.cs`
- `src/Domain/Tenants/TenantAccessEvaluator.cs`
- `src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/20260721021843_AddTenantIsComplimentary.cs`
- `src/Infrastructure/Persistence/Migrations/20260721021843_AddTenantIsComplimentary.Designer.cs`
- `src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs`
- `src/Contracts/Platform/PlatformTenantContracts.cs`
- `src/Application/Tenants/IPlatformTenantService.cs`
- `src/Infrastructure/Platform/PlatformTenantService.cs`
- `src/Api/Controllers/V1/PlatformTenantsController.cs`
- `src/Infrastructure.Tests/Tenants/PlatformTenantServiceTests.cs`
- `src/Api.IntegrationTests/PlatformTenantLifecycleIntegrationTests.cs`
- `web/lib/platform-api.ts`
- `web/app/(platform)/platform/tenants/[id]/page.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-21: Story context created (ready-for-dev)
- 2026-07-21: Implemented IsComplimentary flag, complimentary API, platform detail control, tests → review
- 2026-07-21: Code review findings recorded (1 decision, 6 patches, 3 deferred)
- 2026-07-21: CR decision — Suspended tenants may set/clear complimentary (allow)
- 2026-07-21: Applied all 6 CR patches → done
- 2026-07-21: Post-patch re-review — 4 residual patches, prior defers restated (no AC violations)
- 2026-07-21: Applied post-patch residual patches (nullable flag, set-audit after, idempotent same-plan, plan-update test) → done
- 2026-07-21: Post-patch re-review round 3 — no AC violations; 1 residual patch (reset comp form on tenantId change)
- 2026-07-21: Applied round-3 patch (reset complimentary/suspend form on tenantId change) → done
- 2026-07-21: Post-patch re-review round 4 — no AC violations; 2 residual patches (clear stale tenant/busy on navigate; ignore stale runAction)
- 2026-07-21: Applied round-4 patches (stale tenant clear + ignore stale runAction) → done
- 2026-07-21: Post-patch re-review round 5 — no AC violations; 2 residual UI race patches (compReason clear timing; actionGen for same-id revisit)
- 2026-07-21: Applied round-5 patches (compReason via runAction; actionGenRef) → done
- 2026-07-21: Post-patch re-review round 6 — no AC violations; 1 residual patch (idempotent no-op also requires BillingStatus=Free)
- 2026-07-21: Applied round-6 patch (same-plan no-op requires Free; repair drifted billing) → done
