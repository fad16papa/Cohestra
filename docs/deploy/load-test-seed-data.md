# Load test seed data (local Docker)

Five complimentary workspaces for volume and UX testing — **Development only** (blocked in production when enabled).

## Enable

Add to `.env`:

```env
LoadTestSeed__Enabled=true
LoadTestSeed__ForceReseed=false
LoadTestSeed__Password=LoadTest123!
```

Use `LoadTestSeed__ForceReseed=true` only when you need to wipe and recreate all `load-*` tenants. Leave it `false` for day-to-day work.

Load test seed runs **synchronously at API startup** before login is accepted. The first run (or a force reseed) can take several minutes — wait until `docker compose ps` shows all services healthy before signing in.

Recreate the API after changing flags:

```bash
git pull origin main
docker compose build api --no-cache
docker compose up -d --force-recreate api web nginx
```

With `ForceReseed=false`, subsequent restarts skip heavy seeding when data is already present (startup stays fast).

Watch progress during a long first run:

```bash
docker compose logs -f api | grep -i "load test"
```

## Hosts file (required)

```
127.0.0.1 load-core-alpha.localhost
127.0.0.1 load-core-beta.localhost
127.0.0.1 load-pro-alpha.localhost
127.0.0.1 load-pro-beta.localhost
127.0.0.1 load-basic-alpha.localhost
```

Use port **8088** when `NGINX_HTTP_PORT=8088` in `.env` (local-docker example).

---

## Credentials (all tenants)

Default password: **`LoadTest123!`** (override with `LoadTestSeed__Password` in `.env`).

You can sign in at the **default URL** `http://localhost:8088/login` using any load-test email below — the app resolves your workspace from your account and redirects to the correct tenant dashboard. Tenant-specific URLs still work if you prefer them.

| Plan | Tenant | Login URL | Email |
|------|--------|-----------|-------|
| **Core** | Load Test Core Alpha | http://load-core-alpha.localhost:8088/login | load.core.alpha@cohestra.local |
| **Core** | Load Test Core Beta | http://load-core-beta.localhost:8088/login | load.core.beta@cohestra.local |
| **Pro** | Load Test Pro Alpha | http://load-pro-alpha.localhost:8088/login | load.pro.alpha@cohestra.local |
| **Pro** | Load Test Pro Beta | http://load-pro-beta.localhost:8088/login | load.pro.beta@cohestra.local |
| **Basic** | Load Test Basic Alpha | http://load-basic-alpha.localhost:8088/login | load.basic.alpha@cohestra.local |

All accounts are **TenantAdmin** on their respective workspace.

### Other local seed logins (with `.env.local-docker.example`)

| Profile | Email | Password | URL |
|---------|-------|----------|-----|
| Demo operator (default / Pro) | `operator@cohestra.local` | `ChangeMe123!` | http://default.localhost:8088/login |
| Platform admin | `platform-admin@cohestra.local` | `ChangeMe123!` | http://localhost:8088/platform/login |

Enable all of the above via `cp .env.local-docker.example .env` then recreate `api`.

---

## Data volumes per tenant

| Tenant | Plan | Communities | Published | Draft | Archived | Registrations (this month) |
|--------|------|-------------|-----------|-------|----------|----------------------------|
| load-core-alpha | Core | 3 | 12 | 10 | 15 | 1,000 |
| load-core-beta | Core | 3 | 12 | 10 | 15 | 1,000 |
| load-pro-alpha | Pro | 10 | 50 | 20 | 30 | 5,000 |
| load-pro-beta | Pro | 10 | 50 | 20 | 30 | 5,000 |
| load-basic-alpha | Basic | 1 | 4 | 10 | 10 | 250 |

**Also seeded per tenant:** categories (Sports, Social, Wellness), clients (enough for unique registrations), activities with form schemas, registrations dated within the current calendar month.

**Calendar testing:** On API startup, load-test schedules are backfilled across a ~14-day past / 12-week future window so draft, published, and archived activities appear in the dashboard calendar for every profile below. Open the **Calendar** nudge (bottom-right) and browse the current month — you should see colored dots on most days.

**Calendar conflict samples (`load-core-alpha` only):** Published activities `load-core-alpha-001`, `002`, and `003` are pinned to the same day (~10 days from seed date): **1:00 pm** and **1:30 pm** overlap (scheduling conflict), plus **3:00 pm** on the same day without overlap. Log in as `load.core.alpha@cohestra.local`, open Calendar, and select that day to verify conflict warnings.

**Core + Pro only:** published site homepage (website builder unlocked for load-test slugs).

**Basic:** stub public homepage (Basic plan — no full builder).

---

## Quick verification

After logs show `Seeded load test tenant load-core-alpha ...`:

| Check | URL |
|-------|-----|
| Core activities list | http://load-core-alpha.localhost:8088/dashboard |
| Pro clients at scale | http://load-pro-alpha.localhost:8088/clients |
| Basic public door | http://load-basic-alpha.localhost:8088/ |

---

## Notes

- You can sign in at **http://localhost:8088/login** (email-based workspace resolution) or on a tenant subdomain.
- `LoadTestSeed__ForceReseed=true` wipes existing `load-*` tenants and recreates them **before** the API accepts traffic (avoid leaving this on after the first reseed).
- If login shows **"Service is temporarily unavailable"** (503): pull latest `main` (or PR #80), set `LoadTestSeed__ForceReseed=false`, rebuild the API, and wait until `docker compose ps` shows all containers healthy (first seed can take up to ~15 minutes). Check `docker compose logs api | grep -iE "Login readiness|load test|error"`.
- Compatible with `DemoDataSeed__Enabled=true` (demo targets **default** tenant only; load test uses `load-*` tenants).
- Implementation: `src/Infrastructure/Seed/LoadTestDataSeeder.cs`
