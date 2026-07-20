---
project_name: cohestra
user_name: Admin
date: '2026-07-20'
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - code_quality
existing_patterns_found: 12
discovery_status: complete
initiative_focus: Cohestra Enterprise multi-tenant (Epics 11–15)
implementation_mode: brownfield_extend
sources:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/epics-cohestra-enterprise.md
  - web/package.json
  - src/Api/Api.csproj
  - src/Infrastructure/Infrastructure.csproj
  - docker-compose.yml
updated: '2026-07-20'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Mode: brownfield extend-only.** Implement Cohestra Enterprise (Epics 11–15) by extending `Cohestra.sln` + `web/`. Do **not** create a parallel app, microservice, or greenfield rewrite. Do **not** modify the separate `lead-generation-crm` product.

- **Backend:** .NET 9.0 / ASP.NET Core Web API (`net9.0`), Nullable enable, ImplicitUsings
- **EF Core:** 9.0.11 · **Npgsql.EntityFrameworkCore.PostgreSQL:** 9.0.4
- **Auth:** ASP.NET Identity + JWT Bearer 9.0.11 · refresh tokens in Redis
- **Cache:** Redis 7 (StackExchange.Redis 2.8.x) · Docker `redis:7-alpine`
- **DB:** PostgreSQL 16 · Docker `postgres:16-alpine`
- **Email / QR:** SendGrid 9.29.x · QRCoder 1.6.x
- **API shape:** `/api/v1/...` · ProblemDetails · DTOs in `Contracts` only
- **Web:** Next.js 16.2.9 · React 19.2.x · TypeScript 5 · Tailwind 4 · shadcn · next-themes 0.4.x
- **Edge:** nginx 1.27-alpine · Compose projects `cohestra-infra` (local) / `cohestra-infra-uat`
- **Solution:** `Cohestra.sln` → Api · Application · Domain · Infrastructure · Contracts (+ Api.IntegrationTests, Infrastructure.Tests)

**Agent constraints**

- Stay on **.NET 9** / **Next 16** line — do not upgrade majors in a story unless asked
- Prefer package versions already in `*.csproj` / `package.json`; avoid parallel HTTP/ORM stacks
- Stripe (Epic 14): test keys local/CI; live only production — pin Stripe.NET when first introduced
- Read `web/AGENTS.md` before Next changes (Next 16 may differ from training data)

## Critical Implementation Rules

### Language-Specific Rules

**C# / .NET**

- Nullable reference types **on** — do not disable; fix nullability instead of `!` sprawl
- Primary constructors / file-scoped namespaces match existing controllers (`Cohestra.Api.Controllers.V1`)
- Business logic in **Application/Domain**; Api controllers stay thin
- Return **ProblemDetails** for errors — never ad-hoc anonymous error JSON
- Wire types live in **Contracts**; never return EF entities from API
- Prefer `CancellationToken` through service methods (existing style)
- Async all the way — no `.Result` / `.Wait()` on hot paths

**TypeScript / Next**

- `strict: true` in `tsconfig` — keep it
- Imports via `@/` paths (e.g. `@/lib/api`) — match existing `lib/*-api.ts` wrappers
- Parse ProblemDetails on failed fetches; surface `detail` when present
- `"use client"` only where needed; prefer server fetch helpers already in `lib/`
- Do not bypass typed API helpers with one-off raw `fetch` to new endpoints without a matching `lib/*-api.ts` (or extend an existing one)

### Framework-Specific Rules

**ASP.NET API**

- Routes: `api/v1/admin/...`, `api/v1/public/...`, `api/v1/auth`, `api/v1/system` — keep this split
- New enterprise endpoints follow same V1 controller folder + `[Route("api/v1/...")]`
- Auth: JWT Bearer on admin; public routes unauthenticated but **tenant from Host**
- Never trust client `X-Tenant-Id` alone — JWT `tenant_id` + Host alignment (AD-3)
- EF: global query filters on `ITenantScoped`; bypass only `[RequiresPlatformAdmin]` audit paths
- Redis keys: `tenant:{tenantId}:...` — no bare shared keys for tenant data
- Plan gates enforced **server-side** (UI lock alone is insufficient)

**Next.js App Router**

- Keep route groups: `app/(admin)/`, `app/(public)/`, apex marketing/login as today
- Theme via existing `components/theme/theme-provider.tsx` (next-themes, class on `html`)
- Extend `lib/*-api.ts` for new API surfaces; mirror admin vs public base URL helpers
- Subdomain: forward Host (middleware) so API can resolve tenant — local: `{slug}.localhost` or `DEV_TENANT_SLUG`

**Enterprise product rules (Epics 11–15)**

- Dual dials: access = `Tenant.Status` ∩ `BillingStatus`; **Suspended always wins**
- Billing UX = Stripe Checkout + **Customer Portal only** — no custom invoices/finance UI
- Basic = no SitePage (stub); Core = fixed SitePage; Pro = builder
- Remove `AuthService.GetExistingOperatorAsync` single-operator gate (Epic 12) — do not reintroduce
- Brand: replace Platform 0 forest green with **Midnight Atelier** tokens (`ux-cohestra-2026-07-18/DESIGN.md`) on Cohestra surfaces — do not invent a third palette

### Testing Rules

- **Unit:** `Infrastructure.Tests` — domain/service behavior close to existing test style (xUnit)
- **Integration:** `Api.IntegrationTests` — `WebApplicationFactory`, `[Collection(IntegrationTestCollection.Name)]`, `[Trait("Category", "Integration")]`, `SkippableFact` + `SkipIfUnavailable`
- Reuse `IntegrationTestHelpers` for login/seed patterns; extend helpers for multi-tenant fixtures rather than one-off bootstraps
- **TenantIsolation** (Epic 13 / SM-1): category/trait required on PRs to `main` — at minimum cross-tenant GET denial + public site isolation + export isolation
- New tenant-scoped endpoints → add or extend a TenantIsolation negative case
- Prefer proving isolation with **two tenants** in one test over mocking away the filter
- Do not delete Platform 0 tests to “make green”; fix tenancy migration so SM-4 (~90% pass) holds
- Stripe: use test mode / fixtures / Stripe CLI — never live keys in CI
- Web: no established Playwright suite required for v1 stories unless a story explicitly adds it — API isolation gates first

### Code Quality & Style Rules

**Organization**

- C#: `src/{Api,Application,Domain,Infrastructure,Contracts}/` — new types in the layer that owns them
- Controllers only in `Api/Controllers/V1/`
- Web: `app/` routes · `components/` UI · `lib/` API/helpers · `hooks/` · `styles/` tokens
- Brand tokens: update `web/styles/brand-tokens.css` (and Tailwind theme wiring) toward Midnight Atelier — single source of hex values

**Naming**

- C#: PascalCase types/methods; `TenantId` FK column name; enums as in PRD (`TenantAdmin`, `BillingStatus`, …)
- Product term: **Community** (not “Club”)
- Web files: kebab-case components where existing; `*-api.ts` for API modules
- Tests: `*Tests.cs` beside area folders

**Lint / format**

- Web: `eslint-config-next` (core-web-vitals + typescript) — keep green on touched files
- C#: nullable + existing analyzer warnings; don’t mass-suppress

**Docs in code**

- Prefer clear names over comment essays
- XML docs exist on API (`GenerateDocumentationFile`) — keep public controller summaries useful when adding endpoints
- Story/epic IDs in commit messages when implementing (`11.2`, `13.4`, …)
