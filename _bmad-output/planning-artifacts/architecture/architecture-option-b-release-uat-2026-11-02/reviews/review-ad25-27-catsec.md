---
name: CAT-SEC independent review — AD-25 / AD-26 / AD-27
type: cat-sec-review
status: complete
created: 2026-11-02
method: independent CAT-SEC
scope: AD-25 protected sync, AD-26 merge-token push, AD-27 trusted inline suppression
authority: https://github.com/fad16papa/Cohestra/issues/538
workspace: architecture-option-b-release-uat-2026-11-02
did_not_read: reviews/*
simulator: simulate-migration-contracts.py → SIMULATE_MIGRATION=PASS
---

# CAT-SEC — AD-25 / AD-26 / AD-27

Independent review of the Option B letters that close T23 / T24 / T25. This review does not retract the 2026-11-01 parent catalog (T1–T11) or the Option B catalog (T12–T22). Parent residuals **T1 / T3 / T5 / T7 / T10 remain OPEN**. Those OPEN rows are **not** new MAJORs of this letter.

**Not authorized to cut over. Not authorized to merge PR-C or PR-D.**

## Official facts used (not inferred)

| Fact | Use |
| --- | --- |
| A `GITHUB_TOKEN`-triggered `push` does **not** create a workflow run. Exceptions: `workflow_dispatch`, `repository_dispatch`. | T24 / AD-26 / N35 |
| Environment selected-branch policy matches the workflow run `GITHUB_REF`, not checkout, not `workflow_run.head_branch`. | T21 residual; AD-14 ref conjunct |
| Live App → `push` → Deploy UAT is **UNVERIFIED**. | T24 residual, not a new MAJOR |
| `simulate-migration-contracts.py` this review: `SIMULATE_MIGRATION=PASS`, `LIVE_APP_PUSH=UNVERIFIED`. | Required simulation |

## Evidence read

- `CAT-SEC-THREAT-MODEL.md` (T23–T25, N34–N38)
- `ARCHITECTURE-SPINE.md` AD-14, AD-15, AD-16, AD-20, AD-23, AD-25, AD-26, AD-27
- `MIGRATION-PLAN.md` PR-C / PR-D / AD-25 order, N34–N38
- `ENVIRONMENT-REF-ANALYSIS.md` (GITHUB_REF table)
- `ADR-OPTION-B.md`
- `simulate-migration-contracts.py` (executed)
- Live `main` `.github/workflows/deploy.yml` (T25 current hole only; not a review of unmerged implementation)

Did **not** read `reviews/*`.

## Must-verify

| Requirement | Result |
| --- | --- |
| No fast-forward procedure | **PASS.** AD-25 forbids `git push --ff-only origin/main:release/uat`, force-push, and admin-bypass. Migration step 8 and the owner checklist repeat the deny. Simulator: FF of live `main` tip is forbidden even when the tree is exclusive. N34 = contract FAIL. |
| Trusted inline suppression | **PASS.** AD-27 places the suppressor in default-branch `deploy.yml` **before** any `actions/checkout` of `TARGET_SHA` / `workflow_run.head_sha`. Vars are read from workflow env, not from the candidate tree. Candidate `validate-uat-predeploy-gate.sh` is defense-in-depth, not the first suppressor. N36. |
| Merge token starts `push` | **PASS (architecture / simulated).** AD-26 requires a GitHub App **installation access token** (or human OWNER UI). `secrets.GITHUB_TOKEN` merge/push is N35 FAIL — AD-23 never starts. Simulator: `GITHUB_TOKEN`+`push` does not start Deploy UAT; `installation` and `user_owner` do. Live App→`push` **UNVERIFIED**. |
| No AD-14 authorization bypass | **PASS for this letter.** No new conjunct is candidate-controlled once AD-27 is installed and the owner follows the suppress-then-drain-then-PR-D-then-gate order. Unordered `UAT_DEPLOY_GATE_ACTIVE=true` while `workflow_run` still listens to `main` remains catalogued **T12**, not a new finding. |
| Production isolation | **PASS.** Exclusive-tree allowlist refuses Production workflows and app paths (N38). AD-13 / AD-19 forbid `release/uat` → `main` automation. AD-15 merge App must not write `main` or read Environment `production`. AD-20 / T20 isolation contract keeps `PROD_*` out of `deploy.yml`. AD-24 App (if used) may dispatch only `deploy.yml` (N33). |

---

## Hostile walks

### H1 — Fast-forward live `main` into protected `release/uat` (T23)

**Walk.** After PR-D merges to `main`, an admin runs `git push --ff-only origin/main:release/uat` (or force-push / bypass). Live `main` may already carry Production-RC commits, `deploy-production.yml` edits, or #505 residue. Required checks on `release/uat` never run for those commits. Deploy UAT YAML on that tip is whatever `main` had, including any later non-PR-D files.

**Architecture response.** AD-25 deletes FF as a procedure. Prior letters that assumed FF are superseded. The only licensed update of `release/uat` after PR-D is an owner control-plane PR whose **exclusive-path** `git ls-tree` equals the PR-D-on-`main` tree. If `main` moved after Q2, the PR is a same-patch / cherry-pick of PR-D only. N34 = contract FAIL. Simulator `ff_live_main_tip(*)` is always false.

**Residual.** Creating the branch as unprotected, or leaving `can_admins_bypass=true`, is owner GitHub UI (T13 / parent T1 class). This agent must not set protections. That residual is **not** a new MAJOR of AD-25.

**Verdict:** T23 **CLOSED** as architecture. Severity if used as cutover procedure remains MAJOR; it is not the procedure.

### H2 — Unintended Production files in the AD-25 sync PR (T23 / T20 / N38)

**Walk.** Owner opens `main`…`release/uat` as a full-branch PR (not a cherry-pick). Merge-tree includes `src/Api/Program.cs`, `.github/workflows/deploy-production.yml`, `docs/adcp/README.md`, or other `main`-only paths. UAT line silently becomes a Production-RC mirror. A later AD-23 `push` would deploy that tree to the UAT droplet.

**Architecture response.** AD-25: unintended `main` paths (app, Production workflows, #505) must not enter `release/uat` through this PR. N38 = REFUSE. Simulator `sync_allowed` is exact-set equality against `PR_D_EXCLUSIVE`; adding `deploy-production.yml` is refused; omitting `deploy.yml` is refused.

**Residual (MINOR, not T23-reopen).** `PR_D_EXCLUSIVE` in the simulator is four paths (`.github/workflows/deploy.yml`, `deploy/validate-uat-predeploy-gate.sh`, `deploy/validate-deploy-uat-workflow.sh`, `deploy/commission-uat-hold.sh`). Migration-plan PR-D exclusive also names “predeploy/fetch scripts” and “provenance writer.” AD-25 itself says “`deploy.yml` and the PR-D exclusive scripts” without enumerating. An implementation that copies only the four-file set fail-closes on missing fetch/provenance (old `origin/main` tip-pin ≠ exclusive-sync SHA). An implementation that uses a **blocklist** of the three `UNINTENDED_MAIN` examples instead of the allowlist would be a later contract FAIL — that is not what AD-25 specifies.

**Verdict:** Hostile path REFUSE. Production files cannot ride a correct exclusive-tree check. MINOR inventory hygiene only.

### H3 — `GITHUB_TOKEN` merge (T24)

**Walk.** `uat-merge.yml` (or an owner Action) merges into `release/uat` with `secrets.GITHUB_TOKEN`. GitHub records a green merge. Documented: that `push` does **not** create a workflow run. AD-23 never starts. AD-17 / predeploy / SSH never run. Feature SHA is on the protected tip; monitors see “merged.” Silent stuck HOLD.

**Architecture response.** Official fact accepted. AD-15 + AD-26: `cohestra-uat-merge` uses an **installation access token** only; `secrets.GITHUB_TOKEN` must not perform the merge. Human OWNER UI merge emits a normal `push`. N35 = no Deploy UAT `push` run (contract FAIL of the merge credential, not a licensed residual). Simulator: `GITHUB_TOKEN`+`push` → false; `installation`+`push` → true; `user_owner`+`push` → true.

**Not a bypass.** `GITHUB_TOKEN` **can** start `workflow_dispatch` / `repository_dispatch` (documented exception). AD-23 may include optional `workflow_dispatch`. That does not rehabilitate a `GITHUB_TOKEN` merge: AD-26 forbids the merge credential itself. Under exclusive AD-24, `GITHUB_TOKEN` must not start Deploy UAT (App / permission contract, because GitHub **will** start a dispatch). Default is AD-23; merge App is not the dispatch App.

**Residual.** Live App→`push`→Deploy UAT is **UNVERIFIED** until the App exists. Required simulation is `SIMULATE_MIGRATION=PASS`. Not a new MAJOR.

**Verdict:** T24 **CLOSED** as architecture. BLOCKER if the merge App uses `GITHUB_TOKEN`; that use is forbidden.

### H4 — Candidate SHA omits the suppressor (T25)

**Walk.** PR-C only patches `validate-uat-predeploy-gate.sh`. Live `deploy.yml` (current `main`) does this today:

1. Refuse unpinned `TARGET_SHA` (no suppressor).
2. `actions/checkout` of `TARGET_SHA` / `workflow_run.head_sha`.
3. Run `deploy/validate-uat-predeploy-gate.sh` from **that** tree.

A delayed `workflow_run` for an old `main` CI SHA, or a hostile SHA, checks out a tree whose script never reads `UAT_MAIN_DEPLOY_SUPPRESSED`. Owner has set the var `true` and believes `main` is quiet. Candidate script can still reach `eligible=true` if the gate is also true (or if the old script’s only HOLD is gate-false and someone enabled the gate).

**Architecture response.** AD-27: PR-C adds a step on the **default-branch** `deploy.yml` **before** any `TARGET_SHA` checkout. The step reads `vars.UAT_MAIN_DEPLOY_SUPPRESSED` and `vars.UAT_DEPLOY_GATE_ACTIVE` from workflow env (GitHub vars, not git). Exact `UAT_MAIN_DEPLOY_SUPPRESSED==true` → HOLD that reason, `eligible=false`, write both evidence files inline, skip candidate validation. Exact `UAT_DEPLOY_GATE_ACTIVE!=true` → HOLD as #451. Candidate script must not be the first suppressor. N36. Simulator `inline_holds(suppressed=true, gate=true, candidate_script_has_suppressor=False)` → HOLD `UAT_MAIN_DEPLOY_SUPPRESSED is true`.

**Live confirmation that the hole is real today.** `predeploy-gate` env lists `UAT_DEPLOY_GATE_ACTIVE` only. Checkout of `TARGET_SHA` precedes the script. AD-27 is the close, not current `main`.

**Verdict:** T25 **CLOSED** as architecture. BLOCKER if the first suppressor stays candidate-controlled; AD-27 moves it to trusted YAML.

### H5 — PR-C changes `workflow_run.branches` (T25 / T12 / N37)

**Walk.** PR-C “helpfully” sets `on.workflow_run.branches` to `[main, release/uat]` or to `[release/uat]`. CI on `release/uat` then starts Deploy UAT via `workflow_run`. That run’s `GITHUB_REF` is the default branch (`main`) — official fact. Environment `uat`=`release/uat` would deny the `environment:` job (T21). If Environment `uat` is still unrestricted (parent T1, current audit FAIL), the job runs with `github.ref==refs/heads/main`. Dual-listen is first-merge / unordered-cutover (T12).

**Architecture response.** AD-27 and PR-C **Must not**: do not change `on.workflow_run.branches` (stays `[main]`). N37 = contract FAIL. Simulator: `["main"]` legal; `["main", "release/uat"]` illegal. PR-D later **deletes** `workflow_run` (N25). A leftover listener after PR-D is a PR-D FAIL, not a licensed Environment-deny.

**Defense while PR-C is live.** Gate stays unset/false → AD-27 inline HOLDs #451. Suppression var is implemented but owner-unset until drain. N37 is still a contract FAIL even when HOLD saves SSH.

**Verdict:** Path is a contract FAIL, not a licensed design. T25 / N37 **CLOSED** as architecture.

### H6 — Authorization bypass of AD-14

**Walk.** Attacker tries `eligible=true` without the full conjunction: `UAT_DEPLOY_GATE_ACTIVE==true` AND `UAT_MAIN_DEPLOY_SUPPRESSED==true` AND `github.ref==refs/heads/release/uat` AND AD-12 tip-pin AND every AD-17 job in **this run** SUCCESS.

| Attempt | Result |
| --- | --- |
| Old/hostile SHA omits suppressor after owner sets suppress | AD-27 inline HOLDs first (H4). |
| Gate true, suppress unset, `ref==main`, old SHA omits N14 | Inline HOLDs only on suppress==true **or** gate!=true. This window is **T12** (unordered cutover). Migration forbids enabling the gate before suppress, drain, PR-D, and AD-25. N14 remains a predeploy conjunct; it is not a new AD-27 hole. |
| `workflow_run` after PR-D | N25 contract FAIL of PR-D. |
| `workflow_dispatch --ref main` after PR-D | `GITHUB_REF` is `main` → N14 HOLD. Environment `uat`=`release/uat` does not match (AD-18 / AD-22). Feature-ref dispatch REFUSE (AD-20). |
| Skip AD-17 via UI/PAT dispatch | AD-23 / exclusive AD-24 re-run AD-17 in-run; `needs` skip SSH on SKIPPED/FAILURE (N31/N32). |
| New workflow on `release/uat` with `environment: uat` and no AD-14 | AD-16 forbids auto-merge of `.github/workflows/**`. Owner merge only. T14 / T16. |
| Merge App writes vars or Environment secrets | AD-15 deny. |

**Verdict:** No new AD-14 bypass introduced by AD-25/26/27. T12 stays in the Option B catalog if the owner enables the gate out of order. Parent T1 (unrestricted Environment `uat`) stays OPEN and is **not** a new MAJOR.

### H7 — Production via the new line (T20)

**Walk.** `release/uat` AD-23 `push` (or AD-24 dispatch) reuses `PROD_DROPLET_*`, names Environment `production`, or the merge/dispatch App starts `deploy-production.yml`. Or the AD-25 sync PR copies Production workflow / app onto the UAT line, then a later push deploys that tree. Or automation opens `release/uat` → `main`.

**Architecture response.**

- Isolation contract already forbids `PROD_*` in `deploy.yml` (inherited; keep it).
- AD-13 / AD-19: no automation opens or merges `release/uat` → `main`. State stays `AWAIT_BUSINESS_RELEASE`. N23.
- AD-15: merge App must not write `main`, must not read Environment `production`.
- AD-24 (exclusive, not default): App may dispatch **only** `deploy.yml`. N33 / N24.
- AD-25 exclusive-tree + N38 refuse Production files on the sync PR (H2).
- Production Environment remains require-`main` + reviewer (parent verified).

**Verdict:** Production is not opened by AD-23/25/26/27. T20 remains **BLOCKER if implemented**; it is not implemented in this letter. Residual host layout UNVERIFIED is parent T9, not a new MAJOR.

---

## Simulator

```text
SIMULATE_MIGRATION=PASS
AD-25 exclusive-tree ALLOW; live-main FF DENY; unintended paths REFUSE
AD-26 GITHUB_TOKEN push does not start Deploy UAT; installation/user does
AD-27 inline HOLD before candidate script; workflow_run.branches=[main]
LIVE_APP_PUSH=UNVERIFIED
```

Cases exercised: exclusive-tree allow; Production workflow refuse; missing `deploy.yml` refuse; FF forbidden with and without exclusive tree; `GITHUB_TOKEN` push silent; installation / OWNER push starts; inline HOLD when candidate omits suppressor; unset suppress + gate false matches #451; `workflow_run.branches` must stay `[main]`.

---

## Findings

Parent T1 / T3 / T5 / T7 / T10 OPEN — **not recorded as new MAJORs**.

Catalogued Option B residuals that this letter does not reopen: T12 (unordered gate), T13 (unprotected branch / owner UI), T21 live Environment canary UNVERIFIED, T24 live App→`push` UNVERIFIED.

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. **Exclusive-tree inventory is not one list.** AD-25, migration-plan PR-D exclusive, and `PR_D_EXCLUSIVE` in the simulator disagree on fetch/provenance scripts. Fail-closed today (missing intended path refuses; extra path refuses). Tighten to one enumerated allowlist before PR-D / AD-25 implementation so a four-file sync cannot be marked PASS while AD-12 scripts stay on the Q2 tree.

2. **AD-25 “Merge is human OWNER or AD-26 App token” must not be read as an AD-16 exception.** Auto-merge of `.github/workflows/**` / `deploy/**` stays denied (T16). The App-token clause is T24 (push authenticity), not a feature-manifest path grant. The AD-25 sync PR is owner control-plane. If the merge App is used, it is an explicit control-plane merge of that PR, not `allowed_path_prefixes` on a task manifest.

3. **`inline_holds` does not encode N14.** Gate true + suppress unset + candidate omits suppressor returns “not held.” That is T12 / N14, correctly out of T25’s first suppressor. Do not treat the function as a full AD-14 oracle.

### NIT

1. `check("GITHUB_TOKEN workflow_dispatch still starts", True)` is a tautology and does not call `push_starts_deploy`. That function returns false for every non-`push` event, so it does not model the documented `GITHUB_TOKEN` dispatch exception. Harmless for T24 (`push`); do not reuse it as an AD-24 GitHub-behavior oracle.

2. `UNINTENDED_MAIN` is three examples. The real check is the exclusive allowlist. Keep it that way.

---

## T23 / T24 / T25 status

| ID | Status | Residual |
| --- | --- | --- |
| T23 | **CLOSED** (architecture; N34 simulated) | Owner must create `release/uat` protected, `can_admins_bypass=false`, before any `environment: uat` job can run with the gate true. Owner UI. Not a new MAJOR. |
| T24 | **CLOSED** (architecture; N35 simulated) | `LIVE_APP_PUSH=UNVERIFIED`. Official `GITHUB_TOKEN`+`push` silence accepted. |
| T25 | **CLOSED** (architecture; N36 / N37 simulated) | N36/N37 `NOT_RUN` on live until Draft PR-C. Current `main` still checkouts `TARGET_SHA` before the script — that is the hole AD-27 closes. |

N14–N38 remain `NOT_RUN` until Draft PR-C/G. PR-C must ship N35–N37 simulations. N1 stays VERIFIED by run #451.

---

## Verdict

**ACCEPTABLE as a target** for AD-25 / AD-26 / AD-27. **BLOCKER=0. MAJOR=0.**

T23 / T24 / T25 are closed in architecture: no FF procedure, exclusive-tree refuse of unintended `main` / Production paths, merge credential must emit an authenticated `push`, trusted inline suppression before candidate checkout, `workflow_run.branches` stays `[main]` in PR-C, no new AD-14 bypass, Production stays off the new line.

**Not authorized to cut over.** Live App→`push` and Environment canary remain UNVERIFIED. Parent T1 / T3 / T5 / T7 / T10 remain OPEN and are not new MAJORs of this letter.
