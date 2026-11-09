# GitHub Environment identity vs Option B triggers

**Date:** 2026-11-02, Asia/Singapore  
**Exact HEAD reviewed:** `c6ec3370b763a913b3703e8e315c79a9b39e1bf7`  
**Live canary:** not run (unauthorized). Marked UNVERIFIED.

## Documented facts (not inferred)

| Trigger | `GITHUB_REF` | `GITHUB_SHA` | Source |
| --- | --- | --- | --- |
| `workflow_run` | **Default branch** (`main` here) | Last commit on default branch | [Events that trigger workflows — `workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run) |
| `push` | Updated ref | Tip commit pushed to the ref | [same page — `push`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push) |
| `workflow_dispatch` | Branch or tag that received the dispatch | Last commit on that ref | [same page — `workflow_dispatch`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch) |
| `repository_dispatch` | **Default branch** | Last commit on default branch | [same page — `repository_dispatch`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch) |
| `workflow_call` | **Same as the caller workflow** | Same as the caller | [same page — `workflow_call`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_call) |

Environment “Selected branches and tags” is matched against **`GITHUB_REF` of the workflow run**, not against a checkout, and not against `workflow_run.head_branch`.

Source: [Deployments and environments — Deployment branches and tags](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments): “The deployment branch or tag rule is matched against the `GITHUB_REF` of the workflow run.”

Changelog 2021-02-17: “Actions will check the value of `github.ref` against the configuration.”

`workflow_run` also: the listener workflow file must exist on the **default branch**; the listener run is able to access secrets even if the triggering workflow was not.

## What does not change `GITHUB_REF`

- `actions/checkout` of `release/uat` or of `workflow_run.head_sha`
- Reading `github.event.workflow_run.head_branch`
- Setting `ORIGIN_UAT_REF` in a script
- Job `if:` filters

Those can change the git worktree. They do not change the Environment deployment ref.

## Conflict with the c6ec3370 design

c6ec3370 AD-13 / conventions said: after cutover, Deploy UAT is `workflow_run` of CI on `release/uat`, and Environment `uat` allows only `release/uat` (AD-18).

Documented result:

1. CI runs on `release/uat` (`GITHUB_REF=refs/heads/release/uat`).
2. That completion starts Deploy UAT via `workflow_run`.
3. Deploy UAT `GITHUB_REF` is **`refs/heads/main`** (default branch).
4. Environment policy `release/uat` **does not match** `refs/heads/main`.
5. The `environment: uat` job is rejected by GitHub **before** AD-14 scripts run. No `DROPLET_*`.

If the owner instead leaves Environment `uat` unrestricted so `workflow_run` can proceed, T1 (open credential well) remains. Option B cannot have both “`workflow_run` listener” and “Environment restricted to `release/uat`”.

**UNVERIFIED live:** this repo has not run a canary `workflow_run` + Environment `release/uat` policy. The table above is official documentation. Simulator: `simulate-github-refs.py`.

## Alternatives compared

| Model | Environment `uat` = `release/uat` | Untrusted YAML | Completion race | Extra credential |
| --- | --- | --- | --- | --- |
| A. `workflow_run` of CI or post-merge | FAIL (ref=`main`) | Listener YAML from **default branch** (good) | If listener is CI: post-merge may still be running → HOLD with no retry | None |
| B. `repository_dispatch` | FAIL (ref=`main`) | Listener YAML from default branch | Depends on who dispatches | Dispatch token |
| C. Protected `push` to `release/uat`, tests `needs` deploy | PASS (ref=`release/uat`) | YAML from **protected** `release/uat` tip (control-plane, no auto-merge) | None — same run `needs` | None |
| D. Post-merge `push` then App `workflow_dispatch --ref release/uat` | PASS (ref=dispatched branch) | Deploy YAML from `release/uat`; dispatch YAML from `release/uat`. File must exist on default (`main`) | Dispatch only after every named job `conclusion==success` (not workflow `success()`) | App with `actions: write`, no Environment secrets. `GITHUB_TOKEN` cannot dispatch another workflow |
| E. `workflow_call` from `ci.yml` on `release/uat` | PASS (inherits caller ref) — **forbidden** | Called YAML from caller ref | CI-complete start; AD-17 may be absent → stuck HOLD | None |

## Adopted design

**Primary (AD-23):** Model C. After PR-D, Deploy UAT is `on.push.branches: [release/uat]` plus owner `workflow_dispatch` on that same ref. Mandatory post-merge jobs live in that workflow and the `environment: uat` job `needs` them. `workflow_run` is removed from Deploy UAT at PR-D.

**Exclusive alternative (AD-24), not both:** Model D if the owner refuses a *push-triggered* combined file. Deploy UAT still **re-runs** AD-17 jobs with in-run `needs` so UI / PAT dispatch cannot skip tests. `post-merge-uat.yml` is the automatic start only. Dispatch App is not #535, #536, or `cohestra-uat-merge`, may call only `deploy.yml`, and must not dispatch Production. `GITHUB_TOKEN` must not be able to start Deploy UAT.

**Rejected after cutover:** Model A and B.

Until PR-D, PHASE_MAIN_LISTEN keeps today’s `workflow_run` on `main`. Environment `uat` is still unrestricted (audit FAIL). AD-18 still requires the owner to set the Environment policy **before PHASE_ARMED**. After PR-D a leftover `workflow_run` listener is a contract FAIL of PR-D (N25), not a licensed “safe deny.”

Model C is exclusive of Model D. Push + split-file without App dispatch is a stuck HOLD (T22) and is forbidden.

## Post-merge completion contract (AD-23)

Same workflow run:

```
push release/uat
  → required AD-17 jobs (no environment)
  → predeploy needs every AD-17 job (no environment; AD-14 conjunction)
  → deploy needs predeploy (environment: uat; if eligible)
```

| Event | Deploy job |
| --- | --- |
| All required jobs SUCCESS | Starts (gate still required) |
| Any required job FAILURE | Skipped / not eligible |
| Any required job CANCELLED | Skipped |
| Any required job SKIPPED | HOLD; not eligible |
| Duplicate `workflow_run` of CI | Does not start Deploy UAT after PR-D |
| Stale SHA / not tip | Predeploy HOLD |
| Newer commit pushed | New run for new SHA; old run tip-pin HOLDs |
| Retry | Re-run the same workflow on the same SHA |

No polling. No “wait for a later check-run”. No manual dispatch required for the happy path.

`ci.yml` on `release/uat` remains the pre-merge / extra push signal. It does **not** start Deploy UAT after PR-D.
