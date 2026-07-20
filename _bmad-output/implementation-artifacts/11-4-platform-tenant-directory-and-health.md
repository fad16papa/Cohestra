---
baseline_commit: ec86c4650d79dd1b568bb1b454597af00768cb6f
---

# Story 11.4: Platform tenant directory and health

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
     Optional: run validate-create-story before dev-story. -->

## Story

As a Platform Admin,
I want a searchable tenant directory plus health/audit visibility,
so that I can find workspaces and confirm platform readiness without exporting tenant PII.

## Acceptance Criteria

1. **Given** an authenticated Platform Admin  
   **When** they open the tenant directory (API + UI)  
   **Then** they see a paginated list with status, slug, created date, admin contact, and aggregate counts (activities, clients — **not** PII export)  
   **And** they can search by slug and organization name

2. **Given** a tenant in the directory  
   **When** they open tenant detail  
   **Then** they can invoke lifecycle actions from Story 11.3 (suspend / reactivate / archive) from the detail surface  
   **And** they see recent audit entries for that tenant (actor, action, tenantId, timestamp, reason when present)

3. **Given** the platform health endpoint `/ready`  
   **When** called without auth  
   **Then** it remains publicly reachable  
   **And** readiness documents DB (+ Redis) connectivity; optionally verify the Platform 0 `default` tenant row exists (fail-closed or degraded status if missing — document choice in OpenAPI/README comment)

4. **Given** platform lifecycle actions from Epic 11  
   **When** they occur  
   **Then** immutable audit entries continue to include actor, action, tenantId, and timestamp (11.3 write path — this story **reads** them; no rewrite of audit model)

5. **Given** a Tenant Admin / Member JWT (or any non–Platform Admin)  
   **When** they call platform directory/detail routes  
   **Then** access is denied (**403**)

6. **Given** Midnight Atelier craft for the platform console  
   **When** the directory UI ships  
   **Then** it stays sparse/ops-focused (UX-DR16); atelier refresh of `platform-admin-suspend` mock is acceptable but not blocking  
   **And** Suspend copy remains break-glass (abuse/ToS/freeze) — not non-payment

## Tasks / Subtasks

- [x] Contracts + service list/detail/audit (AC: 1, 2, 4)
  - [x] Add DTOs under `Contracts/Platform/`: e.g. `TenantListItemResponse` (+ `ActivityCount`, `ClientCount`), `TenantListResponse` (`Items`, `Page`, `PageSize`, `TotalCount`), `PlatformAuditEntryResponse`, extend detail response if needed (reuse `TenantResponse` + audits)
  - [x] Extend `IPlatformTenantService`: `ListAsync(search, page, pageSize)`, `GetByIdAsync(tenantId)`, `ListAuditAsync(tenantId, take)` (or embed recent audits in GetById)
  - [x] Implement in `PlatformTenantService`:
    - Pagination constants match admin norm: default **25**, max **100**; clamp page ≥ 1
    - Search: trim; case-insensitive `Contains` on `Slug` **and** `Name`
    - Counts: for page tenant ids, `GroupBy`/`Count` on `Activities` and `Clients` by `TenantId` (no PII fields)
    - Audit: `OrderByDescending(CreatedAt).Take(n)` (default n=20–50) for tenant; never expose other tenants’ audits
  - [x] Do **not** add bulk client/registration export (NFR-4)

- [x] API GET routes (AC: 1, 2, 5)
  - [x] Extend `PlatformTenantsController` (same `[Authorize(Roles = PlatformAdmin)]`):
    - `GET /api/v1/platform/tenants?search=&page=&pageSize=`
    - `GET /api/v1/platform/tenants/{tenantId}` — detail (+ recent audits or nested)
    - Optional: `GET /api/v1/platform/tenants/{tenantId}/audit` if detail payload should stay thin
  - [x] Reuse ProblemDetails helpers; 404 for unknown tenant; 403 via role gate
  - [x] Keep existing POST lifecycle endpoints; detail UI calls them (no duplicate mutation APIs)

