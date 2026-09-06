# Epic 19 — Cohestra UAT port / data isolation

**Date:** 2026-09-06  
**Compose project:** `cohestra-uat`  
**Network:** `cohestra_uat_internal`

Owner lock: share the physical DigitalOcean UAT droplet; do not share the existing
application’s Compose project, network, ports, Postgres, Redis, volumes, or env.

## Verdicts

| Gate | Result |
|------|--------|
| COHESTRA PORT ISOLATION (repo contract) | **PASS** — `bash deploy/validate-uat-isolation.sh` |
| COHESTRA PORT ISOLATION (host loopback occupancy) | **FAIL** — not yet proven. This VM cannot see `127.0.0.1` on the droplet. Do not deploy. |
| COHESTRA DATA ISOLATION (repo contract) | **PASS** — dedicated project, network, volumes, credentials path, no host DB/Redis publish |
| SHARED UAT HOSTING | **CONDITIONAL** — 2 vCPU / 4 GiB is tight once the existing stack stays up. Port isolation does not prove RAM. |

External scan from this agent (not a substitute for `ss` on the host):

| Port | `129.212.235.2` |
|------|-----------------|
| 22, 80, 443 | OPEN |
| 3000, 3100, 5100, 8080, 8088, 8180, 5432, 6379 | closed_or_filtered |

Public `/ready` on `:80`/`:443` is **Healthy** for the **existing** application (`Server: nginx/1.27.5`). That listener must stay theirs.

## COHESTRA PORT PLAN (proposed; freeze after host audit)

| SERVICE | HOST IP | HOST PORT | CONTAINER PORT | PUBLIC? | OWNER |
|---------|---------|-----------|----------------|---------|--------|
| Web | 127.0.0.1 | 3100 | 3000 | NO | Cohestra |
| API | 127.0.0.1 | 5100 | 8080 | NO | Cohestra |
| nginx | 127.0.0.1 | 8180 | 80 | NO | Cohestra |
| Postgres | none | none | 5432 | NO | Cohestra |
| Redis | none | none | 6379 | NO | Cohestra |
| Public reverse proxy | 0.0.0.0 | 80 / 443 | existing | YES | Shared host |
| SSH | 0.0.0.0 | 22 | host | YES | Shared host |

If a preferred loopback port is occupied: do not stop the occupant. Choose the nearest unused Cohestra-specific port (`+10` / `+20` / `+100`) and freeze it in `.env` (`WEB_HOST_PORT` / `API_HOST_PORT` / `NGINX_HOST_PORT`).

## Why the Compose project was renamed

`docker-compose.uat.yml` previously used `name: cohestra-infra-uat` and published
`:80` / `:443` plus loopback Postgres/Redis. A `compose up` of that file on the
shared droplet could recreate or steal the live public stack.

Isolated UAT now uses **`cohestra-uat`**. Scripts refuse `COMPOSE_PROJECT_NAME=cohestra-infra-uat`.

## TLS

Cohestra nginx stays HTTP. Shared-host UAT terminates TLS at the host public reverse
proxy. `setup-temporary-https.sh` and `switch-https-domain.sh` refuse unless
`COHESTRA_SHARED_HOST_UAT=false` (dedicated droplet only).

## Next safe action

1. Owner workstation: `uat-ssh-accept.sh` until PASS.  
2. On the droplet (read-only): `bash deploy/uat-port-audit.sh`.  
3. If 3100 / 5100 / 8180 are free, freeze that map.  
4. Add a **new** Cohestra hostname on the existing public proxy → `127.0.0.1:8180`. Do not change the existing application hostname.  
5. Only then: isolated `bash deploy/uat-compose.sh up -d --build`.  
6. Prove existing app still healthy, then Cohestra loopback + public host.
