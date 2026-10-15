---
story: 45.3
status: accepted
deploy_run: 38750995038
main_sha: 8e8db856df89c6cf3a654879bb747d4e0571170f
---

# 45.2 / 45.3 first autonomous Deploy UAT

## Trigger

`workflow_dispatch` is 403 for the Cursor GitHub App token. PR #452 merge produced accepted main `8e8db856`. Main CI `38750398673` succeeded. Deploy UAT `workflow_run` `38750995038` then ran.

`94c98c11` is an ancestor of `8e8db856`. The deployed SHA is the accepted main SHA of this run, not a drifted `origin/main` tip.

## Preflight

```
UAT_DEPLOY_SECRETS=present
TARGET_SHA=8e8db856df89c6cf3a654879bb747d4e0571170f
WORKFLOW_RUN_HEAD_SHA=8e8db856df89c6cf3a654879bb747d4e0571170f
```

SSH ran. No `MISSING_SECRET`. No key material in the log.

## SHA provenance

| Field | Value |
|---|---|
| TARGET_SHA | `8e8db856df89c6cf3a654879bb747d4e0571170f` |
| DISPATCH_SHA | `8e8db856df89c6cf3a654879bb747d4e0571170f` |
| EXPECTED_SHA / DEPLOYED_SHA (pre and post) | `8e8db856df89c6cf3a654879bb747d4e0571170f` |
| GIT_SHA | `8e8db856df89c6cf3a654879bb747d4e0571170f` |
| API GIT_SHA | `8e8db856df89c6cf3a654879bb747d4e0571170f` |
| FETCHED_UAT_ACCEPTANCE_SHA | `8e8db856df89c6cf3a654879bb747d4e0571170f` |
| acceptance `shaMatch` | true |

## Artifacts (run 38750995038)

- `uat-deploy-dispatch.json` — `result=dispatched`
- `uat-acceptance.json` — `result=pass`, compose web/api/nginx/postgres/redis running, loopback `/ready` 200, public HTTPS `/ready` 200, port isolation true, bypass tokens absent, Paddle `sandbox`, tenant aligned
- `uat-public-smoke.json` — `result=pass` for `/ready`, `/`, `/signup` on `https://uat.cohestra.app`

Shared CRM was not targeted. `EXISTING_APP_PUBLIC_URL` is unset on the host probe; CRM was not recreated or mutated.

Outbox/migrations remain `not_in_anonymous_probe`. Recaptcha flags are present; live widget enablement is Story 19.3 / 45.6.

## Verdict

45.2 live probe: PASS  
45.3 autonomous pipeline: PASS  
Production: NO-GO