- [x] Health (AC: 3)
  - [x] Confirm `/ready` stays anonymous (already: postgres + redis tagged checks in `Program.cs`)
  - [x] Document in story completion notes / brief API summary what `/ready` means
  - [x] **Preferred small enhancement:** add a ready-tagged check that `Tenants` contains `TenantIds.Default` (or slug `default`) — if missing, report degraded/unhealthy so ops notice a broken 11.2 seed. Keep unauthenticated.
  - [x] Do **not** put Platform Admin JWT on `/ready`

- [x] Web platform console (AC: 1, 2, 5, 6)
  - [x] New route group e.g. `web/app/(platform)/` — **not** under `(admin)` (tenant operator shell)
  - [x] PlatformAdmin session gate (reuse auth session; deny/redirect if role ≠ PlatformAdmin — mirror `AdminRouteGuard` pattern with role check via `/api/v1/admin/me` **or** a small `GET /api/v1/platform/me` if admin/me does not expose PlatformAdmin; prefer minimal: decode roles from existing profile endpoint or add `platform/me` that returns `{ email, roles }` for PlatformAdmin only)
  - [x] Pages: directory list (search + pagination + status/slug/created/admin contact/counts); detail (tenant fields, recent audit table, Suspend/Reactivate/Archive actions using 11.3 APIs with reason modal for Suspend)
  - [x] Sparse ops UI — UX-DR16; Midnight Atelier tokens from existing brand CSS; no impersonation; no card walls/stat strips in hero
  - [x] API client: `web/lib/platform-api.ts` (or similar) wrapping platform tenant endpoints

- [x] Tests (AC: 1–5)
  - [x] Unit: list search/pagination clamps; counts correct for two tenants; audit ordered newest-first; unknown tenant → NotFound
  - [x] Integration: PlatformAdmin can GET list/detail; operator Admin JWT → **403** on GET list; `/ready` still 200 without auth (when stack up)
  - [x] Run `dotnet test src/Infrastructure.Tests`; integration skippable if `/ready` unavailable (same pattern as 11.3)

- [ ] Out of scope
  - [ ] Complimentary / Sponsored flag UI+API (Story 11.5)
  - [ ] Impersonation / login-as-tenant
  - [ ] TenantMembership / JWT `tenant_id` (Epic 12)
  - [ ] EF global filters / Host middleware (Epic 13)
  - [ ] Hard purge job; Stripe; PII export
  - [ ] Full atelier redesign of marketing — platform console only

## Dev Notes

### Epic context

Epic 11 close-out for Platform Control UX: **11.1** dials · **11.2** TenantId · **11.3** lifecycle API+audit · **11.4 (this)** directory+health+console · **11.5** complimentary. FR-17 directory, FR-18 health+audit visibility, UX-DR16 sparse console.

### Architecture compliance

| Source | Implication |
|--------|-------------|
| Spine | Extend `PlatformTenantsController`; platform routes under `api/v1/platform/...` |
| AD-7 | PlatformAdmin role only — never authorize with tenant `Admin` |
| NFR-4 | Counts only — no bulk PII export |
| UX-DR16 | Sparse directory + detail; Suspend reason + audit; no impersonation |
| `/ready` | Already maps health checks; keep public |

[Source: `epics-cohestra-enterprise.md` Story 11.4, `ARCHITECTURE-SPINE.md`, `ux-cohestra-2026-07-18/EXPERIENCE.md`, mock `platform-admin-suspend.html`]

### Previous story intelligence (11.3)

- `PlatformAdmin` role + seed; controller role gate proven (Admin → 403)
- `PlatformTenantService` create/suspend/reactivate/archive + `PlatformAuditLog` writes
- CR: block suspend/archive of `TenantIds.Default`; slug unique → 409 only on Postgres unique violation; email/length validation; keep `SuspendedAt` on archive
- Deferred: append-only DB enforcement; seeder race; optimistic concurrency; skippable integration tests; stricter email RFC
- **Do not** re-open lifecycle mutation design — wire UI to existing POST endpoints

### Auth / profile gap for web guard

Today `GET /api/v1/admin/me` is `[Authorize(Roles = Admin)]` — PlatformAdmin-only users **cannot** call it. For the platform shell:

