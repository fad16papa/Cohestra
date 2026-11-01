# Gated UAT promotion (TDD → scan + retest → UAT)

Ordinary GitHub Actions only. ADCP stays retired. This document is the fail-safe
activation procedure for the pre-UAT eligibility gate. **Do not activate** the
live gate from this pull request. **Do not deploy.** **Do not touch Production.**

## Binding contract

UAT SSH happens only when every required check is SUCCESS on the **exact
candidate SHA that SSH deploys**. Native GitGuardian on `${candidate}^2` is
additional two-parent provenance. It is not a scan of a different merge commit.
The GitGuardian proof for the deploy SHA is the push-main
`GitGuardian exact-SHA API scan` Actions job (ggshield, scan-only key). The
Exact-SHA pattern scan remains required defense-in-depth.

1. Development TDD loop produces a new candidate SHA after every code fix.
2. Candidate verification reruns the full CI suite, the Exact-SHA security scan
   job, and the GitGuardian exact-SHA API scan on that SHA (five Actions jobs +
   Exact-SHA pattern scan + GitGuardian API scan on `candidate_sha`; two-parent
   merges also require native GitGuardian SUCCESS on `${candidate}^2`).
3. Pre-UAT eligibility: `failure`, `cancelled`, `timed_out`, `neutral`,
   `skipped`, `action_required`, `pending`, missing, stale, wrong branch, wrong
   app, or ambiguous duplicates → `HOLD`, zero SSH.
4. `workflow_dispatch` uses the same gate. It is not an OR-bypass.
5. A candidate that is not the current `origin/main` tip is stale and is held.
6. A successful or in-progress Deploy UAT run for the same SHA is a duplicate
   and is held. A prior failed deploy may be retried.
7. Required post-deploy checks are host acceptance, public smoke, and
   Playwright. Story 19.5 lifecycle is opt-in: an authorized
   `SKIPPED (lifecycle_disabled|story_closed)` is not a required pass.
   Missing or unauthorized lifecycle evidence HOLDs. A required-check
   failure is `DEPLOYED_REJECTED`/`HOLD`, not “no deploy occurred.”

The suppressor `vars.UAT_DEPLOY_GATE_ACTIVE` must equal the exact string `true`
or the gate HOLDs. Unset, `false`, `TRUE`, and `1` are HOLD.

## Automatic commissioning vs live HOLD

CI on every PR and on `main` runs `deploy/commission-uat-hold.sh` through
`deploy/commission-uat-hold.test.sh`, then persists and uploads a separately
named **`uat-ci-contract-commissioning`** artifact. That path executes the
**real** predeploy gate with `UAT_DEPLOY_GATE_ACTIVE=false`, plus a static
proof that the Deploy UAT SSH job cannot run unless `eligible == true`.
Evidence class is **`CI_CONTRACT`**. `LIVE_DEPLOY_UAT_HOLD=false`. Do **not**
treat this artifact as a successful live Deploy UAT HOLD run.

Predeploy status is phase `predeploy` with `deployment_phase=NOT_STARTED`.
A later `uat-final-outcome.json` aggregates SSH-step conclusion, deployed
SHA, host acceptance, smoke, Playwright, and lifecycle. Pre-SSH
`result=dispatched` is attempt/intent only. `uat_deployed=true` requires
a proven host accepted SHA. Failed or interrupted SSH is
`ATTEMPTED`/`UNKNOWN` (`uat_deployed=null`). A confirmed deploy plus later
required-check failure is `DEPLOYED_REJECTED`, never “no deployment occurred.”
Host acceptance, public smoke, and Playwright must pass. Playwright
`stats.expected` / `stats.unexpected` must be present nonnegative integers;
absent, zero-expected, non-integer, boolean, negative, or unparseable
stats are `INCOMPLETE`/`HOLD`, never `DEPLOYED_ACCEPTED`. A host-proven
deploy keeps `uat_deployed=true` when browser evidence is malformed.
Story 19.5 lifecycle is opt-in: `result=skip` with
`reason=lifecycle_disabled` or `story_closed` is `SKIPPED`, not a
required pass. Missing or unauthorized skip evidence HOLDs.

Aggregator process exit is not release eligibility. A pre-SSH `HELD`
gate may exit 0 so `uat-final-outcome.json` can be uploaded with
`result=HOLD` / `uat_deployment_outcome=HELD`. SSH stays gated on
`needs.predeploy-gate.outputs.eligible == 'true'`; the deploy job is
skipped on HOLD regardless of the aggregator exit code.

A live Deploy UAT HOLD still requires one owner-authorized
`workflow_dispatch` on `main` **or** the next `workflow_run` after Deploy UAT
is enabled, while the variable remains `false`. This agent cannot enable,
disable, or dispatch that workflow (`actions=write` is owner-only).

Structured, nonsecret `uat-delivery-status.json` records the exact SHA,
failed stage, security-gate result, diagnostics, Actions run link when
present, and `uat_deployed=false`. Authorized Cursor agents may investigate
and prepare fixes on a development branch only. They must not autonomously
merge, change release controls, or retry indefinitely.

## FIRST-MERGE HAZARD

Current `main` still has the legacy Deploy UAT workflow: it triggers on
`workflow_run(CI completed)` and treats `workflow_dispatch` **or**
`CI conclusion == success` as enough to SSH. GitGuardian is a separate
check-run and is not required today.

