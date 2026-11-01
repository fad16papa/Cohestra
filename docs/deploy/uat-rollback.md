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
5. Host mutation requires `execute=true` **and** the confirm phrase. Environment `uat` secrets are required for SSH.

Do not dispatch this workflow from an agent task unless the owner later
authorizes a live recovery.

## Host release rollback

On execute, the droplet fetches `origin/main`, refuses the current tip,
resets to `ROLLBACK_SHA`, and rebuilds the isolated UAT compose stack
(`deploy/remote-deploy.sh`). `DATABASE_MUTATED=false`.

EF migrations apply on API startup. If the previous SHA's schema is not
compatible with the current database, host rollback alone is insufficient.
The owner must decide whether to restore a matching dump or roll forward.

## Database backup, restore, and verification

Before any execute:

```bash
bash deploy/uat-compose.sh exec postgres \
  pg_dump -U crm cohestra > "uat-backup-$(date +%F-%H%M).sql"
```

Restore is **not** implemented here. Owner-only, after compatibility review.
After host rollback, verify `/ready`, host acceptance SHA match, and whether
authenticated UAT flows still pass.

## Isolation

- Concurrency `deploy-uat-rollback` (not `deploy-uat`, not `deploy-production`).
- No Production secrets, paths, or workflows.
- Does not set `UAT_DEPLOY_GATE_ACTIVE`.
- ADCP stays retired.