- **Recommended:** add `GET /api/v1/platform/me` → `{ email, roles }` with `[Authorize(Roles = PlatformAdmin)]`, **or** broaden a shared “session me” later in Epic 12.
- Web guard must not depend on tenant-admin `admin/me` alone.

### Pagination / list envelope (copy admin pattern)

```text
page default 1, pageSize default 25, max 100
response: { items, page, pageSize, totalCount }
search: OR Contains on Slug, Name (normalized lower)
```

### Aggregate counts

```csharp
// After paging tenant ids:
Activities.Where(a => ids.Contains(a.TenantId)).GroupBy(a => a.TenantId).Select(...)
Clients.Where(c => ids.Contains(c.TenantId)).GroupBy(c => c.TenantId).Select(...)
```

No global query filter yet — platform queries intentionally see all tenants.

### Files to touch (expected)

| Area | Paths |
|------|--------|
| Contracts | `Contracts/Platform/*` list/detail/audit DTOs |
| Application | `IPlatformTenantService` list/get/audit |
| Infrastructure | `PlatformTenantService` queries; optional `IHealthCheck` for default tenant |
| Api | `PlatformTenantsController` GETs; optional `PlatformMeController` / action; `Program.cs` health check register |
| Web | `app/(platform)/…`, `lib/platform-api.ts`, platform guard component |
| Tests | `Infrastructure.Tests/Tenants/*`, `Api.IntegrationTests` platform GET 403/list |

### Testing requirements

- Prove **403** on GET list for tenant Admin role (AC 5)
- Prove search matches slug **or** name
- Prove `/ready` still anonymous
- Do not delete Platform 0 tests (SM-4)

### Project context reference

Follow `_bmad-output/project-context.md`: brownfield extend-only; ProblemDetails; Contracts wire types; Midnight Atelier on Cohestra surfaces; no Suspend-as-collections; no greenfield platform microservice.

### Git intelligence

HEAD includes 11.3 done + CR patches (`ec86c46`). Extend in place; do not invent a second API host.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

### Completion Notes List

- Directory API: `GET /api/v1/platform/tenants` (search slug|name, page default 25 / max 100) + `GET /api/v1/platform/tenants/{id}` with recent audits (newest-first, take 25).
- `GET /api/v1/platform/me` returns `{ userId, email, roles }` for PlatformAdmin (tenant Admin `/admin/me` remains Admin-only).
- Web login/`validateStoredSession` falls back to `/platform/me` on 403; PlatformAdmin-only users land on `/platform`.
- `/ready` stays anonymous; added fail-closed `default-tenant` ready check for `TenantIds.Default` (Unhealthy if missing). Existing postgres + redis checks unchanged.
- Platform console under `web/app/(platform)/` with sparse Midnight Atelier-scoped surface; lifecycle actions reuse 11.3 POSTs.
- Unit tests: 9 PlatformTenantService tests passed. Integration tests added (skippable when stack unavailable).

### File List

- `src/Contracts/Platform/PlatformTenantContracts.cs`
- `src/Application/Tenants/IPlatformTenantService.cs`
- `src/Infrastructure/Platform/PlatformTenantService.cs`
- `src/Api/Controllers/V1/PlatformTenantsController.cs`
- `src/Api/Controllers/V1/PlatformMeController.cs`
- `src/Api/Health/DefaultTenantReadyHealthCheck.cs`
- `src/Api/Program.cs`
- `src/Infrastructure.Tests/Tenants/PlatformTenantServiceTests.cs`
- `src/Api.IntegrationTests/PlatformTenantDirectoryIntegrationTests.cs`
- `web/lib/auth-api.ts`
- `web/lib/platform-api.ts`
- `web/components/auth/login-form.tsx`
- `web/components/auth/platform-route-guard.tsx`
- `web/app/(platform)/layout.tsx`
- `web/app/(platform)/platform/page.tsx`
- `web/app/(platform)/platform/tenants/[id]/page.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-20: Story context created (ready-for-dev)
- 2026-07-20: Implemented directory API, platform/me, default-tenant ready check, platform console UI, tests → review
