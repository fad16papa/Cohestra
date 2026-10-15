---
id: 45.1
key: 45-1-uat-github-environment-deployment-control-plane
title: UAT GitHub Environment + deployment control plane
status: done
epic: 45
created: 2026-10-15
baseline_commit: bdd6d42269cf7dcd08e97850b068eee8865b43c7
---

# Story 45.1: UAT GitHub Environment + deployment control plane

Status: done — merged PR #450 at `10738f5f` / main `0f2f5d66`. Exact-head CI 38744496092 green. Grok 4.6 review PASS (BLOCKER=0, MAJOR=0).

The control-plane HEAD that passed review is `10738f5f`. Do not treat older SHAs as evidence.

## Story

As a **platform operator**,
I want **UAT deploys to run from GitHub Environment `uat` after main CI**,
so that **Cursor never needs droplet SSH and routine deploys need no owner shell**.

## Acceptance Criteria

1. **Given** `.github/workflows/deploy.yml`
   **When** the workflow is inspected
   **Then** `concurrency.group` is `deploy-uat`
   **And** the job uses `environment: uat`
   **And** `deploy-production` does not appear

2. **Given** required Environment secrets `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY` are unset
   **When** the fail-closed script runs
   **Then** it exits non-zero
   **And** it prints `MISSING_SECRET=<NAME>` for each missing name
   **And** it never prints secret values

3. **Given** those secrets are present
   **When** the workflow deploys
   **Then** it calls existing `deploy/remote-deploy.sh`
   **And** it does not bind :80/:443, does not use compose project `cohestra-infra-uat`, and does not deploy production
   **And** `DROPLET_DEPLOY_PATH` is passed via appleboy `envs`, not interpolated into the logged script body

4. **Given** a `workflow_run` trigger
   **When** the job checks out / records the SHA
   **Then** it uses `github.event.workflow_run.head_sha`
   **And** a machine-readable dispatch artifact records that SHA

5. **Given** this story
   **When** implementation is reviewed
   **Then** Cursor still has no droplet key
   **And** docs tell the owner to populate Environment `uat` names only
   **And** production remains NO-GO

6. **Given** CI accepted SHA A
   **When** Deploy UAT executes after main has advanced to SHA B
   **Then** UAT still deploys SHA A, or the job fails closed
   **And** it never silently deploys SHA B

7. **Given** the Actions UAT path
   **When** `DEPLOY_SHA` is missing or not a 40-character hexadecimal SHA on the allowed branch
   **Then** deploy is refused
   **And** `EXPECTED_SHA` / `DEPLOYED_SHA` are emitted and must match

## Tasks / Subtasks

- [x] Task 1: Rewrite deploy workflow (AC 1, 3, 4)
- [x] Task 2: `deploy/fail-closed-uat-secrets.sh` + contract test (AC 2)
- [x] Task 3: Dispatch evidence JSON + upload-artifact (AC 4)
- [x] Task 4: Isolation/workflow contract assertions in CI (AC 1)
- [x] Task 5: Update `docs/deploy/github-actions-cd.md` (AC 5)
- [x] Task 6: CI contract tests added
- [x] Task 7: Review of `8d65d985` found MAJOR SHA mismatch — patched via `DEPLOY_SHA` + `reset-accepted-sha.sh`
- [x] Task 8: Exact-HEAD re-review of `10738f5f` PASS (BLOCKER=0, MAJOR=0); merged as PR #450 / main `0f2f5d66`

## Dev Notes

Reuse `remote-deploy.sh`. Do not add Cursor SSH. Do not print secrets. Do not create production deploy.

### Scope lock

- No Playwright UAT suite (45.4)
- No on-host JSON probe beyond dispatch evidence (45.2)
- No mailbox (45.5)
- No 19.3 close

## File list

- `.github/workflows/deploy.yml`
- `deploy/fail-closed-uat-secrets.sh`
- `deploy/fail-closed-uat-secrets.test.sh`
- `deploy/record-uat-deploy-dispatch.sh`
- `deploy/reset-accepted-sha.sh`
- `deploy/reset-accepted-sha.test.sh`
- `deploy/remote-deploy.sh`
- `deploy/validate-deploy-uat-workflow.sh`
- `.github/workflows/ci.yml` (call new validators)
- `docs/deploy/github-actions-cd.md`
