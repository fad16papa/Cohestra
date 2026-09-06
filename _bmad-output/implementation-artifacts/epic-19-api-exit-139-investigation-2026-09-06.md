# Investigation: Cohestra UAT API exit 139

## Hand-off Brief

1. **What happened.** Isolated UAT compose started; dedicated Postgres/Redis became healthy; `cohestra-uat-api` crash-looped with exit **139**; web/nginx stayed Created.
2. **Where the case stands.** Evidence-light. Screenshot + `docker ps` confirm 139 and healthy data services. Logs, `OOMKilled`, `dotnet --info`, dmesg, and foreground reproduction are **missing**.
3. **What's needed next.** On the droplet, from `/home/deploy/cohestra`: `bash deploy/host-proxy/capture-api-crash-139.sh` and paste the redacted output. Do not change DNS/vhost. Do not delete volumes.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Epic 19 / Story 19.1 |
| Date opened | 2026-09-06 |
| Status | Active — evidence collection |
| System | Shared DigitalOcean droplet `ubuntu-s-2vcpu-4gb-sgp1` |
| Evidence sources | Owner screenshot of compose/ps/curl/stats; repo Dockerfile/Program.cs |

## Problem Statement

`cohestra-uat-api` restarts with exit 139 (normally SIGSEGV). Owner curl to 5100/3100/8180 failed. Existing lead-generation-crm remains up.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| compose up output | Available | volumes created; api unhealthy; web/nginx blocked |
| `docker ps -a` | Available | API Restarting (139); postgres/redis healthy; existing app 2 months healthy |
| curl loopback | Available | expected connect failures |
| `free -h` / `df -h` / `docker stats` | Available | 2.4 GiB available; API 0B/0 PIDs; disk 60G free |
| API logs | Missing | required |
| `State.OOMKilled` | Missing | required |
| `dotnet --info` in image | Missing | CASE 1 discriminator |
| dmesg | Missing | required |
| foreground `uat-compose.sh run --rm --no-deps api` | Missing | CASE 2/3 discriminator |
| deployed SHA | Missing | required |

## Confirmed Findings

### Finding 1: Dedicated Cohestra data plane started

**Evidence:** owner `docker ps` — `cohestra-uat-postgres` and `cohestra-uat-redis` Up (healthy); no host ports on those containers.

**Detail:** Isolation of Postgres/Redis is not the crash.

### Finding 2: API last observed exit is 139

**Evidence:** owner `docker ps -a` status `Restarting (139)`.

**Detail:** Do not treat this as a healthcheck timeout. 139 is 128+11 (SIGSEGV) unless a later foreground run shows a managed exception (CASE 3).

### Finding 3: Ordinary host OOM is not supported by current resource numbers

**Evidence:** `free -h` available 2.4 GiB; exit is 139 not 137; API stats 0B / 0 PIDs.

**Detail:** Still must read `OOMKilled` and dmesg before closing OOM.

### Finding 4: Existing application untouched by this start attempt

**Evidence:** lead-generation-crm containers Up 2 months (healthy); host 80/443, 127.0.0.1:5432, 127.0.0.1:6379 unchanged.

### Finding 5: Web/nginx did not start

**Evidence:** compose `Created` + dependency failed. Loopback curl failures are consequences, not separate defects.

## Deduced Conclusions

### Deduction 1: Crash is in the API container process, not Compose networking

**Based on:** Findings 1–5.

**Conclusion:** Diagnose `dotnet Api.dll` inside `cohestra-uat-api` before changing ports, DNS, or volumes.

## Hypothesized Paths

### H1: Native runtime segfault (CASE 1 / class F)

**Status:** Open  
**Would confirm:** `docker run --rm --entrypoint dotnet IMAGE --info` also exits 139, or dmesg shows coreclr/segfault.  
**Would refute:** `dotnet --info` exits 0 and foreground API prints a managed exception.

### H2: Managed startup exception; 139 is secondary (CASE 3)

**Status:** Open  
**Would confirm:** foreground run prints `InvalidOperationException` / EF / config error and a non-139 process exit.  
**Note:** UAT Compose sets `ASPNETCORE_ENVIRONMENT=Production` and `Username=${POSTGRES_USER:-crm}`. `ProductionSecurityValidator` rejects `Username=crm` or `Password=crm` in Production (`src/Infrastructure/Auth/ProductionSecurityValidator.cs`). That is a **managed** throw (normally exit 1), not a proven 139 cause. Look for that message in logs before changing the validator.

### H3: Crash during/after EF migrations (CASE 2)

**Status:** Open  
**Would confirm:** logs reach `ApplyMigrationsAsync` / Npgsql then stop, or stop before `Database migrations applied successfully.`

## Decision tree (blocked on capture)

| Discriminator | If true | Class |
| ------------- | ------- | ----- |
| `dotnet --info` exits 139 | environment/runtime | F |
| `dotnet --info` OK, `Api.dll` dies with no managed log | native during startup | A/C/F after last log line |
| foreground managed exception | treat exception as truth | C or config |

## Safety already in force

- No `compose down -v`
- No volume rm
- No existing-app mutation
- No public vhost / DNS
- No Dockerfile/runtime switch without capture evidence

## Next command

```bash
cd /home/deploy/cohestra
bash deploy/host-proxy/capture-api-crash-139.sh
```
