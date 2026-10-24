# Case: Story 46.3 Docker bootstrap compose-config refusal

Date: 2026-10-24 (Asia/Singapore)
Main at investigation: `a7607728f773953ec8a84b9e47517528a32dbd2d`
Production: NO-GO

## Problem

Owner-run `deploy/bootstrap-production-docker.sh` installed official Docker
Engine / Compose, then refused:

`RESULT=REFUSE`
`REFUSE_REASON=production_compose_config_failed`

No compose-up, no database mutation, no docker-group change.

## Stronghold (Confirmed)

`docker-compose.production.yml` requires six `${VAR:?}` names:

- POSTGRES_PASSWORD
- REDIS_PASSWORD
- JWT_SIGNING_KEY
- PUBLIC_BASE_URL
- SendGrid__ApiKey
- SendGrid__FromEmail

`deploy/bootstrap-production-docker.sh` on `a7607728` supplied process-only
placeholders for only the first four when `.env` was absent.

## Hypothesis #1 — incomplete config-only placeholder set

Status: Confirmed

Resolution: Live host has no Production `.env` (Story 46.4 not started).
Compose interpolation therefore failed on `SendGrid__ApiKey` /
`SendGrid__FromEmail`. Docker install itself succeeded.

## Fix

Canonical helper `deploy/lib/production-compose-config-placeholders.sh`
owns the config-only names. `production-compose.sh config` applies those
placeholders only when `.env` is absent. Drift between compose `${VAR:?}`
and the helper fails CI.
