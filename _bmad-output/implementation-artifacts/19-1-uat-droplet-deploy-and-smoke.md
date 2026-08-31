---
story_id: 19.1
story_key: 19-1-uat-droplet-deploy-and-smoke
epic: 19
status: ready-for-dev
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

Status: ready-for-dev

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
  - [ ] Provision Ubuntu 22.04+ droplet (2 GB RAM min, 4 GB recommended); enable weekly backups
  - [ ] Attach DO firewall: inbound **22, 80, 443** only; no 5432/6379/3000/8080
  - [ ] DNS: A record for apex/wildcard **or** document nip.io interim (`docs/deploy/temporary-https-nipio.md`)

- [ ] **Task 2 — Bootstrap repo + secrets** (AC: 1, 3)
  - [ ] SSH → `git clone` → `bash deploy/uat-bootstrap.sh` (installs Docker, copies `.env.uat.example` → `.env`)
  - [ ] Fill `.env`: `PUBLIC_BASE_URL`, `POSTGRES_PASSWORD`, `JWT_SIGNING_KEY`, SendGrid live keys (see `docs/deploy/sendgrid-production.md`)
  - [ ] Confirm seeds off: `OperatorSeed__Enabled=false`, `DemoDataSeed__Enabled=false` in compose (do not set `DEV_TENANT_SLUG`)
  - [ ] Run `bash deploy/preflight-launch.sh` (warn-only reCAPTCHA OK for 19.1; `--strict-recaptcha` is 19.3)

- [ ] **Task 3 — Deploy stack** (AC: 1)
  - [ ] `docker compose -f docker-compose.uat.yml up -d --build`
  - [ ] Verify containers healthy: `docker compose -f docker-compose.uat.yml ps`
  - [ ] `curl -s ${PUBLIC_BASE_URL}/ready` returns `"status":"Healthy"`

- [ ] **Task 4 — Automated smoke** (AC: 2)
  - [ ] On droplet: `PUBLIC_BASE_URL=http://YOUR_IP bash deploy/uat-smoke.sh`
  - [ ] Full smoke: set `SMOKE_TENANT_HOST` when URL is apex or bare IP (e.g. `creativorare.YOUR_NIP_IO` or tenant subdomain)
  - [ ] `PUBLIC_BASE_URL=… SMOKE_TENANT_HOST=… bash deploy/uat-smoke.sh --full` exits 0
  - [ ] Capture smoke output in story Dev Agent Record (date, URL, pass count)

- [ ] **Task 5 — Manual operator bootstrap** (AC: 3)
  - [ ] Browser: `${PUBLIC_BASE_URL}/register` → create single operator via OTP (no dev seed credentials)
  - [ ] Dashboard loads after login
  - [ ] Check enterprise checklist **Deploy** section items for 19.1 evidence

- [ ] **Task 6 — Dev gaps (only if smoke fails)** (AC: 2)
  - [ ] If script/doc gap found, minimal fix in `deploy/` or `docs/deploy/` — no product features
  - [ ] Re-run smoke after fix; note in Change Log

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

### Common failures (from 19.0 + digitalocean-uat.md)

| Symptom | Fix |
|---------|-----|
| `/ready` unhealthy | `docker compose … logs postgres redis api` |
| CORS / API calls fail | `PUBLIC_BASE_URL` mismatch — rebuild web |
| `--full` tenant login fails on IP URL | Set `SMOKE_TENANT_HOST` to real tenant host |
| API won't start | SendGrid config invalid in Production |
| 502 from nginx | web/api container down |

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

(composer — story creation)

### Completion Notes List

(pending implementation)

### File List

(pending — expect checklist notes + optional deploy doc/script touch-ups only)

### Change Log

- 2026-08-31: Story 19.1 spec created — UAT droplet deploy and stack smoke (Epic 19 kickoff)
