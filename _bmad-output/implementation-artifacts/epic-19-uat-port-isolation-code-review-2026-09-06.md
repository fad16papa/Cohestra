# BMAD code review — Epic 19 UAT port isolation

**HEAD:** `299bb54`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294  
**Date:** 2026-09-06  

Loop: IMPLEMENT → BUILD (`validate-uat-isolation.sh` 17/17) → TEST (repo contract + public port probe) → REVIEW.

## Layers

### Blind Hunter

No leftover `80:80`, `443:443`, `5432:5432`, `6379:6379`, or `0.0.0.0` binds in `docker-compose.uat.yml`. Project name is no longer `cohestra-infra-uat`. Compose invocations that can mutate the droplet go through `deploy/uat-compose.sh --project-name cohestra-uat`. Let’s Encrypt scripts refuse on the shared host.

### Edge Case Hunter

- Preferred loopback ports occupied: audit fails; deploy scripts stop; occupant is not killed.
- `COMPOSE_PROJECT_NAME=cohestra-infra-uat`: wrapper refuses.
- `NGINX_CONFIG_PATH` still *can* mount an SSL config; host `443` is not published, and TLS scripts refuse. Residual: do not point UAT at `active-ssl.conf` on the shared droplet.
- GitHub `deploy.yml` on merge would call `remote-deploy.sh`; that path now audits first and starts **`cohestra-uat`**, it does not recreate the live project. Residual operational: confirm `DROPLET_DEPLOY_PATH` before merging.

### Acceptance Auditor

Owner locks mapped to repo:

| Lock | Evidence |
|------|----------|
| Own compose / network / volumes | `name: cohestra-uat`, `cohestra_uat_internal`, `cohestra_uat_*` volumes |
| Own web/api/nginx host ports | `127.0.0.1:3100:3000`, `:5100:8080`, `:8180:80` |
| Container-native ports unchanged | 3000 / 8080 / 80 / 5432 / 6379 |
| Postgres/Redis no host port | no `ports:` on those services |
| nginx routes `/` and `/api/` via Docker DNS | `web:3000`, `api:8080` |
| No public 80/443 on Cohestra nginx | HTTP-only; host-proxy examples only |
| Existing app unchanged | no edits to another product’s compose; live project name avoided |
| Do not deploy until ports free | audit gate on bootstrap + remote-deploy |
| Paddle route unchanged | no billing path edits |

## Findings

No **BLOCKER** or **MAJOR** remaining on this HEAD.

**Minor / residual (do not block review):**

1. Host loopback occupancy is still unproven from this agent (no SSH). Deploy stays gated on `uat-port-audit.sh`.
2. Shared-host RAM is **CONDITIONAL**; audit warns under 1.2 GiB available and does not weaken isolation.
3. Public proxy identity (`nginx/1.27.5`) is inferred from headers; confirm with `ss` / `docker ps` on the host before applying a vhost.

## Decision

**CODE REVIEW: PASS** on `299bb54`.  
Remote UAT acceptance is **not** authorized until the owner-workstation SSH + droplet port audit pass.
