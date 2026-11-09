# Independent BMAD rubric — AD-25 / AD-26 / AD-27

**Date:** 2026-11-02  
**Reviewer:** independent rubric walker (this file only; prior `reviews/*` not used as evidence)  
**Spine HEAD reviewed:** `/tmp/cohestra-534/_bmad-output/planning-artifacts/architecture/architecture-option-b-release-uat-2026-11-02/`  
**Inputs (read-only):** `ARCHITECTURE-SPINE.md` (AD-25, AD-26, AD-27, AD-14, AD-15, AD-21, AD-23), `ADR-OPTION-B.md`, `MIGRATION-PLAN.md`, `CAT-SEC-THREAT-MODEL.md`, `simulate-migration-contracts.py` (executed), plus companion `ENVIRONMENT-REF-ANALYSIS.md` for Production / trigger isolation.  
**Brownfield ratification (read-only, not amended):** live `.github/workflows/deploy.yml` @ this tree (still `workflow_run.branches: [main]`; first `actions/checkout` is `ref: TARGET_SHA`).  
**Does not authorize:** merge, deploy, SSH, gate activation, live protection or secret changes.

---

## Verdict

**PASS.** BLOCKER = 0. MAJOR = 0.

All five must-verify items PASS. Companions do not re-open fast-forward of live `main`, `GITHUB_TOKEN` merge as a legal AD-23 start, or a candidate-tree-first suppressor. Production isolation is unchanged. Residual findings are MINOR / NIT contract-precision items; they do not reopen the three closed holes.

---

## Simulator

```
$ python3 simulate-migration-contracts.py
SIMULATE_MIGRATION=PASS
AD-25 exclusive-tree ALLOW; live-main FF DENY; unintended paths REFUSE
AD-26 GITHUB_TOKEN push does not start Deploy UAT; installation/user does
AD-27 inline HOLD before candidate script; workflow_run.branches=[main]
LIVE_APP_PUSH=UNVERIFIED
EXIT:0
```

`LIVE_APP_PUSH=UNVERIFIED` is the honest residual AD-26 already names. It is not a letter defect.

---

## Must-verify

