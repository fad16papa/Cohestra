# Production-like load acceptance report (Story 46.12)

**Production:** NO-GO  
**Recorded:** 2026-11-18 (UTC)  
**Target:** In-process integration test host (`ProductionLikeLoadWebApplicationFactory`), Development environment, **LoadTestSeed disabled**, Postgres `cohestra_test` and Redis on `localhost` only.

## Scope and safety

- **Customer DNS was not used** (`cohestra.app`, `uat.cohestra.app`, and inventory droplet IPs are refused by `deploy/production-like-load.sh`).
- **The production droplet was not contacted** — this run exercised the real API code on a private test host only, not `docker-compose.production.yml` on the 8 GiB droplet.
- **LoadTestSeed** remained disabled (`LoadTestSeed:Enabled=false` in the test factory; `LoadTestSeed__Enabled: "false"` locked in `docker-compose.production.yml`).

## Measured load (bounded)

| Metric | Value |
| --- | --- |
| Endpoint | `GET /health` |
| Requests | 320 |
| Concurrency | 4 |
| Success | 320 |
| Error rate | 0% |
| Latency p50 | 1.182 ms |
| Latency **p95** | **1.979 ms** |
| Latency **p99** | **9.483 ms** |
| Latency max | 10.716 ms |

Source: `_bmad-output/implementation-artifacts/evidence/46-12/load-metrics.json` (written by `ProductionLikeLoadIntegrationTests`).

## Host samples (developer VM at run time — not the production droplet)

| Sample | Value |
| --- | --- |
| Mem available | 4029 MiB (`/proc/meminfo` / `free -m` at 2026-11-18) |
| Load (1m) | 0.70 |
| Disk `/` used % | 5% |

These samples illustrate the reporting shape for future loopback runs via `deploy/production-like-load.sh` when `BASE_URL=http://127.0.0.1:<port>` is set. They **do not** characterize the 8 GiB production droplet.

## Future Story 46.7 latency WARNING (record only — not implemented)

Per observability planning, API latency WARNING threshold = **2 × measured p95**:

- Measured p95: **1.979 ms**
- **46.7 WARNING threshold (recorded): 3.958 ms** (`future46_7LatencyWarningMs` in metrics JSON)

No Grafana, Prometheus, or alerting was built in this story.

## Size recommendation

| Item | Recommendation |
| --- | --- |
| Planning seed (Epic 46 architecture) | **8 GiB RAM** / 4 vCPU |
| This run | Did **not** measure the production droplet under compose load |
| Go/no-go | **NO-GO** to size **below** the 8 GiB planning seed based on this VM-only `/health` probe |

A production-like compose load on the dedicated droplet remains required before inferring capacity GO.

## How to reproduce

```bash
# Guard contract (no server required)
bash deploy/production-like-load.test.sh
bash deploy/production-like-load.sh   # self-check when BASE_URL unset

# Bounded integration load (Postgres + Redis on localhost)
CI=true \
  ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=cohestra_test;Username=crm;Password=crm" \
  ConnectionStrings__Redis="localhost:6379" \
  dotnet test src/Api.IntegrationTests/Api.IntegrationTests.csproj \
  --filter "FullyQualifiedName~ProductionLikeLoadIntegrationTests"
```

Optional loopback curl load (requires a live API on loopback):

```bash
BASE_URL=http://127.0.0.1:8080 REPORT_PATH=/tmp/load-report.json bash deploy/production-like-load.sh
```