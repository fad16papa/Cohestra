# Story 1.1: Solution Scaffold and Docker Compose

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the full solution scaffold with Docker Compose services,
so that all subsequent stories deploy and run consistently in local and production environments.

## Acceptance Criteria

1. **AC-1.1.1 — Docker Compose stack**
   - **Given** a fresh clone of the repository
   - **When** I run `docker compose up --build` from the repository root
   - **Then** services start for `api` (ASP.NET Core), `postgres`, `redis`, and `web` (Next.js placeholder)
   - **And** all four services reach a healthy/running state without manual intervention

2. **AC-1.1.2 — .NET solution structure**
   - **Given** the repository is scaffolded
   - **When** I inspect the backend
   - **Then** `Cohestra.sln` exists at repo root with projects: `Api`, `Application`, `Domain`, `Infrastructure`, `Contracts`
   - **And** project references follow clean architecture: `Api → Application, Infrastructure, Contracts`; `Application → Domain, Contracts`; `Infrastructure → Application, Domain`; `Domain` has no upstream deps
   - **And** bounded-context folder stubs exist under `Application/` and `Domain/`: `Activities/`, `Clients/`, `Campaigns/`, `Reports/` (empty placeholder namespaces or README per folder is acceptable)

3. **AC-1.1.3 — Health endpoints**
   - **Given** the `api` container is running
   - **When** I request `GET /health` and `GET /ready`
   - **Then** both return HTTP 200 with JSON indicating healthy/ready status suitable for container orchestration

4. **AC-1.1.4 — Web placeholder**
   - **Given** the `web` container is running
   - **When** I open `http://localhost:3000`
   - **Then** a minimal Next.js page loads confirming the web service is up (placeholder text is fine — full shadcn scaffold is Story 1.4)

5. **AC-1.1.5 — Infrastructure services reachable from API**
   - **Given** `postgres` and `redis` are running via Compose
   - **When** the API starts
   - **Then** connection strings for PostgreSQL and Redis are configured via environment variables (not hard-coded)
   - **And** API logs confirm successful connection attempts (actual EF migrations and Redis usage are Story 1.2+ — connection config only here)

## Tasks / Subtasks

- [x] **Task 1: Backend solution scaffold** (AC: 1.1.2)
  - [x] Create `Cohestra.sln` with five projects using `dotnet new` templates
  - [x] Wire project references per clean architecture layering
  - [x] Add bounded-context folder stubs in `Application/` and `Domain/`
  - [x] Configure `Api` as ASP.NET Core Web API targeting Linux containers

- [x] **Task 2: Health check endpoints** (AC: 1.1.3)
  - [x] Add `GET /health` (liveness) and `GET /ready` (readiness) — use ASP.NET Core health checks middleware
  - [x] Readiness may check postgres/redis connectivity optionally; liveness returns OK if process is up

- [x] **Task 3: Docker Compose orchestration** (AC: 1.1.1, 1.1.5)
  - [x] Create `docker-compose.yml` at repo root with services: `api`, `postgres`, `redis`, `web`
  - [x] Create `Dockerfile` for API (multi-stage, publish to port 8080)
  - [x] Create `Dockerfile` for web (minimal Next.js placeholder on port 3000)
  - [x] Use named volumes for postgres data persistence
  - [x] Internal Docker network; expose `3000` (web) and `8080` (api) to host for local dev
  - [x] Environment variables via `.env.example` (document required vars; do NOT commit secrets)

- [x] **Task 4: Web placeholder** (AC: 1.1.4)
  - [x] Initialize minimal Next.js App Router app in `web/` directory
  - [x] Single page confirming service name and link to API health endpoint for smoke test

- [x] **Task 5: Developer documentation** (AC: all)
  - [x] Add root `README.md` section: prerequisites (.NET SDK, Docker), `docker compose up --build`, service URLs
  - [x] Add `.dockerignore` and `.gitignore` entries for build artifacts, `node_modules`, `bin/`, `obj/`

### Review Findings

- [x] [Review][Decision] **Runtime version stack differs from story spec** — **Resolved (A):** Accept modern stack (.NET 9, Node 22, Next.js 16.2.9). Story dev notes updated; no downgrade required.

- [x] [Review][Patch] **Add Docker healthchecks for `api` and `web`** [`docker-compose.yml:24-49`]

- [x] [Review][Patch] **Fix stale `Api.http` scaffold** [`src/Api/Api.http:1-4`]

- [x] [Review][Patch] **Align local API port with architecture** [`src/Api/Properties/launchSettings.json:8`]

