# Gated UAT promotion (TDD → scan + retest → UAT)

Ordinary GitHub Actions only. ADCP stays retired. This document is the fail-safe
activation procedure for the pre-UAT eligibility gate. **Do not activate** the
live gate from this pull request. **Do not deploy.** **Do not touch Production.**

## Binding contract

UAT SSH happens only when every required check, including GitGuardian Security
Checks, is `conclusion=success` on the exact candidate SHA (the candidate
itself for a single-parent commit; `${candidate}^2` for a two-parent merge,
which is the reviewed PR head GitGuardian actually scanned):

1. Development TDD loop produces a new candidate SHA after every code fix.
2. Candidate verification reruns the full CI suite and mandatory security scans
   on that SHA (five Actions jobs + GitGuardian).
3. Pre-UAT eligibility: `failure`, `cancelled`, `timed_out`, `neutral`,
   `skipped`, `action_required`, `pending`, missing, stale, wrong branch, wrong
   app, or ambiguous duplicates → `HOLD`, zero SSH.
4. `workflow_dispatch` uses the same gate. It is not an OR-bypass.
5. A candidate that is not the current `origin/main` tip is stale and is held.
6. A successful or in-progress Deploy UAT run for the same SHA is a duplicate
   and is held. A prior failed deploy may be retried.
7. Post-deploy public smoke, Playwright, lifecycle, and acceptance-summary stay
   on the existing path. A post-deploy failure is `UAT_REJECTED/HOLD`, not
   “no deploy occurred.”

The suppressor `vars.UAT_DEPLOY_GATE_ACTIVE` must equal the exact string `true`
or the gate HOLDs. Unset, `false`, `TRUE`, and `1` are HOLD.

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
7. Only after a written owner approval, set the **repository** variable
   `UAT_DEPLOY_GATE_ACTIVE=true`. Environment `uat` alone is not sufficient:
   the predeploy job has no Environment and must not receive UAT secrets.
8. Subsequent `main` CI completions may SSH only when every required check on
   that exact SHA is SUCCESS.

Rollback: unset or delete `UAT_DEPLOY_GATE_ACTIVE` (immediate HOLD) and/or
disable Deploy UAT again. Do not “fix” a failed check by rerunning identical
failing code; produce a new SHA and retest.

## What this PR does not do

- Does not merge itself.
- Does not set `UAT_DEPLOY_GATE_ACTIVE`.
- Does not disable or enable live workflows.
- Does not SSH, deploy, or change UAT host state.
- Does not modify `.github/workflows/deploy-production.yml` or Production
  Environment settings.
- Does not restore ADCP.

## Tests

- `deploy/validate-uat-predeploy-gate.test.sh` — positive all-green case and
  negative fixtures for every gate (neutral, skipped, absent, duplicate,
  wrong SHA, wrong app, stale, dispatch, older queued run, API error).
- `deploy/validate-uat-gate-activation.test.sh` — first-merge suppressor and
  ordered activation procedure.
