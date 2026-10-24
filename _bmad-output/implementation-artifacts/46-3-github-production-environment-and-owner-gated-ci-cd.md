---
id: 46.3
key: 46-3-github-production-environment-and-owner-gated-ci-cd
title: GitHub Production Environment and owner-gated CI/CD
status: review
epic: 46
created: 2026-10-21
baseline_commit: 5d52d6e3dc99bce01545eda6eb10f378d469c374
depends_on:
  - 46.1
  - 46.2
owner_gate: production_environment_protections
owner_gate_status: PASS — OWNER CONFIGURED / BOT API UNAVAILABLE
overlay_code_path: IMPLEMENTED / NOT LIVE
owner_gate_b: BLOCKED — DOCKER RUNTIME NOT INSTALLED / GATE B VALIDATION NOT DISPATCHED
implementation_authorized: true
cutover_authorization: GRANTED
production_release_readiness: NOT_YET_COMPLETE
production: NO-GO
---

# Story 46.3: GitHub Production Environment and owner-gated CI/CD

Status: review

<!-- Ultimate context engine analysis completed — comprehensive developer guide created. -->
<!-- DONE requires Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT ACCEPTANCE → CLOSE. Code review is repeating, not one-shot. -->

## Story

As an **owner**,
I want **Production deployments to require explicit GitHub Environment approval against a pinned SHA**,
so that **merging to `main` can never automatically deploy Production**.

Required delivery chain:

`approved main SHA` → required CI success → GitHub Environment `production` → explicit owner approval → exact pinned-SHA Production control-plane deploy → runtime SHA verification → smoke → sanitized evidence

**CI green alone must never deploy Production.**

## Acceptance Criteria

1. **Manual Production workflow exists and cannot auto-fire**
   **Given** `.github/workflows/deploy-production.yml`
   **When** `main` is pushed, a PR is merged, UAT Deploy runs, or CI completes
   **Then** Production deploy does not start
   **And** the only Production trigger is `workflow_dispatch`
   **And** the required input is an explicit 40-character hexadecimal `deploy_sha`
   **And** the workflow refuses implicit `HEAD`, `latest`, `github.sha`, and unverified branch tips

2. **GitHub Environment `production` is the only Production CD environment**
   **Given** a Production deploy job that can SSH or mutate the Production host
   **When** the workflow is inspected
   **Then** that job uses `environment: production`
   **And** Environment `production` is independent of Environment `uat`
   **And** concurrency is `deploy-production` with `cancel-in-progress: false`
   **And** a newer request cannot silently cancel an active Production release
   **And** owner-required reviewer + `main`-only deployment branch are documented as a GitHub Settings owner gate (not YAML-settable)

3. **SHA provenance is fail-closed (Layer A + Layer B)**
   **Given** a requested `deploy_sha`
   **When** validation runs
   **Then** Layer A (exact deploy SHA / main CI) and Layer B (associated merged PR + GitGuardian) both pass
   **And** a missing, pending, cancelled, skipped, or failed GitGuardian result is never treated as PASS
   **And** a direct-to-main commit with no associated merged PR is REFUSE
   **And** a one-parent squash/rebase `deploy_sha` is REFUSE
   **And** GitGuardian is evaluated on merge-time `${deploy_sha}^2`, never on live `pr.head.sha` or on the merge SHA
   **And** `ancestor of origin/main` is not treated as “reviewed”
   **And** the environment job redeploys only that same `deploy_sha`
   **And** AD-7 remains `REVIEWED = CI = DEPLOY TARGET = RUNTIME = ACCEPTANCE`
   **And** 46.3 proves the GitHub merge-commit link from reviewed PR HEAD to merged main SHA
   **And** ACCEPTANCE SHA is proven later (46.13/46.14); 46.3 must not drop it from AD-7
   **And** any mismatch fails closed

4. **Secrets fail closed by name**
   **Given** missing `PROD_DROPLET_HOST`, `PROD_DROPLET_USER`, `PROD_DROPLET_SSH_KEY`, `PROD_DROPLET_DEPLOY_PATH`, or `PROD_PUBLIC_BASE_URL`
   **When** the deploy job starts
   **Then** it exits non-zero
   **And** output contains `MISSING_SECRET=<NAME>`
   **And** no secret values are printed
   **And** UAT secret names (`DROPLET_*`) are not read

5. **Host and path cannot target UAT**
   **Given** Production deploy secrets
   **When** host/path validation runs
   **Then** inventory validation still requires literal `PROD_DROPLET_HOST=159.223.55.242`
   **And** SSH transport uses `${{ vars.PROD_TAILSCALE_HOST }}` in Tailscale CGNAT `100.64.0.0/10` only
   **And** the public inventory IPv4 is never the appleboy SSH destination
   **And** `129.212.235.2`, IPv6 literals, `uat.cohestra.app`, `*.uat.cohestra.app`, and any hostname with extra A/AAAA records are refused
   **And** `PROD_DROPLET_DEPLOY_PATH` is an absolute safe path with no `..`
   **And** `/home/deploy/cohestra` and any UAT checkout path are refused
   **And** default Production path is `/home/deploy/cohestra-production`
   **And** `vars.PROD_COMPOSE_PROJECT` must equal `cohestra-production` or the job fails closed

6. **Rollback is explicit and database-safe**
   **Given** `deploy/production-rollback.sh`
   **When** it runs
   **Then** it requires explicit `ROLLBACK_SHA` of 40 hex characters
   **And** it refuses unknown / not-previously-accepted / non-main-ancestor revisions
   **And** it restores only the selected application revision
   **And** it verifies the resulting runtime SHA
   **And** it emits sanitized evidence
   **And** database restore never happens implicitly
   **And** `--restore-dump <id>` is refused in this story (`NOT_IMPLEMENTED_46_5`) because restore belongs to 46.5

7. **UAT isolation is preserved**
   **Given** this story
   **When** it lands
   **Then** `.github/workflows/deploy.yml` remains Environment `uat`, concurrency `deploy-uat`
   **And** UAT auto-deploy after CI on `main` still runs
   **And** `deploy.yml` does not gain `environment: production` or `deploy-production`
   **And** `remote-deploy.sh` and `docker-compose.uat.yml` are not reused for Production

8. **46.3 does not launch Production**
   **Given** this story completes
   **When** evidence is reviewed
   **Then** no Production application workload was composed up
   **And** DNS was not changed
   **And** live Paddle was not enabled
   **And** customer data was not migrated
   **And** Production remains **NO-GO / NOT YET COMPLETE**
   **And** cutover authorization does not waive remaining Epic 46 gates

## Non-goals