- [x] [Review][Patch] **Remove unused OpenAPI package** [`src/Api/Api.csproj:12`]

- [x] [Review][Patch] **Expand `.env.example` documentation** [`.env.example`]

- [x] [Review][Patch] **Add startup connection logging** [`src/Api/Program.cs`]

- [x] [Review][Patch] **Validate connection strings with `IsNullOrWhiteSpace`** [`src/Api/Program.cs:5-11`]

- [x] [Review][Defer] **Add Compose restart policies** [`docker-compose.yml`] — deferred, pre-existing — `restart: unless-stopped` improves resilience but is optional for local-dev scaffold.

- [x] [Review][Defer] **Postgres healthcheck before migrations exist** [`docker-compose.yml:10-14`] — deferred, pre-existing — schema readiness belongs in Story 1.2 (EF migrations), not this scaffold story.

### Review Findings (Round 2 — 2026-06-16)

- [x] [Review][Patch] **Web healthcheck always failed** [`web/Dockerfile`] — Next.js standalone bound to container IP, not `127.0.0.1`; fixed with `ENV HOSTNAME=0.0.0.0`. All four Compose services now report healthy.

- [x] [Review][Patch] **Redis connection string logged verbatim** [`src/Api/Program.cs`] — fixed with `GetRedisTarget()` logging endpoint only.

- [x] [Review][Patch] **Startup health probe ignored shutdown** [`src/Api/Program.cs`] — fixed by passing `ApplicationStopping` cancellation token to `CheckHealthAsync`.

- [x] [Review][Dismiss] **HTTPS launch profile uses port 7247** — standard dev SSL binding; HTTP profile correctly uses 8080.

- [x] [Review][Defer] **`NEXT_PUBLIC_*` build-time vs runtime** [`web/Dockerfile`, `docker-compose.yml`] — deferred to Story 1.4 when web scaffold matures; localhost default works for local Compose smoke tests.

## Dev Notes

### Epic Context

**Epic 1: Platform Foundation & Operator Access** — Marco signs into a branded platform. Story 1.1 is the **greenfield foundation**; no application code exists yet (repo currently contains planning artifacts and BMad config only).

**Subsequent stories in Epic 1 (do NOT implement now):**
| Story | Scope |
|-------|-------|
| 1.2 | EF Core migrations, OpenAPI, ProblemDetails |
| 1.3 | Identity + JWT auth |
| 1.4 | Full Next.js + shadcn scaffold |
| 1.5–1.11 | Design tokens, theme, layouts, login |

### Architecture Compliance (MUST follow)

[Source: `_bmad-output/planning-artifacts/architecture.md`]

| Requirement | Implementation in this story |
|---------------|------------------------------|
| API-first, .NET backend | ASP.NET Core Web API in `Api/` project |
| Clean architecture layers | Api / Application / Domain / Infrastructure / Contracts |
| Bounded contexts | Folder stubs: Activities, Clients, Campaigns, Reports |
| Docker Compose local dev | api + postgres + redis + web |
| Health endpoints | `/health`, `/ready` per architecture API surface |
| Linux containers | Dockerfiles target Linux (DigitalOcean deployment) |
| API port 8080, web port 3000 | Match production nginx layout |
| Secrets in env | JWT/SendGrid keys NOT in source — use `.env.example` placeholders |

**Explicitly OUT OF SCOPE for Story 1.1:**
- EF Core entities, migrations, DbContext (Story 1.2)
- JWT, Identity, auth middleware (Story 1.3)
- OpenAPI/Swagger beyond bare minimum if needed for health (Story 1.2)
- Business logic, controllers beyond health
- shadcn/ui, Tailwind theme system (Story 1.4+)
- nginx reverse proxy (production deployment — later)

### Target Repository Structure

```
cohestra/
├── Cohestra.sln
├── docker-compose.yml
├── .env.example
├── README.md
├── src/
│   ├── Api/
│   │   ├── Api.csproj
│   │   ├── Program.cs
│   │   ├── Dockerfile
│   │   └── Health/ (or inline health endpoints)
│   ├── Application/
│   │   ├── Application.csproj
│   │   ├── Activities/
│   │   ├── Clients/
│   │   ├── Campaigns/
│   │   └── Reports/
│   ├── Domain/
│   │   ├── Domain.csproj
│   │   ├── Activities/
│   │   ├── Clients/
│   │   ├── Campaigns/
│   │   └── Reports/
│   ├── Infrastructure/
│   │   └── Infrastructure.csproj
│   └── Contracts/
│       └── Contracts.csproj
└── web/
    ├── Dockerfile
    ├── package.json
    └── app/
        └── page.tsx
```

