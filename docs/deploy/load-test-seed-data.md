# Load test seed data (local Docker)

Five complimentary workspaces for volume and UX testing — **Development only** (blocked in production when enabled).

## Enable

Add to `.env`:

```env
LoadTestSeed__Enabled=true
LoadTestSeed__ForceReseed=true
LoadTestSeed__Password=LoadTest123!
```

Recreate the API after changing flags:

```bash
git pull origin main
docker compose build api --no-cache
docker compose up -d --force-recreate api web nginx
```

Load test seed runs **in the background** after the API is healthy (Pro tenants can take several minutes). Watch progress:

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

| Plan | Tenant | Login URL | Email |
|------|--------|-----------|-------|
| **Core** | Load Test Core Alpha | http://load-core-alpha.localhost:8088/login | load.core.alpha@cohestra.local |
| **Core** | Load Test Core Beta | http://load-core-beta.localhost:8088/login | load.core.beta@cohestra.local |
| **Pro** | Load Test Pro Alpha | http://load-pro-alpha.localhost:8088/login | load.pro.alpha@cohestra.local |
| **Pro** | Load Test Pro Beta | http://load-pro-beta.localhost:8088/login | load.pro.beta@cohestra.local |
| **Basic** | Load Test Basic Alpha | http://load-basic-alpha.localhost:8088/login | load.basic.alpha@cohestra.local |

All accounts are **TenantAdmin** on their respective workspace.

---

## Data volumes per tenant

| Tenant | Plan | Communities | Published | Draft | Archived | Registrations (this month) |
|--------|------|-------------|-----------|-------|----------|----------------------------|
| load-core-alpha | Core | 3 | 12 | 10 | 15 | 1,000 |
| load-core-beta | Core | 3 | 12 | 10 | 15 | 1,000 |
| load-pro-alpha | Pro | 10 | 50 | 20 | 30 | 5,000 |
| load-pro-beta | Pro | 10 | 50 | 20 | 30 | 5,000 |
| load-basic-alpha | Basic | 1 | 3 | 10 | 10 | 150 |

**Also seeded per tenant:** categories (Sports, Social, Wellness), clients (enough for unique registrations), activities with form schemas, registrations dated within the current calendar month.

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

- Login must use the **tenant subdomain** (e.g. `load-core-alpha.localhost`), not bare `localhost:8088`.
- `LoadTestSeed__ForceReseed=true` wipes existing `load-*` tenants and recreates them on each API startup.
- Compatible with `DemoDataSeed__Enabled=true` (demo targets **default** tenant only; load test uses `load-*` tenants).
- Implementation: `src/Infrastructure/Seed/LoadTestDataSeeder.cs`
