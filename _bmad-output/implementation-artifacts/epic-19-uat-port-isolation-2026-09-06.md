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
| EDGE PROXY DESIGN | **PASS in-repo** — live attach not applied (owner-session boundary) |
| SSH ACCESS | **PASS** — `deploy` + sudo group + docker group (NOPASSWD not required) |
| DOCKER DEPLOY ACCESS | **PASS** |
| EXISTING APP BASELINE | **PASS** |
| PR #294 MERGE | **BLOCKED** until live discover/backup/attach + Cohestra internal + review |
| Exact reviewed implementation HEAD | see latest review artifact after this revision |

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

## Next (SSH gate closed — run on the droplet as `deploy`)

1. `bash deploy/host-proxy/live-19-1.sh discover` (read-only)  
2. `bash deploy/host-proxy/live-19-1.sh backup`  
3. `bash deploy/host-proxy/live-19-1.sh attach` then re-verify existing app  
4. Reconcile droplet `.env` (preserve Paddle sandbox + SendGrid; set Cohestra UAT hostname)  
5. Only then `bash deploy/uat-compose.sh up -d --build`  
6. Prove data targets with `prove-cohestra-data-targets.sh` before migrations  
7. Internal loopback 3100/5100/8180, then additive `zz-cohestra-uat.conf`, `nginx -t`, reload  
8. Do not apt upgrade / reboot as part of 19.1.