| # | Required lock | Result | Evidence |
| --- | --- | --- | --- |
| 1 | No assumed FF of live `main` into protected `release/uat`. AD-25 is owner PR + exclusive-tree match. | **PASS** | AD-25 Rule forbids `git push --ff-only origin/main:release/uat`, force-push, and admin bypass. Owner control-plane PR; `git ls-tree` of exclusive PR-D paths must equal PR-D-on-`main`; unintended `main` paths (app, Production workflows, #505) must not enter; if `main` moved after Q2 the sync is same-patch / cherry-pick of PR-D only. Conflicts table supersedes prior FF letters. ADR after-table, MIGRATION-PLAN steps 7–8 + checklist, CAT-SEC T23 / N34 / N38, simulator `ff_live_main_tip` always DENY (even when exclusive). |
| 2 | PR-C inline suppression is in default-branch `deploy.yml` **before** `TARGET_SHA` checkout. `workflow_run.branches` stays `[main]`. | **PASS** | AD-27: step on default-branch `deploy.yml` before any `actions/checkout` of `TARGET_SHA` / `workflow_run.head_sha`; reads `vars.UAT_MAIN_DEPLOY_SUPPRESSED` and `vars.UAT_DEPLOY_GATE_ACTIVE`; exact suppress → HOLD + `eligible=false` + both evidence files + skip candidate validation; gate ≠ true → #451 HOLD; candidate-tree `validate-uat-predeploy-gate.sh` must not be first suppressor; do not change `on.workflow_run.branches` (still `[main]`). AD-14 last sentence; ADR “does not change”; PR-C Purpose / Must not; T25 / N36 / N37; simulator `inline_holds` + `workflow_run_branches_legal(["main"])`. Live file today checks out `TARGET_SHA` first — that is the hole AD-27 closes, not a contrary letter. |
| 3 | Merge App uses installation token; `GITHUB_TOKEN` merge cannot start AD-23 `push`. | **PASS** | AD-15: pull-request merge API with installation access token only; `secrets.GITHUB_TOKEN` must not perform the merge. AD-26: documented GITHUB_TOKEN events do not create workflow runs except `workflow_dispatch` / `repository_dispatch`; GITHUB_TOKEN merge/push into `release/uat` is N35 contract FAIL — AD-23 never starts. Human OWNER UI merge emits `push`. Conventions “Merge token”. ADR after-table. PR-E Must not. T24 / N35. Simulator: `push_starts_deploy("GITHUB_TOKEN","push")` is False; `installation` and `user_owner` are True. |
| 4 | Companions do not re-open FF / `GITHUB_TOKEN` merge / candidate-first suppressor. | **PASS** | No companion letter treats FF of the live `main` tip, `GITHUB_TOKEN` merge, or candidate-script-first HOLD as a legal procedure. See companion walk below. |
| 5 | Production isolation unchanged. | **PASS** | ADR: Production stays `workflow_dispatch` from `main`, `PROD_DROPLET_*`, Environment `production`, two-parent provenance, `PRODUCTION CUTOVER: AUTHORIZED`; #505 / Production NO-GO. AD-13: no automated `release/uat` → `main`; Production provenance unchanged. AD-18: `PROD_DROPLET_*` stay on Environment `production`. AD-20: `deploy-production.yml` free of `environment: uat` / `DROPLET_*`. AD-24 / T20 / N24 / N33: dispatch App must not call `deploy-production.yml`. Seed: `deploy-production.yml` unchanged. Simulator refuses a sync that includes that file. `simulate-github-refs.py`: Environment `production` policy `main` DENY for `refs/heads/release/uat`. |

---

## AD walk (bound ADs)

### AD-25 — owner PR, exclusive-tree match, no FF

- **Prevents:** force-push or admin-bypass FF of the live `main` tip (and unintended Production-RC commits) into `release/uat`.
- **Rule is operational, not aspirational:** names the forbidden command (`git push --ff-only origin/main:release/uat`), the required writer (owner-opened control-plane PR), the acceptance check (`git ls-tree` equality on exclusive PR-D paths), the negative (unintended `main` paths must not enter), the drift rule (cherry-pick PR-D only if `main` moved after Q2), and the merge credential (human OWNER or AD-26 App token).
- **Join with AD-21:** PR-D merges to **`main`** only; `release/uat` is updated only by AD-25. After both copies exist, neither `deploy.yml` may retain `workflow_run` (N25).
- **Join with AD-20:** `workflow_dispatch` needs the file on the default branch, so PR-D lands on `main` first; AD-25 then syncs the exclusive tree onto `release/uat`. That path is control-plane (AD-16).
- **Does not assume FF.** Conflicts table: “Prior letters assumed PR-D fast-forward into `release/uat` — Superseded by AD-25.”

### AD-26 — installation token so AD-23 `push` starts

- **Prevents:** a merge performed with `GITHUB_TOKEN` that never starts Deploy UAT.
- **Documented GitHub fact (not inferred):** `GITHUB_TOKEN`-triggered events do not create new workflow runs except `workflow_dispatch` / `repository_dispatch`.
- **Required credential:** `cohestra-uat-merge` installation access token on the pull-request merge API. `GITHUB_TOKEN` must not be the merge credential.
- **Join with AD-15 / AD-23:** AD-15 already forbids `GITHUB_TOKEN` merge and names the installation token. AD-23’s happy path is `push` to `refs/heads/release/uat`; a silent non-start is N35, not an Environment-deny fallback.
- **Honesty:** live App→`push`→Deploy UAT is UNVERIFIED until the App exists; `simulate-migration-contracts.py` is the required simulation.

### AD-27 — trusted inline suppression before candidate checkout

- **Prevents:** candidate SHA checkout supplying a validator that omits `UAT_MAIN_DEPLOY_SUPPRESSED`.
- **Order is load-bearing:** default-branch YAML step **before** any `TARGET_SHA` / `workflow_run.head_sha` checkout. Candidate-tree `validate-uat-predeploy-gate.sh` is defense-in-depth, never the first suppressor.
- **Trigger lock:** do **not** change `on.workflow_run.branches` (still `[main]`). N37 if PR-C retargets.
- **Behavior matrix:** suppress exact `true` → HOLD `UAT_MAIN_DEPLOY_SUPPRESSED is true`; gate ≠ `true` → #451 HOLD; unset suppress + gate false = #451.
- **Join with AD-14:** PR-C installs this inline on `main` without changing `workflow_run.branches`. PHASE_SUPPRESS uses it; PR-D then deletes the listener.

### AD-14 — dual suppressor; gate never implies source

- SSH `eligible=true` only on the exact conjunction (gate + suppress + `github.ref==refs/heads/release/uat` + AD-12 tip-pin + every AD-17 job in **this run** SUCCESS).
- Phase order: PHASE_MAIN_LISTEN → PHASE_SUPPRESS → AD-21 drain → PR-D on `main` → **AD-25 sync PR** → PHASE_ARMED. No FF step.
- Explicitly binds AD-27 inline on `main` and keeps `workflow_run.branches` unchanged through PR-C.
- Leftover `workflow_run` after PR-D is N25, not an Environment-deny license.

### AD-15 — merge controller is not the correction controller

- Only App `cohestra-uat-merge` (distinct id from #535/#536) may automate merge into `release/uat`.
- Method: pull-request merge API with **installation access token only (AD-26)**.
- Must not force-push, must not write `main`, must not read Environment `uat` or `production` secrets, must not edit repository variables.
- `secrets.GITHUB_TOKEN` must not perform the merge.
- Does not re-open FF (force-push denied) or candidate-first suppression (out of scope; no contrary sentence).

### AD-21 — drain, then PR-D to `main`, then AD-25

- Concurrency `deploy-uat` / `cancel-in-progress: false` is load-bearing.
- Owner sets `UAT_MAIN_DEPLOY_SUPPRESSED=true`, waits for queued/in_progress/waiting/pending/requested runs to complete `eligible=false` / `ssh_executed=false`, **then** merges PR-D to `main`.
- `release/uat` is updated **only** by AD-25. This sentence is the anti-FF lock on the cutover path.
- “add `push` to `release/uat` under AD-23” is the **trigger** in `deploy.yml`, not a git FF of the branch.

### AD-23 — protected `push` + in-run `needs`

- Default after PR-D unless exclusive AD-24. `on:` is only `push: {branches: [release/uat]}` plus optional `workflow_dispatch`.
- Name-forbids `workflow_run` / `repository_dispatch` / `workflow_call` / `pull_request` / `pull_request_target`.
- Does not mention FF or `GITHUB_TOKEN` merge. Relies on AD-25 to place this YAML on `release/uat` and on AD-26 for the merge to emit a real `push`.
- Evaluator must accept `GITHUB_EVENT_NAME=push`. Does not treat leftover `workflow_run` as safe.

---

## Companion consistency (must-verify 4)

Walked for any sentence that would re-legalize (a) FF of live `main` tip, (b) `GITHUB_TOKEN` as the merge credential that starts AD-23, or (c) candidate-tree validator as the first suppressor.

| Companion | FF of live `main` | `GITHUB_TOKEN` merge → AD-23 | Candidate-first suppressor |
| --- | --- | --- | --- |
| `ADR-OPTION-B.md` | After-table: assumed FF **replaced** by AD-25 owner sync PR + exclusive-tree + no force-push. | After-table: merge with `GITHUB_TOKEN` **replaced** by AD-26 installation token. | “Does not change”: PR-C keeps `workflow_run.branches: [main]` and adds AD-27 inline **before candidate checkout**. |
| `MIGRATION-PLAN.md` | Graph `D → D25`; PR-D “lands on `main`”; `release/uat` “updated only by AD-25”; step 8 + checklist: no FF of live `main` tip. Initial create of `release/uat` from Q2 SHA is branch birth, not post-PR-D FF. | PR-E Must not: “Must not merge with `GITHUB_TOKEN` (AD-26).” Checklist: installation token, not `GITHUB_TOKEN`. PR-G ships N35. | PR-C Purpose: inline in default-branch `deploy.yml` **before** `TARGET_SHA` checkout; Must not change `workflow_run.branches` away from `[main]`. Hazard control: script is defense-in-depth; var unset matches #451. |
| `CAT-SEC-THREAT-MODEL.md` | T23: FF of `origin/main` onto `release/uat` is the attack; mitigation is AD-25; N34 contract FAIL. | T24 BLOCKER if merge App uses `GITHUB_TOKEN`; mitigation AD-26; N35. Trust-boundary lists `GITHUB_TOKEN merge push` as untrusted. | T25 BLOCKER if first suppressor is candidate-controlled; mitigation AD-27 before `TARGET_SHA` checkout; N36 / N37. |
| `ENVIRONMENT-REF-ANALYSIS.md` | No FF procedure. Adopted model is AD-23 `push` or exclusive AD-24 dispatch. | `GITHUB_TOKEN` must not start Deploy UAT (AD-24 dispatch). Does not license `GITHUB_TOKEN` merge as an AD-23 start. | Does not place the suppressor in the candidate tree. |
| `simulate-migration-contracts.py` | `ff_live_main_tip` always False; DENY even if exclusive. Unintended Production / app / #505 paths refused. | `GITHUB_TOKEN` + `push` does not start Deploy UAT; installation / OWNER user does. | Trusted YAML evaluated first; HOLD when candidate omits suppressor; `workflow_run.branches` must equal `["main"]`. |

No companion re-opens the three holes.

---

## Production isolation (must-verify 5)

Unchanged across the bound letters:

- Trigger: `workflow_dispatch` from `refs/heads/main` only.
- Secrets: `PROD_DROPLET_*` / Environment `production` only; isolation contract keeps `PROD_*` out of `deploy.yml`.
- Provenance: two-parent + `PRODUCTION CUTOVER: AUTHORIZED`.
- No automation opens or merges `release/uat` → `main` (AD-13, AD-19 `AWAIT_BUSINESS_RELEASE`).
- AD-24 App may dispatch only `.github/workflows/deploy.yml` (N33). Concurrency `deploy-uat` must never be `deploy-production`.
- #505 / retired ADCP / Production activation remain NO-GO.
- AD-25 sync that includes `.github/workflows/deploy-production.yml` is refused by the required simulator.

---

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

**M1 — Required simulator exclusive set is a subset of PR-D exclusive prose.**  
`simulate-migration-contracts.py` `PR_D_EXCLUSIVE` is:

- `.github/workflows/deploy.yml`
- `deploy/validate-uat-predeploy-gate.sh`
- `deploy/validate-deploy-uat-workflow.sh`
- `deploy/commission-uat-hold.sh`

MIGRATION-PLAN PR-D Exclusive also names “predeploy/fetch scripts” and “provenance writer”. Live Deploy UAT calls `deploy/fetch-origin-main.sh` and `deploy/lib/uat-predeploy-gate.py` (via the gate script). AD-25’s acceptance check is `git ls-tree` of “`deploy.yml` and the PR-D exclusive scripts” but does not close-enumerate those scripts. A cutover agent that treats the simulator ALLOW set as the exclusive-tree oracle could sync four files, omit fetch / `.py` / provenance, and still print `SIMULATE_MIGRATION=PASS`.

This does **not** re-open FF (FF remains DENY even when exclusive). Worst realistic miss is a new `release/uat` `deploy.yml` calling an unsynced old fetch / gate library. That is fail-closed or a later PR-D test miss, not live-`main` FF and not Production. Close by enumerating the exclusive path set in AD-25 and in `PR_D_EXCLUSIVE` to match PR-D Exclusive, and by adding a “missing fetch / provenance is refused” check beside “missing `deploy.yml` is refused.”

**M2 — AD-25 “Merge is human OWNER or AD-26 App token” vs AD-16 owner-only control-plane.**  
AD-16: paths under `.github/workflows/**` and `deploy/**` require a separate owner merge and must not appear in an auto-merge manifest. AD-25’s sync PR *is* those paths. Allowing `cohestra-uat-merge` to merge that PR is a credential reuse, not a FF / `GITHUB_TOKEN` reopen. Prefer: human OWNER merges the AD-25 PR; the App token remains the AD-16 feature-PR merger only. If the App is used, name it as an owner-initiated exception, not AD-16 auto-merge.

### NIT

**N1 — Vacuous simulator assertion.**  
`check("GITHUB_TOKEN workflow_dispatch still starts", True)` always passes and does not call `push_starts_deploy`. The documented exception belongs in the function or should be dropped.

**N2 — `ff_live_main_tip` is `… and False`.**  
The parameter `includes_unintended` cannot change the result. `return False` is enough.

**N3 — AD-21 drain statuses vs migration step 6.**  
AD-21 lists `queued`, `in_progress`, `waiting`, `pending`, `requested`. Migration step 6 omits `pending`. Align the checklist to AD-21.

**N4 — AD-21 “add `push` to `release/uat`”.**  
Readable as a git push. Adjacent sentence (“`release/uat` is updated only by AD-25”) already forbids that reading. Could say “add the AD-23 `on.push` trigger.”

---

## Classification notes

- T23 (FF of live `main`) is CAT-SEC **MAJOR if used as the cutover procedure**. The letters now forbid that procedure. Residual risk is owner admin-bypass in the GitHub UI, which AD-18 / AD-25 already name as owner-only (`can_admins_bypass=false`). Not a letter FAIL.
- T24 / T25 remain BLOCKER **if implemented wrong**. The target letters close both. This review scores the letters, not an unwritten PR-C/E.
- Live App→`push` and Environment canary stay `UNVERIFIED`. Required evidence class is `SIMULATED_PASS` until the App exists.

---

## Close condition

This rubric is closed on the current letters when:

1. Must-verify 1–5 remain PASS (they do).
2. BLOCKER = 0 and MAJOR = 0 (they are).
3. M1 is acceptable as a later PR-D / simulator enumeration (does not block this architecture wave).
4. M2 is acceptable as an AD-16 join note (does not re-open AD-25/26/27).

**Architecture target for AD-25 / AD-26 / AD-27 is accepted. Not authorized to cut over, merge PR-C/D/E, set vars, or change live protections.**
