---
epic: 19
story: 1
status: in-progress
baseline_commit: pending
brainstorm: _bmad-output/brainstorming/epic-19-production-launch-2026-08-22/brainstorm-intent.md
---

# Story 19.1: UAT droplet deploy and stack smoke

Status: in-progress

## Story

As a **platform operator**,
I want **Cohestra running on a UAT droplet with automated smoke passing**,
So that **we have a live stack matching production topology before HTTPS, reCAPTCHA, and billing UAT**.

## Context

- **Epic 19 evidence ladder:** 19.1 must complete before 19.2–19.5. Each story produces dated evidence (URL + command output + sign-off note).
- **Dev pre-work done (Story 19.0):** `preflight-launch.sh`, `uat-smoke.sh`, `verify-security-headers.sh`, `ci-docker-smoke.sh`, catalog backfill migration, launch checklist.
- **This story is primarily ops execution** on a DigitalOcean droplet; dev deliverable is the evidence runner + preflight guard for `SMOKE_TENANT_HOST`.
- **Oracle:** `docs/deploy/enterprise-launch-checklist.md` § Deploy + `docs/deploy/digitalocean-uat.md`.

## Acceptance Criteria

### AC1 — Droplet provisioned

**Given** Ubuntu 22.04+ droplet per `docs/deploy/digitalocean-uat.md`  
**When** firewall is configured  
**Then** inbound allows **22, 80, 443 only**  
**And** 5432/6379/3000/8080 are not public

### AC2 — Environment hardened

**Given** `.env` copied from `.env.uat.example` with strong secrets  
**When** `bash deploy/preflight-launch.sh` runs on the server  
**Then** exit code is 0  
**And** `DemoDataSeed__Enabled=false`, `LoadTestSeed__Enabled=false`  
**And** `DEV_TENANT_SLUG` is **unset**  
**And** `POSTGRES_PASSWORD` and `JWT_SIGNING_KEY` are not dev defaults

### AC3 — Stack deploys

**Given** repo cloned on droplet at desired tag/commit  
**When** `docker compose -f docker-compose.uat.yml up -d --build` runs  
**Then** all services reach healthy/running state  
**And** EF migrations apply (including `AddPlatformOpsConsoleEpic28`, `AddActivityScheduledStartsAt`)

### AC4 — Automated smoke passes

