---
name: CAT-SEC threat model — Option B release/uat
type: threat-model
status: draft
created: 2026-11-02
method: independent CAT-SEC
authority: https://github.com/fad16papa/Cohestra/issues/538
parent_audit: ../architecture-uat-automation-readiness-2026-11-01/CAT-SEC-THREAT-MODEL.md
---

# CAT-SEC — Option B

This review does not retract the 2026-11-01 catalog (T1–T11). Those residuals still stand on `main`. This file adds threats created by moving the UAT source to `release/uat` and by adding auto-merge.

## New trust boundary

```text
Untrusted                 Semi-trusted                    Trusted
---------                 ------------                    -------
Feature PR head           GITHUB_TOKEN on PR CI           origin/release/uat
PR-modified workflows     merge_group snapshot            origin/main
#536 Cursor workspace     cohestra-uat-merge token        Environment production
Forged review comments    post-merge jobs (no secrets)    vars (owner)
Queued Deploy UAT on main Environment uat (if eligible)   UAT_DEPLOY_GATE_ACTIVE
```

## Option B threats

### T12 — First-merge / dual-trigger deploy

**Vector:** `deploy.yml` listens to both `main` and `release/uat`, or the owner sets `UAT_DEPLOY_GATE_ACTIVE=true` before `main` is suppressed. A queued `workflow_run` from `main` CI then becomes eligible.
**Severity:** BLOCKER if cutover is unordered.
**Mitigation:** After PR-D, Deploy UAT has no `workflow_run` (N25). SSH requires the AD-14 conjunction. Residual `workflow_run` is a PR-D FAIL, not a licensed residual. N14–N16, N25.

### T13 — Unprotected `release/uat` as a secret well

**Vector:** Branch created without protection; Environment `uat` still has no branch policy (audited FAIL). Anyone pushes a workflow with `environment: uat`.
**Severity:** BLOCKER if the branch is created before Environment restriction.
**Mitigation:** Owner creates the branch as protected and sets Environment policy `release/uat` only **before** any job with `environment: uat` can run with the gate true. Gate remains false during prep.

### T14 — Branch-modified privileged workflow

**Vector:** Feature PR edits `deploy.yml` to skip the gate. If Actions used the PR copy with Environment secrets, SSH would bypass AD-2.
**Severity:** BLOCKER if executed.
**Mitigation:** AD-20. After PR-D, Deploy UAT YAML is the protected `release/uat` tip; AD-16 forbids auto-merge of `.github/workflows/**`. Do not keep a leftover `workflow_run` “for YAML safety” (N25). No `pull_request_target`. Contract test: PR CI must not contain `secrets.DROPLET_`.

### T15 — Correction controller self-merge

**Vector:** #536 token also has merge rights; a failed review becomes a merge.
**Severity:** BLOCKER if combined.
**Mitigation:** AD-15. Separate App. Negative test: #536 token cannot merge.

### T16 — Auto-merge of control-plane paths

**Vector:** Manifest lists `deploy/**` or an agent rewrites the manifest in the PR.
**Severity:** MAJOR.
**Mitigation:** AD-16. Manifest is the owner-merged file on `main` at `deploy/uat-task-manifests/<task_id>.json`. PR-head `TASK.md` is evidence, not the authorization copy. Path check uses the merge-tree, not the author list.

### T17 — Stale `workflow_run` replay

**Vector:** After retarget, GitHub delivers a delayed `workflow_run` for an old `main` CI run.
**Severity:** MAJOR if `workflow_run` remains.
**Mitigation:** PR-D deletes the `workflow_run` trigger from `main` and `release/uat`. A leftover listener is N25 contract FAIL of PR-D, not a licensed residual.

### T21 — Environment identity mismatch

**Vector:** `workflow_run` Deploy UAT with Environment `uat` restricted to `release/uat`. Documented `GITHUB_REF` is the default branch. Checkout and `head_branch` do not change it.
**Severity:** BLOCKER for the c6ec3370 trigger design.
**Mitigation:** AD-22/AD-23. Simulator `SIMULATE=PASS`. Live canary UNVERIFIED.

### T22 — Post-merge completion race

