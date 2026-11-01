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
**Mitigation:** SSH requires the AD-14 conjunction (gate true AND suppressed true AND source `release/uat` AND tip-pin AND post-merge). Evaluated inline on the default-branch workflow before candidate scripts. N14–N16. Gate stays false until drain evidence exists.

### T13 — Unprotected `release/uat` as a secret well

**Vector:** Branch created without protection; Environment `uat` still has no branch policy (audited FAIL). Anyone pushes a workflow with `environment: uat`.
**Severity:** BLOCKER if the branch is created before Environment restriction.
**Mitigation:** Owner creates the branch as protected and sets Environment policy `release/uat` only **before** any job with `environment: uat` can run with the gate true. Gate remains false during prep.

### T14 — Branch-modified privileged workflow

**Vector:** Feature PR edits `deploy.yml` to skip the gate. If Actions used the PR copy with Environment secrets, SSH would bypass AD-2.
**Severity:** BLOCKER if executed.
**Mitigation:** AD-20. `workflow_run` uses the default-branch workflow. No `pull_request_target`. Contract test: PR CI must not contain `secrets.DROPLET_`.

### T15 — Correction controller self-merge

**Vector:** #536 token also has merge rights; a failed review becomes a merge.
**Severity:** BLOCKER if combined.
**Mitigation:** AD-15. Separate App. Negative test: #536 token cannot merge.

### T16 — Auto-merge of control-plane paths

**Vector:** Manifest lists `deploy/**` or an agent rewrites the manifest in the PR.
**Severity:** MAJOR.
**Mitigation:** AD-16. Manifest is owner-approved and stored outside the PR head (repository variable, gist-less: a signed issue comment by OWNER on a control issue, or a file on `main` only). PR-head `TASK.md` is evidence, not the authorization copy. Path check uses the merge-tree, not the author list.

### T17 — Stale `workflow_run` replay

**Vector:** After retarget, GitHub delivers a delayed `workflow_run` for an old `main` CI run.
**Severity:** MAJOR.
**Mitigation:** Predeploy refuses `workflow_run.head_branch == main` when suppressed. Candidate must equal `origin/release/uat` tip after cutover.

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
**Mitigation:** Isolation contract already forbids `PROD_*` in `deploy.yml`. Keep it. Production actor permissions must not broaden.

## Parent residuals still open

T1 Environment `uat` unrestricted, T3 no review Apps, T5 no post-merge gate, T7 HOLD artifact errors, T10 #536 absent. Option B does not mark them PASS.

## Required negatives (add to parent N1–N13)

| ID | Case | Expected |
| --- | --- | --- |
| N14 | Gate true, `UAT_MAIN_DEPLOY_SUPPRESSED` false, trigger `main` | HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE`; no SSH |
| N15 | `UAT_MAIN_DEPLOY_SUPPRESSED` true, delayed `main` workflow_run | HOLD `UAT_MAIN_DEPLOY_SUPPRESSED is true` |
| N16 | Queued Deploy UAT during drain | Completes `eligible=false`; no SSH |
| N17 | Candidate is `main` tip after cutover | HOLD |
| N18 | PR-modified deploy.yml in pull_request | No `DROPLET_*`; no `environment: uat` |
| N19 | #536 token merge attempt | Denied |
| N20 | Auto-merge of `.github/workflows/**` | Denied |
| N21 | Forged review / one App two roles | HOLD (parent T3/T4) |
| N22 | Post-merge job skipped | HOLD |
| N23 | `release/uat` → `main` automation | No PR opened |
| N24 | Production dispatch from `release/uat` | REFUSE |

N1 (gate false) remains VERIFIED by run #451. N14–N24 are `NOT_RUN` until Draft PR-G.

## Verdict

**Architecture is acceptable as a target** after the AD-14 conjunction, inline default-branch HOLDs, event-ref (not SHA) refusal, and AD-15/AD-16/AD-20 splits. **Not authorized to cut over.** Creating an unprotected `release/uat` or enabling the gate in PHASE_MAIN_LISTEN is a BLOCKER.
