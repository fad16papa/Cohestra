---
id: 46.3
key: 46-3-github-production-environment-and-owner-gated-ci-cd
title: GitHub Production Environment and owner-gated CI/CD
status: ready-for-dev
epic: 46
created: 2026-10-21
baseline_commit: 5d52d6e3dc99bce01545eda6eb10f378d469c374
depends_on:
  - 46.1
  - 46.2
owner_gate: production_environment_protections
owner_gate_status: NOT_STARTED
implementation_authorized: false
cutover_authorization: GRANTED
production_release_readiness: NOT_YET_COMPLETE
production: NO-GO
---

# Story 46.3: GitHub Production Environment and owner-gated CI/CD

Status: ready-for-dev

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

3. **SHA provenance is fail-closed**
   **Given** a requested `deploy_sha`
   **When** validation runs
   **Then** it is exactly 40 hexadecimal characters
   **And** it exists and is an ancestor of `origin/main`
   **And** required CI jobs succeeded on that exact SHA
   **And** the environment job redeploys only that same SHA
   **And** `REVIEWED SHA = CI SHA = DEPLOY TARGET SHA = RUNTIME SHA` is proven in 46.3
   **And** AD-7 `ACCEPTANCE SHA` remains in the chain and is proven later (46.13/46.14 smoke); 46.3 must not redefine AD-7 as four-way
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
   **Then** SSH connects only to literal inventory IPv4 `159.223.55.242`
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
| `production_environment_protections` | Owner in GitHub Settings | Before first live Environment deployment | Unprotected `production` environment |
| `production_secrets` | Owner populates Environment `production` secrets | Before first live SSH | Missing `PROD_*` (fail-closed names only) |
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
  actions: read          # inspect CI on the pinned SHA