- Do not provision another droplet or rerun 46.2 hardening without a proven defect.
- Do not move Production onto UAT or modify the UAT host.
- Do not convert `deploy.yml` into a shared UAT/Production workflow.
- Do not populate secret values in git, story files, PRs, evidence, logs, screenshots, or chat.
- Do not copy UAT secrets into Production.
- Do not create application `.env` on the host (46.4).
- Do not implement backup/restore (46.5).
- Do not enable live Paddle (46.10) or Production email DNS (46.11).
- Do not change public DNS/TLS (46.13) or declare cutover (46.15).
- Do not invent a second SHA mechanism. Reuse `GIT_SHA` + `PlatformOpsVersionService`.
- Do not use Cursor as an SSH client (Epic 45 AD-1).

## Owner gates

| Gate | Who | When | Blocks |
| --- | --- | --- | --- |
| `production_environment_protections` | Owner in GitHub Settings | Before first live Environment deployment | Unprotected `production` environment. 2026-10-23: owner attested Environment `production` from the GitHub web UI (`OWNER_ATTESTED_CONFIGURATION=PASS`). Cursor App Settings verification remains unavailable (`AUTOMATED_SETTINGS_VERIFICATION=UNAVAILABLE_DUE_TO_GITHUB_APP_PERMISSIONS`). See `evidence/46-3/owner-gate-a-environment-protections.md`. |
| `production_secrets` | Owner populates Environment `production` secrets | Before first live SSH | Missing `PROD_*` (fail-closed names only). **2026-10-24 BLOCKED — DOCKER RUNTIME NOT INSTALLED.** Live checkout is `21e835604884a922f3a51d3b0d6039657affed15`. Environment `production` has the 5 required secrets and 4 required variables. Dedicated Production Actions SSH key is created and installed for `deploy`. Host `docker` is absent, so Gate B / `production-compose.sh config` must not be dispatched until owner-run `deploy/bootstrap-production-docker.sh` completes. See `docs/deploy/tailscale-production-overlay.md`. |
| Each deploy approval | Owner required reviewer | Every Environment `production` job | Deploy without approval |
| Implementation authorization | Owner | After this planning artifact is accepted | `bmad-dev-story` for 46.3 |

This planning pass does **not** authorize implementation.

Owner must create Environment `production` in GitHub UI **before the first `workflow_dispatch`**. A first dispatch must not auto-create an unprotected environment. YAML cannot set required reviewers. Required settings:

- Required reviewers: owner
- Prevent self-review / administrator bypass if the GitHub UI offers it (single-owner repos still keep required reviewers enabled)
- Deployment branches: `main` only
- Independent of Environment `uat`
- Wait timer: 0 unless owner chooses a delay
- Secrets: names below, values never pasted into chat

Dispatch the workflow from `main` only. Environment branch policy `main` must reject production deploys started from a feature branch. A single-owner repository may have only the owner as required reviewer; that is accepted and must still be a required reviewer, not an unprotected environment.

## Production workflow design

File: `.github/workflows/deploy-production.yml`  
Name: `Deploy Production` (must not be `Deploy UAT`)

```
on:
  workflow_dispatch:
    inputs:
      action:        deploy | rollback   (required)
      deploy_sha:    40 hex              (required; deploy target or ROLLBACK_SHA)
      restore_dump:  forbidden in 46.3; validate-sha fails if non-empty

concurrency:
  group: deploy-production
  cancel-in-progress: false

permissions:
  contents: read
  actions: read          # Layer A: CI runs on deploy_sha
  checks: read           # Layer B: check-runs on PR HEAD
  pull-requests: read    # Layer B: commit → associated PRs
# No write, contents:write, secrets, or workflow-global id-token: write.
# deploy/rollback add job-level id-token: write only after Environment approval.
```

Jobs:

