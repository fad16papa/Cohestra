---
epic: 19
story: 1
status: ready-for-dev
baseline_commit: 60ab47b69947d7307374e1b993a56546683c0783
---

# Story 19.1: UAT droplet deploy and stack smoke

Status: ready-for-dev

## Story

As a **platform operator**,
I want **Cohestra running on a UAT droplet with automated smoke passing**,
So that **we have a live stack matching production topology before public launch**.

## DONE requires the Mandatory Code Review Loop

IMPLEMENT → BUILD → TEST → `bmad-code-review` (repeat on new HEAD) → PRODUCT/UX ACCEPTANCE → CLOSE.

Deployment/infrastructure stories must additionally include **real environment validation**.

## Acceptance Criteria

Copied from `epics-cohestra-enterprise.md` Epic 19.1:

1. Existing droplet reused per `docs/deploy/digitalocean-uat.md`; isolated Compose project `cohestra-uat`; `.env` from `.env.uat.example` with strong secrets; `bash deploy/uat-compose.sh up -d --build` succeeds **after** port audit; firewall **22, 80, 443 only** (host public proxy). Cohestra loopback binds stay off the public internet.
2. `bash deploy/uat-smoke.sh` with `PUBLIC_BASE_URL` set completes without error.
3. `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false` (or documented bootstrap-only exception); `DEV_TENANT_SLUG` not set on the production path.
4. DNS: apex + wildcard or documented nip.io interim.

## Pre-deployment readiness

**PASS** — `_bmad-output/implementation-artifacts/epic-19-pre-deployment-readiness-2026-09-05.md`

Repo contract, checklists, smoke, rollback, and secrets matrix are ready. This story is still **blocked on owner credentials**.

## Execution gate (2026-09-06)

The **existing** droplet is in use. Public `/ready` is Healthy. Do not create another droplet.

```
PORT PLAN FREEZE          ← DONE 2026-09-06 (host ss: 3100/5100/8180 free)
EDGE PROXY TOPOLOGY       ← Docker network cohestra_uat_edge + alias (this PR)
SSH ACCESS VALIDATION     ← still required before deploy automation
→ ENV RECONCILIATION
→ SERVER BASELINE
→ RECONCILE EDGE NETWORK (no recreate of lead-generation-crm-nginx-1)
→ ADD NEW COHESTRA SERVER BLOCK (backup, nginx -t, reload)
→ DEPLOY ISOLATED cohestra-uat
→ DATABASE MIGRATION (Cohestra volume only)
→ HEALTH CHECKS (loopback 8180 + Cohestra host via existing edge)
→ EXISTING APP REGRESSION CHECK (thesocialcollectivesg.com unchanged)
→ PRODUCT SMOKE
→ RESOURCE CHECK (free -h, docker stats, df, uptime)
→ LOG REVIEW
→ ACCEPTANCE
```

**Port isolation PASS.** Do **not** deploy until the Docker edge topology is in this PR, CI is green, and owner SSH is available. Existing edge must proxy to `http://cohestra-uat-nginx:80`, not `127.0.0.1:8180`.

Paddle full billing lifecycle stays **19.4**. Do not block 19.1 on webhook acceptance.

Owner workstation (do not paste the key or passphrase):

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
UAT_SSH_USER=YOUR_DEPLOY_USER bash deploy/uat-ssh-accept.sh
```

Canonical: `epic-19-uat-access-readiness-2026-09-06.md`

**Do not invent a droplet. Do not put secrets or the private key in the repo.**

Paddle sandbox recon: **PASS**. Preserve local sandbox API key, client token, prices. Same webhook route `POST /api/v1/system/paddle/webhook`.

## Repo already ready

- `docs/deploy/digitalocean-uat.md`
- `docker-compose.uat.yml`
- `deploy/preflight-launch.sh`, `deploy/uat-smoke.sh`
- Story 19.0 local/CI smoke artifacts are on `main`

## Do NOT implement in 19.1

- Stripe (cancelled; 19.4 is Paddle)
- Live Paddle keys (sandbox only until public launch)
- Cinema changes
- Reopening Epic 25 or Epic 34

### Review Findings

Reviewed HEAD `95e5bd0` (PR #294) on 2026-09-06. Mandatory loop applied BLOCKER/MAJOR patches on the following HEAD.

- [x] [Review][Patch] `uat-compose.sh` must refuse later `-p` / `--project-name` [deploy/uat-compose.sh]
- [x] [Review][Patch] Port audit must fail when `ss` is missing (no false free) [deploy/uat-port-audit.sh]
- [x] [Review][Patch] Gate `NGINX_HOST_PORT` 80/443, not only retired `NGINX_HTTP_PORT` [deploy/preflight-launch.sh]
- [x] [Review][Patch] Source droplet `.env` before auditing host ports [deploy/uat-port-audit.sh]
- [x] [Review][Patch] Treat existing `cohestra-uat` listeners as self on redeploy [deploy/uat-port-audit.sh]
- [x] [Review][Patch] `remote-deploy.sh` must reset git, then audit the new tree [deploy/remote-deploy.sh]
- [x] [Review][Patch] Smoke must not skip loopback or default to existing `:80` [deploy/uat-smoke.sh]
- [x] [Review][Patch] Shared-host TLS refuse must treat anything but explicit false as shared [deploy/cohestra-uat-guards.sh]
- [x] [Review][Patch] Refuse certbot / SSL nginx config on the shared host [deploy/uat-compose.sh]
- [x] [Review][Patch] RAM under 3.5 GiB is CONDITIONAL warn, not a port-audit FAIL [deploy/uat-port-audit.sh]
- [x] [Review][Patch] Story AC and env example must not steer at the existing app hostname
- [x] [Review][Defer] Isolation CI does not run `docker compose config` — deferred, pre-existing CI job has no Docker daemon requirement

