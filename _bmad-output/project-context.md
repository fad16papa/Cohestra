---
project_name: cohestra
user_name: Admin
date: '2026-07-20'
sections_completed:
  - technology_stack
  - language_rules
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
