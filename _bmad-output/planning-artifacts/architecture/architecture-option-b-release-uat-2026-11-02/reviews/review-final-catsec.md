---
name: Independent CAT-SEC threat-model review — Option B letters AD-12..AD-24
type: review
method: independent CAT-SEC
scope: architecture-option-b-release-uat-2026-11-02 letters only
date: 2026-11-02
reviewer: independent CAT-SEC (this run)
does_not_use: prior review letters as evidence
authority: Issue #538 Option B target; not live cutover
---

# Independent CAT-SEC review — corrected Option B letters (AD-12..AD-24)

**Workspace:** `/tmp/cohestra-534/_bmad-output/planning-artifacts/architecture/architecture-option-b-release-uat-2026-11-02/`

**Read (this review only):**

- `CAT-SEC-THREAT-MODEL.md` (Option B addendum T12–T22, N14–N31)
- `ARCHITECTURE-SPINE.md` (AD-12..AD-24 and inherited AD-1..AD-11)
- `ENVIRONMENT-REF-ANALYSIS.md`
- `ADR-OPTION-B.md`
- `MIGRATION-PLAN.md` (cutover order and PR-D contract; not treated as a prior review)
- `simulate-github-refs.py` (executed)
- Parent catalog residuals only: `../architecture-uat-automation-readiness-2026-11-01/CAT-SEC-THREAT-MODEL.md` T1–T11

**Not used as evidence:** any file under `reviews/` written before this document.

**Official facts accepted (already documented; not re-inferred):**

| Fact | Used as |
| --- | --- |
| `workflow_run` and `repository_dispatch` set `GITHUB_REF` to the default branch (`main`) | Environment identity; leftover-listener analysis |
| Environment selected-branch policy matches **`GITHUB_REF` of the workflow run** | AD-18 / AD-22 |
| `workflow_call` inherits the **caller** `GITHUB_REF` | Forbidden-trigger analysis |
| `workflow_dispatch` `GITHUB_REF` is the dispatched ref | AD-23 optional dispatch; AD-24 |
| `workflow_dispatch` workflow file must exist on the default branch | PR-D lands on `main` then fast-forwards `release/uat` |
| Live canary of `workflow_run` + Environment `uat`=`release/uat` is **UNVERIFIED** | T21 evidence residual, not a licensed control |

**Simulator (this run):**

