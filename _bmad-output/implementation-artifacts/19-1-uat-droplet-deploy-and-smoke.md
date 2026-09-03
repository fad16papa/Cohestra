---
story_id: 19.1
story_key: 19-1-uat-droplet-deploy-and-smoke
epic: 19
status: ready-for-dev
baseline_commit: main
created: 2026-09-03
depends_on: []
sources:
  - _bmad-output/planning-artifacts/epics-cohestra-enterprise.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-01.md
  - docs/deploy/digitalocean-uat.md
  - docker-compose.uat.yml
  - deploy/uat-smoke.sh
forward_deps:
  - 19-2-https-edge-security-header-verify
  - 19-3-recaptcha-production-enablement
---

# Story 19.1: UAT droplet deploy and stack smoke

Status: ready-for-dev

## Story

As a platform operator,
I want Cohestra running on a UAT droplet with automated smoke passing,
So that we have a live stack matching production topology before public launch.

## Acceptance Criteria

1. DigitalOcean droplet provisioned per `docs/deploy/digitalocean-uat.md`
2. `.env.uat.example` copied to `.env` on the droplet with strong secrets filled in
3. `docker compose -f docker-compose.uat.yml up -d --build` succeeds
4. Firewall allows **22, 80, 443 only** (no public 5432/6379/3000/8080)
5. `bash deploy/uat-smoke.sh` runs with `PUBLIC_BASE_URL` set to the droplet URL
   - verifies `/ready`
   - verifies web home, onboarding, signup/pricing surfaces
   - verifies security headers (via `deploy/verify-security-headers.sh`)

6. Production-minded UAT
   - `DemoDataSeed__Enabled=false`
   - `OperatorSeed__Enabled=false`
   - `DEV_TENANT_SLUG` is **not** set on the production UAT path

7. DNS / HTTPS interim is documented
   - apex + wildcard point to droplet (or nip.io interim for temporary HTTPS)

## Tasks / Subtasks

- [ ] **Task 1 — Validate droplet + firewall prerequisites** (AC: 1, 4)
  - [ ] Confirm `docs/deploy/digitalocean-uat.md` documents firewall inbound rules (22/80/443 only)
  - [ ] Ensure `deploy/uat-bootstrap.sh` aligns with doc guidance (OS packages, cloning repo, copying `.env.uat.example`)

- [ ] **Task 2 — Validate production-style Compose defaults for UAT** (AC: 2, 3, 6)
  - [ ] Confirm `docker-compose.uat.yml` runs with `OperatorSeed__Enabled=false`, `DemoDataSeed__Enabled=false`, `LoadTestSeed__Enabled=false`
  - [ ] Confirm `docker-compose.uat.yml` treats `ASPNETCORE_ENVIRONMENT=Production` on API
  - [ ] Confirm `.env.uat.example` contains the required strong secret placeholders (`JWT_SIGNING_KEY`, `POSTGRES_PASSWORD`, `SendGrid__ApiKey`, `PUBLIC_BASE_URL`)

- [ ] **Task 3 — Deploy stack and confirm containers are healthy** (AC: 3, 5)
  - [ ] On a droplet: run `bash deploy/uat-bootstrap.sh`
  - [ ] Run `docker compose -f docker-compose.uat.yml up -d --build`
  - [ ] Confirm docker healthchecks succeed (`api /ready`, `nginx /ready`, `web /`)

- [ ] **Task 4 — Run and (if needed) harden UAT smoke script** (AC: 5)
  - [ ] Run `PUBLIC_BASE_URL=<droplet-url> bash deploy/uat-smoke.sh`
  - [ ] Verify the script checks:
    - [ ] `/ready` health status
    - [ ] web home HTTP (200/307/308)
    - [ ] `/api/v1/auth/onboarding` `registrationAvailable`
    - [ ] `/signup` and `/pricing` surfaces
    - [ ] security headers via `deploy/verify-security-headers.sh`
  - [ ] If smoke fails locally (syntax/logic): adjust `deploy/uat-smoke.sh` / `deploy/local-smoke-run.sh` accordingly

- [ ] **Task 5 — DNS / HTTPS interim documentation** (AC: 7)
  - [ ] Ensure `docs/deploy/temporary-https-nipio.md` and `docs/deploy/digitalocean-uat.md` agree on the temporary URL format
  - [ ] Ensure `docs/deploy/digitalocean-uat.md` explicitly calls out “HTTP on droplet IP works until TLS is configured”

- [ ] **Task 6 — Repo-level validation (no-droplet sanity checks)** (AC: scripts present)
  - [ ] `bash -n deploy/uat-smoke.sh`
  - [ ] `bash -n deploy/preflight-launch.sh`
  - [ ] `bash -n deploy/verify-security-headers.sh`

## Dev Notes

- Scope: Story 19.1 is **infra + evidence collection** (docs + scripts + smoke). It does not implement product features.
- Story 19.2/19.3/19.4 build on the deployed stack:
  - 19.2 adds HTTPS edge verification + regeneration of nginx ssl config
  - 19.3 toggles reCAPTCHA via UAT/prod `.env` and rebuilds web
  - 19.4 verifies billing via (Paddle sandbox after Epic 29; Stripe is held off)

### NFR / launch guardrails

- **No production PII** committed to repo; droplet `.env` contains secrets and stays out of git.
- UAT must behave like production topology:
  - seeds disabled by default (Compose + bootstrap)
  - avoid tenant dev env exports (`DEV_TENANT_SLUG` not set on production path)

## Dev Agent Record

### Agent Model Used

_(filled by dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings

### Review Follow-ups

