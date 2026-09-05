---
story_id: 19.1
story_key: 19-1-uat-droplet-deploy-and-smoke
epic: 19
status: in-progress
baseline_commit: 7b4a892
created: 2026-08-31
depends_on:
  - 29-7-paddle-sandbox-uat-epic-14-regression
  - 19-0-production-readiness-dev
forward_deps:
  - 19-2-https-edge-security-header-verify
  - 19-3-recaptcha-production-enablement
  - 19-4-paddle-billing-uat-on-droplet
  - 19-5-operator-core-flows-launch-signoff
sources:
  - _bmad-output/planning-artifacts/epics-cohestra-enterprise.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-01.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-22-hold-epic-19-paddle.md
  - _bmad-output/implementation-artifacts/19-0-production-readiness-dev.md
  - docs/deploy/digitalocean-uat.md
  - docs/deploy/enterprise-launch-checklist.md
  - docs/deploy/sendgrid-production.md
---

# Story 19.1: UAT droplet deploy and stack smoke

Status: in-progress

<!-- Ultimate context engine analysis completed — comprehensive operator + dev guide for Epic 19 kickoff -->

## Story

As a **platform operator**,
I want **Cohestra running on a UAT droplet with automated smoke passing**,
So that **we have a live stack matching production topology before public launch**.

**Epic:** 19 — Production Launch Sign-off. **FRs touched:** deploy NFR, billing readiness (Paddle keys land in 19.4). **Not in scope:** HTTPS hardening (19.2), reCAPTCHA prod keys (19.3), Paddle checkout on droplet (19.4), §7 operator flows (19.5).

## Acceptance Criteria

1. **Given** DigitalOcean droplet provisioned per `docs/deploy/digitalocean-uat.md`
   **When** `.env` is filled from `.env.uat.example` with strong secrets
   **Then** `docker compose -f docker-compose.uat.yml up -d --build` succeeds
   **And** firewall allows **22, 80, 443 only**

2. **Given** deploy completes
   **When** `bash deploy/uat-smoke.sh` runs with `PUBLIC_BASE_URL` set to the droplet URL
   **Then** script completes without error (`/ready`, web home, auth onboarding, signup/pricing surfaces)
   **And** with `--full`, nested `local-smoke-run.sh` passes when `SMOKE_TENANT_HOST` is set for apex/IP URLs

3. **Given** production-minded UAT
   **When** reviewing compose env
   **Then** `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false` (defaults in `docker-compose.uat.yml`)
   **And** `DEV_TENANT_SLUG` is **not** set on production path
   **And** `OperatorSeed__Enabled=true` is documented bootstrap-only exception if used once

4. **Given** DNS
   **When** launch uses custom domain
   **Then** apex + wildcard (or documented nip.io interim) point to droplet
   **And** `PUBLIC_BASE_URL` matches the browser URL exactly (rebuild `web` after change)

## Tasks / Subtasks

- [ ] **Task 1 — Droplet + firewall** (AC: 1, 4)
  - [x] Droplet exists (129.212.235.2); HTTPS cert for `thesocialcollectivesg.com` (verified 2026-08-31)
  - [ ] Confirm DO firewall: inbound **22, 80, 443** only (operator verify in DO console)
  - [ ] Document wildcard/`cohestra.app` DNS if marketing signup checks required on same stack

- [ ] **Task 2 — Bootstrap repo + secrets** (AC: 1, 3)
  - [ ] SSH → pull latest `main` → confirm `.env` secrets (operator)
  - [x] Compose defaults verified in repo: `OperatorSeed__Enabled=false`, `DemoDataSeed__Enabled=false`; no `DEV_TENANT_SLUG` in `docker-compose.uat.yml`
  - [ ] Run `bash deploy/preflight-launch.sh` on droplet after `.env` review

