---
id: 45.1
key: 45-1-uat-github-environment-deployment-control-plane
title: UAT GitHub Environment + deployment control plane
status: in-progress
epic: 45
created: 2026-10-15
baseline_commit: bdd6d42269cf7dcd08e97850b068eee8865b43c7
---

# Story 45.1: UAT GitHub Environment + deployment control plane

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD.

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

## Tasks / Subtasks

- [x] Task 1: Rewrite deploy workflow (AC 1, 3, 4)
- [x] Task 2: `deploy/fail-closed-uat-secrets.sh` + contract test (AC 2)
- [x] Task 3: Dispatch evidence JSON + upload-artifact (AC 4)
- [x] Task 4: Isolation/workflow contract assertions in CI (AC 1)
- [x] Task 5: Update `docs/deploy/github-actions-cd.md` (AC 5)
- [ ] Task 6: Build/test + story record + exact-HEAD review (open until CI + review)

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
- `deploy/validate-deploy-uat-workflow.sh`
- `.github/workflows/ci.yml` (call new validators)
- `docs/deploy/github-actions-cd.md`
