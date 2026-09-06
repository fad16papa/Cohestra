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

1. Existing droplet reused per `docs/deploy/digitalocean-uat.md`; isolated Compose project `cohestra-uat`; `.env` from `.env.uat.example` with strong secrets; `docker compose -f docker-compose.uat.yml up -d --build` succeeds **after** port audit; firewall **22, 80, 443 only** (host public proxy). Cohestra loopback binds stay off the public internet.
2. `bash deploy/uat-smoke.sh` with `PUBLIC_BASE_URL` set completes without error.
3. `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false` (or documented bootstrap-only exception); `DEV_TENANT_SLUG` not set on the production path.
4. DNS: apex + wildcard or documented nip.io interim.

## Pre-deployment readiness

**PASS** — `_bmad-output/implementation-artifacts/epic-19-pre-deployment-readiness-2026-09-05.md`

Repo contract, checklists, smoke, rollback, and secrets matrix are ready. This story is still **blocked on owner credentials**.

## Execution gate (2026-09-06)

The **existing** droplet is in use. Public `/ready` is Healthy. Do not create another droplet.

```
SSH ACCESS VALIDATION   ← current owner boundary (workstation key)
→ SERVER AUDIT (ss + docker ports + memory — deploy/uat-port-audit.sh)
→ PORT PLAN FREEZE (3100 / 5100 / 8180 or documented nearest unused)
→ ENV RECONCILIATION
→ SERVER BASELINE
→ DEPLOY ISOLATED cohestra-uat   ← do not use -p cohestra-infra-uat
→ DATABASE MIGRATION (Cohestra volume only)
→ START SERVICES
→ HEALTH CHECKS (127.0.0.1:8180 + Cohestra public host)
→ EXISTING APP REGRESSION CHECK (unchanged hostname)
→ PRODUCT SMOKE
→ RESOURCE CHECK
→ LOG REVIEW
→ ACCEPTANCE
```

**Do not deploy** until `uat-port-audit.sh` proves `127.0.0.1:3100`, `:5100`, and `:8180` are free. If occupied, do not stop the occupant; freeze a nearest unused Cohestra-specific port in `.env`.

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
