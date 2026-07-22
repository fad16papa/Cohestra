# Cohestra

Cohestra — multi-tenant enterprise SaaS for community events and lead generation.

> **Product boundary:** Cohestra (this repo) targets multi-tenant enterprise deployments. The separate **lead-generation-crm** product is single-operator only — keep its codebase and Docker stack independent.

## Prerequisites

- [.NET SDK 9](https://dotnet.microsoft.com/download)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose)
- [Node.js 20+](https://nodejs.org/) (optional, for local web development)

## Quick start (Docker Compose)

Cohestra is a **separate product** from single-operator **lead-generation-crm**. Local Docker runs as project **`cohestra-infra`** (visible in Docker Desktop) so it does not share containers or volumes with other products.

```bash
cp .env.example .env   # optional — defaults work for local dev
docker compose up --build
```

If **lead-generation-crm** (or another stack) is already using ports 80, 5432, or 6379 on your machine, assign different host ports in `.env` instead of stopping the other product:

```bash
NGINX_HTTP_PORT=8088
PUBLIC_BASE_URL=http://localhost:8088
POSTGRES_HOST_PORT=5433
REDIS_HOST_PORT=6380
```

Then open **http://localhost:8088** (or your chosen nginx port).

After pulling changes or adding web routes (e.g. `/login`), rebuild the web container:

```bash
docker compose up -d --build web
```

Traffic enters through **nginx on port 80** (same routing as production). If you change `PUBLIC_BASE_URL`, rebuild web as well.

On Windows, if port 80 is in use, add to `.env`:

```bash
NGINX_HTTP_PORT=8088
PUBLIC_BASE_URL=http://localhost:8088
```

If you also run `npm run dev` locally, stop the Compose stack first or use different ports.

| Service | URL |
|---------|-----|
| App (via nginx) | http://localhost |
| API health | http://localhost/health |
| API readiness | http://localhost/ready (anonymous; postgres + redis + Platform 0 default tenant row — fail-closed Unhealthy if `TenantIds.Default` / slug `default` is missing) |
| OpenAPI spec (v1) | http://localhost/openapi/v1.json |
| API v1 sample | http://localhost/api/v1/system/info |
| Auth login | `POST http://localhost/api/v1/auth/login` |
| Admin profile (JWT) | `GET http://localhost/api/v1/admin/me` |
| Admin activities | `GET/POST http://localhost/api/v1/admin/activities` |
| Activity form schema | `PUT http://localhost/api/v1/admin/activities/{id}/form-schema` — see [docs/contracts/activity-form-schema-v1.md](docs/contracts/activity-form-schema-v1.md) |

See [deploy/nginx/README.md](deploy/nginx/README.md) for routing details.

### Identity roles

| Role | Who | Home |
|------|-----|------|
| `PlatformAdmin` | Cohestra ops (whole-platform governance) | `/platform` |
| `TenantAdmin` | Subscribed org operator (PRD Tenant Admin) | `/dashboard` |

These roles are mutually exclusive. Legacy Identity role name `Admin` is renamed to `TenantAdmin` on API startup.

### Dev operator credentials (Docker Compose)

Seeded on first API startup when no tenant admin exists:

| Setting | Default |
|---------|---------|
| Email | `operator@cohestra.local` |
| Password | `ChangeMe123!` |

Override via `OperatorSeed__Email` and `OperatorSeed__Password` in `.env` or `docker-compose.yml`. JWT signing key must be at least 32 characters (`Jwt__SigningKey`).

### Demo data seed (Development)

When `DemoDataSeed:Enabled` is `true`, the API **wipes all business data** (clients, registrations, activities, communities, categories, campaigns, templates) and reseeds on every startup. Operator login is preserved.

| Item | Count |
|------|-------|
| Communities | 6 |
| Activities | 60 (10 per community) |
| Clients (leads) | 100 |
| Registrations | 6,000 (each client registered for every activity) |

Demo clients use emails like `demo.user001@demo.cohestra.local` and appear under **Clients**, **Communities**, and campaign segment filters. Each registration has a unique ID like `REG20260616000001`.

Enabled by default in `appsettings.Development.json` and Docker Compose (`DemoDataSeed__Enabled`). Set to `false` in production.

Example login:

```bash
curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@cohestra.local","password":"ChangeMe123!"}'
```

Use the returned `accessToken` as `Authorization: Bearer {token}` on admin endpoints. Refresh via `POST /api/v1/auth/refresh` with the `refreshToken` (24h TTL in Redis).

Migrations run automatically when the API starts via Docker Compose. To apply manually from your machine:

1. Start infrastructure first (Postgres must be listening on `localhost:5432`):

```bash
docker compose up -d postgres redis
```

2. Run the migration:

```bash
dotnet ef database update --project src/Infrastructure/Infrastructure.csproj --startup-project src/Api/Api.csproj
```

Connection strings for host-side tools come from `src/Api/appsettings.json` (`Host=localhost`). Inside Compose, the API overrides these via environment variables (`Host=postgres`).

## UAT deployment (DigitalOcean)

For client UAT on Ubuntu with Docker + nginx + HTTPS, see **[docs/deploy/digitalocean-uat.md](docs/deploy/digitalocean-uat.md)**.

**SendGrid (live production delivery, required):** [docs/deploy/sendgrid-production.md](docs/deploy/sendgrid-production.md)

Pre-handoff QA: **[UAT polish checklist](docs/deploy/uat-polish-checklist.md)**.

**CI/CD (GitHub Actions → droplet):** [docs/deploy/github-actions-cd.md](docs/deploy/github-actions-cd.md)

Quick reference:

```bash
cp .env.uat.example .env   # edit secrets + PUBLIC_BASE_URL on the server
docker compose -f docker-compose.uat.yml up -d --build
# nginx included in Compose — see deploy/nginx/README.md
```

## Solution structure

```
Cohestra.sln
src/
  Api/              # ASP.NET Core Web API (controllers, health, JWT auth)
  Application/      # Use cases (Activities, Clients, Campaigns, Reports stubs)
  Domain/           # Entities and domain rules
  Infrastructure/   # EF Core, Redis, SendGrid (later stories)
  Contracts/        # DTOs for API wire contract
docs/
  contracts/        # Frozen cross-epic JSON contracts (form schema v1, etc.)
web/                # Next.js App Router + shadcn/ui (UI client — calls API directly)
```

## Local development (without Docker)

```bash
dotnet build
dotnet run --project src/Api/Api.csproj
```

Requires PostgreSQL and Redis running locally with connection strings in `src/Api/appsettings.Development.json`.

### TenantIsolation gate (SM-1)

Cross-tenant negative tests are a **required CI gate** on every PR to `main` (AD-10 / Story 13.4).

| Trait | Project | What it covers |
|-------|---------|----------------|
| `Category=TenantIsolation` | `Infrastructure.Tests` | Report/dashboard export isolation (Story 13.3) |
| `Category=TenantIsolation` (+ `Integration`) | `Api.IntegrationTests` | A JWT ↛ B activity; public site A ↛ B activities; export API |

Run locally:

```bash
# Unit isolation proofs (no Docker deps)
dotnet test src/Infrastructure.Tests/Infrastructure.Tests.csproj --filter "Category=TenantIsolation"

# API isolation (needs Postgres + Redis — same as integration suite)
dotnet test src/Api.IntegrationTests/Api.IntegrationTests.csproj --filter "Category=TenantIsolation"
```

**When you add a new tenant-scoped endpoint**, add or extend a `TenantIsolation` negative case (prefer two real tenants + Host `{slug}.localhost` — never trust `X-Tenant-Id`). Extend `IntegrationTestHelpers` rather than one-off bootstraps.

### Local tenant subdomains (Epic 15)

Each workspace is addressed by **Host**, not a path prefix:

| Host | Resolves to |
|------|-------------|
| `cohestra.app` / `www.cohestra.app` | Marketing + signup only (no tenant SitePage) |
| `localhost` (bare) | Default seed tenant (`default`) — Platform 0 dev fallback |
| `{slug}.localhost` | Tenant workspace (public door, admin login, registration) |
| `{slug}.cohestra.app` | Same as `{slug}.localhost` in production |

**Examples (default nginx on port 80):**

- `http://default.localhost/` — default seed tenant public home
- `http://default.localhost/register/{activity-slug}` — tenant-scoped registration
- `http://default.localhost/login` — admin login scoped to that tenant

**Optional env for single-host dev:** set `DEV_TENANT_SLUG=default` on the **api** service when you cannot use `{slug}.localhost`. The web tier forwards your browser host to the API via `X-Forwarded-Host`.

**Docker tip:** add `{slug}.localhost` to your OS hosts file if needed; most systems resolve `*.localhost` to `127.0.0.1` automatically.

**404 on `/` after pulling Epic 15?** Rebuild containers (`docker compose up --build`). Then verify:

```bash
curl -s http://localhost/ready
curl -s http://localhost/api/v1/public/door
curl -s http://default.localhost/api/v1/public/door
```

`kind` should be `"active"` (default tenant) or `"marketing"` — not `"unknown"`. Prefer `http://default.localhost/` for the seed workspace; bare `http://localhost/` also maps to the default tenant in local dev.

## Planning artifacts

Product specs live in `_bmad-output/planning-artifacts/` (PRD, architecture, epics, UX).