1. **`validate-sha`** — no `environment`, no SSH, no host mutation. Both layers required.

   Shared refuse-before-layers:
   - `inputs.restore_dump` is empty
   - `deploy_sha =~ ^[0-9a-fA-F]{40}$` (normalize to lowercase only after the match)
   - `git cat-file -t $SHA` is `commit` (refuse tags/trees/blobs)
   - checkout uses `fetch-depth: 0` (or fetches the SHA + `origin/main`)
   - `git merge-base --is-ancestor $SHA origin/main`
   - GitHub API/HTTP failures, incomplete, or empty payloads are `REFUSE`

   **Layer A — exact `deploy_sha` / main CI**
   1. Query workflow `.github/workflows/ci.yml` (name `CI`) runs with `head_sha == deploy_sha`
   2. **Paginate every page** (`Link` / `total_count`). Truncation or fetch failure → `REFUSE`
   3. Keep runs whose `event` is `push` or `workflow_dispatch`. Refuse `pull_request`, `pull_request_target`, and `merge_group` (this repo does not use merge queue)
   4. Require `head_branch == main`. Null, empty, or any other value → `REFUSE`
   5. Select the newest run by `created_at`, then highest numeric `id` if timestamps tie. If conclusions still disagree → `REFUSE`
   6. Do **not** filter to green runs before picking newest (that hides a newer red)
   7. Newest run `conclusion` must be `success` (not `skipped`, `cancelled`, pending, empty, or `neutral`)
   8. Named **jobs** on that run must exist and `conclusion == success`: `.NET build and test`, `API integration tests`, `Next.js build`, `UAT isolation contract`, `Docker stack smoke`
   9. Refuse if a newer CI run on the same SHA failed
   10. Do **not** require `GitGuardian Security Checks` on `deploy_sha` itself

   **Layer B — unique merged PR + GitGuardian on merge-time PR HEAD**
   1. `GET /repos/{owner}/{repo}/commits/{deploy_sha}/pulls` with `Accept: application/vnd.github+json` (read-only, paginate all pages). Use only immutable relationship fields. Do not use PR title, body, labels, comments, or other user-supplied metadata
   2. From the **list** payload, keep rows where `base.ref == main` AND `merge_commit_sha == deploy_sha` (apply merge-commit equality **before** uniqueness). **Do not require `merged == true` on this list payload.** Live evidence (PR #484 merge `5d52d6e3`): `commits/{sha}/pulls` returns `merged: null` even though `GET /pulls/484` has `merged: true`
   3. If `merge_commit_sha` is absent/empty on a list row, drop it
   4. If zero remain → `REFUSE` (direct-to-main, unmapped merge, or deploying a PR HEAD / other ancestor)
   5. If more than one remains → `REFUSE`
   6. Hydrate the unique candidate: `GET /repos/{owner}/{repo}/pulls/{n}`. HTTP/empty/incomplete → `REFUSE`. On the hydrated object require ALL of: `merged == true`, `base.ref == main`, `merge_commit_sha == deploy_sha`. Missing or false → `REFUSE`
   7. Require `deploy_sha` is a **two-parent merge commit** (`git rev-list --parents -n 1` has exactly two parents). One-parent squash/rebase → `REFUSE`. This repository currently allows squash/rebase and does **not** delete branches on merge, so `/pulls/{n}/commits` and live `pr.head.sha` can drift. The only immutable merge-time PR HEAD is `${deploy_sha}^2`. Do **not** change GitHub merge-method settings in 46.3
   8. Pin `reviewed_pr_head = git rev-parse ${deploy_sha}^2` as **authoritative**. Paginate `GET /pulls/{n}/commits` (HTTP/empty → `REFUSE`) only as corroboration. If the last list SHA differs from `^2` (branch reuse after merge), **do not** switch the GitGuardian host to that live SHA and **do not** REFUSE solely for the drift. Never use live `pr.head.sha` as the GitGuardian host
   9. First-parent chain: load immutable trust anchor `deploy/production-provenance-anchor.txt` (`c39f2618bcdcb71875d2da5b654f3a999b39ae35`). Confirm it is a commit and an ancestor of `deploy_sha`. Walk `${deploy_sha}^1` backward until the anchor. Every commit after the anchor must be a two-parent merge that independently satisfies this Layer B contract (unique hydrated merged-to-`main` PR + GitGuardian on `${commit}^2`). A direct-to-main commit, or a later merge that launders one, is `REFUSE`. The anchor is the trust root and is not revalidated as a new PR merge. Traversal limit 10000; exceeding it is `REFUSE`, not silent truncation.
   10. List **all pages** of `GET /repos/{owner}/{repo}/commits/{reviewed_pr_head}/check-runs` on **this** repository only (do not follow fork remotes; empty → `REFUSE`)
   11. Match name exactly `GitGuardian Security Checks` AND `app.slug` case-insensitive `gitguardian` (verified on PR #484 HEAD `c5acc081` and PR #485 HEAD `895d951b`). If `app` is missing → `REFUSE`
   12. Every matched run with `check_run.head_sha != reviewed_pr_head` is ignored; if none remain → `REFUSE`
   13. If any matched run is `queued`, `in_progress`, or `pending` → `REFUSE` (do not fall back to an older SUCCESS)
   14. Newest **terminal** matched run (by `completed_at`, then highest `id`) must have `status == completed` and `conclusion == success`
   15. `REFUSE` conclusions: `failure`, `cancelled`, `skipped`, `neutral`, `timed_out`, `action_required`, empty
   16. Never treat a missing GitGuardian result as PASS
   17. Use only `GITHUB_TOKEN` with the read permissions above. Do not add a PAT, `contents:write`, `secrets`, or `deployments` write solely for this validation

   Outputs: `validated_sha` (= `deploy_sha`), `reviewed_pr_head`, `associated_pr_number` (evidence only; never a deploy target)

2. **`deploy` or `rollback`** — `needs: validate-sha`, `environment: production`
   - refuse unless `validate-sha` succeeded in **this** `run_id` (no partial job re-run)
   - refuse if `inputs.deploy_sha != validated_sha`
   - **re-run Layer A and Layer B** immediately before SSH (covers approval-wait races and stale GitGuardian)
   - checkout this job's helpers at `ref: ${{ needs.validate-sha.outputs.validated_sha }}` with `persist-credentials: false`
   - fail-closed secret names (`PROD_*`). GitHub Actions does not prove Environment vs repo/org secret scope at runtime. Owner Settings must place `PROD_*` only on Environment `production` and must confirm conflicting repo/org `PROD_*` are absent before first dispatch.
   - `vars.PROD_COMPOSE_PROJECT` must equal `cohestra-production`
   - host/path allowlist keeps inventory `PROD_DROPLET_HOST=159.223.55.242`
   - overlay validator requires `PROD_TAILSCALE_CLIENT_ID`, `PROD_TAILSCALE_AUDIENCE`, and CGNAT `PROD_TAILSCALE_HOST`
   - join Tailscale with pinned `tailscale/github-action@99a8333667fff04fdd6cffb46dfd409f8329a7bf` using OIDC federation (`tag:gha-production`)
   - fail-closed overlay ping; no public `:22` fallback
   - appleboy `host:` is `${{ vars.PROD_TAILSCALE_HOST }}`
   - SSH via pinned `appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f`; `command_timeout: 60m`; `debug: false`
   - droplet `git fetch origin main` retries 6× like UAT before reset
   - never interpolate unvalidated strings into shell
   - no `set -x` around secrets, no `eval`, no workspace write of the SSH key, no SSH transcript artifacts

Forbidden `on:` keys: `push`, `pull_request`, `workflow_run`, `workflow_call`, `repository_dispatch`, `schedule`, `release`, `deployment`. CI green and UAT completion must not start this workflow.

## GitHub Environment design

Environment name: `production`

| Item | Value |
| --- | --- |
| Secrets | `PROD_DROPLET_HOST`, `PROD_DROPLET_USER`, `PROD_DROPLET_SSH_KEY`, `PROD_DROPLET_DEPLOY_PATH`, `PROD_PUBLIC_BASE_URL` |
| Variable | `PROD_COMPOSE_PROJECT=cohestra-production` |
| Overlay variables (later) | `PROD_TAILSCALE_CLIENT_ID`, `PROD_TAILSCALE_AUDIENCE`, `PROD_TAILSCALE_HOST` — not populated in this pass |
| Optional later smoke | `PROD_SMOKE_*` only (do not invent in 46.3 unless a contract test needs the name) |
| App secrets | Host `.env` in 46.4 — not GitHub unless Actions must use them |
| Reviewers | Owner required |
| Branches | `main` only |

Deploy key is a **new** Production Actions key, not `cohestra-uat-gha` and not the owner workstation key.

## SHA provenance design

AD-7 invariant (do not shorten or replace):

`REVIEWED = CI = DEPLOY TARGET = RUNTIME = ACCEPTANCE`

GitHub merge commits create two SHAs. Production must prove the link, not pretend GitGuardian ran on the merge commit.

```
REVIEWED PR HEAD
  → GitGuardian SUCCESS on that PR HEAD
  → MERGED MAIN DEPLOY SHA  (pr.merge_commit_sha)
  → CI SUCCESS on the deploy SHA (five Actions jobs)
  → DEPLOY TARGET SHA
  → RUNTIME SHA (GIT_SHA)
  → later ACCEPTANCE SHA (46.13/46.14)
```

Worked example (PR #484, do not treat as a secret):

| Role | SHA |
| --- | --- |
| Reviewed PR HEAD | `c5acc08107124ee4c69a41078857f6b0fcd4cb0d` |
| GitGuardian | SUCCESS on PR HEAD |
| Merged main / deploy SHA | `5d52d6e3dc99bce01545eda6eb10f378d469c374` |
| CI on deploy SHA | SUCCESS (five Actions jobs). No GitGuardian check-run on this merge SHA |

`REVIEWED` in AD-7 is the reviewed PR HEAD. `CI` / `DEPLOY TARGET` / `RUNTIME` are the merged main SHA once Layer A passes. The control plane must prove `merge_commit_sha == deploy_sha` and GitGuardian success on merge-time `reviewed_pr_head` (`${deploy_sha}^2`). Do not collapse those identities. Do not pretend GitGuardian ran on the merge commit.

### Direct-to-main policy

`main` is not strongly branch-protected today. **Do not assume `ancestor of main == reviewed`.** Branch protection is **not** the Production trust boundary.

A Production deploy of a commit with no single associated PR that is merged to `main` **fails closed**. That includes owner pushes, bot commits, and merge commits GitHub cannot map to exactly one PR.

A two-parent merge whose first-parent chain contains a direct-to-main commit after the trust anchor **fails closed**, including when a later clean merge would otherwise hide that commit.

Do **not** change GitHub branch protection in Story 46.3. Record it as a later production-hardening observation (candidate: 46.9 / repo settings), not an owner-approved 46.3 task.

### Merge-style policy

Production deploy requires a two-parent merge commit so `reviewed_pr_head` is an immutable git object (`^2`). Squash and rebase merges are `REFUSE` even if a PR maps and some live head has GitGuardian SUCCESS.

Do **not** change allowed GitHub merge methods in 46.3. This is a deploy-time provenance rule, not a Settings mutation.

### GitGuardian policy

- Required check name: `GitGuardian Security Checks`
- Required `app.slug`: `gitguardian` (verified on PR #484 and PR #485)
- Evaluated on merge-time `reviewed_pr_head` only (`${deploy_sha}^2`)
- Never evaluated on live `pr.head.sha`
- Never required on the merge/`deploy_sha` itself (PR #484 merge `5d52d6e3` has no GitGuardian check-run; requiring it there would refuse legitimate merges)
- Never optional, skippable, or inferred from Layer A
- Missing / pending / cancelled / skipped / failed / API error / empty payload → REFUSE

Reuse, do not duplicate:

- `deploy/reset-accepted-sha.sh` **must not be sourced as-is**. Empty `DEPLOY_SHA` resets to `origin/main` tip. Production wrapper `deploy/reset-production-sha.sh` refuses empty/implicit SHA, then performs the 40-hex + ancestor + hard-reset checks.
- After reset: `GIT_SHA="$(git rev-parse HEAD)"` and export it (same as UAT `remote-deploy.sh` lines 75–77).
- Compose already injects `GIT_SHA: ${GIT_SHA:-}` in `docker-compose.production.yml`.
- Runtime read path is `PlatformOpsVersionService` (`GIT_SHA`, 40 or 64 hex; `latest` is malformed).
- Public `/ready` must not leak `GIT_SHA` (existing test). Staff ops/version remains the runtime proof when a later story actually boots the API.

46.3 proves the control-plane pin with `EXPECTED_SHA` / `DEPLOYED_SHA` / `GIT_SHA` in sanitized evidence. Full runtime ops/version equality waits until a later authorized dark deploy after 46.4.

## Secret handling

Required names (values never stored in-repo):

```
PROD_DROPLET_HOST
PROD_DROPLET_USER
PROD_DROPLET_SSH_KEY
PROD_DROPLET_DEPLOY_PATH
PROD_PUBLIC_BASE_URL
```

Fail-closed helper: `deploy/fail-closed-production-secrets.sh` modeled on `deploy/fail-closed-uat-secrets.sh`.

Expected failure output:

```
OWNER_GATE=missing_protected_secret
ENVIRONMENT=production
MISSING_SECRET=PROD_DROPLET_HOST
```

Rules:

- Never print values, key material, or `.env` contents.
- Evidence JSON: names, present/absent booleans, SHAs, result codes only.
- Do not copy Environment `uat` secrets.
- Do not store `PROD_*` as repository or organization secrets.
- `PROD_PUBLIC_BASE_URL` for 46.3 is a dark-host URL (IP or non-public name). Refuse `https://uat.cohestra.app` and customer `cohestra.app` cutover claims.
- Evidence schema test must reject secret-like keys and SSH logs.

## Rollback design

File: `deploy/production-rollback.sh`

- Required `ROLLBACK_SHA` (40 hex commit that is an ancestor of `origin/main`)
- Production (non-test) rollback requires `ROLLBACK_SHA` to equal the host ledger `/var/lib/cohestra-production/accepted-sha` or a previous ledger entry. The “fixture marks accepted” exception is **test-only**.
- The accepted-SHA ledger lives **outside** the git work tree so `git reset --hard` cannot delete it.
- Reset the application tree to that SHA; verify `git rev-parse HEAD` and exported `GIT_SHA`
- Run `bash deploy/production-compose.sh config` at that SHA (dry-run compose contract). Do **not** `up` in 46.3.
- Sanitized evidence JSON
- `--restore-dump`, `--restore`, `RESTORE_DUMP`, `psql`, `pg_restore`, `down -v` → exit non-zero (`NOT_IMPLEMENTED_46_5` for dump restore). No database mutation.
- Same Environment approval + concurrency if invoked from the workflow
- Re-run Layer A + Layer B on `ROLLBACK_SHA` before SSH
- Do not call UAT `remote-deploy.sh`

## Deployment sequence (implementation contract — not executed in planning)

1. Validate requested SHA (40 hex commit object)
2. Verify SHA is an ancestor of `origin/main` (necessary, not sufficient)
3. Layer A: required five Actions jobs SUCCESS on that exact SHA (latest unfiltered `push`/`workflow_dispatch` CI run)
3b. Layer B: unique hydrated merged-to-`main` PR; two-parent merge; GitGuardian SUCCESS on `${deploy_sha}^2`
4. Enter Environment `production`
5. Wait for explicit owner approval
6. Validate secrets without exposing values
7. SSH with Actions credential
8. Fetch repository
9. Reset exactly to approved SHA
10. Validate Production compose/config prerequisites (`production-compose.sh`, not UAT wrappers)
11. Migration/backup safety gate: if the tree contains new EF migrations, refuse unless a documented expand/contract note exists; do not invent 46.5 dumps
12. Deploy `docker-compose.production.yml` only after 46.4 runtime secrets exist — **out of scope for 46.3 close**
13. Inject `GIT_SHA`
14. Verify deployed/runtime SHA
15. Production smoke (dark host) — out of scope for 46.3 close
16. Record sanitized evidence
17. Preserve previous accepted SHA for rollback in host ledger `/var/lib/cohestra-production/accepted-sha` (40 hex + newline only; outside the git tree). Tests may use a fixture. Do not write this file in the planning pass.

46.3 implementation lands and contract-tests steps 1–10 and 16–17. Steps 12–15 wait for 46.4+ authorized dark deploy.

## UAT isolation

Frozen:

- `.github/workflows/deploy.yml` — Environment `uat`, `deploy-uat`, `cancel-in-progress: false`
- `deploy/remote-deploy.sh` — UAT compose only
- `docker-compose.uat.yml`
- `deploy/validate-deploy-uat-workflow.sh` must keep refusing `deploy-production` **on the UAT workflow**

46.1/46.2 validators currently **fail if** `deploy-production.yml` exists. Implementation **must flip** those assertions:

- `deploy/validate-production-compose.sh`
- `deploy/validate-production-host.sh`

They must require the Production workflow contract instead of forbidding the file. Do not weaken UAT isolation checks.

## Files the implementer will create or update

Create (implementation pass only — not this planning PR):

- `.github/workflows/deploy-production.yml`
- `deploy/fail-closed-production-secrets.sh`
- `deploy/fail-closed-production-secrets.test.sh`
- `deploy/reset-production-sha.sh`
- `deploy/reset-production-sha.test.sh`
- `deploy/validate-deploy-production-workflow.sh`
- `deploy/validate-production-provenance.sh` (Layer A + Layer B)
- `deploy/validate-production-provenance.test.sh`
- `deploy/validate-production-target.sh` (host/path allowlist)
- `deploy/validate-production-target.test.sh`
- `deploy/production-rollback.sh`
- `deploy/production-rollback.test.sh`
- `deploy/production-remote-deploy.sh` (dry-run in 46.3; must refuse UAT compose/project, `COHESTRA_SHARED_HOST_UAT`, `DROPLET_*`, `psql`/`pg_restore`, and `compose up`)

Update:

- `deploy/validate-production-compose.sh` — require Production workflow
- `deploy/validate-production-host.sh` — require Production workflow
- `.github/workflows/ci.yml` `uat-isolation` job — add the new contract tests
- `docs/deploy/github-actions-cd.md` — add Production section; keep UAT path unchanged
- `docs/deploy/production-launch-program.md` — record 46.3 control plane
- `docs/deploy/production-host.md` — 46.3 no longer “does not create” the workflow after implementation

Do not edit: `docker-compose.uat.yml`, UAT auto-deploy behavior, Paddle live flags, DNS records, 46.2 host provisioners unless a proven defect appears.

## Tasks / Subtasks

- [x] Task 1: Owner-gated workflow + concurrency (AC 1, 2)
  - [x] Add `deploy-production.yml` with `workflow_dispatch` only
   - [x] Required `deploy_sha` / `action` inputs; no default SHA
   - [x] Forbid every trigger except `workflow_dispatch` (`push`, `workflow_run`, `workflow_call`, `repository_dispatch`, `schedule`, `release`, `deployment`)
   - [x] `concurrency` is workflow-wide `deploy-production` with `cancel-in-progress: false`
   - [x] Split `validate-sha` (no environment, no SSH) and `deploy`/`rollback` (`environment: production`)
   - [x] Checkout helpers at `ref: validated_sha` with `persist-credentials: false`
   - [x] Pin checkout + appleboy actions to the same reviewed SHAs as UAT; `command_timeout: 60m`; no `debug: true`
- [x] Task 2: SHA + CI + GitGuardian provenance (AC 3)
  - [x] `reset-production-sha.sh` refuses empty/`HEAD`/`latest`/`github.sha`
  - [x] Ancestor of `origin/main` required (necessary, not sufficient)
  - [x] Layer A: latest CI on exact `deploy_sha` green for the five Actions jobs
  - [x] Layer B: unique associated PR; hydrate `merged`; two-parent merge; `merge_commit_sha == deploy_sha`; GitGuardian success on `${deploy_sha}^2`
  - [x] Direct-to-main / squash/rebase / missing / ambiguous PR / missing GitGuardian → REFUSE
  - [x] Environment job re-runs Layer A + Layer B and refuses SHA substitution
- [x] Task 3: Secrets, host, path (AC 4, 5)
  - [x] `fail-closed-production-secrets.sh` + tests
  - [x] Inventory IPv4 allowlist; UAT IPv4/DNS denylist
  - [x] Safe deploy path; default `/home/deploy/cohestra-production`
- [x] Task 4: Rollback (AC 6)
  - [x] `production-rollback.sh` + tests
  - [x] `--restore-dump` fail-closed `NOT_IMPLEMENTED_46_5`
- [x] Task 5: Flip 46.1/46.2 forbids; keep UAT frozen (AC 7)
  - [x] Update compose/host validators
  - [x] Add `validate-deploy-production-workflow.sh` to CI
  - [x] Prove `deploy.yml` / UAT compose behavior unchanged
- [x] Task 6: Docs + sanitized evidence (AC 2, 8)
  - [x] Owner Environment checklist (no secret values)
  - [x] Evidence templates: SHAs, missing-secret names, host-allowlist result
  - [x] No live compose-up, DNS, Paddle, or UAT mutation
- [x] Task 7: Exact-HEAD Grok 4.6 review PASS (BLOCKER=0, MAJOR=0)
  - [x] Repeat Mandatory Code Review Loop on the final implementation HEAD
- [x] Task 8: Tailscale OIDC code path (dormant until owner bootstrap)
  - [x] Job-level `id-token: write` on `deploy`/`rollback` only
  - [x] Pin `tailscale/github-action@99a8333667fff04fdd6cffb46dfd409f8329a7bf`
  - [x] Overlay validator + connectivity helper; appleboy uses `PROD_TAILSCALE_HOST`
  - [x] Owner-run Tailscale and `deploy` user bootstrap scripts (unexecuted)
  - [x] Grants template + OIDC inspection workflow (undispatched)
  - [ ] Live overlay bootstrap remains owner-only and is not this PR

## Test strategy

Deterministic contract tests (preferred; no live droplet required):

| Test | Proves |
| --- | --- |
| `validate-deploy-production-workflow.sh` | only `workflow_dispatch`; no `workflow_call`/`push`/`workflow_run`; concurrency; `environment: production` on mutating jobs; no `github.sha` deploy; action pins; appleboy `debug` absent |
| `fail-closed-production-secrets.test.sh` | missing/whitespace secrets print `MISSING_SECRET=<NAME>` only |
| `reset-production-sha.test.sh` | refuse empty/`HEAD`/`latest`/short/non-ancestor; accept 40-hex ancestor |
| `validate-production-target.test.sh` | allow only 159.223.55.242; refuse 129.212.235.2, IPv6, UAT hosts, `/home/deploy/cohestra`, `..` paths |
| `validate-production-overlay-target.test.sh` | require overlay vars; accept CGNAT only; refuse public/UAT/RFC1918/IPv6/hostname |
| `verify-production-overlay-connectivity.test.sh` | no public TCP 22 fallback; refuse public/UAT ping targets |
| `validate-inspect-production-oidc-workflow.sh` | manual production-only OIDC inspect; mutations for JWT leak/SSH/Tailscale/push fail |
| `validate-tailscale-production-grants.sh` | Grants `tcp:22` only; no wildcard/UAT/exit-node/invented owner |
| `production-rollback.test.sh` | explicit SHA; refuse unknown; refuse `--restore-dump`; no DB commands |
| existing `validate-deploy-uat-workflow.sh` | UAT path still forbids Production concurrency/environment |
| existing `validate-production-compose.sh` / `validate-production-host.sh` | updated to require the new workflow without weakening UAT checks |
| existing `reset-accepted-sha.test.sh` | UAT helper unchanged (empty→main tip remains UAT-only) |
| `validate-production-provenance.test.sh` | Layer A + Layer B fixtures below |

Required provenance fixtures (mocked GitHub API; no live tokens/secrets):

| Case | Expected |
| --- | --- |
| Two-parent merge SHA + list payload `merged: null` + hydrated PR `merged: true` + `merge_commit_sha` match + GitGuardian success on `${deploy_sha}^2` + five CI jobs green | PASS |
| Same, but GitGuardian `failure` | REFUSE |
| GitGuardian missing | REFUSE |
| GitGuardian pending / queued | REFUSE |
| GitGuardian cancelled or skipped | REFUSE |
| Associated PR missing | REFUSE |
| PR `base.ref != main` (list or hydrated) | REFUSE |
| Hydrated PR `merged != true` | REFUSE |
| Implementation treats list-payload `merged: null` as merged without hydrating `GET /pulls/{n}` | REFUSE |
| Direct-to-main commit (no associated PR) | REFUSE |
| One-parent squash/rebase with mapped PR + GitGuardian green on live head | REFUSE |
| Two PRs with `merge_commit_sha == deploy_sha` | REFUSE |
| `merge_commit_sha` missing/empty | REFUSE |
| `merge_commit_sha` ≠ `deploy_sha` (wrong PR or deploying PR HEAD) | REFUSE |
| Live `pr.head.sha` and `/pulls/n/commits` drifted after merge; GitGuardian still evaluated on `${deploy_sha}^2` and is SUCCESS | PASS |
| Implementation switches GitGuardian host to drifted live head when `^2` differs | REFUSE |
| GitGuardian success on an older PR commit; missing/failed on `${deploy_sha}^2` | REFUSE |
| Check-runs queried against `deploy_sha` instead of pinned `reviewed_pr_head` | REFUSE |
| Newest GitGuardian pending/queued; older SUCCESS exists | REFUSE |
| GitGuardian `neutral` / `timed_out` / `action_required` / `skipped` / `cancelled` | REFUSE |
| Check name matches but `app.slug` is not `gitguardian` | REFUSE |
| Five CI jobs green, GitGuardian red | REFUSE |
| GitGuardian green, exact merge-SHA CI red or missing | REFUSE |
| Newer red `push` CI after older green on same SHA | REFUSE |
| CI `head_branch != main` | REFUSE |
| Paginated pulls/check-runs/CI truncated | REFUSE |
| GitHub API error / empty / incomplete payload | REFUSE |
| Merge whose first-parent chain contains a direct-to-main commit after the trust anchor | REFUSE |

Both layers are mandatory. Green Actions CI cannot waive GitGuardian. Green GitGuardian cannot waive exact-SHA CI.

CI: add the new scripts to `.github/workflows/ci.yml` job `UAT isolation contract`.

Do not require a live Production deploy to mark 46.3 done. If owner later populates secrets, a connectivity probe may run but must not `compose up`.

## CI/CD validation strategy

- Local: run the new contract tests + existing UAT/production compose/host validators.
- PR CI: all current CI jobs plus the new contract steps.
- Post-merge: confirm UAT `Deploy UAT` still auto-starts from CI on `main` and Production workflow does not.
- Never use CI success as Production GO.

## Evidence expectations

Allowed: SHAs (`deploy_sha`, `reviewed_pr_head`), associated PR number, GitGuardian conclusion name only, workflow run ids, job names, `MISSING_SECRET=<NAME>`, `shared_host_uat=false`, inventory IPv4, boolean present/absent, result=`PASS|FAIL`.

Forbidden: secret values, private keys, `.env` dumps, SSH transcripts with commands that echo secrets, screenshots of GitHub secret values.

## Security threat review (Grok 4.6)

Every item is resolved in this planning artifact. Implementation must keep the control.

| Threat | Severity if unmitigated | Planned control |
| --- | --- | --- |
| Arbitrary SHA deploy | BLOCKER | 40-hex commit; ancestor of `origin/main`; Layer A + Layer B |
| Direct-to-main / unreviewed ancestor | BLOCKER | No associated merged-to-`main` PR → REFUSE; ancestry ≠ review |
| Bypass GitGuardian via merge commit | BLOCKER | GitGuardian required on PR HEAD; never optional; never inferred from Layer A |
| Wrong PR’s GitGuardian | BLOCKER | Exactly one merged-to-`main` PR; `merge_commit_sha == deploy_sha` |
| Stale PR-head security result | BLOCKER | GitGuardian evaluated only on immutable `${deploy_sha}^2`; pending/old-success-then-fail → REFUSE |
| Ambiguous commit→PR mapping | BLOCKER | `count != 1` after merge-commit+base filters → REFUSE |
| PR HEAD / merge SHA substitution | BLOCKER | Deploy target is `deploy_sha` only; GitGuardian host is `reviewed_pr_head` (`^2`) only |
| List-payload `merged: null` treated as not-merged or as merged | BLOCKER | Hydrate `GET /pulls/{n}`; require `merged == true` there |
| Squash/rebase live-head swap | BLOCKER | One-parent `deploy_sha` → REFUSE |
| API failure as success | BLOCKER | HTTP/empty/incomplete → REFUSE |
| GitGuardian skipped/cancelled as success | BLOCKER | Only `status=completed` and `conclusion=success` |
| Post-merge CI failed after green PR checks | BLOCKER | Layer A on merge SHA is independent and mandatory |
| Branch/ref confusion | BLOCKER | Never deploy `github.sha` / `HEAD` / `latest`; dispatch input is the only target |
| Stale CI acceptance | BLOCKER | Latest CI run on that SHA must be success; do not use a different commit's green |
| SHA substitution between jobs | BLOCKER | `validated_sha` output must equal `inputs.deploy_sha` in the environment job |
| Workflow input command injection | BLOCKER | Regex-gate SHA/path before shell use; no `eval`; quote expansions |
| SSH key exposure | BLOCKER | Environment secret only; never echo; evidence redacts key material |
| Actions log secret exposure | BLOCKER | Fail-closed names only; no `set -x` on secret steps |
| Artifact secret leakage | BLOCKER | Evidence allowlist; refuse secret-like keys |
| Deployment-path injection | BLOCKER | Absolute safe path; no `..`; distinct from UAT path |
| Host-target substitution | BLOCKER | Inventory IPv4 allowlist; hard-deny UAT IPv4/DNS |
| Accidental UAT target | BLOCKER | Deny list + `PROD_*` names only; do not read `DROPLET_*` |
| Accidental Production auto-deploy | BLOCKER | `workflow_dispatch` only; contract test forbids `push`/`workflow_run` |
| Concurrent Production releases | MAJOR | `deploy-production` + `cancel-in-progress: false` |
| Rollback abuse | MAJOR | Explicit 40-hex accepted SHA; Environment approval; no implicit previous |
| Unapproved database restoration | BLOCKER | `--restore-dump` refused in 46.3; no `psql`/`pg_restore` in rollback |
| GitHub Environment bypass | BLOCKER | SSH/mutate jobs require `environment: production`; owner configures required reviewers |
| Stale/incorrect Production secrets | MAJOR | Host allowlist; UAT secret names unused; fail-closed presence check |
| Reuse of UAT `remote-deploy.sh` | BLOCKER | Forbidden; that script starts `cohestra-uat` |
| Reuse of `reset-accepted-sha.sh` empty fallback | BLOCKER | Production wrapper refuses empty SHA |
| Cursor/agent SSH | BLOCKER | Actions only (Epic 45 AD-1) |

Planning-review resolutions (Grok 4.6 Blind Hunter / Edge Case Hunter / Acceptance Auditor / security):

- Unprotected Environment auto-create → owner must create protected `production` before first dispatch; implementation PR must not dispatch.
- Extra triggers / `workflow_call` → forbidden `on:` list + contract test.
- Helper scripts from `github.sha` → checkout `validated_sha` with `persist-credentials: false`.
- UAT path/project/host TOCTOU → SSH only to literal `159.223.55.242`; refuse `/home/deploy/cohestra`; require `PROD_COMPOSE_PROJECT`.
- Implicit DB restore / `restore_dump` input → fail in `validate-sha` if set; rollback refuses dump/psql/`down -v`.
- Accepted-SHA wiped by `reset --hard` → ledger outside the git tree.
- AD-7 shortened → full five-way chain kept; ACCEPTANCE later.
- Rollback compose missing → dry-run `production-compose.sh config` at `ROLLBACK_SHA`.
- Approval-wait CI/main races → re-validate in the environment job before SSH.
- GitGuardian omitted from merge-SHA CI → Layer B on immutable merge-time PR HEAD (`${deploy_sha}^2`), never live `pr.head.sha`, never `deploy_sha`.
- Unique PR selected by `base main + merge_commit_sha == deploy_sha` on the list payload, then hydrated; `commits/{sha}/pulls.merged` is **not** authoritative (`null` on PR #484).
- Direct-to-main and any later merge whose first-parent chain still contains that commit after the trust anchor → REFUSE. The walk stops at the immutable 46.3 baseline anchor.
- One-parent squash/rebase → REFUSE (no immutable `^2` pin; repo does not delete branches on merge). Merge-method Settings are not changed in 46.3.
- Pending/forged GitGuardian → refuse any non-terminal run; pin `app.slug=gitguardian`; refuse `neutral`/`skipped`/`cancelled`.
- Paginated GitHub lists must be fully consumed or REFUSE.
- Threat-table wording that said “current `pr.head.sha`” is retired; implementers must follow `reviewed_pr_head`.

Correction-review pass (Grok 4.6 Blind Hunter / Edge Case Hunter / Acceptance Auditor / deployment-security), attacking the requested bypasses:

| Attack | Result after this plan |
| --- | --- |
| Bypass GitGuardian via direct main push | REFUSE (no unique hydrated merged-to-`main` PR) |
| Choose a different PR’s GitGuardian | REFUSE unless `merge_commit_sha == deploy_sha` uniquely |
| Stale / live PR-head security result | GitGuardian host is immutable `^2`, not live `pr.head.sha` |
| Ambiguous commit→PR mapping | `count != 1` after merge-commit+base filters → REFUSE |
| PR HEAD / merge SHA substitution | Deploy target stays `deploy_sha`; GG host stays `^2` |
| GitHub API failure treated as success | HTTP/empty/incomplete/truncated → REFUSE |
| GitGuardian skipped/cancelled as success | Only `completed` + `success` |
| Deploy unreviewed main ancestor | Ancestry insufficient; no associated PR → REFUSE |
| PR checks green, post-merge CI red | Layer A independent; red/missing exact-SHA CI → REFUSE |
| `commits/{sha}/pulls.merged == null` | Hydrate `GET /pulls/{n}` (live #484 evidence) |
| Squash/rebase + reused branch | One-parent → REFUSE; no Settings mutation |
| Merge whose first-parent chain contains a direct-to-main commit after the trust anchor | REFUSE, including later-merge laundering |

Blind Hunter: no remaining SHA-substitution or GG-waiver path in the planned algorithm.  
Edge Case Hunter: list-payload `merged:null`, pagination, pending-over-old-success, squash drift, first-parent ride-along are fail-closed.  
Acceptance Auditor: user-required fixtures plus hydration/squash/`^2` cases are in the contract table. AD-7 five-way chain is not shortened.

No unresolved BLOCKER or MAJOR remains in this plan. Deferred MINOR: live EF migration detector (step 11) waits until 46.4 compose-up exists. Deferred observation: strengthen `main` branch protection and optionally lock merge methods to merge-commits only — outside 46.3, candidate 46.9.

## Definition of Done

- All ACs above are implemented and contract-tested on the same HEAD.
- UAT auto-deploy behavior unchanged.
- No Production workload, DNS, or live Paddle change.
- Mandatory Code Review Loop PASS on the final HEAD (no unresolved BLOCKER/MAJOR).
- Product acceptance: owner Environment checklist recorded without secret values.
- CI green on that HEAD.
- Tracker may move 46.3 to `done` only after that loop. This planning file is `ready-for-dev` only.
- Epic 46 stays `in-progress`. Production stays NO-GO.

## Dev Notes

### Architecture decisions the implementer must follow

- AD-1 dedicated droplet `cohestra-production` / `159.223.55.242` ≠ UAT `129.212.235.2`
- AD-3 compose project `cohestra-production` already landed in 46.1
- AD-6 Environment `production` is the only Production CD environment
- AD-7 SHA chain mandatory; runtime SHA is `GIT_SHA` / `PlatformOpsVersionService`
- AD-13 Epic 46 complete ≠ Production GO
- Epic 45 AD-1 Cursor is not an SSH client
- Epic 45 AD-3 fail closed on missing secrets

### Current state the implementer must preserve

- `docker-compose.production.yml` already injects `GIT_SHA: ${GIT_SHA:-}`
- `deploy/production-compose.sh` already refuses `COHESTRA_SHARED_HOST_UAT` and ad-hoc `run/exec`
- Host has no Docker/app workload (`workloads_deployed: false`)
- UAT `reset-accepted-sha.sh` empty fallback is **UAT-only**
- 46.1/46.2 validators currently forbid `deploy-production.yml` — flip, do not delete UAT guards

### Project Structure Notes

- Workflows live in `.github/workflows/`
- Deploy helpers live in `deploy/`
- Docs live in `docs/deploy/`
- Evidence lives in `_bmad-output/implementation-artifacts/evidence/46-3/` (sanitized)
- Do not add Production secrets to `.env.production.example` beyond existing names

### Previous story intelligence

- 46.1 locked compose/project/network names and forbade Production CD.
- 46.2 provisioned droplet `610830617` / `159.223.55.242`, hardened SSH/UFW, and left workloads undeployed.
- 46.2 CI validators will break the moment `deploy-production.yml` appears unless updated in the same PR.
- PR #484 (main `5d52d6e3`) was an unrelated billing-test CI flake fix; do not reopen billing.

### Git intelligence

- Recent main: 46.2 host hardening merge, then PR #484 test-only merge.
- UAT Actions pins: `actions/checkout@11d5960a326750d5838078e36cf38b85af677262`, `appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f`. Reuse them.

### Latest technical notes

- GitHub Environment required reviewers and branch policies are configured in repo Settings, not workflow YAML. The workflow can only set `environment: production`.
- `workflow_dispatch` `github.sha` is the branch tip at dispatch time — never the deploy target.
- `concurrency.cancel-in-progress: true` would cancel an in-flight Production release; it is forbidden.

### References

- [Source: `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.3]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md` AD-6, AD-7, AD-13]
- [Source: `_bmad-output/planning-artifacts/epic-46/deployment-release-architecture.md`]
- [Source: `_bmad-output/planning-artifacts/epic-46/story-dependency-graph.md`]
- [Source: `_bmad-output/planning-artifacts/epic-46/parallel-execution-plan.md` Track B]
- [Source: `_bmad-output/planning-artifacts/epic-46/production-security-model.md`]
- [Source: `docs/deploy/production-launch-program.md`]
- [Source: `docs/deploy/production-host.md` + `production-host-inventory.json`]
- [Source: `.github/workflows/deploy.yml` UAT isolation pattern]
- [Source: `deploy/fail-closed-uat-secrets.sh` + `deploy/reset-accepted-sha.sh`]
- [Source: `src/Infrastructure/Platform/PlatformOpsVersionService.cs`]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (planning + implementation)

### Debug Log References

- PR #484 merged at `5d52d6e3dc99bce01545eda6eb10f378d469c374` (reviewed HEAD `c5acc081`)
- Planning PR #485 merged at `c39f2618bcdcb71875d2da5b654f3a999b39ae35`
- Implementation branch created from that main SHA
- Workflow was not dispatched. Environment `production` was not created.

### Completion Notes List

- 2026-10-22 planning: planning artifact only. No `deploy-production.yml` in that planning pass.
- 2026-10-22: Layer A + Layer B GitGuardian provenance correction. Direct-to-main fails closed. Two-parent merge required. Hydrate `merged` from `GET /pulls/{n}`.
- 2026-10-22: Control-plane implementation exists (`deploy-production.yml`, provenance, rollback, target, secrets validators). Workflow was not dispatched. Environment `production` was not created. Secrets were not populated. Production SSH was not executed. No Production workload was deployed.
- 2026-10-22: First-parent chain walk to immutable anchor `c39f2618`. Laundering a direct-to-main commit through a later clean merge is REFUSE.
- 2026-10-23: Tailscale OIDC Production control plane implemented in-repo and left dormant. Workflow not dispatched. Tailscale not installed live. Federated identity not created. `deploy` user not created live. Secrets/variables not populated. Story 46.4 not started.
- 2026-10-24: Owner live Tailscale join at `100.90.12.72` and Unix user `deploy` reported. Checkout directory exists without a Git repository. Added owner-run `deploy/bootstrap-production-checkout.sh` (unexecuted). Gate B remains blocked.
- 2026-10-24: Live checkout PASS at `21e835604884a922f3a51d3b0d6039657affed15`. Gate B secrets/variables and the dedicated Production Actions SSH key are configured. Host `docker` is absent. Added owner-run `deploy/bootstrap-production-docker.sh` (unexecuted). Do not dispatch Gate B validation. Gate B remains blocked. Story 46.4 not started.
- 2026-10-24: Owner ran Docker bootstrap. Engine install succeeded; `production-compose.sh config` refused because config-only placeholders omitted `SendGrid__ApiKey` / `SendGrid__FromEmail`. No compose-up. Added canonical placeholder helper. Do not create `.env`. Story 46.4 not started.

### File List

- `.github/workflows/deploy-production.yml`
- `.github/workflows/ci.yml`
- `deploy/fail-closed-production-secrets.sh`
- `deploy/fail-closed-production-secrets.test.sh`
- `deploy/reset-production-sha.sh`
- `deploy/reset-production-sha.test.sh`
- `deploy/validate-production-provenance.sh`
- `deploy/validate-production-provenance.test.sh`
- `deploy/validate-deploy-production-workflow.sh`
- `deploy/validate-production-target.sh`
- `deploy/validate-production-target.test.sh`
- `deploy/production-rollback.sh`
- `deploy/production-rollback.test.sh`
- `deploy/production-remote-deploy.sh`
- `deploy/production-remote-deploy.test.sh`
- `deploy/validate-production-compose.sh`
- `deploy/validate-production-host.sh`
- `deploy/lib/cohestra-gh-api.sh`
- `deploy/lib/production-github-provenance.py`
- `deploy/lib/production-gh-api-mock.sh`
- `deploy/lib/production-provenance-fixture.sh`
- `deploy/production-provenance-anchor.txt`
- `docs/deploy/github-actions-cd.md`
- `docs/deploy/production-launch-program.md`
- `docs/deploy/production-host.md`
- `_bmad-output/implementation-artifacts/46-3-github-production-environment-and-owner-gated-ci-cd.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/evidence/46-3/implementation-control-plane.md`
- `.github/workflows/inspect-production-oidc.yml`
- `deploy/validate-production-overlay-target.sh`
- `deploy/validate-production-overlay-target.test.sh`
- `deploy/verify-production-overlay-connectivity.sh`
- `deploy/verify-production-overlay-connectivity.test.sh`
- `deploy/bootstrap-production-tailscale.sh`
- `deploy/bootstrap-production-deploy-user.sh`
- `deploy/bootstrap-production-overlay.test.sh`
- `deploy/validate-inspect-production-oidc-workflow.sh`
- `deploy/validate-tailscale-production-grants.sh`
- `docs/deploy/tailscale-production-overlay.md`
- `docs/deploy/tailscale-production-grants.template.json`
- `_bmad-output/implementation-artifacts/evidence/46-3/tailscale-oidc-control-plane.md`
- `_bmad-output/implementation-artifacts/evidence/46-3/tailscale-github-action-review.md`
- `deploy/bootstrap-production-checkout.sh`
- `deploy/bootstrap-production-checkout.test.sh`
- `_bmad-output/implementation-artifacts/evidence/46-3/production-checkout-bootstrap.md`
- `_bmad-output/implementation-artifacts/evidence/46-3/production-checkout-bootstrap-review.md`
- `deploy/bootstrap-production-docker.sh`
- `deploy/bootstrap-production-docker.test.sh`
- `deploy/production-compose.sh`
- `_bmad-output/implementation-artifacts/evidence/46-3/production-docker-bootstrap.md`
- `_bmad-output/implementation-artifacts/evidence/46-3/production-docker-bootstrap-review.md`
- `deploy/lib/production-compose-config-placeholders.sh`
- `deploy/production-compose-config-placeholders.test.sh`
- `_bmad-output/implementation-artifacts/investigations/story-46-3-docker-bootstrap-compose-config.md`
- `_bmad-output/implementation-artifacts/evidence/46-3/production-compose-config-placeholders-review.md`
