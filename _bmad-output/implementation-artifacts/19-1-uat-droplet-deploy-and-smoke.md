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

1. Droplet provisioned per `docs/deploy/digitalocean-uat.md`; `.env` from `.env.uat.example` with strong secrets; `docker compose -f docker-compose.uat.yml up -d --build` succeeds; firewall **22, 80, 443 only**.
2. `bash deploy/uat-smoke.sh` with `PUBLIC_BASE_URL` set completes without error.
3. `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false` (or documented bootstrap-only exception); `DEV_TENANT_SLUG` not set on the production path.
4. DNS: apex + wildcard or documented nip.io interim.

## Pre-deployment readiness

**PASS** — `_bmad-output/implementation-artifacts/epic-19-pre-deployment-readiness-2026-09-05.md`

Repo contract, checklists, smoke, rollback, and secrets matrix are ready. This story is still **blocked on owner credentials**.

## Owner gate (blocks implementation in this environment)

This story cannot be executed in the Cloud Agent VM:

- No Docker daemon
- No DigitalOcean token / droplet SSH
- No UAT public URL
- Deploying is an irreversible environment action

**Do not invent a droplet. Do not put secrets in the repo.**

Required from the owner to continue:

1. DigitalOcean access / SSH (existing droplet **or** token to create one)
2. SendGrid Mail Send key + verified from-addresses
3. Paddle sandbox credentials (can wait until 19.4)
4. reCAPTCHA UAT credentials (can wait until 19.3)

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
