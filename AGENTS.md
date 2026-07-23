# Cohestra

Cohestra (a.k.a. Activity Lead) — API-first community events + lead-generation platform.
See `README.md` for the full product overview, endpoints, and Docker Compose workflow.

## Cursor Cloud specific instructions

The VM snapshot already has .NET 9 SDK (`/usr/local/dotnet`, on `PATH` as `dotnet`),
Node 22, PostgreSQL 16, and Redis installed. The update script runs `dotnet restore`
and `npm ci` on startup, so you only need to (re)start services and run things.

### Start backing services (required, not auto-started)
Postgres/Redis do not start automatically on boot. Start them each session:

```bash
sudo service postgresql start
sudo service redis-server start
```

DB is already provisioned in the snapshot: role `crm` / password `crm`, databases
`cohestra` (dev) and `cohestra_test` (integration tests). The dev `cohestra` DB is
seeded with an operator and demo data from setup.

### Run the app in dev mode (native, no Docker)
Two processes. API on `:8080`, web on `:3000`:

```bash
# API (applies EF migrations on startup)
ASPNETCORE_ENVIRONMENT=Development OperatorSeed__Enabled=true \
  dotnet run --project src/Api/Api.csproj

# Web — MUST set NEXT_PUBLIC_API_URL, else the browser calls its own origin (:3000)
cd web && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

Operator login (seeded): `operator@cohestra.local` / `ChangeMe123!`.
`OperatorSeed__Enabled=true` is a no-op once an operator exists.

### Tests
- Unit tests: `dotnet test Cohestra.sln --filter "Category!=Integration"` (115 pass, no services needed).
- Integration tests need Postgres + Redis running AND two non-obvious things:
  1. Set `CI=true` (or `ASPNETCORE_ENVIRONMENT=Development`) — otherwise the SendGrid
     validator treats the host as Production and the test host fails to start (tests skip).
  2. A FRESH `cohestra_test` DB — several tests assert global row counts, so drop/recreate
     it first: `sudo -u postgres psql -c "DROP DATABASE IF EXISTS cohestra_test;" && sudo -u postgres createdb -O crm cohestra_test`

  ```bash
  CI=true \
  ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=cohestra_test;Username=crm;Password=crm" \
  ConnectionStrings__Redis="localhost:6379" \
  dotnet test src/Api.IntegrationTests/Api.IntegrationTests.csproj --filter "Category=Integration"
  ```

  Expect 16/17 to pass: `ClientDedupIntegrationTests.SubmitPublicRegistration_PhoneMatch_ReusesExistingClient`
  is a pre-existing flaky test — it builds a phone from GUID hex chars that fails the
  default Singapore mobile-number validation (returns 400). Unrelated to environment.

### Lint
`cd web && npm run lint`. Note the repo currently has pre-existing ESLint errors
(e.g. `hooks/use-website-auto-save.ts`); a clean exit is not expected today.

### Full Docker Compose stack
`docker compose up --build` (per `README.md`) also works but Docker is NOT installed in
this snapshot and the compose `web` image builds in production mode. Prefer the native
dev workflow above for iterating.