- [ ] **Task 3 — Deploy stack** (AC: 1)
  - [x] `/ready` healthy on `https://thesocialcollectivesg.com` (2026-08-31 remote probe)
  - [ ] Redeploy latest `main`: `docker compose -f docker-compose.uat.yml up -d --build` (operator — stack appears behind current main)
  - [ ] `docker compose -f docker-compose.uat.yml ps` all healthy on server

- [ ] **Task 4 — Automated smoke** (AC: 2)
  - [x] Remote smoke script fix: `uat-smoke.sh` skips local Docker when probing remote URL
  - [ ] Full pass on droplet URL (see Dev Agent Record — 3 pass / 4 fail on 2026-08-31 probe)
  - [ ] `PUBLIC_BASE_URL=… SMOKE_TENANT_HOST=… bash deploy/uat-smoke.sh --full` exits 0

- [ ] **Task 5 — Manual operator bootstrap** (AC: 3)
  - [x] Operator already exists (`registrationAvailable: false` on onboarding API)
  - [ ] Dashboard login verified in browser post-redeploy
  - [ ] Enterprise checklist **Deploy** section checked with evidence

- [x] **Task 6 — Dev gaps (only if smoke fails)** (AC: 2)
  - [x] `deploy/uat-smoke.sh`: skip Docker when not on PATH; `SMOKE_MARKETING_HOST` for Host-header marketing checks; `SMOKE_INSECURE_TLS=1` for cert mismatch probes
  - [x] `docs/deploy/digitalocean-uat.md`: remote smoke from laptop documented

## Dev Notes

### Story type

**Primarily operator/ops.** Dev work is limited to minor script or doc fixes discovered during smoke (Story 19.0 already landed preflight, uat-smoke, CI docker smoke, catalog backfill migration).

### Prerequisites (must be true before starting)

| Gate | Evidence |
|------|----------|
| Epic 29 done | Paddle adapter on `main`; 29.7 sandbox walk signed off |
| Local §1–§3 | `enterprise-launch-checklist.md` local Docker verify passed |
| SendGrid | Live Mail Send API key + verified sender domain (API refuses Production start without valid SendGrid) |
| No Stripe on droplet | Epic 19.4 is **Paddle** UAT — do not configure Stripe keys |

### Architecture on droplet

```
Internet (:80 / :443)
    → nginx container (deploy/nginx/app.conf or active-ssl.conf)
        /      → web:3000 (Next.js, PUBLIC_BASE_URL baked at build)
        /api/* → api:8080 (ASP.NET Core, Production env)
    postgres + redis (127.0.0.1 bind only — SSH tunnel for pgAdmin)
```

Same routing as local `docker-compose.yml`; UAT differs by Production env, required secrets, seed flags off.

### Critical env vars (`.env.uat.example`)

| Variable | Rule |
|----------|------|
| `PUBLIC_BASE_URL` | Must match browser URL exactly; rebuild `web` after change |
| `POSTGRES_PASSWORD` | Not `crm` (preflight fails dev default) |
| `JWT_SIGNING_KEY` | ≥32 chars; not `dev-compose-jwt` |
| `SendGrid__ApiKey` | Live key; `SendGrid__UseSandbox=false` in compose |
| `SMOKE_TENANT_HOST` | Required for `--full` when no `*.localhost` — tenant door Host header |

### Smoke script behavior (`deploy/uat-smoke.sh`)

- Default: `/ready`, web home (200/307/308), auth onboarding, `/signup` + `/pricing`, legal versions, security headers via `verify-security-headers.sh`
- `--full`: delegates to `deploy/local-smoke-run.sh` with `API_BASE` + `TENANT_HOST`; needs registration payload with `consent: true` (fixed in 19.0)
- Exit non-zero if any check fails; summary shows pass/fail counts
- **Remote mode:** when Docker is not installed locally, HTTP checks still run against `PUBLIC_BASE_URL`

### Common failures (from 19.0 + digitalocean-uat.md)

