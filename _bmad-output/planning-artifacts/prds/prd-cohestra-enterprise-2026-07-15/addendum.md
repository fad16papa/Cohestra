# Cohestra Enterprise PRD — Addendum

Technical mechanism decisions referenced by the PRD. Architecture workflow (`bmad-architecture`) may supersede or ratify these.

## Product boundary

| Product | Repository | Tenancy | Status |
|---------|------------|---------|--------|
| **Cohestra Enterprise** | `fad16papa/Cohestra` | Multi-tenant SaaS | This PRD |
| **lead-generation-crm** | Separate repo | Single operator | Unchanged |

## Tenancy model (proposed — ratify in architecture)

**Selected for v1:** Shared PostgreSQL database, shared schema, `TenantId` column on all business tables.

**Rejected for v1:**
- Schema-per-tenant — operational overhead too high for initial scale
- Database-per-tenant — same
- Row-level security only without app filters — defense in depth requires EF global filters + middleware

## Tenant resolution

**Production:** `{tenant-slug}.cohestra.app` → nginx → web/API with `Host` header resolution.

**Local development options:**
1. `/etc/hosts` entries: `ikigai.localhost`, `tgh.localhost`
2. Env override: `DEV_TENANT_SLUG=ikigai` when using plain `localhost`
3. Document in README when architecture locks choice

## Identity model (proposed)

Extend ASP.NET Identity:
- `ApplicationUser` (global identity)
- `TenantMembership` (UserId, TenantId, Role)
- JWT claims: `sub`, `tenant_id`, `role`, optional `platform_admin`

Remove: `AuthService` single-operator gate (`GetExistingOperatorAsync` block).

## Migration strategy (brownfield)

1. Add `Tenants` table + seed `default` tenant for dev
2. Add nullable `TenantId` to core tables
3. Backfill all rows → `default` tenant
4. Set `TenantId` non-nullable
5. Add composite unique indexes (e.g., `(TenantId, Slug)` on Activities)
6. Enable EF global query filters

Platform 0 Docker project name: `cohestra-infra` (local).

## SendGrid (open — decide in architecture)

| Option | Pros | Cons |
|--------|------|------|
| Shared platform API key + per-tenant sender auth | Simpler ops | Blast radius if key leaked |
| Per-tenant API key | Isolation | Tenant onboarding friction |

**PRD default:** Shared platform key with per-tenant verified sender identity (From email/name per tenant).

## Epic mapping (from CC proposal)

| Epic | PRD sections |
|------|----------------|
| 11 Tenant foundation | FR-1–3, FR-8 |
| 12 Identity & RBAC | FR-4–7 |
| 13 API scoping | FR-9–10 |
| 14 Onboarding | FR-1, FR-6, UJ-1–2 |
| 15 Public surfaces | FR-11–13, FR-14 |

## Cloud development workflow

No droplet deployment required for enterprise v1 development. Build via Cursor Cloud Agents; verify with `dotnet test` and `docker compose` in agent VM or developer machine.
