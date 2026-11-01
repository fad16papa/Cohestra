---
name: CAT-SEC threat model — UAT automation readiness
type: threat-model
status: draft
created: 2026-11-01
updated: 2026-11-01
method: independent CAT-SEC (identity, spoofing, privilege, supply chain, fail-closed)
scope: Deploy UAT, CI, Environments, PR #535 reporter, Issue #536 controller, Production isolation
evidence_cutoff: 2026-11-01 23:30 Asia/Singapore
---

# CAT-SEC Threat Model — UAT Automated Delivery

Independent of the BMAD spine. This review assumes a hostile PR author, a compromised comment, a forged check-run, and a curious GitHub App. It does not assume Production is in scope for activation.

## Trust boundaries

```text
Untrusted          Semi-trusted              Trusted root
---------          ------------              ------------
PR head code       GITHUB_TOKEN (job)        origin/main
PR comments        workflow YAML on branch   Environment production
PR labels          Environment uat           vars.UAT_DEPLOY_GATE_ACTIVE
cursor[bot]        Actions artifacts         Owner merge
Public check-run   appleboy SSH action       PROD_DROPLET_*
Issue text         Droplet .env              Owner-approved task manifest
```

Untrusted inputs must never become authorization. Semi-trusted jobs may read; they may write only after a trusted-root gate.

## Assets

| Asset | Impact if lost |
| --- | --- |
| `DROPLET_SSH_KEY` | Host mutation of shared UAT droplet |
| `PROD_DROPLET_*` | Production host mutation |
| `GITGUARDIAN_API_KEY` | Secret-scan bypass or quota abuse |
| UAT `.env` on droplet | Tenant data, Paddle sandbox, JWT |
| Merge to `main` | Downstream deploy eligibility |
| BMAD/CAT-SEC PASS | False READY / false merge pressure |
| `UAT_DEPLOY_GATE_ACTIVE` | First live SSH |

## Verified vs unverified controls

| Control | Verdict | Why |
| --- | --- | --- |
| Suppressor `!= "true"` blocks SSH | VERIFIED | Run 41321497962 / #451 |
| HOLD-first skips `fetch-origin-main` | VERIFIED | `deploy.yml` lines 65-70 |
| `environment: uat` only after `eligible==true` | VERIFIED | `deploy.yml` job `if` |
| Production secret names isolated | VERIFIED | `PROD_DROPLET_*` only in `deploy-production.yml` |
| Environment `uat` branch restriction | FAIL | `protection_rules=[]`, `deployment_branch_policy=null`, `can_admins_bypass=true` |
| Environment `production` restriction | VERIFIED | `main` branch policy, required reviewer `fad16papa`, `can_admins_bypass=false` |
| Secret values present | UNVERIFIED | Secrets API 403 |
| SSH reachability | UNVERIFIED | No authorized test |
| Branch protection on `main` | UNVERIFIED | Protection API 403; rulesets `[]` |
| Dual-review Apps installed | UNVERIFIED / FAIL for operation | No `cohestra-bmad` / `cohestra-cat-sec` check-runs on `22ffe635` |
| #536 controller | FAIL | Issue OPEN, no implementation PR |

## Attack catalog

### T1 — Disabled gate bypass

**Vector:** Workflow YAML change, truthy var (`True`, `1`), or skipped predeploy `if`.
**Current:** Exact string `true` required in two places (predeploy and pre-SSH). Run #451 proves HOLD.
**Residual:** A later workflow on the same repo that uses `environment: uat` without the suppressor. Environment `uat` currently has no branch policy, so any workflow on any ref that names the environment can request those secrets once the job starts.
**Severity:** MAJOR
**Mitigation:** AD-9 environment branch policy + contract test that every `environment: uat` job also requires `eligible==true` and the suppressor.

### T2 — Untrusted PR code with privileged secrets

**Vector:** `pull_request_target`, persist-credentials checkout of a fork, or a correction controller that runs PR code with `DROPLET_*`.
**Current:** `deploy.yml` and #535 `uat-readiness.yml` use `persist-credentials: false` and refuse `pull_request_target`. Deploy secrets are not in CI or the reporter.
**Residual:** #536 must not checkout untrusted HEAD with environment secrets. Mocked tests must include this negative.
**Severity:** BLOCKER if introduced; currently absent on main.

### T3 — Forged BMAD / CAT-SEC evidence

**Vector:** PR comment with a marker JSON; author posts both roles; `github-actions` check-run named like a review; stale SHA reuse.
**Current:** #535 consumer (unmerged) rejects `cursor[bot]`, author, forbidden slugs, and inauthentic comments. Producer does not exist.
**Residual:** Until Apps are installed and the producer is implemented, READY cannot be honest. Do not merge #535 as if reviews were live.
**Severity:** BLOCKER for autonomous merge-readiness; HOLD is the correct current state.

### T4 — One App impersonating two reviewers

**Vector:** Single GitHub App posts both BMAD and CAT-SEC check-runs.
**Current:** #535 `merge_review_sources` requires distinct identities. Not live-tested with real Apps.
**Severity:** MAJOR until negative tests exist on main.

### T5 — Stale SHA / wrong artifact SHA

