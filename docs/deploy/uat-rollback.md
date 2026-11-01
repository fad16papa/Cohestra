# UAT previous-SHA recovery

Dedicated recovery for a **previously shipped** UAT revision. This is not
Deploy UAT and is not Production rollback.

## What this is not

| Action | Effect |
|---|---|
| Unset / leave `UAT_DEPLOY_GATE_ACTIVE` false | Stops **future** automatic deploys. Does not restore a broken host. |
| Deploy UAT | Only the **current** `origin/main` tip. Wrong-SHA and stale SHA HOLD. |
| This workflow / `deploy/uat-rollback.sh` | Moves the UAT host to a **previous** SHA that is still an ancestor of `origin/main`. |
| Database restore | Owner-only, manual, not automated. |

## Authorization

1. Dispatch **UAT rollback** on `main`.
2. `rollback_sha` = 40-character hexadecimal SHA, ancestor of `origin/main`, **not** the current tip.
3. `confirm` must be exactly `UAT ROLLBACK: AUTHORIZED`.
4. `execute` defaults to **false** (dry-run / validate only).
5. Host mutation requires `execute=true`, the confirm phrase, `backup_attested=true`,
   and `compat_reviewed=true`. Environment `uat` secrets are required for SSH.

Do not dispatch this workflow from an agent task unless the owner later
authorizes a live recovery. Agents must not live-dispatch to prove readiness.

## Host mutation lock

Rollback shares GitHub concurrency group `deploy-uat` with **Deploy UAT**
(`cancel-in-progress: false`). Independent `deploy-uat-rollback` concurrency
is forbidden because it allowed both workflows to mutate the same host.

Before SSH, the runner queries in-progress/queued `deploy.yml` and
`deploy-uat-rollback.yml` runs and **refuses** if another mutator is active.
It does not cancel an in-flight Deploy UAT. The droplet also takes
`/tmp/cohestra-uat-host-mutation.lock` via `flock`. Production stays isolated.

## Host release rollback

On execute, the droplet fetches `origin/main`, refuses the current tip,
resets to `ROLLBACK_SHA`, and rebuilds with sequential
`deploy/uat-compose.sh` (`build api`, `build web`, `up -d --no-build`).
Do not call `deploy/remote-deploy.sh` for rollback; older copies reset to
the current tip.

Honest data-state tokens (never `DATABASE_MUTATED=false`):

- `DB_RESTORE_NOT_ATTEMPTED=true`
- `DB_MIGRATION_EFFECT=UNVERIFIED`
- `RECOVERY_RESTORE_READY=false`
- `OWNER_ATTESTATION_REQUIRED=true`

EF migrations may still apply on API startup. Host rollback does **not**
prove the database is unchanged or that restore is ready.

## Post-rollback acceptance

Execute fail-closes unless isolated nginx loopback `/ready` is Healthy and
the API `GIT_SHA` matches `ROLLBACK_SHA`. That is host acceptance only.
It is not authenticated Playwright acceptance and not a rehearsed database
restore.

## Database backup, restore, and verification

Before any execute, the owner must attest:

- a current `pg_dump` exists
- previous-SHA schema compatibility was reviewed

```bash
bash deploy/uat-compose.sh exec postgres \
  pg_dump -U crm cohestra > "uat-backup-$(date +%F-%H%M).sql"
```

Restore is **not** implemented here. Owner-only, after compatibility review
and a rehearsed restore on a copy. Do not treat this workflow as closing the
Issue #531 rollback/restore readiness blocker.

## Dispatch registration

Push of a `workflow_dispatch`-only file created Actions run
[41297290896](https://github.com/fad16papa/Cohestra/actions/runs/41297290896)
(`event=push`, zero jobs, `conclusion=failure`). GitHub registered the new
file on push while every job was gated to `workflow_dispatch`. The
`dispatch-readiness` job now runs on push/PR so registration produces a
real succeeding job. Host mutation remains `workflow_dispatch` only.
Workflow id `403445991` is active; this document does not authorize a live
dispatch.

The validate job fetches `origin/main` with `deploy/fetch-origin-main.sh`
(URL-scoped HTTP Basic) after `persist-credentials: false`.

## Isolation

- Shared concurrency `deploy-uat` plus Actions/host locks. Not `deploy-production`.
- No Production secrets, paths, or workflows.
- Does not set `UAT_DEPLOY_GATE_ACTIVE`.
- ADCP stays retired.