**Vector:** CI `workflow_run` starts Deploy UAT while AD-17 jobs are still pending. Predeploy HOLDs. No later event retries. A green `release/uat` never deploys.
**Severity:** BLOCKER for a CI-triggered listener.
**Mitigation:** AD-23 same-run `needs` (`predeploy` waits for every AD-17 job). Exclusive AD-24 still re-runs those jobs in Deploy UAT (`needs`); the App is only the automatic start, after every named AD-17 job `conclusion==success` (not workflow `conclusion`, not Actions `success()`). UI / PAT dispatch is not a skip-tests path.

### T18 — Artifact substitution / wrong tree

**Vector:** Deploy checks out a SHA that passed tests but the host builds a different tree.
**Severity:** MAJOR.
**Mitigation:** AD-7 + AD-17 provenance `{release_sha, git_tree, compose_config_hash}`. Mismatch REFUSE.

### T19 — Silent promotion to `main`

**Vector:** Auto-merge bot opens `release/uat` → `main` after UAT PASS.
**Severity:** BLOCKER if implemented.
**Mitigation:** AD-13, AD-19. No automation opens that PR. State stays `AWAIT_BUSINESS_RELEASE`.

### T20 — Production via the new line

**Vector:** `release/uat` workflow reuses `PROD_DROPLET_*` or Production environment.
**Severity:** BLOCKER if implemented.
**Mitigation:** Isolation contract already forbids `PROD_*` in `deploy.yml`. Keep it. Production actor permissions must not broaden. AD-24 App may dispatch only `deploy.yml` (N33).

## Parent residuals still open

T1 Environment `uat` unrestricted, T3 no review Apps, T5 no post-merge gate, T7 HOLD artifact errors, T10 #536 absent. Option B does not mark them PASS.

## Required negatives (add to parent N1–N13)

| ID | Case | Expected |
| --- | --- | --- |
| N14 | Gate true, `UAT_MAIN_DEPLOY_SUPPRESSED` false, `github.ref==refs/heads/main` | HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE`; no SSH |
| N15 | PHASE_SUPPRESS only: delayed `main` `workflow_run` while suppressed | HOLD `UAT_MAIN_DEPLOY_SUPPRESSED is true`. After PR-D this event must not exist (N25). |
| N16 | Queued Deploy UAT during drain | Completes `eligible=false`; no SSH |
| N17 | `github.ref==refs/heads/main` after cutover | HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE` (ref, not SHA) |
| N25 | `workflow_run` listener after PR-D on `main` or `release/uat` | Contract FAIL of PR-D |
| N26 | Required job SKIPPED in the deploy run | SSH skipped |
| N27 | CI completes; post-merge still pending (old design) | Must not start SSH; AD-23 same-run `needs` avoids stuck HOLD |
| N28 | `workflow_call` on Deploy UAT after PR-D | Contract FAIL (caller `GITHUB_REF` can match Environment `uat`) |
| N29 | AD-23 and AD-24 both implemented | Contract FAIL |
| N30 | AD-23 `GITHUB_EVENT_NAME=push` after PR-D | Eligible event (must not HOLD wrong-trigger) |
| N31 | AD-24 App dispatch after workflow `conclusion==success` with a SKIPPED required job | Must not dispatch; if Deploy UAT is still started, in-run SKIPPED skips SSH |
| N32 | AD-24 human / PAT `workflow_dispatch --ref release/uat` with no prior post-merge | In-run AD-17 `needs` still run; SSH only after those jobs SUCCESS + AD-14 |
| N33 | AD-24 App dispatches `deploy-production.yml` | Denied by App contract; Production Environment still require-main + reviewer |
| N18 | PR-modified deploy.yml in pull_request | No `DROPLET_*`; no `environment: uat` |
| N19 | #536 token merge attempt | Denied |
| N20 | Auto-merge of `.github/workflows/**` | Denied |
| N21 | Forged review / one App two roles | HOLD (parent T3/T4) |
| N22 | Post-merge job skipped | HOLD |
| N23 | `release/uat` → `main` automation | No PR opened |
| N24 | Production dispatch from `release/uat` | REFUSE |

N1 (gate false) remains VERIFIED by run #451. N14–N33 are `NOT_RUN` until Draft PR-G.

## Verdict

**Architecture is acceptable as a target** after AD-22/AD-23 close the Environment-ref conflict and the post-merge race. **Not authorized to cut over.** `workflow_run` + Environment `uat`=`release/uat` is a documented deny. Live canary UNVERIFIED.