**Vector:** Deploy a SHA that passed an older CI; rebuild on the droplet from `main` tip after a later push; reuse a previous image.
**Current:** Predeploy (when gate is true) requires candidate == `origin/main` tip, Layer A jobs on that SHA, Exact-SHA scan, and push-main GitGuardian API scan. SSH script pins `DEPLOY_SHA`.
**Residual:** No independent post-merge workflow. Layer A does not name auth or billing jobs. Host rebuild is SHA-pinned in script, but image digest provenance is not a signed attestation. Duplicate successful deploy is HOLD.
**Severity:** MAJOR for the missing dedicated post-merge gate and provenance.

### T6 — Concurrent / superseded deploy

**Vector:** Two `workflow_run` events; dispatch overlapping with CI; canceled-in-progress.
**Current:** `concurrency: deploy-uat` with `cancel-in-progress: false`. Duplicate in-progress or successful deploy HOLD.
**Residual:** A failed prior deploy does not block a retry (correct). A HOLD run conclusion is `failure`, which can confuse monitors but does not open SSH.
**Severity:** MINOR.

### T7 — Missing-artifact fail-open

**Vector:** `continue-on-error: true` on every delivery-outcome download. After a real deploy, missing Playwright evidence could still aggregate.
**Current:** Run #451 missing artifacts were expected. Final JSON stayed HOLD / `UAT_DEPLOYED=false`. `uat-final-outcome.sh` treats missing post-deploy fields as missing, not PASS.
**Residual:** If SSH ran and artifacts failed to upload, aggregator must FAIL, not HOLD-as-success. Conditional download is required so expected HOLD skips are not `##[error]` and unexpected gaps stay fail-closed.
**Severity:** MAJOR for post-deploy honesty; not a bypass on #451.

### T8 — Unauthorized branch dispatch

**Vector:** `workflow_dispatch` from a feature branch. `TARGET_SHA=github.sha` of that ref.
**Current:** When the suppressor is false, HOLD before tip-pin. When true, candidate must equal `origin/main` tip, so a feature SHA HOLDs.
**Residual:** Environment `uat` still has no branch policy. A new workflow could dispatch SSH from another ref if it skips the gate.
**Severity:** MAJOR (environment), MINOR (current deploy.yml path).

### T9 — Production via UAT path

**Vector:** Reuse `DROPLET_*` for prod, or call production compose from UAT SSH.
**Current:** Production workflow is dispatch-only, `require-main`, `PROD_DROPLET_*`, Environment `production` with reviewer. Isolation contract tests exist on CI.
**Residual:** Live droplet layout (shared host vs dedicated) is documented, not re-probed this run.
**Severity:** Residual UNVERIFIED for host; PASS for workflow naming.

### T10 — Controller privilege escalation (#536)

**Vector:** Broad GitHub App; ADCP resurrection; webhook that runs on every PR; token in `pull_request` checkout; infinite retry; prompt injection from PR body.
**Required refusals:** No ADCP. Manifest-only start. No #505. No privileged checkout of untrusted code. Dedup lock. Budget. Fail closed on 403. Comments are evidence, not permission.
**Current:** Not implemented. Claiming operational status would be a false PASS.
**Severity:** BLOCKER if built wrong; FAIL (absent) today.

### T11 — Secret exfiltration through artifacts

**Vector:** Evidence JSON echoing env, logs with `set -x` around keys, Playwright traces with passwords.
**Current:** Predeploy and final-outcome strip secret-like files. Tests assert `GITGUARDIAN_API_KEY=` and `DROPLET_` are absent from evidence.
**Residual:** Acceptance jobs still inject mailbox and operator passwords into the runner when SSH is enabled. Keep those jobs behind `eligible=true`.
**Severity:** MINOR while gate is false; MAJOR after activation if traces are uploaded unsanitized.

## Abuse-case tests (deterministic first)

These must exist as mocks before the live gate is enabled. Do not dispatch Deploy UAT to obtain them.

| ID | Case | Expected |
| --- | --- | --- |
| N1 | Gate disabled | SSH job skipped; RESULT=HOLD |
| N2 | Missing mandatory CI job | HOLD/REFUSE; no SSH |
| N3 | Stale SHA not main tip | HOLD |
| N4 | Artifact digest ≠ approved SHA | REFUSE |
| N5 | Forged comment review | REVIEW_EVIDENCE_MISSING |
| N6 | One App both roles | HOLD |
| N7 | Unauthorized branch | HOLD or environment denied |
| N8 | Failed post-merge test | no SSH |
| N9 | Missing `DROPLET_*` | fail-closed `MISSING_SECRET` after eligibility |
| N10 | Workflow `permissions: write-all` | contract FAIL |
| N11 | Untrusted PR job reads `DROPLET_*` | job must not have the secret |
| N12 | Duplicate/superseded deploy | HOLD |
| N13 | Production action from UAT workflow | REFUSE |
| P1 | Valid evidence, gate still false | HOLD (eligible for later owner activation, not deployed) |

N1 is VERIFIED live by run #451. All others are UNVERIFIED on main.

## CAT-SEC verdict

**NOT READY for UAT activation.** The suppressor and run #451 are sound. Trust is not. Environment `uat` is an open credential well. Dual-review is a consumer design without a producer or installed Apps. Post-merge testing is the same CI `workflow_run` that already ran, not a mandatory independent gate covering auth, billing, and provenance. The correction loop does not exist.

Do not set `UAT_DEPLOY_GATE_ACTIVE=true`. Do not merge #535 as a substitute for #536. Do not SSH.
