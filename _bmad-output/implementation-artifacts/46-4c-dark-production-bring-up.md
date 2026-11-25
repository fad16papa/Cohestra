---
id: 46.4c
key: 46-4c-dark-production-bring-up
title: Dark Production bring-up
status: backlog
epic: 46
created: 2026-11-25
baseline_commit: 5756a0982a9b54a63509232d2d49589971b1780b
depends_on:
  - 46.2
  - 46.3
  - 46.4
  - 46.5
owner_gate: checkout pin plus live host secret check
implementation_authorized: false
checkout_pin: BLOCKED
cutover_authorization: NOT_GRANTED
production: NO-GO
planning_artifact: _bmad-output/planning-artifacts/epic-46/dark-production-bring-up.md
---

# Story 46.4c: Dark Production bring-up

Status: backlog

## Story

As a **platform operator**,
I want **the first Production compose-up to be staged, dark, and tied to one reviewed SHA**,
so that **the API cannot migrate or serve before a verified isolated restore, and public DNS stays untouched**.

**Depends on:** 46.2, 46.3, 46.4, 46.5 gate behavior  
**Owner gate:** explicit checkout-pin authorization, then the live 46.4 name and classified check  
**Rollback:** stop the 46.4c containers; leave the droplet dark; do not change DNS

Canonical plan: `_bmad-output/planning-artifacts/epic-46/dark-production-bring-up.md`.

`implementation_authorized` stays false while `checkout_pin` is BLOCKED. Do not implement host execution, and do not start containers, from this stub alone.

## Blocked pin

The checkout pin is **BLOCKED** as of `origin/main` `5756a0982a9b54a63509232d2d49589971b1780b` and PR #594 head `502eefbc5525278ee0b2e557fde72d11f82ce0ef`.

Required before any pin, and before this story may start:

- A merge commit on `origin/main` that contains `502eefbc5525278ee0b2e557fde72d11f82ce0ef`, with success on that exact SHA for `.NET build and test`, `API integration tests`, `Next.js build`, `UAT isolation contract`, `Docker stack smoke`, `Exact-SHA security scan`, and `GitGuardian exact-SHA API scan` (`skipped` does not count). `GitGuardian Security Checks` succeeded on the reviewed PR head.
- Read-only host proof that `deploy/bootstrap-production-checkout.sh` hashes to blob `a968c56598b7edf67daa191288743e58d88d17d8`.
- Read-only proof that `git status --porcelain`, `git diff --stat HEAD`, and `git diff --cached --stat` show no tracked or staged changes that `git reset --hard` would discard.
- An owner sentence that names the post-merge SHA and authorizes both `git reset --hard` and `chown -R deploy:deploy` on `/home/deploy/cohestra-production`.

An earlier bootstrap run does not provide this authorization.

## Acceptance criteria

1. **Given** the pin is BLOCKED or the live 46.4 name check has not passed  
   **When** an operator attempts the 46.4c bring-up  
   **Then** it refuses before `docker compose up`.

2. **Given** the approved post-merge SHA is checked out and the 46.4 name check passed  
   **When** 46.4c starts the stack  
   **Then** Postgres and Redis come up first with no published host ports  
   **And** `deploy` is not added to group `docker`  
   **And** API, web, and nginx stay stopped.

3. **Given** Postgres is up and the API is stopped  
   **When** the owner records the pre-API attestation  
   **Then** it comes from `backup` of dedicated-local `cohestra` and `restore-isolated` into a disposable database  
   **And** `status` is `verified` and `production_recovery_proven` is boolean `false`  
   **And** Story 46.5 remains open.

4. **Given** that attestation is in place  
   **When** API, web, and nginx start  
   **Then** `ProductionBackupGate` allows migrations  
   **And** runtime `GIT_SHA` equals checkout `HEAD`  
   **And** `/ready` is Healthy on a dark host or an IP/Host-header probe.

5. **Given** this story  
   **When** evidence is recorded  
   **Then** `cohestra.app` DNS is unchanged  
   **And** `Paddle__AllowLive` stays false  
   **And** the record says `PRODUCTION=NO-GO`  
   **And** it does not contain `PRODUCTION CUTOVER: AUTHORIZED`.

6. **Given** `deploy/production-remote-deploy.sh`  
   **When** 46.4c runs  
   **Then** that helper is not invoked. Its dry-run output is not treated as this bring-up.

## Non-goals

- Do not dispatch Deploy Production.
- Do not create or read a Production `.env` in git.
- Do not change public DNS or run Story 46.15.
- Do not mark Story 46.4, 46.5, 46.13, 46.14, or 46.15 done.
- Do not close 46.5 on the pre-API attestation. The post-schema/data isolated restore remains required before 46.14.

## Tasks

- [ ] Re-read the planning artifact and confirm the pin is no longer BLOCKED before any implementation that can start containers
- [ ] Specify the staged compose commands for project `cohestra-production` without calling the 46.3 dry-run helper
- [ ] Refuse bring-up when the attestation or the 46.4 name check is absent
- [ ] Record dark `/ready` and runtime SHA evidence with no secret values
