# BMAD code review Pass 2 — Epic 19 UAT isolation

**Reviewed HEAD:** `0175767`  
**Prior HEAD (invalid after patches):** `95e5bd0`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294  
**Date:** 2026-09-06

Pass 1 on `95e5bd0` found BLOCKER/MAJOR. Those patches are in `0175767`. This pass reviews the **new** HEAD only.

## Pass 1 triage (closed on 0175767)

| Sev | Finding | Status |
|-----|---------|--------|
| BLOCKER | `uat-compose.sh` later `-p` can recreate live project | patched |
| BLOCKER | `ss` missing reported ports free | patched (fail closed) |
| BLOCKER | `NGINX_HOST_PORT=80/443` not gated | patched |
| MAJOR | Audit ignored droplet `.env` port map | patched |
| MAJOR | Redeploy failed on own loopback binds | patched |
| MAJOR | Audit ran before `git reset` | patched |
| MAJOR | Smoke defaulted to existing `:80` / skipped loopback | patched |
| MAJOR | `COHESTRA_SHARED_HOST_UAT=TRUE` bypassed TLS refuse | patched |
| MAJOR | certbot / SSL nginx config on shared host | patched |
| MAJOR | RAM < 3.5 GiB hard-failed a port-clean deploy | patched (CONDITIONAL warn; FAIL only < 2 GiB) |
| MINOR | Story AC still said raw `docker compose -f` | patched |
| MINOR | Env example steered at existing hostname / nip.io | patched |
| — | Isolation CI has no `docker compose config` | deferred |

Dismissed: owner-locked 3100/5100 diagnostic binds; empty `X-Forwarded-Proto` on loopback HTTP.

## Pass 2 on 0175767

Verified locally:

- `validate-uat-isolation.sh` 17/17
- `uat-compose.sh -p cohestra-infra-uat` REFUSE
- `COMPOSE_PROJECT_NAME=cohestra-infra-uat` REFUSE
- `NGINX_HOST_PORT=80` REFUSE
- `NGINX_CONFIG_PATH=.../active-ssl.conf` REFUSE
- `COHESTRA_SHARED_HOST_UAT=TRUE` TLS refuse
- `uat-port-audit.sh` no longer dies under `set -e` when a port is free

No new BLOCKER / MAJOR on this HEAD.

Residual (do not block this review): host loopback occupancy on the **droplet** is still unproven; Story 19.1 product acceptance still needs owner SSH + `uat-port-audit.sh` on that host.

## Decision

**CODE REVIEW: PASS** on `0175767` (no unresolved BLOCKER / MAJOR).  
Do **not** mark Story 19.1 done. Product / remote UAT acceptance remains gated.
