# Story 46.3 Owner Gate A evidence (sanitized)

Date (Asia/Singapore): 2026-10-23 21:50 +08
Main SHA: `beba545f269f801711aaea0047bd7dbb95775c60`
Story: 46.3
Owner gate: `production_environment_protections`
Production: NO-GO / NOT YET COMPLETE
Workflow dispatched: NO

`OWNER_CONFIGURATION_SOURCE=GitHub owner web UI`
`OWNER_CONFIGURATION_ACTOR=fad16papa`
`OWNER_ATTESTED_CONFIGURATION=PASS`
`AUTOMATED_SETTINGS_VERIFICATION=UNAVAILABLE_DUE_TO_GITHUB_APP_PERMISSIONS`
`CURSOR_API_VERIFIED` is not claimed.

## Identity

- Repository owner login: `fad16papa` (user id `13810195`)
- Authenticated GitHub actor for Cursor Settings attempts: `cursor[bot]` (GitHub App integration)
- Authenticated actor is **not** the repository owner and does **not** have repository `admin`
- GitHub App 403/404 is an evidence limitation, not proof that Environment `production` is absent

## Historical: Cursor App Settings attempt (do not treat as current configuration)

Date (Asia/Singapore): 2026-10-23 18:58 +08

Environments visible to the App before the attempt: `uat` only.

`PUT /repos/fad16papa/Cohestra/environments/production` was attempted with:

- name: `production`
- required reviewer: `fad16papa` (user id `13810195`) only
- `prevent_self_review`: `false`
- `can_admins_bypass`: `false`
- `wait_timer`: `0`
- deployment branch policy: custom, intended `main` only

Result: HTTP 403 `Resource not accessible by integration`

Cursor did **not** create an Environment. No unprotected `production` Environment was left by the App.

UAT was not modified by Cursor:

- UAT `updated_at` remained `2026-10-15T13:50:40Z` after the App attempt
- UAT protection rules were not changed by Cursor
- UAT branch policy was not changed by Cursor

Retry (Asia/Singapore 2026-10-23 19:02 +08): same `PUT` body, same HTTP 403. No Settings mutation. No further PUT is authorized.

## Owner-attested configuration (current)

`OWNER_CONFIGURATION_SOURCE=GitHub owner web UI`  
`OWNER_CONFIGURATION_ACTOR=fad16papa`  
`OWNER_ATTESTED_CONFIGURATION=PASS`

The repository owner manually saved Environment protections in the GitHub web UI.

Sanitized attested state:

| Field | Owner-attested value |
| --- | --- |
| Environment | `production` |
| Required reviewer protection | enabled |
| Required reviewer | `fad16papa` only |
| Prevent self-review | `false` |
| Admin bypass | `false` |
| Wait timer | disabled / `0` |
| Deployment branch mode | Selected branches and tags |
| Allowed branches | `main` |
| Allowed tags | none |
| Environment secrets | none |
| Environment variables | none |

This is owner-attested. It is not `CURSOR_API_VERIFIED=PASS`.

## Secret-name inspection

- Cursor App cannot list repository Actions secrets (HTTP 403)
- Organization secrets: HTTP 404 (repository owner is a User, not an Organization)
- `ORG_SECRET_SCOPE=UNVERIFIED`
- Repository-level `PROD_*` conflicts: not inspected by the bot
- `OWNER_GATE_B_PRECONDITION=verify_repository_secret_name_conflicts`
- Owner-attested Environment `production` secrets: none
- Owner-attested Environment `production` variables: none
- `PROD_COMPOSE_PROJECT`: not populated (Gate B)

No secret values were requested or printed. No `PROD_*` names were created in this pass.

## No-dispatch / no-SSH

- `Deploy Production` runs before and after this evidence update: none
- Production SSH: NO
- Production workload deployed: NO
- Production ledger written: NO

## Gate result

`OWNER_GATE_A_STATUS=PASS — OWNER CONFIGURED / BOT API UNAVAILABLE`

`OWNER_GATE_B_STATUS=OUTSTANDING`

Still not configured (do not create in this pass):

- `PROD_DROPLET_HOST`
- `PROD_DROPLET_USER`
- `PROD_DROPLET_SSH_KEY`
- `PROD_DROPLET_DEPLOY_PATH`
- `PROD_PUBLIC_BASE_URL`
- `PROD_COMPOSE_PROJECT`
- Production Actions SSH key

Story 46.3 remains `review`. Epic 46 remains `in-progress`. Production remains NO-GO / NOT YET COMPLETE.