```

Jobs:

1. **`validate-sha`** — no `environment`, no SSH, no host mutation. Refuse unless:
   - `inputs.restore_dump` is empty
   - `deploy_sha =~ ^[0-9a-fA-F]{40}$` (normalize to lowercase only after the match)
   - `git cat-file -t $SHA` is `commit` (refuse tags/trees/blobs)
   - checkout uses `fetch-depth: 0` (or fetches the SHA + `origin/main`)
   - `git merge-base --is-ancestor $SHA origin/main`
   - GitHub API/HTTP failures and empty payloads are `REFUSE`
   - required CI lookup algorithm (fail closed if any step misses):
     1. Query workflow file `.github/workflows/ci.yml` (name `CI`) runs with `head_sha == deploy_sha` and `event` in `push` or `workflow_dispatch` (PR CI on a different ref is not sufficient)
     2. Select the newest run by `created_at`
     3. That run `conclusion` must be `success` (not `skipped`, `cancelled`, or empty)
     4. Named jobs must exist and succeed: `.NET build and test`, `API integration tests`, `Next.js build`, `UAT isolation contract`, `Docker stack smoke`
     5. Refuse if a newer CI run on the same SHA failed
     6. Refuse if the only green run is for a different SHA, `main` tip, or a pull_request event
   - output `validated_sha`

2. **`deploy` or `rollback`** — `needs: validate-sha`, `environment: production`
   - refuse unless `validate-sha` succeeded in **this** `run_id` (no partial job re-run)
   - refuse if `inputs.deploy_sha != validated_sha`
   - **re-run** SHA format, commit-object, `origin/main` ancestry, and CI algorithm immediately before SSH (covers approval-wait races)
   - checkout this job's helpers at `ref: ${{ needs.validate-sha.outputs.validated_sha }}` with `persist-credentials: false`
   - fail-closed secret names; Environment-scoped `PROD_*` only (no repo/org `PROD_*`)
   - `vars.PROD_COMPOSE_PROJECT` must equal `cohestra-production`
   - host/path allowlist; appleboy `host:` is the literal IPv4
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
| Optional later smoke | `PROD_SMOKE_*` only (do not invent in 46.3 unless a contract test needs the name) |
| App secrets | Host `.env` in 46.4 — not GitHub unless Actions must use them |
| Reviewers | Owner required |
| Branches | `main` only |

Deploy key is a **new** Production Actions key, not `cohestra-uat-gha` and not the owner workstation key.

## SHA provenance design

AD-7 invariant (do not shorten): `REVIEWED = CI = DEPLOY TARGET = RUNTIME = ACCEPTANCE`.
46.3 proves REVIEWED/CI/DEPLOY TARGET and control-plane RUNTIME (`GIT_SHA` export). ACCEPTANCE SHA is proven by 46.13/46.14 smoke, not by this story.

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
- Do not call UAT `remote-deploy.sh`

## Deployment sequence (implementation contract — not executed in planning)

1. Validate requested SHA (40 hex)
2. Verify SHA is accepted `main` history
3. Verify required CI passed on that exact SHA (latest run)
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

- [ ] Task 1: Owner-gated workflow + concurrency (AC 1, 2)
  - [ ] Add `deploy-production.yml` with `workflow_dispatch` only
   - [ ] Required `deploy_sha` / `action` inputs; no default SHA
   - [ ] Forbid every trigger except `workflow_dispatch` (`push`, `workflow_run`, `workflow_call`, `repository_dispatch`, `schedule`, `release`, `deployment`)
   - [ ] `concurrency` is workflow-wide `deploy-production` with `cancel-in-progress: false`
   - [ ] Split `validate-sha` (no environment, no SSH) and `deploy`/`rollback` (`environment: production`)
   - [ ] Checkout helpers at `ref: validated_sha` with `persist-credentials: false`
   - [ ] Pin checkout + appleboy actions to the same reviewed SHAs as UAT; `command_timeout: 60m`; no `debug: true`
- [ ] Task 2: SHA + CI provenance (AC 3)
  - [ ] `reset-production-sha.sh` refuses empty/`HEAD`/`latest`/`github.sha`
  - [ ] Ancestor of `origin/main` required
  - [ ] Latest CI on exact SHA must be green for the five required jobs
  - [ ] Environment job refuses SHA substitution
- [ ] Task 3: Secrets, host, path (AC 4, 5)
  - [ ] `fail-closed-production-secrets.sh` + tests
  - [ ] Inventory IPv4 allowlist; UAT IPv4/DNS denylist
  - [ ] Safe deploy path; default `/home/deploy/cohestra-production`
- [ ] Task 4: Rollback (AC 6)
  - [ ] `production-rollback.sh` + tests
  - [ ] `--restore-dump` fail-closed `NOT_IMPLEMENTED_46_5`
- [ ] Task 5: Flip 46.1/46.2 forbids; keep UAT frozen (AC 7)
  - [ ] Update compose/host validators
  - [ ] Add `validate-deploy-production-workflow.sh` to CI
  - [ ] Prove `deploy.yml` / UAT compose behavior unchanged
- [ ] Task 6: Docs + sanitized evidence (AC 2, 8)
  - [ ] Owner Environment checklist (no secret values)
  - [ ] Evidence templates: SHAs, missing-secret names, host-allowlist result
  - [ ] No live compose-up, DNS, Paddle, or UAT mutation
- [ ] Task 7: Exact-HEAD Grok 4.6 review PASS (BLOCKER=0, MAJOR=0)
  - [ ] Repeat Mandatory Code Review Loop on the final implementation HEAD

## Test strategy

Deterministic contract tests (preferred; no live droplet required):

| Test | Proves |
| --- | --- |
| `validate-deploy-production-workflow.sh` | only `workflow_dispatch`; no `workflow_call`/`push`/`workflow_run`; concurrency; `environment: production` on mutating jobs; no `github.sha` deploy; action pins; appleboy `debug` absent |
| `fail-closed-production-secrets.test.sh` | missing/whitespace secrets print `MISSING_SECRET=<NAME>` only |
| `reset-production-sha.test.sh` | refuse empty/`HEAD`/`latest`/short/non-ancestor; accept 40-hex ancestor |
| `validate-production-target.test.sh` | allow only 159.223.55.242; refuse 129.212.235.2, IPv6, UAT hosts, `/home/deploy/cohestra`, `..` paths |
| `production-rollback.test.sh` | explicit SHA; refuse unknown; refuse `--restore-dump`; no DB commands |
| existing `validate-deploy-uat-workflow.sh` | UAT path still forbids Production concurrency/environment |
| existing `validate-production-compose.sh` / `validate-production-host.sh` | updated to require the new workflow without weakening UAT checks |
| existing `reset-accepted-sha.test.sh` | UAT helper unchanged (empty→main tip remains UAT-only) |

CI: add the new scripts to `.github/workflows/ci.yml` job `UAT isolation contract`.

Do not require a live Production deploy to mark 46.3 done. If owner later populates secrets, a connectivity probe may run but must not `compose up`.

## CI/CD validation strategy

- Local: run the new contract tests + existing UAT/production compose/host validators.
- PR CI: all current CI jobs plus the new contract steps.
- Post-merge: confirm UAT `Deploy UAT` still auto-starts from CI on `main` and Production workflow does not.
- Never use CI success as Production GO.

## Evidence expectations

Allowed: SHAs, workflow run ids, job names, `MISSING_SECRET=<NAME>`, `shared_host_uat=false`, inventory IPv4, boolean present/absent, result=`PASS|FAIL`.

Forbidden: secret values, private keys, `.env` dumps, SSH transcripts with commands that echo secrets, screenshots of GitHub secret values.

## Security threat review (Grok 4.6)

Every item is resolved in this planning artifact. Implementation must keep the control.

| Threat | Severity if unmitigated | Planned control |
| --- | --- | --- |
| Arbitrary SHA deploy | BLOCKER | 40-hex only; object exists; ancestor of `origin/main`; CI green on exact SHA |
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

No unresolved BLOCKER or MAJOR remains in this plan. Deferred MINOR: live EF migration detector (step 11) waits until 46.4 compose-up exists.

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

Cursor Grok 4.6 (planning / story-prep only)

### Debug Log References

- PR #484 merged at `5d52d6e3dc99bce01545eda6eb10f378d469c374` (reviewed HEAD `c5acc081`)
- Story baseline is fresh `origin/main` after #484
- Implementation not started

### Completion Notes List

- Planning artifact only. No `deploy-production.yml`, rollback script, or runtime deploy code in this pass.

### File List

- `_bmad-output/implementation-artifacts/46-3-github-production-environment-and-owner-gated-ci-cd.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/46-2-dedicated-production-host-and-network-hardening.md` (status bookkeeping only)
- `docs/deploy/production-launch-program.md`