```text
$ python3 simulate-github-refs.py
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

Live canary was not run (unauthorized). `SIMULATE=PASS` is documentation-faithful simulation, not host proof.

## Verdict

**CHANGES REQUIRED.** Default path **AD-23 is a sound target**. Exclusive **AD-24, as written, is not equivalent** and leaves one AD-14 conjunct unenforceable. **Not authorized to cut over, merge PR-C/PR-D, set the gate, or change live protections/secrets.**

| Score | Count |
| --- | --- |
| BLOCKER | **0** |
| MAJOR | **1** |
| MINOR | 3 |
| NIT | 2 |

Parent T1 / T3 / T5 / T7 / T10 remain **OPEN** on `main`. That honesty is **not** scored as a new MAJOR against these letters.

| ID | Status against corrected letters | Residual |
| --- | --- | --- |
| **T21** | **MITIGATED / CLOSED-BY-DESIGN** | Live canary of the *denied* pair remains **UNVERIFIED**. Letters do not license that pair. Leftover listener is N25 contract FAIL, not an Environment-deny fallback. |
| **T22** | **MITIGATED / CLOSED-BY-DESIGN** | AD-23 same-run `needs` cannot observe PENDING. Exclusive AD-24 App fires only on named-job `conclusion==success`. The AD-24 *alternate-dispatcher* hole is F1 (MAJOR), a different threat than the CI-first stuck HOLD. |

## Must-verify

| # | Requirement | Result |
| --- | --- | --- |
| 1 | No remaining design uses `workflow_run` + Environment `uat`=`release/uat` | **PASS.** Target `on:` is AD-23 `{push, optional workflow_dispatch}` or exclusive AD-24 `{workflow_dispatch}`. Name-forbid includes `workflow_run`. Leftover = N25 FAIL of PR-D, not a residual design. Transitional PHASE_SUPPRESS still has `workflow_run` on `main` while Environment is unrestricted (today) or already retargeted (drain window); that window is fail-closed by gate-false + AD-14 ref HOLD + suppress, and is not the armed target. |
| 2 | No post-merge completion race | **PASS** on AD-23 (`predeploy` `needs` every AD-17 job; `needs` waits). **PASS** for T22 on AD-24 App (named conclusions, not workflow `success()`). |
| 3 | No authorization bypass | **FAIL (MAJOR F1)** on exclusive AD-24: AD-14’s “every AD-17 job in **this run** is SUCCESS” is vacuous when AD-17 lives in another file, and GitHub UI / any `actions:write` principal can `workflow_dispatch` Deploy UAT without the App’s named-job check. AD-23 conjunction holds. |
| 4 | Production isolation unchanged | **PASS.** `PROD_*` / Environment `production` / `workflow_dispatch` from `refs/heads/main` / no `release/uat`→`main` automation. N24. Simulator: `release/uat` does not satisfy Production policy `main`. |
| 5 | Untrusted workflow modifications cannot reach deployment credentials | **PASS** after AD-16 + AD-18 + AD-20. Feature-ref / `pull_request` `GITHUB_REF` does not match Environment `uat`=`release/uat`. Auto-merge cannot land `.github/workflows/**`. `pull_request_target` name-forbidden. Parent T1 (unrestricted Environment **today**) remains OPEN and is not a new Option B letter defect. |

---

## Hostile walks

Each walk assumes a hostile PR author, a forged check-run/comment, a curious GitHub App, and an owner who might click the wrong GitHub control. Missing evidence is HOLD, not PASS.

### H1 — Untrusted PR YAML / `DROPLET_*`

**Attack:** Feature PR adds or edits a workflow so a `pull_request` / `pull_request_target` / feature `push` job sets `environment: uat` or reads `secrets.DROPLET_*`. Variant: PR rewrites `deploy.yml` to drop the gate.

**What the letters do:**

- AD-23 / AD-24 closed `on:` name-forbids `pull_request` and `pull_request_target` on Deploy UAT.
- AD-20: after PR-D, GitHub executes Deploy UAT YAML from the **protected `release/uat` tip** (`push`) or dispatch-on-that-ref. PR CI must not contain `secrets.DROPLET_*`. No PR-authored script runs with UAT secrets. `persist-credentials: false`.
- AD-16: auto-merge cannot land `.github/workflows/**` or `deploy/**`. Authorization manifest is the owner-merged file on `main`, not PR-head `TASK.md`.
- AD-18: Environment `uat` allows only `release/uat`; `can_admins_bypass=false` before the gate is true.
- Official: Environment policy matches run `GITHUB_REF`. A `pull_request` run is `refs/pull/N/merge`. A feature `push` is `refs/heads/<feature>`. Neither equals `refs/heads/release/uat`.

**Result:** After AD-18 is applied, untrusted YAML cannot obtain `DROPLET_*` even if it names `environment: uat`. Until AD-18, that is **parent T1** (open credential well on `main` today). **Not a new MAJOR.** N18 remains the required fixture.

### H2 — Leftover `workflow_run` after PR-D

**Attack:** PR-D is incomplete; `deploy.yml` on `main` and/or `release/uat` still lists `workflow_run`. A delayed `main` CI completion starts Deploy UAT.

**Official identity:** that run’s `GITHUB_REF` is `refs/heads/main`. Checkout of `release/uat` / `head_branch` does not change it. Environment `uat`=`release/uat` **documents** DENY of the `environment: uat` job. Live canary UNVERIFIED.

**What the letters do:**

- AD-13, AD-21, AD-22, AD-23: leftover listener is **N25 contract FAIL of PR-D**, not a licensed “safe deny.”
- AD-14: `github.ref==refs/heads/main` is HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE` (ref, not SHA uniqueness).
- T12 / T17: residual `workflow_run` is not an accepted residual.

**Result:** No remaining *design* uses the pair. A leftover is an implementation FAIL. Defense in depth is AD-14 ref HOLD; Environment deny is **not** the licensed control (and is UNVERIFIED live). **PASS** as a letter.

### H3 — `workflow_call` from `ci.yml` on `release/uat`

**Attack:** `ci.yml` on `release/uat` calls Deploy UAT as a reusable workflow.

**Official identity:** `GITHUB_REF` is the **caller** ref = `refs/heads/release/uat`. Environment policy **would ALLOW**. This is the one trigger that satisfies AD-18 *and* can start from CI completion (T22-class race if AD-17 is absent).

**What the letters do:**

- AD-22 / AD-23 / AD-24: `workflow_call` is **name-forbidden**. Closed allowlist, not a deny-list-with-holes (`on:` may contain only the stated events).
- N28: `workflow_call` on Deploy UAT after PR-D is contract FAIL.
- Simulator asserts `ENV_uat=ALLOW` **and** `trigger_legal` false.

**Result:** **PASS.** The letters correctly treat a matching Environment as the reason to forbid the trigger, not as a reason to keep it.

### H4 — Environment identity via checkout / `head_branch`

**Attack:** Keep `workflow_run`, checkout `release/uat` or trust `workflow_run.head_branch` / `ORIGIN_UAT_REF`, and claim Environment `uat`=`release/uat` is satisfied.

**Official + simulator:** checkout and `head_branch` return the pre-existing `GITHUB_REF` (`main` for `workflow_run`). Policy does not match.

**What the letters do:** AD-12 forbids `head_branch` as Environment identity. AD-22 states the official table. Mitigation of T21 is **abandoning** `workflow_run`, not “fixing” the ref in script.

**Result:** **PASS.** T21 is not rescued by checkout. Closed-by-design.

### H5 — CI-first stuck HOLD (T22)

**Attack:** CI `workflow_run` starts Deploy UAT while AD-17 jobs are still pending. Predeploy HOLDs. No later event retries. Green `release/uat` never deploys.

**What the letters do:**

- AD-23: AD-17 jobs live in the **same** Deploy UAT run. `predeploy` `needs` all of them (`needs` waits; it never observes PENDING). SSH `needs` `predeploy`. FAILURE / CANCELLED / SKIPPED skip dependents (N26).
- AD-24 exclusive: App dispatches only when every named AD-17 job `conclusion==success` (not workflow `conclusion`, not Actions `success()`).
- N27 / N31 named.
- `ci.yml` is explicitly not a deploy trigger after PR-D.

**Result:** **T22 CLOSED-BY-DESIGN.** The happy path does not start early and stall.

### H6 — AD-23 and AD-24 both

**Attack:** Combined-file `push` deploy plus split `post-merge-uat.yml` plus App dispatch (or `push` Deploy UAT with AD-17 moved out).

**Effect:** Push Deploy UAT would have no in-run AD-17 `needs` → SSH without post-merge tests, **or** two deploy starters racing.

**What the letters do:** AD-24 is **XOR**. N29 contract FAIL. Push + split + no App is also named as stuck HOLD (T22) and forbidden. Default is AD-23.

**Result:** **PASS** as a letter (forbidden). Implementing both is a PR-D FAIL, not a licensed residual.

### H7 — AD-24 skip-matrix dispatch

**Attack:** Required AD-17 job is SKIPPED; workflow `conclusion==success` / Actions `success()` is true; App dispatches; SSH proceeds.

**What the letters do:** AD-24 and N31 require every named job `conclusion==success`. Simulator `skip-matrix` does not dispatch.

**Result:** **PASS** at the **App** contract. This does **not** close a human/PAT/`actions:write` UI dispatch of Deploy UAT (see F1).

### H8 — #536 merge

**Attack:** Correction App / #536 token also has merge rights; a failed review becomes a merge. Variant: #536 is installed as `cohestra-uat-merge`.

**What the letters do:** AD-15 distinct App `cohestra-uat-merge` (distinct numeric id). Merge API only; no force-push; no write to `main`; no Environment secrets; no variable edits. #536 must not be that App. N19 denied. Parent AD-4 / AD-5 tightened, not dropped.

**Result:** **PASS** as a letter. Parent **T10 remains OPEN** (#536 absent). Honest residual; not a new MAJOR.

### H9 — Auto-merge control-plane

**Attack:** Manifest lists `deploy/**` or `.github/workflows/**`, or the PR rewrites `TASK.md` / a head-branch manifest to self-authorize.

**What the letters do:** AD-16 authorization copy is `deploy/uat-task-manifests/<task_id>.json` **on `main`**, owner-merged. PR-head `TASK.md` is evidence only. Merge-tree paths ⊆ `allowed_path_prefixes`. Control-plane prefixes (workflows, `deploy/**`, `docs/deploy/**`, billing/auth/migration, Production, #505) require a separate owner merge and must not appear in an auto-merge manifest. Merge controller re-evaluates AD-3; a #535 READY comment is not a permit.

**Result:** **PASS** as a letter (T16 mitigated). Path-normalization tightness is NIT F6.

### H10 — Silent promotion to `main`

**Attack:** After UAT PASS, automation opens or merges `release/uat` → `main`.

**What the letters do:** AD-13 / AD-19: no automation opens that PR. Record `state=AWAIT_BUSINESS_RELEASE`. Promotion is an independently authenticated owner instruction naming `release_sha`. AD-15 merge App must not write `main`. N23: no PR opened.

**Result:** **PASS.** T19 is BLOCKER *if implemented*; letters forbid implementation.

### H11 — Production via the new line

**Attack:** `release/uat` workflow reuses `PROD_DROPLET_*` or Environment `production`, or the new dispatch App fires `deploy-production.yml`.

**What the letters do:** Isolation contract already forbids `PROD_*` in `deploy.yml` — keep it. Production remains `workflow_dispatch` from `refs/heads/main` with existing provenance. N24 REFUSE. Environment `production` selected-branch is `main` (verified in parent catalog); `release/uat` does not match. Actor permissions “must not broaden” (T20).

**Result:** **PASS** for the UAT line and naming. AD-24’s new `actions:write` principal is a **MINOR** widening unless the App is name-denied from Production dispatch (F2). Production Environment required reviewer still blocks SSH.

### H12 — Authorization bypass of the AD-14 conjunction

**Conjunction (exact):** `UAT_DEPLOY_GATE_ACTIVE==true` AND `UAT_MAIN_DEPLOY_SUPPRESSED==true` AND `github.ref==refs/heads/release/uat` AND AD-12 tip-pin AND every AD-17 job in **this run** is SUCCESS. Mechanism: `needs` edge, **not** Checks API.

| Bypass attempt | AD-23 | AD-24 as written |
| --- | --- | --- |
| Gate true, suppress false, `ref=main` | N14 HOLD | Same HOLD if someone dispatched `--ref main` (also Environment DENY) |
| Gate true, suppress true, SHA equals both tips, `ref=main` | AD-12 / N17 refuse on **ref**, not SHA uniqueness | Same |
| Truthy gate (`True`, `1`) | Inherited AD-2 exact `true` | Same |
| Evaluate AD-17 via `ci.yml` Checks names | Forbidden; in-run `needs` | AD-17 not in this run |
| Skip required AD-17 (`if:`) | N26 dependents skipped | App must not fire (N31); **UI dispatch still can** |
| `workflow_run` leftover | N25 FAIL + ref HOLD | N25 FAIL |
| `workflow_call` from `ci.yml` | Name-forbidden | Name-forbidden |
| Human / PAT / other App `workflow_dispatch --ref release/uat` | Still runs AD-17 in-run, then AD-14 | **Vacuous AD-17 conjunct — F1** |

**Result:** AD-23 **holds**. Exclusive AD-24 **does not** enforce the AD-17 conjunct inside Deploy UAT. AD-14 also **forbids** the Checks-API evaluation that would be the in-run fix on AD-24, with no carve-out. See F1.

### H13 — First-merge / dual trigger (T12)

**Attack:** Gate set `true` while `workflow_run` still listens to `main`; or `deploy.yml` listens to both branches; or a queued `main` run starts after the owner believes cutover is done; or `release/uat` exists unprotected with Environment still open.

**What the letters do:**

- Mandatory order: gate stays false → PR-C (suppress *code*, var unset) → protect `release/uat` → Environment policy → `UAT_MAIN_DEPLOY_SUPPRESSED=true` → AD-21 drain (`eligible=false`, `ssh_executed=false`, do not cancel) → PR-D to **`main` first** (delete `workflow_run`; `workflow_dispatch` file must exist on default) → fast-forward `release/uat` → only then gate `true`.
- After PR-D, no `workflow_run` (N25). SSH requires the full AD-14 conjunction (N14–N17).
- If PR-D hits `main` before `release/uat` is fast-forwarded: default-branch listener is gone; old `release/uat` copy has no `push` trigger → **no deploy** (fail-closed), not dual deploy.
- Reverse order (FF `release/uat` first) would dual-path; letters forbid it.

**Result:** **PASS** as a letter. T12 remains BLOCKER **if cutover is unordered**; the letters do not authorize that order. Process residual, not a missing invariant.

---

## Findings (this review only)

### F1 — MAJOR — Exclusive AD-24 leaves AD-14’s AD-17 conjunct vacuous and dispatcher-unauthenticated

**Letter conflict**

- AD-14: SSH `eligible=true` only if every AD-17 job **in this run** is SUCCESS, via a `needs` edge. “Do not evaluate AD-17 names via the Checks API.”
- AD-17 / AD-24: under exclusive AD-24 those jobs live in `post-merge-uat.yml`. Deploy UAT `on:` is **only** `workflow_dispatch`. The App is told to check named `conclusion==success` **before** dispatch.
- ENVIRONMENT-REF-ANALYSIS and ADR call AD-24 **equivalent**.

**Hostile path**

1. Owner chooses AD-24 (split file).
2. Gate is `true`, suppress is `true`, `GITHUB_REF=refs/heads/release/uat`, tip-pin matches.
3. Attacker or hurried operator with `actions:write` (repo Write role, PAT, or any App other than a perfectly behaved `cohestra-uat-dispatch`) runs “Run workflow” / `workflow_dispatch --ref release/uat`.
4. Official: that run’s `GITHUB_REF` **matches** Environment `uat`.
5. There are **no** AD-17 jobs in this run, so “every AD-17 job in this run is SUCCESS” is vacuously true and there is no `needs` edge.
6. AD-14 forbids predeploy from reading Checks conclusions, so the deploy run cannot repair the hole without violating AD-14 as written.
7. `GITHUB_TOKEN` cannot dispatch (stated; matches GitHub’s default). That does **not** bind humans, PATs, or other Apps.

Skip-matrix (H7) is closed **only** for the intended App. This path never consults the matrix.

This is **not** parent T5 (“no post-merge gate on today’s `main`”). It is Option B re-introducing a skip-the-gate entry on a path the letters call equivalent.

**Why MAJOR, not BLOCKER**

- Default AD-23 in-run `needs` enforces the conjunct.
- Does not hand `DROPLET_*` to untrusted PR YAML.
- Does not touch Production SSH.
- Does not skip the gate / suppress / ref / tip-pin conjuncts.

**Required letter fix (any one is insufficient alone; do both or withdraw AD-24):**

1. Withdraw “equivalent,” **or** state AD-24 is not authorized until Deploy UAT itself refuses dispatchors other than `cohestra-uat-dispatch[bot]` **and** re-validates every named AD-17 `conclusion==success` on that SHA (AD-14 Checks-API forbid needs an AD-24 carve-out).
2. Keep XOR / N29. Default remains AD-23.

Until then, MAJOR remains unresolved. Migration plan’s own bar (BLOCKER=0, MAJOR=0 before PR-C/PR-D) is not met.

### F2 — MINOR — AD-24 App `actions:write` is a new Production-adjacent principal

GitHub cannot natively scope `actions:write` to one workflow. `cohestra-uat-dispatch` as specified could API-dispatch `deploy-production.yml` on `main`. Environment `production` still requires reviewer `fad16papa` and `can_admins_bypass=false` (parent VERIFIED), so this is not Production SSH. T20 already says actor permissions must not broaden; the AD-24 letter should name-deny Production (and any non-Deploy-UAT) dispatch in the App contract.

### F3 — MINOR — Same-branch workflows inherit a matching Environment ref

After AD-18, `ci.yml` / `uat-merge.yml` / `uat-correction.yml` / `uat-readiness.yml` on **`push` to `release/uat`** have `GITHUB_REF=refs/heads/release/uat` and **would** match Environment `uat`. Policy stops feature refs and `main`; it does **not** stop a control-plane file on the allowed branch. AD-16 (no auto-merge of workflows) and PR-C “must not add `environment: uat` to CI” are the real controls. N18 is scoped to PR-modified `deploy.yml`. Tighten the isolation contract: **every** workflow except the eligible Deploy UAT SSH job must be free of `environment: uat` and `secrets.DROPLET_*`.

### F4 — MINOR — AD-14 does not require pre-SSH re-evaluation

Live `deploy.yml` re-runs the gate in the SSH job. AD-14 describes `predeploy` then `deploy` `needs` `predeploy` and does not bind a second evaluation of tip-pin / conjunction. A newer `release/uat` push during a long AD-17/`predeploy` window (`cancel-in-progress: false`) can let the older run SSH a SHA that is no longer tip if only predeploy checked. Require the SSH job to re-assert AD-12 + AD-14 before `appleboy/ssh-action`.

### F5 — NIT — Simulator leftover-`workflow_run` assertion is tautological

`check("leftover workflow_run after PR-D is contract FAIL", True)` does not parse a workflow. Honest as a comment; it is not evidence that a given `deploy.yml` lacks the trigger. N25 still has to be a real fixture in PR-G.

### F6 — NIT — AD-16 path check should require normalization

`allowed_path_prefixes` / merge-tree comparison should reject `..`, symlink escapes, and case/Unicode lookalikes before subset test. Architecture intent is already “control-plane stays owner-merge.”

---

## Parent residuals (OPEN; not re-scored)

From `architecture-uat-automation-readiness-2026-11-01/CAT-SEC-THREAT-MODEL.md`. Option B correctly does **not** mark these PASS.

| ID | Residual | Option B stance |
| --- | --- | --- |
| T1 | Environment `uat` unrestricted (`protection_rules=[]`, `deployment_branch_policy=null`, `can_admins_bypass=true`) | AD-18 is owner UI, before gate true. Still FAIL live. |
| T3 | Dual-review Apps / producer absent | AD-3 inherited; Apps deferred. READY cannot be honest. |
| T5 | No dedicated post-merge gate on `main` today | AD-17/AD-23 are after PR-D. Not live. |
| T7 | HOLD artifact / `continue-on-error` honesty | PR-F later. Not a letter bypass. |
| T10 | #536 unimplemented | AD-15/AD-10: no merge token; still absent. |

T2 / T4 / T6 / T8 / T9 / T11 are unchanged in character; Option B does not worsen Production isolation (must-verify 4) and does not introduce `pull_request_target`.

N1 remains VERIFIED by run #451. N14–N31 are `NOT_RUN` until Draft PR-G. That is honest.

---

## T21 / T22

### T21 — Environment identity mismatch

**c6ec3370 design:** `workflow_run` of CI on `release/uat` + Environment `uat` allows only `release/uat`.

**Documented result:** Deploy UAT `GITHUB_REF=refs/heads/main` → policy DENY before AD-14 scripts. Checkout / `head_branch` cannot repair it. Leaving Environment unrestricted to let `workflow_run` through re-opens T1.

**Corrected letters:** do not keep that pair. AD-23 `push` / AD-24 `--ref release/uat` are the documented ALLOW identities. `workflow_call` would ALLOW and is forbidden. Leftover `workflow_run` is N25 FAIL, not a fallback.

**Status:** **MITIGATED / CLOSED-BY-DESIGN.** Evidence residual: live canary UNVERIFIED. Simulator `SIMULATE=PASS`. Do not treat the documented DENY as the only control.

### T22 — Post-merge completion race

**Old race:** CI completion starts Deploy UAT while AD-17 is pending → HOLD, no retry.

**Corrected letters:** AD-23 same-run `needs` (PENDING is not observable). Exclusive AD-24 App waits for named `conclusion==success`. Both-at-once is N29 FAIL.

**Status:** **MITIGATED / CLOSED-BY-DESIGN.** Do not fold F1 into T22: F1 is “SSH without tests,” T22 is “tests not finished, deploy HOLDs forever.”

---

## What these letters get right (so F1 is not a general reject)

- Fail-closed paradigm unchanged. CI PASS is not deploy authorization.
- AD-12 source is run `github.ref`, not SHA coincidence with `main`.
- AD-14 dual suppressor; gate never implies source; refuse on ref.
- AD-15 / AD-16 token split and main-store manifest.
- AD-18 / AD-20 / AD-22 official Environment identity.
- AD-21 drain without cancel-in-progress.
- AD-23 closed allowlist; evaluator must accept `push`; `commission-uat-hold` must not require `workflow_run`.
- Production RC on `main`; no silent promotion; `PROD_*` stay out of Deploy UAT.
- Parent catalog not retracted.

## Authorization statement

This review **does not** authorize: merging #535/#536/#505/#532/#533, creating `release/uat`, setting Environment policy, installing Apps, setting `UAT_MAIN_DEPLOY_SUPPRESSED` or `UAT_DEPLOY_GATE_ACTIVE`, SSH, or live secret/protection changes.

**Do not start PR-C or PR-D** until F1 is resolved in the letters (MAJOR=0) and a later independent review of that new HEAD agrees.

---

## Scoreboard

| Class | IDs |
| --- | --- |
| BLOCKER | — |
| MAJOR | F1 |
| MINOR | F2, F3, F4 |
| NIT | F5, F6 |
| Parent OPEN (not scored) | T1, T3, T5, T7, T10 |
| Closed-by-design | T21, T22 (and T12/T13/T14/T15/T16/T17/T18/T19/T20 as *letter* mitigations; T12/T13 still BLOCKER *if* the owner violates the written order) |

**Verdict:** CHANGES REQUIRED. BLOCKER=0. MAJOR=1. T21=MITIGATED (canary UNVERIFIED). T22=MITIGATED. Top finding: F1 AD-24 vacuous AD-17 / unauthenticated `workflow_dispatch`.
