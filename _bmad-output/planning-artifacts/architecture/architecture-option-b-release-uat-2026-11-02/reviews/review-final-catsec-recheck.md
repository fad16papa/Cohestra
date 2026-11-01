---
name: CAT-SEC recheck — Option B release/uat
type: review
method: independent CAT-SEC (fresh; no prior review letters)
status: complete
date: 2026-11-02
reviewer: CAT-SEC (hostile, independent)
subject: architecture-option-b-release-uat-2026-11-02
authority: Issue #538
does_not_authorize: merge, deploy, SSH, gate activation, live protection or secret changes
---

# CAT-SEC recheck — Option B release/uat

Independent of prior review letters. No file under `reviews/` was read. Evidence is the current spine, companions, simulator, parent threat catalog, and live workflow files on this workspace.

**Scope:** target architecture after owner-authorized cutover (AD-12…AD-24), plus whether the target still depends on a forbidden trigger/Environment pair. Not a live cutover review. Not an implementation review of unmerged PR-D YAML (that file does not exist yet).

**Method:** official GitHub ref facts → simulator → eleven hostile walks → must-verify gates → classify findings. Missing live canary is recorded, not invented as a new hole.

## Official facts used

Given and treated as authoritative (live canary UNVERIFIED):

| Trigger | `GITHUB_REF` | Environment selected-branch match |
| --- | --- | --- |
| `workflow_run` | default branch (`main`) | `uat=release/uat` → DENY |
| `repository_dispatch` | default branch (`main`) | `uat=release/uat` → DENY |
| `push` | updated ref | `push` to `release/uat` → ALLOW |
| `workflow_dispatch` | dispatched ref; workflow file must exist on default branch | `--ref release/uat` → ALLOW; `--ref main` → DENY |
| `workflow_call` | caller ref | caller `release/uat` → ALLOW (therefore forbidden on Deploy UAT) |

Environment “Selected branches and tags” matches the **workflow run** `GITHUB_REF`. `actions/checkout`, `workflow_run.head_branch`, and `ORIGIN_UAT_REF` do not change that ref.

## Simulator

Command: `python3 simulate-github-refs.py`  
Working directory: this architecture folder.  
Exit 0.

```
SIMULATE=PASS
workflow_run GITHUB_REF=refs/heads/main ENV_uat=DENY
push GITHUB_REF=refs/heads/release/uat ENV_uat=ALLOW
workflow_dispatch ref=release/uat ENV_uat=ALLOW
workflow_call caller=release/uat ENV_uat=ALLOW FORBIDDEN
AD-23 XOR AD-24
same-run needs: SUCCESS starts; FAILURE/CANCELLED/SKIPPED/HOLD/PENDING do not
AD-24 named-job conclusion==success; skip-matrix does not dispatch
LIVE_CANARY=UNVERIFIED
```

The leftover-`workflow_run` assertion in the simulator is a documented contract (`True`), not a live listener scan. That does not weaken AD-22/AD-23: the pair is rejected, not licensed as a deny-fallback.

## What was read

- `ARCHITECTURE-SPINE.md` (AD-14, AD-17, AD-20, AD-22, AD-23, AD-24 and surrounding invariants)
- `CAT-SEC-THREAT-MODEL.md` (this Option B addendum)
- `ENVIRONMENT-REF-ANALYSIS.md`
- `ADR-OPTION-B.md`
- `MIGRATION-PLAN.md` (cutover order only; not treated as a review letter)
- `simulate-github-refs.py` (source + run)
- Parent `architecture-uat-automation-readiness-2026-11-01/CAT-SEC-THREAT-MODEL.md` (T1–T11 catalog; residuals stay OPEN)
- Live `.github/workflows/deploy.yml`, `deploy-production.yml`, `ci.yml`, `inspect-production-oidc.yml` (brownfield isolation facts)

Not read: any file under `reviews/`.

## Hostile walks

### 1. UI / PAT / other-App `workflow_dispatch` of Deploy UAT without prior post-merge

**Attack:** An authorized human, a PAT, or a non-dispatch App starts Deploy UAT with `--ref release/uat` before `post-merge-uat.yml` (or any prior AD-17 run) has executed on that SHA.

**AD-23:** optional `workflow_dispatch` “still runs the same AD-17 jobs.” `predeploy` `needs` every named job. SSH `needs` `predeploy`.