Merging this workflow change onto `main` can still let **in-flight** legacy
Deploy UAT runs SSH, and a `workflow_run` event processed against a cached
legacy workflow file can deploy without GitGuardian. The merge commit’s own
CI success would also start Deploy UAT.

`UAT_DEPLOY_GATE_ACTIVE` is intentionally **unset**. After this file is on
`main`, every new gate evaluation HOLDs until the owner activates it.

## Safe activation procedure (owner only — do not perform here)

Do not execute these steps from this PR, a cloud agent, or a CI job.

1. **Disable Deploy UAT** in GitHub Actions (the workflow named `Deploy UAT`).
   Do not delete the workflow file. Do not change Production.
2. **Drain** queued and in-progress Deploy UAT runs. Record run IDs. Wait until
   none remain. Also wait out any in-progress `CI` runs on `main` so they cannot
   enqueue a legacy deploy after re-enable.
3. **Merge** this pull request (owner-authorized, provenance-preserving
   strategy as required for the source PR). Confirm `main` HEAD contains
   `predeploy-gate` and `validate-uat-predeploy-gate.sh`.
4. Confirm `vars.UAT_DEPLOY_GATE_ACTIVE` is still unset.
5. **Re-enable** Deploy UAT.
6. **Observe one HOLD** artifact (`uat-predeploy-gate-evidence`) on the next
   `main` CI completion or a non-bypass `workflow_dispatch`. The artifact must
   record `RESULT=HOLD` and name `UAT_DEPLOY_GATE_ACTIVE`. Zero SSH.
   CI `CI_CONTRACT` commissioning is automatic and is not this live run.
7. Confirm **GitGuardian on the exact main SHA** via the
   `GitGuardian exact-SHA API scan` Actions job SUCCESS on the merged `main`
   commit itself (`event=push`, `head_branch=main`, `head_sha=candidate`).
   Native GitGuardian on `${sha}^2` is not a scan of the merge commit. Also
   confirm the `Exact-SHA security scan` Actions job SUCCESS on that commit.
   Confirm repository secret `GITGUARDIAN_API_KEY` is provisioned with
   **scan-only** scope and is not available to `pull_request` jobs. Do not
   activate if either exact-SHA scan is missing, skipped, or unverified.
8. Only after a written owner approval, set the **repository** variable
   `UAT_DEPLOY_GATE_ACTIVE=true`. Environment `uat` alone is not sufficient:
   the predeploy job has no Environment and must not receive UAT secrets.
9. Subsequent `main` CI completions may SSH only when every required check on
   that exact SHA is SUCCESS.

Rollback: unset or delete `UAT_DEPLOY_GATE_ACTIVE` (immediate HOLD) and/or
disable Deploy UAT again. Do not “fix” a failed check by rerunning identical
failing code; produce a new SHA and retest.

## Owner gates not performed here

- Provision `GITGUARDIAN_API_KEY` (scan-only) as a **repository** secret.
  Do not put it on Environment `uat` or `production`. Do not put it on
  pull_request jobs. Live main-push scan behavior is an owner observation
  after first merge, not an assumption of this PR.
- Do not assume the GitGuardian native GitHub App publishes a verified
  success check on a `push` to `main`. Historical `main` merge SHAs have no
  such check-run.

## What this PR does not do

- Does not merge itself.
- Does not set `UAT_DEPLOY_GATE_ACTIVE`.
- Does not provision or rotate `GITGUARDIAN_API_KEY`.
- Does not disable or enable live workflows.
- Does not SSH, deploy, or change UAT host state.
- Does not modify `.github/workflows/deploy-production.yml` or Production
  Environment settings.
- Does not restore ADCP.

## Tests

- `deploy/validate-uat-predeploy-gate.test.sh` — positive all-green case and
  negative fixtures for every gate (neutral, skipped, absent, duplicate,
  wrong SHA, wrong app, stale, dispatch, older queued run, API error,
  missing/skipped/failed GitGuardian exact-SHA API scan, wrong event/branch).
- `deploy/exact-sha-gitguardian-api-scan.test.sh` — missing API key, invalid
  auth/quota/network, findings, and push-main-only CI job.
- `deploy/validate-uat-gate-activation.test.sh` — first-merge suppressor and
  ordered activation procedure.
- `deploy/commission-uat-hold.test.sh` — automatic `CI_CONTRACT` HOLD for
  `UAT_DEPLOY_GATE_ACTIVE=false` plus YAML proof that SSH cannot run.
- `deploy/uat-delivery-status.test.sh` — structured nonsecret predeploy report.
- `deploy/uat-final-outcome.test.sh` — missing, inconsistent, incomplete,
  pre-SSH dispatch, failed SSH, and failed postdeploy evidence fail closed;
  only a proven host SHA may set `uat_deployed=true`; authorized lifecycle
  skip is optional; missing, malformed, or unauthorized skip HOLDs;
  malformed Playwright stats HOLD as `INCOMPLETE`; pre-SSH `HELD` may
  exit 0 because eligibility is JSON + `eligible`, not aggregator rc.
- `deploy/record-uat-ssh-execution.test.sh` — post-SSH step conclusion is
  recorded without claiming host mutation.
