# UAT automated delivery — implementation evidence

**Branch:** `cursor/uat-automated-delivery-a5ee`  
**Base:** `origin/main` `b1ee5f74740e1bf31044ed0759b407c92fb05f75`  
**ADCP:** not restored  
**Production:** untouched  
**Live gate:** not set to `true`  
**Live Deploy UAT dispatch:** not performed

## What this change automates

- CI runs the real predeploy gate with `UAT_DEPLOY_GATE_ACTIVE=false` and
  proves the SSH job `if` cannot run unless `eligible == true`.
- Evidence class is `CI_CONTRACT`. It is not a live Deploy UAT HOLD run.
- CI uploads durable `uat-ci-contract-commissioning` after redaction.
  Commissioning absolutizes `UAT_GATE_EVIDENCE_DIR` before entering the
  fixture worktree so a relative `artifacts/ci-contract` path survives.
- Predeploy status is phase-specific (`NOT_STARTED` / `HELD`). Final
  `uat-final-outcome.json` treats pre-SSH `dispatched` as attempt only.
  `uat_deployed=true` requires a proven host accepted SHA. Interrupted
  SSH is `ATTEMPTED` (`uat_deployed=null`). Confirmed deploy plus later
  browser/lifecycle failure is `DEPLOYED_REJECTED`. Playwright is read
  from `web/test-results/` after download-artifact. Story 19.5 lifecycle
  is opt-in: authorized `skip` (`lifecycle_disabled` / `story_closed`) is
  `SKIPPED`, not a required pass. Missing or unauthorized skip HOLDs.
  Playwright stats must be valid nonnegative integers; malformed or
  missing browser proof is `INCOMPLETE` and cannot be `DEPLOYED_ACCEPTED`.
  A pre-SSH `HELD` aggregator may exit 0; SSH eligibility remains
  `eligible == true`, not the aggregator process exit code.
- Issue #529: live run 41289603719 failed before the real validator because
  an unscoped Bearer `git fetch` prompted for a username. Disabled
  suppressor now writes real HOLD evidence first. Enabled path uses
  `deploy/fetch-origin-main.sh` (URL-scoped Basic x-access-token).
  Fetch/auth refusal writes both predeploy evidence files. Both files are
  required before upload. A local HTTP Git fixture proves Basic auth.
- Binding contract: host acceptance, public smoke, and Playwright are
  required. Lifecycle is optional when skip is authorized.
- Continuous path remains: merge → main CI → scans SUCCESS → predeploy
  gate → automatic `workflow_run` UAT → smoke/browser. Recurring dispatch
  is not required after the owner sets `UAT_DEPLOY_GATE_ACTIVE=true`.

## One-time owner remainder

This integration cannot `actions=write`. One owner `workflow_dispatch` of
Deploy UAT on `main` (variable still `false`) is the remaining live HOLD
observation. Separate written approval is still required before `true`.
