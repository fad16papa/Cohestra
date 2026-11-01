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
  `uat-final-outcome.json` aggregates SSH, SHA, host, smoke, browser,
  and lifecycle, including Playwright at `web/test-results/` after
  download-artifact. Post-deploy failure is `DEPLOYED_REJECTED`.
- Continuous path remains: merge → main CI → scans SUCCESS → predeploy
  gate → automatic `workflow_run` UAT → smoke/browser. Recurring dispatch
  is not required after the owner sets `UAT_DEPLOY_GATE_ACTIVE=true`.

## One-time owner remainder

This integration cannot `actions=write`. One owner `workflow_dispatch` of
Deploy UAT on `main` (variable still `false`) is the remaining live HOLD
observation. Separate written approval is still required before `true`.