**Given** `PUBLIC_BASE_URL` set to droplet URL (http://IP or https://domain)  
**When** `SMOKE_TENANT_HOST` is set to a real tenant host (e.g. `creativorare.cohestra.app`)  
**And** `bash deploy/epic-19-1-evidence.sh` runs (or `uat-smoke.sh --full` manually)  
**Then** exit code is 0  
**And** `/ready` returns Healthy  
**And** full API smoke includes tenant door + registration path

### AC5 — Evidence bundle recorded

**Given** AC1–AC4 pass  
**When** operator completes story  
**Then** evidence file or sign-off note includes:

| Evidence | Example |
|----------|---------|
| Droplet URL | `https://creativorare.cohestra.app` |
| `PUBLIC_BASE_URL` | same apex or IP |
| `SMOKE_TENANT_HOST` | tenant subdomain used |
| Preflight output | pasted or linked |
| Smoke summary | `Passed: N \| Failed: 0` |
| DNS decision | wildcard `*.cohestra.app` vs nip.io interim |
| Date | ISO date of run |

**And** `docs/deploy/enterprise-launch-checklist.md` Deploy section checkboxes updated where applicable

### AC6 — Two-tenant bootstrap (recommended)

**Given** first deploy on fresh volume  
**When** bootstrap completes  
**Then** at least one **Pro** tenant (e.g. `creativorare`) and one **Basic** tenant exist for Epic 19.5  
**And** bootstrap method documented (seed script, self-serve signup, or `uat-bootstrap.sh` notes)

## Tasks / Subtasks

### Dev (repo — agent)

- [x] **Task 1 — Evidence runner script** (AC: 4, 5)
  - [x] Add `deploy/epic-19-1-evidence.sh` — validates env, runs preflight + `uat-smoke.sh --full`, prints evidence template
  - [x] Document usage in script header + story Dev Notes

- [x] **Task 2 — Preflight SMOKE_TENANT_HOST guard** (AC: 4)
  - [x] `preflight-launch.sh` fails when `PUBLIC_BASE_URL` is not localhost and `SMOKE_TENANT_HOST` unset

- [x] **Task 3 — Launch checklist cross-link** (AC: 5)
  - [x] Add Story 19.1 evidence command to `enterprise-launch-checklist.md` Deploy section

### Ops (droplet — operator)

- [ ] **Task 4 — Provision droplet** (AC: 1)
  - [ ] Follow `docs/deploy/digitalocean-uat.md` §1–3
  - [ ] Enable weekly backups

- [ ] **Task 5 — Configure `.env`** (AC: 2)
  - [ ] Fill secrets from `.env.uat.example`
  - [ ] Set `PUBLIC_BASE_URL`; seeds off; no `DEV_TENANT_SLUG`

- [ ] **Task 6 — Deploy stack** (AC: 3)
  - [ ] `docker compose -f docker-compose.uat.yml up -d --build`
  - [ ] Verify migrations in API logs

- [ ] **Task 7 — Run evidence bundle** (AC: 4, 5)
  - [ ] `PUBLIC_BASE_URL=… SMOKE_TENANT_HOST=… bash deploy/epic-19-1-evidence.sh`
  - [ ] Save output; update sign-off notes

- [ ] **Task 8 — Bootstrap tenants** (AC: 6)
  - [ ] Pro + Basic tenants ready for 19.5

## Dev Notes

### Required environment variables (droplet)

```bash
PUBLIC_BASE_URL=https://YOUR_DROPLET_OR_DOMAIN
SMOKE_TENANT_HOST=creativorare.YOUR_DOMAIN   # REQUIRED for non-localhost smoke
```

### Commands (copy-paste)

```bash
cp .env.uat.example .env   # edit on server
bash deploy/preflight-launch.sh
docker compose -f docker-compose.uat.yml up -d --build
PUBLIC_BASE_URL=https://YOUR_URL SMOKE_TENANT_HOST=tenant.YOUR_URL bash deploy/epic-19-1-evidence.sh
curl -s "${PUBLIC_BASE_URL}/ready" | jq .
docker compose -f docker-compose.uat.yml ps
```

### Common failures (from Epic 19 brainstorm)

| Symptom | Fix |
|---------|-----|
| Smoke green but tenant door untested | Set `SMOKE_TENANT_HOST` |
| `/ready` unhealthy | Check nginx + api logs; migrations |
| Preflight fails on JWT | Generate 32+ char secret |
| Full smoke registration fail | Ensure tenant exists; catalog migration applied |

### Do NOT do in 19.1

- HTTPS / HSTS (Story 19.2)
- reCAPTCHA enable (Story 19.3) — preflight warns only
- Stripe webhook setup (Story 19.4)
- §7 operator flows sign-off (Story 19.5)

### Previous story intelligence (19.0)

- `docker-compose.ci-smoke.yml` forces `DEV_TENANT_SLUG=""` — replicate on UAT compose env
- `uat-smoke.sh --full` captures nested exit code; use evidence script for repeatable bundle
- Catalog backfill migration prevents activity edit failures post-deploy

### References

- [Epic 19 brainstorm](../brainstorming/epic-19-production-launch-2026-08-22/brainstorm-intent.md)
- [Enterprise launch checklist](../../docs/deploy/enterprise-launch-checklist.md)
- [DigitalOcean UAT](../../docs/deploy/digitalocean-uat.md)
- [Story 19.0](./19-0-production-readiness-dev.md)
- [Epics — Epic 19](../planning-artifacts/epics-cohestra-enterprise.md)

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log

- Preflight SMOKE_TENANT_HOST guard added before JWT checks so droplet misconfig fails early.
- Evidence script chains preflight (non-strict reCAPTCHA) + compose ps + uat-smoke --full.

### Completion Notes List

- **Dev tasks complete (2026-08-22).** Ops Tasks 4–8 require droplet access — operator must run `deploy/epic-19-1-evidence.sh` on server and save output.
- Story moves to `review` after ops evidence captured; AC1–AC6 fully satisfied only with droplet run.

### File List

- `_bmad-output/implementation-artifacts/19-1-uat-droplet-deploy-and-smoke.md`
- `deploy/epic-19-1-evidence.sh`
- `deploy/preflight-launch.sh`
- `docs/deploy/enterprise-launch-checklist.md`

## Change Log

| Date | Change |
|------|--------|
| 2026-08-22 | Story created from Epic 19 brainstorm evidence ladder |
| 2026-08-22 | Dev automation: evidence script + preflight SMOKE_TENANT_HOST guard |