> **Note:** If the team prefers projects at repo root (`Api/`, `Application/`, etc.) instead of `src/`, either is acceptable — **match architecture doc naming** and document the choice in README. Do not nest inconsistently.

### Docker Compose Service Specification

| Service | Image / Build | Ports | Environment |
|---------|---------------|-------|-------------|
| `postgres` | `postgres:16-alpine` | internal 5432 | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `redis` | `redis:7-alpine` | internal 6379 | — |
| `api` | build `./src/Api` | 8080:8080 | `ConnectionStrings__DefaultConnection`, `ConnectionStrings__Redis`, `ASPNETCORE_URLS=http://+:8080` |
| `web` | build `./web` | 3000:3000 | `NEXT_PUBLIC_API_URL=http://localhost:8080` |

- `api` depends_on: `postgres`, `redis` (with healthcheck wait if feasible)
- Use Docker Compose `healthcheck` for postgres/redis so API starts after DB is ready

### Technology Versions (use current LTS/stable)

| Technology | Version guidance |
|------------|------------------|
| .NET | **.NET 9** (ASP.NET Core Web API template) — accepted at implementation; supersedes original .NET 8 LTS note |
| PostgreSQL | 16-alpine |
| Redis | 7-alpine |
| Node.js | **22 LTS** for Next.js Docker build — accepted at implementation; supersedes original Node 20 note |
| Next.js | **16.x** (App Router) — minimal placeholder only; supersedes original 15.x note |

### Testing Requirements

- **Manual smoke test:** `docker compose up --build` → curl `http://localhost:8080/health` and `http://localhost:8080/ready` → open `http://localhost:3000`
- **No automated test suite required** in this story unless project already has test infrastructure (greenfield: skip)
- Verify `dotnet build` succeeds on host outside Docker as well

### Git Intelligence

Recent commits are planning-artifact only (`architecture.md`, `epics.md`, UX specs). **No existing application code to preserve or migrate.** This is a true greenfield scaffold — do not search for legacy patterns.

### Project Structure Notes

- Keep ` _bmad-output/` and `.agents/` untouched — application code lives alongside them at repo root
- Add standard .NET ignores: `bin/`, `obj/`, `.vs/`
- Add Node ignores: `web/node_modules/`, `web/.next/`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.1]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Official Technology Stack, Backend solution structure, Docker Compose services, Health API group]
- [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-06-16.md` — Epic 1 Story 1.1 sizing note]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- `dotnet build Cohestra.sln` — succeeded (0 warnings, 0 errors)
- `docker compose up --build` — all four services healthy (api, postgres, redis, web); verified after round-2 web bind fix
- Smoke tests: `GET /health` → `{"status":"healthy"}`; `GET /ready` → postgres + redis Healthy; web → HTTP 200

### Completion Notes List

- Greenfield scaffold: .NET 9 solution under `src/` with clean-architecture project references and bounded-context folder stubs
- API exposes liveness (`/health`) and readiness (`/ready`) with Npgsql + Redis health checks
- Docker Compose orchestrates api/postgres/redis/web with health-gated startup and named postgres volume
- Next.js placeholder at `web/` with link to API health endpoint for smoke testing
- Root README documents prerequisites, compose workflow, and service URLs

### File List

- `.dockerignore`
- `.env.example`
- `.gitignore`
- `Cohestra.sln`
- `README.md`
- `docker-compose.yml`
- `src/Api/` (Api.csproj, Dockerfile, Program.cs, appsettings*.json, launchSettings.json, Api.http)
- `src/Application/` (Application.csproj, ApplicationAssembly.cs, Activities/, Clients/, Campaigns/, Reports/)
- `src/Contracts/` (Contracts.csproj, ContractsAssembly.cs)
- `src/Domain/` (Domain.csproj, DomainAssembly.cs, Activities/, Clients/, Campaigns/, Reports/)
- `src/Infrastructure/` (Infrastructure.csproj, InfrastructureAssembly.cs)
- `web/` (Dockerfile, package.json, next.config.ts, app/page.tsx, app/layout.tsx, and supporting config/assets)

### Change Log

- 2026-06-16: Code review patches applied — compose healthchecks, Api.http/launchSettings fixes, startup connection logging, .env.example expanded
- 2026-06-16: Re-review round 2 — fixed web healthcheck bind (`HOSTNAME=0.0.0.0`), redis log redaction, startup shutdown token; all services healthy in Compose
