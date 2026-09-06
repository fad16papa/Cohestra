# Epic 19 — Cohestra UAT port / data / edge isolation

**Date:** 2026-09-06  
**Compose project:** `cohestra-uat`  
**Networks:** `cohestra_uat_internal` + `cohestra_uat_edge`

## Verdicts

| Gate | Result |
|------|--------|
| COHESTRA PORT ISOLATION | **PASS** — owner host-local `ss`: `127.0.0.1:3100/5100/8180` free; frozen |
| COHESTRA DATA ISOLATION | **PASS** — dedicated project, internal network, volumes; no host DB/Redis |
| SHARED UAT HOSTING | **PASS** — ~3.8 GiB RAM, ~2.6 GiB available, existing stack ~270 MiB. Light UAT only. Not production capacity. |
| EDGE PROXY DESIGN | **PASS in-repo** — `validate-uat-isolation.sh` 26/26. Live attach not applied. |
| PR #294 MERGE | **BLOCKED** until live attach + CI green + exact-HEAD review + SSH + safe merge/deploy trigger |

## Frozen Cohestra host map

| SERVICE | HOST IP | HOST PORT | CONTAINER PORT | PUBLIC? | OWNER |
|---------|---------|-----------|----------------|---------|--------|
| Web | 127.0.0.1 | **3100** | 3000 | NO | Cohestra |
| API | 127.0.0.1 | **5100** | 8080 | NO | Cohestra |
| nginx | 127.0.0.1 | **8180** | 80 | NO | Cohestra |
| Postgres | none | none | 5432 | NO | Cohestra |
| Redis | none | none | 6379 | NO | Cohestra |

Do not change without a genuine future collision.

## Existing stack (owner-discovered)

- `lead-generation-crm-nginx-1` owns `0.0.0.0:80` and `:443`
- Existing loopback: `127.0.0.1:5432` / `:6379`
- SSH: `0.0.0.0:22`
- Do not change those mappings

## Corrected edge

`lead-generation-crm-nginx-1` + `cohestra-uat-nginx` on `cohestra_uat_edge`.
Upstream: `http://cohestra-uat-nginx:80` (Docker DNS).
`127.0.0.1:8180` from inside the existing nginx container is **wrong**.

## Swap

No swap on the host. Not a blocker. Optional 1–2 GiB swap is UAT OOM insurance if
someone runs `compose build` on the droplet. Prefer building without a host spike
(or sequential builds). Do not resize the droplet. Re-check `free -h` after start.

## TLS

Cohestra nginx stays HTTP. Existing certs stay on `lead-generation-crm-nginx-1`.
Story 19.2 owns Cohestra HTTPS. Do not run Cohestra certbot on the shared host.

## Next (still no Cohestra deploy)

1. Owner SSH (`uat-ssh-accept.sh`) — port audit ≠ SSH.  
2. On droplet (read-only): `inspect-existing-nginx.sh` — backup mounted nginx/certs.  
3. `reconcile-edge-network.sh` (connect existing nginx to `cohestra_uat_edge`; do not recreate).  
4. Then `bash deploy/uat-compose.sh up -d --build`.  
5. Add only `zz-cohestra-uat.conf`, `nginx -t`, reload.  
6. Prove existing hostname healthy, then Cohestra via `:8180` and the new hostname.  
7. Capture `free -h`, `docker stats --no-stream`, `df -h`, `uptime`.