| Symptom | Fix |
|---------|-----|
| `/ready` unhealthy | `docker compose … logs postgres redis api` |
| CORS / API calls fail | `PUBLIC_BASE_URL` mismatch — rebuild web |
| `--full` tenant login fails on IP URL | Set `SMOKE_TENANT_HOST` to real tenant host |
| API won't start | SendGrid config invalid in Production |
| 502 from nginx | web/api container down |
| `/signup` `/pricing` 404 on client domain | Set `SMOKE_MARKETING_HOST=cohestra.app` and ensure marketing host resolves to droplet, or redeploy with apex routes |
| Security headers fail | Story **19.2** — regenerate `active-ssl.conf` |

### Operator handoff (remaining)

SSH to droplet (`129.212.235.2` / `thesocialcollectivesg.com`):

```bash
cd ~/cohestra   # or DROPLET_DEPLOY_PATH
git pull origin main
bash deploy/preflight-launch.sh
docker compose -f docker-compose.uat.yml up -d --build
PUBLIC_BASE_URL=https://thesocialcollectivesg.com bash deploy/uat-smoke.sh
# If marketing on cohestra.app points here:
SMOKE_MARKETING_HOST=cohestra.app PUBLIC_BASE_URL=https://thesocialcollectivesg.com bash deploy/uat-smoke.sh
PUBLIC_BASE_URL=https://thesocialcollectivesg.com SMOKE_TENANT_HOST=thesocialcollectivesg.com bash deploy/uat-smoke.sh --full
```

Or trigger GitHub **Deploy** workflow (`workflow_dispatch`) after CI green on `main`.

### Files reference (do not reinvent)

| Artifact | Purpose |
|----------|---------|
| `docker-compose.uat.yml` | Production-style stack; seeds disabled |
| `deploy/uat-bootstrap.sh` | First-run Docker + `.env` copy |
| `deploy/preflight-launch.sh` | Secret strength gate before deploy |
| `deploy/uat-smoke.sh` | Post-deploy automated checks |
| `deploy/local-smoke-run.sh` | Full API registration smoke (used by `--full`) |
| `deploy/ci-docker-smoke.sh` | CI parity — run locally before droplet if unsure |
| `docs/deploy/digitalocean-uat.md` | Step-by-step droplet guide |
| `docs/deploy/enterprise-launch-checklist.md` | § Deploy — check off 19.1 items |

### Testing strategy for this story

- **No new unit tests required** unless a deploy script bug is fixed
- **Acceptance evidence:** smoke script exit 0 + checklist Deploy section checked + operator `/register` completed
- Optional local rehearsal: `bash deploy/ci-docker-smoke.sh` on dev machine with Docker

### Epic 19 sequence

19.1 (this) → 19.2 HTTPS + header verify on live URL → 19.3 reCAPTCHA prod → 19.4 Paddle sandbox on droplet → 19.5 §7 flows + sign-off table

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- 2026-08-31: Dev-story started. Cloud agent has no Docker; droplet at `129.212.235.2` / `https://thesocialcollectivesg.com` probed remotely.
- Compose seed flags verified in repo (`OperatorSeed__Enabled=false`, `DemoDataSeed__Enabled=false`).
- **Remote smoke** (`PUBLIC_BASE_URL=https://thesocialcollectivesg.com`): **3 pass / 4 fail** — `/ready`, web home 307, auth onboarding OK; failures: `/signup`, `/pricing`, legal versions (404 — likely stale deploy), security headers (→ 19.2).
- Operator account already bootstrapped (`registrationAvailable: false`).
- Patched `uat-smoke.sh` for remote runs without local Docker + `SMOKE_MARKETING_HOST` / `SMOKE_INSECURE_TLS`.

### File List

- `deploy/uat-smoke.sh`
- `docs/deploy/digitalocean-uat.md`
- `_bmad-output/implementation-artifacts/19-1-uat-droplet-deploy-and-smoke.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-08-31: Story 19.1 spec created — UAT droplet deploy and stack smoke (Epic 19 kickoff)
- 2026-08-31: Dev-story — remote smoke script fix; droplet probe documented; **blocked on operator redeploy + full smoke pass**
