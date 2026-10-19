---
title: Epic 46 Deployment and release architecture
status: final
created: 2026-10-19
owner: Winston
production: NO-GO
---

# Deployment / release architecture

Spine: AD-6, AD-7, AD-13.

## UAT path (frozen)

`main` → CI → Environment `uat` → `deploy.yml` concurrency `deploy-uat` → `remote-deploy.sh` → SHA pin → smoke. Automatic. Do not change this into Production.

## Production path (new)

```
main / release candidate
  → CI (must pass, including TenantIsolation)
  → security gates already in CI
  → GitHub Environment production
  → EXPLICIT OWNER APPROVAL (required reviewers)
  → deploy-production job
       checkout SHA
       fail closed on missing secrets
       SSH (Actions deploy key, not Cursor)
       git reset --hard SHA
       pre-deploy backup gate if migrations
       compose pull/build/up
       GIT_SHA injected
       runtime SHA read from ops/version or container env
       smoke
       observation window
  → still NO-GO for public traffic until PRODUCTION CUTOVER: AUTHORIZED
```

CI green alone is never PRODUCTION GO.

## GitHub Environment `production`

Do not create or populate in this planning pass. Required when 46.3 implements:

**Secrets (names only):**

- `PROD_DROPLET_HOST`
- `PROD_DROPLET_USER`
- `PROD_DROPLET_SSH_KEY`
- `PROD_DROPLET_DEPLOY_PATH`
- `PROD_PUBLIC_BASE_URL`

App secrets stay on the droplet `.env`, never in GitHub if they are not needed by Actions. If smoke needs a synthetic probe token, name it `PROD_SMOKE_*` and keep it dedicated.

**Variables:**

- `PROD_COMPOSE_PROJECT=cohestra-production`

**Protections:**

- Required reviewers: owner
- Restrict to `main`
- Wait timer optional (0 unless owner wants a delay)
- Deployment branch policy: `main` only
- Secrets never copied from Environment `uat`

## Release sequence

1. Pre-deploy: CI green, SHA ancestor of `origin/main`, Environment approval recorded
2. Migration compatibility: if EF migrations present, require expand/contract or documented irreversible flag + backup
3. Backup gate: dump completes and is uploaded
4. Deploy
5. Runtime verification: `GIT_SHA` equals target
6. Smoke: `/ready`, TLS, headers, apex, one tenant host if DNS exists
7. Monitoring observation: 15 minutes, no new CRITICAL
8. Rollback trigger: SHA mismatch, `/ready` fail, 5xx spike, failed migration
9. Rollback procedure: previous SHA + restore dump if schema moved forward incompatibly
10. Post-deploy acceptance artifact (no secrets)

## Rollback

No dedicated rollback script exists today. 46.3 must add `deploy/production-rollback.sh` that:

- Accepts `ROLLBACK_SHA` (40 hex) previously accepted
- Refuses if SHA unknown
- Re-runs compose at that SHA
- Does not automatically restore DB unless `--restore-dump <id>` is passed
- Writes evidence JSON

## Provenance

Reuse UAT lessons: `workflow_run.head_sha` is UAT-only. Production should be `workflow_dispatch` with an explicit SHA input and/or a workflow that never uses implicit latest. Prefer `workflow_dispatch` required SHA so a human types the SHA they approved. Optional: tag `prod-<sha>` after success.

## Dark host vs public cutover

46.2–46.14 may deploy to the Production droplet using a non-public hostname or IP with hosts-file/smoke. Public `cohestra.app` DNS is 46.15 and owner-gated. A successful dark deploy is not cutover.