**AD-24 / N32:** Deploy UAT still contains the AD-17 copy. Human / PAT / other-App dispatch “re-runs those jobs; it is not a skip-tests path.” SSH only after those jobs are SUCCESS **and** AD-14.

**Result:** AD-17 **does still run in that run**. Dispatch is not a skip-matrix and not a substitute for `needs`. Feature-ref dispatch is REFUSE (AD-20). `--ref main` is HOLD N14 plus Environment deny.

**Verdict:** ADDRESSED. No authorization bypass.

### 2. Leftover `workflow_run` after PR-D

**Attack:** PR-D is incomplete, or a delayed `workflow_run` delivery arrives after retarget. Listener still exists on `main` and/or `release/uat`.

**Documented effect if the listener exists:** Deploy UAT `GITHUB_REF=refs/heads/main`. Environment `uat=release/uat` DENY. Checkout / `head_branch` cannot repair the ref.

**Design treatment:** this is **N25 contract FAIL of PR-D**, not a licensed “safe deny,” not an Environment-deny fallback (AD-13, AD-14, AD-20, AD-21, AD-22, T17). Until PR-D, AD-1 keeps today’s `workflow_run.branches: [main]` with the gate false (run #451 HOLD). Migration order sets Environment policy and suppression, drains, then deletes the listener on **both** copies.

**Result:** The **remaining design does not use** `workflow_run` + Environment `uat=release/uat`. A leftover listener is a PR-D defect, not a target control.

**Verdict:** ADDRESSED.

### 3. `workflow_call` from `ci.yml` on `release/uat`

**Attack:** `ci.yml` on `release/uat` calls Deploy UAT as a reusable workflow.

**Documented effect:** `GITHUB_REF` inherits the caller (`refs/heads/release/uat`). Environment `uat` **ALLOW**. If AD-17 jobs are absent from the called file, this recreates T22 (CI-complete start, stuck HOLD) **and** would satisfy the branch policy.

**Design treatment:** name-forbidden on Deploy UAT (AD-22, AD-23). N28 is contract FAIL. Model E is rejected in `ENVIRONMENT-REF-ANALYSIS.md`. Live `ci.yml` has no `workflow_call` today.

**Verdict:** ADDRESSED (forbidden because it *would* match).

### 4. Environment identity via checkout / `head_branch`

**Attack:** Implementer (or leftover c6ec3370 thinking) checks out `release/uat` or reads `workflow_run.head_branch` and assumes Environment `uat` now matches.

**Facts:** Environment policy matches run `GITHUB_REF` only. Simulator: checkout and `head_branch` leave `workflow_run` ref at `refs/heads/main`.

**Design treatment:** AD-22 forbids using those as Environment identity. AD-12 source ref is `github.ref` of the **deploy workflow run**.

**Verdict:** ADDRESSED.

### 5. CI-first stuck HOLD

**Attack:** CI `workflow_run` starts Deploy UAT while AD-17 jobs are still pending. Predeploy HOLDs. No later event retries. A green `release/uat` never deploys (T22).

**AD-23:** one run: `push` → AD-17 jobs (no Environment) → `predeploy` `needs` all of them (`needs` waits; it never observes pending) → SSH `needs` `predeploy`. FAILURE / CANCELLED / SKIPPED skip dependents (N26). Evaluator must accept `GITHUB_EVENT_NAME=push` (N30). `ci.yml` is not a deploy trigger.

**AD-24:** App dispatches only after every **named** AD-17 job `conclusion==success` on that SHA. Deploy UAT **re-runs** AD-17 with in-run `needs`. If the App is down, automatic start fails closed; a human/PAT dispatch still re-runs tests (availability, not a skip).

**Old design:** N27 — must not start SSH; same-run `needs` removes the stuck HOLD.

**Verdict:** ADDRESSED for authorization. AD-24 App outage is operational fail-closed, not a bypass.

### 6. AD-23 and AD-24 both

**Attack:** Combined `on.push` Deploy UAT plus split `post-merge-uat.yml` plus App dispatch, or push + split file with no in-run AD-17 jobs.

**Design:** AD-23 XOR AD-24, never both (AD-24, N29). Push + split without in-run AD-17 is a contract FAIL and recreates T22. Default is AD-23. Simulator: `BOTH` is illegal; AD-24 closed-on is only `workflow_dispatch`.

**If both were implemented anyway:** two starts (`push` + App). Concurrency `deploy-uat` / `cancel-in-progress: false` queues, does not cancel. Same-SHA dual SSH is a double-deploy of the protected tip, not an AD-14 skip — still a contract FAIL, not a licensed mode.

**Verdict:** ADDRESSED (forbidden).

### 7. AD-24 skip-matrix

**Attack:** `post-merge-uat.yml` workflow `conclusion==success` (or Actions `success()`) while a required AD-17 job is `skipped` (conditional / matrix skip). App dispatches. SSH proceeds.

**Design:** App fires only when every **named** job `conclusion==success` (AD-17, AD-24, N31). Simulator skip-matrix does not dispatch. Defense in depth: if Deploy UAT is still started, in-run SKIPPED skips SSH (`needs`).

**Verdict:** ADDRESSED.

### 8. AD-24 App dispatches Production

**Attack:** `cohestra-uat-dispatch` (or a mis-installed twin) calls `deploy-production.yml`.

**Design:** App may dispatch **only** `.github/workflows/deploy.yml`. Must not dispatch Production or any other workflow. No Environment secrets. No `contents: write`. N33. N24: Production dispatch from `release/uat` REFUSE.

**Unchanged Production isolation (live file):** `workflow_dispatch` only; `require-main` job exits unless `GITHUB_REF==refs/heads/main`; Environment `production`; `PROD_DROPLET_*`; two-parent provenance; distinct concurrency `deploy-production`. Simulator: Environment `production` policy `main` DENY for `refs/heads/release/uat`.

**Platform residual:** GitHub `actions: write` is repo-wide; “only `deploy.yml`” is an App-install contract, not a native ACL. Production still requires `main` + Environment reviewer. That is owner-config residual, not a target-design bypass. See MINOR-2.

**Verdict:** ADDRESSED for isolation. App-ACL limitation recorded as MINOR.

### 9. Authorization bypass of the AD-14 conjunction

**Required conjuncts (all exact):** `UAT_DEPLOY_GATE_ACTIVE==true` AND `UAT_MAIN_DEPLOY_SUPPRESSED==true` AND `github.ref==refs/heads/release/uat` AND AD-12 tip-pin AND every AD-17 job in **this run** SUCCESS.

Job order is a `needs` edge, not a Checks query. `predeploy` must not start until every required job has finished. Do not evaluate AD-17 names via the Checks API or `ci.yml` jobs. SSH re-asserts AD-12 + conjunction immediately before `appleboy/ssh-action`. A newer `release/uat` tip HOLDs the older run. Gate true + `github.ref==refs/heads/main` is HOLD N14 **on ref**, not SHA uniqueness.

| Bypass attempt | Why it fails |
| --- | --- |
| Gate true, suppressed false, `--ref release/uat` | Conjunction incomplete |
| Both vars true, `--ref main` (even if SHA equals `release/uat` tip) | N14 HOLD on ref; Environment deny after AD-18 |
| Poll `ci.yml` jobs of similar names | Forbidden; `needs` is in-run AD-17 only |
| Start predeploy while AD-17 pending | `needs` waits; PENDING cannot start SSH |
| Required job SKIPPED / FAILURE / CANCELLED | Dependents skip (N26) |
| `if: always()` on SSH | Contract violation of AD-14/AD-17; not licensed |
| `workflow_call` inherit ref, skip tests | N28 FAIL |
| `pull_request_target` to match Environment with PR YAML | Name-forbidden (AD-23); AD-20 never grants `DROPLET_*` on PR events |
| Checkout feature SHA while run ref is `release/uat` | AD-12 tip-pin (must equal `origin/release/uat` tip) |
| Forge `eligible=true` from a feature workflow | Control-plane YAML is protected `release/uat` tip; AD-16 forbids auto-merge of `.github/workflows/**` |
| Unset suppressed after cutover | Fail-closed (SSH HOLDs) |
| Spoof `GITHUB_REF` from a step env | GitHub sets run `github.ref`; AD-14 binds that |

**Verdict:** No conjunction bypass found in the target design.

### 10. Production isolation

**Live facts (unchanged by this spine):** `PROD_DROPLET_*` and Environment `production` exist only on `deploy-production.yml`. `inspect-production-oidc.yml` uses Environment `production` with no `DROPLET_*` / `PROD_*` secrets. `ci.yml` isolation contract tests remain. `deploy.yml` has `DROPLET_*` only, no `PROD_*`.

**Target:** AD-13 — no `main` CI completion starts Deploy UAT after PR-D; no automation opens or merges `release/uat` → `main`. AD-19 — accepted UAT stays `AWAIT_BUSINESS_RELEASE`. AD-24 App must not dispatch Production. Concurrency must never share `deploy-production`. GG / Layer A `head_branch==main` stays Production-only.

**Verdict:** Isolation unchanged. ADDRESSED.

### 11. Untrusted PR YAML / `DROPLET_*`

**Attack:** Feature PR edits `deploy.yml` (skip gate, add `environment: uat` to CI, `pull_request_target`, run PR-authored scripts with secrets).

**Design:** After PR-D, GitHub executes Deploy UAT YAML from the protected `release/uat` tip (`push` / dispatch-on-that-ref). AD-16 forbids auto-merge of `.github/workflows/**` and `deploy/**`. `pull_request` / `pull_request_target` never include `environment: uat` or `secrets.DROPLET_*`. Every other workflow (`ci.yml`, `uat-readiness.yml`, `uat-correction.yml`, `uat-merge.yml`, `post-merge-uat.yml`, `deploy-production.yml`) must also be free of those. No PR-authored scripts with UAT secrets. Checkout `persist-credentials: false`. Closed `on:` is AD-23 or exclusive AD-24. Leftover `workflow_run` is **not** kept “for YAML safety” (N25).

**Live brownfield:** `ci.yml` has no `environment: uat` and no `DROPLET_*` (only scan-only `GITGUARDIAN_API_KEY`). Current `deploy.yml` already uses `persist-credentials: false` on the SSH-path checkout; AD-20 requires that on the post-cutover file.

**Parent T1:** Environment `uat` is still unrestricted **today**. Option B does not mark T1 PASS. AD-18 requires owner policy `release/uat` only and `can_admins_bypass=false` **before** PR-D merges and **before** the gate is `true`. Gate stays false during prep (T13). That residual is honest, not a new Option B hole.

**Verdict:** ADDRESSED for the target. Untrusted workflow mods cannot reach `DROPLET_*` once AD-16/AD-18/AD-20 hold. T1 remains OPEN until the owner applies the policy.

## Must-verify

| Gate | Result | Why |
| --- | --- | --- |
| No remaining design uses `workflow_run` + Environment `uat=release/uat` | **PASS** | Pair is rejected (AD-22/AD-23). Leftover listener is N25 FAIL of PR-D, not a target control. Until PR-D, listener is `main` + unrestricted Environment + gate false (AD-1), not the forbidden pair. |
| No post-merge completion race | **PASS** | AD-23 same-run `needs`. Exclusive AD-24 re-runs AD-17 in Deploy UAT and dispatches only after named-job `conclusion==success`. |
| No authorization bypass | **PASS** | AD-14 five-conjunct + in-run `needs` + tip-pin + Environment policy + control-plane YAML. Walks 1, 8, 9 do not skip tests or conjuncts. |
| Production isolation unchanged | **PASS** | Live Production workflow and secret names unchanged. AD-13/AD-19/N24/N33. No `release/uat` → `main` automation. |
| Untrusted workflow mods cannot reach `DROPLET_*` | **PASS** | AD-16/AD-20/AD-18. No PR event may name Environment `uat`. Parent T1 stays OPEN until owner policy; not converted to PASS. |

## Parent residuals (not new findings)

These remain **OPEN** on `main`. Option B does not convert them to PASS. They are **not** new MAJOR findings of this recheck.

| ID | Residual | Why still OPEN |
| --- | --- | --- |
| T1 | Environment `uat` unrestricted | Owner UI; required before PHASE_ARMED / gate true (AD-18) |
| T3 | Dual-review Apps not operational | Owner install; AD-3/AD-15 later |
| T5 | No dedicated post-merge gate **on live main** | AD-17 exists only after PR-D |
| T7 | HOLD artifact honesty | PR-F; not a trigger/Environment hole |
| T10 | #536 absent | Separate Draft; must not merge (AD-15) |

N1 remains VERIFIED by Deploy UAT #451 (gate false). N14–N33 remain `NOT_RUN` until Draft PR-G. Live canary of the denied `workflow_run` + Environment pair is **UNVERIFIED**. This architecture is **not authorized to cut over**.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

**MINOR-1 — AD-24 App query scope is SHA-global, not run-bound.**  
AD-17/AD-24 say the App fires when every named job `conclusion==success` **on that SHA**, and forbids workflow `conclusion` / Actions `success()`. Under exclusive AD-24 the same job names exist in `post-merge-uat.yml` **and** in Deploy UAT. Two check-runs can exist for one name on one SHA. A sloppy “any success” query could dispatch on a stale Deploy UAT SUCCESS while the new post-merge copy skipped; a sloppy “all must succeed” query fail-closes (availability). In-run `needs` still blocks SSH if Deploy UAT’s own copy is SKIPPED (N31/N32). Bind the App to **jobs of the `post-merge-uat.yml` run for that SHA**. Default AD-23 does not have this split.

**MINOR-2 — `actions: write` cannot mechanically restrict the App to one workflow file.**  
“May dispatch only `deploy.yml`” is an install/policy contract (N33). GitHub’s permission is repo-wide. Mis-install could *attempt* `deploy-production.yml`. Production still REFUSE unless `GITHUB_REF==refs/heads/main` and Environment `production` reviewers approve. Isolation is unchanged; owner App install remains a cutover checklist item, same class as T3 Apps.

### NIT

**NIT-1 — Simulator leftover-`workflow_run` check is tautological** (`check(..., True)`). It documents N25; it does not scan YAML. Acceptable because `LIVE_CANARY=UNVERIFIED` is printed and the architecture does not treat Environment deny as a license.

**NIT-2 — `workflow_dispatch` requires the file on the default branch.** After PR-D, `main` and `release/uat` can drift. AD-23 happy path is `push` (YAML from the `release/uat` tip). Owner must keep the default-branch copy present (and in sync) if they use optional AD-23 dispatch or exclusive AD-24. Not an authorization hole.

**NIT-3 — Live `browser` / `lifecycle` checkouts omit `persist-credentials: false`.** Inherited brownfield. AD-20 requires `persist-credentials: false` on the post-cutover control-plane file. Bind this in PR-D; do not treat as a new Option B trigger defect.

## Threat catalog vs this recheck

| Threat | This recheck |
| --- | --- |
| T12 first-merge / dual-trigger | Conjunction + N25; unordered cutover still BLOCKER **if executed**. Target order forbids it. |
| T13 unprotected `release/uat` | Owner-before-gate; T1/T13 remain OPEN, not new. |
| T14 branch-modified privileged workflow | AD-20/AD-16; no leftover `workflow_run` “for YAML safety.” |
| T15 correction self-merge | AD-15 unchanged; T10 OPEN. |
| T16 auto-merge control-plane | AD-16; manifest on `main`. |
| T17 stale `workflow_run` | N25 FAIL if listener remains; not licensed. |
| T21 Environment identity mismatch | Closed by rejecting the pair (AD-22/AD-23). Canary UNVERIFIED. |
| T22 post-merge completion race | Closed by same-run `needs` (AD-23) / named-job dispatch + in-run re-run (AD-24). |
| T18 artifact substitution | AD-7 + provenance; not re-opened. |
| T19 silent promotion | AD-13/AD-19. |
| T20 Production via new line | Isolation + N33. |

## Verdict

**PASS** as a **target architecture**. BLOCKER=0. MAJOR=0.

The c6ec3370 `workflow_run` + Environment `uat=release/uat` design is gone. The replacement is AD-23 protected `push` with in-run AD-17 `needs`, or exclusive AD-24 dispatch that still re-runs those jobs. `workflow_call` is forbidden because it **would** match. Leftover `workflow_run` is a PR-D contract FAIL, not a control. AD-14 conjunction has no bypass in this design. Production isolation is unchanged. Untrusted PR YAML cannot reach `DROPLET_*` under AD-16/AD-18/AD-20.

This is **not** authorization to merge PR-D, set `UAT_DEPLOY_GATE_ACTIVE=true`, restrict Environments, install Apps, or SSH. Parent T1/T3/T5/T7/T10 stay OPEN. Live canary UNVERIFIED. N14–N33 stay `NOT_RUN` until PR-G.

## Return summary

- Verdict: **PASS**
- BLOCKER: **0**
- MAJOR: **0**
- Must-verify: all five **PASS** (table above)
- Top findings: none blocking; MINOR-1 AD-24 check-run query scope; MINOR-2 App `actions: write` is repo-wide; parent T1/T3/T5/T7/T10 remain OPEN
- File: `reviews/review-final-catsec-recheck.md`
