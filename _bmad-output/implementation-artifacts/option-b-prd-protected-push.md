---
story_key: option-b-prd-protected-push
status: review
baseline_commit: 1c57633fa607dec4a31aca8928c4c02adb231822
binds:
  - issue-538
  - pr-537
  - pr-539
---

# Story: PR-D — Option B AD-23 protected-push UAT CD

## Story

As the Cohestra owner, I want Deploy UAT to run only from protected `push` events to `release/uat` (with optional guarded `workflow_dispatch`), so that after cutover `main` CI cannot start UAT SSH and every deploy is blocked unless the same-run AD-17 graph and AD-14 conjuncts succeed.

## Acceptance Criteria

1. Deploy UAT `on:` is `push` to `release/uat` plus optional `workflow_dispatch`. No `workflow_run`, `repository_dispatch`, `workflow_call`, `pull_request`, or `pull_request_target`.
2. Eleven named AD-17 jobs run in this workflow without `environment: uat` or `DROPLET_*`. `predeploy-gate` `needs` all of them. SSH `needs` predeploy and requires `result==success` and `eligible==true`.
3. After cutover, SSH eligibility requires ALL of: `UAT_DEPLOY_GATE_ACTIVE==true`, `UAT_MAIN_DEPLOY_SUPPRESSED==true`, `github.ref==refs/heads/release/uat`, exact SHA == current `origin/release/uat` tip, all required same-run tests SUCCESS, artifact/source provenance PASS.
4. Environment `uat` remains secret-scoped. No `DROPLET_*` on PR or validation jobs. Unauthorized dispatch and wrong ref HOLD. Production isolated.
5. Native GitGuardian on main-push is investigated; missing mandatory security evidence is not bypassed. In-run GitGuardian exact-SHA API scan is the post-merge UAT signal.
6. AD-25 owner sync procedure is documented and forbids `git push --ff-only origin/main:release/uat`. The owner allowlist is `deploy/ad25-sync-allowlist.txt` (exact-tree + stale-validator refuse). A seven-path subset is N39 REFUSE. Isolated PR-D-on-`main` tests are not proof the synchronized `release/uat` tree works. No live branch, ruleset, secret, or sync merge in this story.
7. Mandatory negatives exist and pass in CI_CONTRACT / SIMULATED_PASS, including missing scripts, stale validators, unapproved extras, wrong SHA, and wrong source tree.
8. This story ships as a Draft PR only. Do not merge, deploy, SSH, or change live GitHub settings.

## Tasks / Subtasks

- [x] Load BMAD Mandatory Code Review Loop and AD-12/14/17/23/25
- [x] Replace legacy `workflow_run` with AD-23 `push` + guarded dispatch
- [x] Add same-run AD-17 jobs and `needs` graph
- [x] Flip PR-C suppressor polarity (`suppressed != true` HOLD)
- [x] Add fetch-origin-uat + provenance + AD-25 procedure
- [x] Rewrite predeploy / isolation / commission contracts
- [x] Run negative suite to green
- [x] Reproduce seven-path AD-25 gap on PR-C baseline and correct the allowlist
- [ ] Independent BMAD + CAT-SEC on the AD-25-correction HEAD (BLOCKER=0 MAJOR=0)
- [x] Open Draft PR-D vs main (keep Draft / unmerged)

## File List

- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`
- `deploy/validate-uat-predeploy-gate.sh`
- `deploy/validate-uat-predeploy-gate.test.sh`
- `deploy/validate-deploy-uat-workflow.sh`
- `deploy/validate-inline-suppression.test.sh`
- `deploy/commission-uat-hold.sh`
- `deploy/commission-uat-hold.test.sh`
- `deploy/fetch-origin-uat.sh`
- `deploy/fetch-origin-uat.test.sh`
- `deploy/fetch-origin-main.test.sh`
- `deploy/write-uat-deploy-provenance.sh`
- `deploy/write-uat-deploy-provenance.test.sh`
- `deploy/ad25-sync-allowlist.txt`
- `deploy/lib/ad25-sync-allowlist.py`
- `deploy/reproduce-ad25-seven-path-gap.sh`
- `deploy/validate-ad25-sync-procedure.sh`
- `deploy/validate-ad25-sync-fixture.test.sh`
- `deploy/validate-prd-ad23.test.sh`
- `deploy/simulate-merge-token-trigger.py`
- `_bmad-output/implementation-artifacts/option-b-prd-protected-push.md`

## Dev Agent Record

Implementation Plan: AD-23 XOR AD-24 — implement AD-23. Same-run `needs` replaces Checks API for AD-17. `UAT_AD17_IN_RUN=true` skips native-GG Checks because native GitGuardian does not complete check-runs on push-to-main (ghost queued suite). In-run API scan is the UAT security signal.

## Change Log

- 2026-11-02: PR-D AD-23 protected-push implementation from main `1c57633`.
- 2026-11-02: AD-25 allowlist correction. Seven-path sync on PR-C `1c57633` fails postmerge-isolation (`validate-prd-ad23.test.sh` / `validate-ad25-sync-procedure.sh` absent; stale inline validator). Canonical allowlist + exact-tree + two-branch fixture + N39.

## Owner preflight (AD-25)

Do not create a live `release/uat` from this story. When the owner later syncs:

1. Bootstrap missing `release/uat` from `1c57633` (PR-C merge). Not from post-PR-D `main`.
2. Copy every path in `deploy/ad25-sync-allowlist.txt` from PR-D-on-`main`. Exact blob match. No `src/`, `web/`, Production, secrets, ADCP.
3. Refuse seven-path subset, missing required scripts, stale PR-C validators, unapproved extras, wrong SHA, wrong source tree.
4. Prove the synchronized dest tree independently passes postmerge-isolation and applicable UAT isolation. Isolated PR-D-on-`main` green is not dest-tree proof.
5. Human OWNER merge only. Never `GITHUB_TOKEN`. Never `git push --ff-only origin/main:release/uat`.
6. Keep `UAT_DEPLOY_GATE_ACTIVE=false` until dest-tree evidence exists. Do not report CUTOVER_READY from this story.
