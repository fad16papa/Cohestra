# Adversarial review — AD-14 / AD-15 / AD-20 / AD-21 / AD-23 / AD-25 / AD-26 / AD-27

**Lens:** Two implementers who obey every AD **Rule** letter and still ship one of:

1. Fast-forward or force-push of the live `main` tip into `release/uat`, or
2. First suppressor after `TARGET_SHA` checkout, or
3. A `GITHUB_TOKEN` merge that is treated as starting Deploy UAT, or
4. PR-C retarget of `on.workflow_run.branches`.

**Authority:** `ARCHITECTURE-SPINE.md` only. Companions (`ADR-OPTION-B.md`, `MIGRATION-PLAN.md`, `CAT-SEC-THREAT-MODEL.md`, `simulate-migration-contracts.py`, parent AD-2) named solely where an AD claims they close a join. Brownfield `deploy.yml` named as the PR-C insertion site, not as Option B after PR-D. Prior `reviews/*` ignored.

**Date:** 2026-11-02  
**Spine modified:** no

---

## Gate verdict

**PASS.** No letter-compliant pair ships any of the four named outcomes.

- BLOCKER: 0
- MAJOR: 0
- surviving pairs: none
- MINOR / NIT: residuals only; they do not restore a named attack

---

## Method

For each named attack: construct Implementer A and Implementer B, both reading every Rule body as written (AD-14, AD-15, AD-20, AD-21, AD-23, AD-25, AD-26, AD-27, plus inherited AD-2 where it binds the same suppressor). If the pair still produces the forbidden outcome, file BLOCKER or MAJOR. If a Rule sentence forbids one of the two readings, the pair is **CLOSED**.

Prevents-lines and N-ids are not extra licenses. They name the join the Rule claims. A weasel that evades one noun but trips another Rule sentence is CLOSED.

---

## Pair 1 — FF or force-push of live `main` tip into `release/uat`

**Attack (T23 / N34).** After PR-D lands on `main`, B updates `release/uat` by `git push --ff-only origin/main:release/uat`, a force-push, an admin-bypass FF, or an equivalent `git push origin main:release/uat` so the live Production-RC tip (app, Production workflows, #505) becomes the UAT integration tip.

**Units**

| Unit | Legal reading they claim |
| --- | --- |
| A | Owner control-plane PR targeting `release/uat`. Merge-tree for exclusive PR-D paths equals the PR-D-on-`main` `git ls-tree`. Unintended `main` paths stay out. If `main` moved after Q2, cherry-pick / same-patch of PR-D only. Merge is OWNER or AD-26 App token. |
| B | AD-20 needs the post-PR-D YAML on the `release/uat` tip so `push` executes that file. Q2 may be “current `main`”. If exclusive paths already match, FF is the fastest exclusive-tree match. “`git push --ff-only origin/main:release/uat`” is one spelling; `git push origin main:release/uat` or a GitHub compare-and-merge of `main` → `release/uat` is another. |

**Why B does not obey every Rule**

- AD-25 Rule, first sentence: do **not** `git push --ff-only origin/main:release/uat`, force-push, or bypass branch protection. Unconditional. Not gated on “if exclusive paths already match.”
- AD-25 Rule, required method: owner opens a control-plane PR targeting `release/uat`. FF / first-push of `main` is not that PR.
- AD-25 Rule: unintended `main` paths (app, Production workflows, #505) must not enter `release/uat` through this PR. An FF of the live tip enters those paths. N38 REFUSE.
- AD-25 when-clause: if `main` moved after the Q2 SHA, the sync PR is a same-patch / cherry-pick of PR-D **only**. Post-Q2 `main` always includes at least PR-D; if Q2 is `22ffe635` it also includes PR-C and any other RC commits. FF is not “PR-D only.”
- AD-21: `release/uat` is updated only by AD-25. A post-PR-D create-from-`main` or FF is an update that is not AD-25.
- AD-20: PR-D lands on `main`, then AD-25 syncs the **exclusive** tree onto `release/uat`. Exclusive ≠ live tip.
- AD-14 phase clock: PR-D on `main` → AD-25 sync PR into `release/uat` → PHASE_ARMED. No FF step.
- AD-15 / AD-25: the merge App must not force-push. Humans with OWNER may **merge** (user token / UI), not bypass protection.

Equivalent spellings (`--force-with-lease`, `+main:release/uat`, local `git merge --ff-only main` then push, GitHub “merge `main` into `release/uat`”) are still FF / force-push / unintended-path entry. Creating `release/uat` from the post-PR-D `main` tip is the same object as FF of the live tip; AD-21 + AD-25 refuse it as the update path.

A who cherry-picks only exclusive PR-D paths is the required unit. B is not letter-compliant.

**CLOSED.** Join claimed by AD-25 + AD-21 + AD-20 + N34 / N38.

---

## Pair 2 — first suppressor after `TARGET_SHA` checkout

**Attack (T25 / N36).** PR-C leaves the brownfield order (`Refuse unpinned TARGET_SHA` → `actions/checkout` of `TARGET_SHA` / `workflow_run.head_sha` → `validate-uat-predeploy-gate.sh`). The first thing that can HOLD on `UAT_MAIN_DEPLOY_SUPPRESSED` runs after the candidate tree is in the workspace. An old or hostile SHA omits the new var; `eligible` can become `true` while the owner believes `main` is suppressed.

**Units**

| Unit | Legal reading they claim |
| --- | --- |
| A | New step in default-branch `deploy.yml` **before** any `actions/checkout` of `TARGET_SHA` / `workflow_run.head_sha`. The step reads both vars from workflow env. Exact `UAT_MAIN_DEPLOY_SUPPRESSED==true` → HOLD that reason, `eligible=false`, write both evidence files **inline**, skip candidate validation. Exact `UAT_DEPLOY_GATE_ACTIVE!=true` → HOLD `#451`. Candidate-tree script is not the first suppressor. `workflow_run.branches` stays `[main]`. Script is defense-in-depth only. |
| B1 | “A step before checkout” is the existing `Refuse unpinned TARGET_SHA` step. Suppression lives in the script after checkout (PR-C exclusive includes that script). Defense-in-depth sentence licenses the script as a suppressor. |
| B2 | Inline HOLD exists, but `with.ref` is an alias (`env.SHA`, `github.sha`, `head_commit.id`) or a raw `git checkout` of the same object, so the named `actions/checkout` of `TARGET_SHA` still follows the HOLD. |
| B3 | Inline HOLD only in `predeploy-gate`. `delivery-outcome` / `deploy` still check out `TARGET_SHA` first (`if: always()` or after `eligible=true`). |

**Why B does not obey every Rule**

- AD-27 Rule: **That** step (the one PR-C adds) reads the two vars and HOLDs. The brownfield SHA-format step does not read `UAT_MAIN_DEPLOY_SUPPRESSED` and does not HOLD. B1 fails “that step.”
- AD-27 Rule: candidate-tree `validate-uat-predeploy-gate.sh` **must not** be the first suppressor. B1’s first suppressor is that script. Closed even if the script was also edited on `main`.
- AD-27 Rule: write both evidence files **inline** and **skip candidate validation** on suppression HOLD. Calling the candidate script to establish eligibility is forbidden. Inherited AD-2 still requires the gate HOLD before fetch; it does not license the script as the first new suppressor.
- AD-27 / T25 Prevents: candidate SHA checkout supplying a validator that omits the var. B2’s alias or raw `git checkout` of the candidate **is** checkout of `TARGET_SHA` / `workflow_run.head_sha` (the object the Rule names, not only the YAML identifier). If B2 then runs the candidate script as the first HOLD, they fail “must not be the first suppressor.” If B2’s first HOLD is the trusted inline step, they did not ship T25 (`eligible` cannot be granted by the omitted-var script). The named attack is “first suppressor after `TARGET_SHA` checkout” in the T25 sense: first **eligibility** suppressor is candidate-controlled. Trusted YAML HOLD is the first suppressor; the candidate script cannot establish `eligible=true` (AD-27 skip-candidate-validation).
- AD-14: SSH `eligible=true` only on the five-conjunct (gate, suppressed, `github.ref==refs/heads/release/uat`, AD-12 tip-pin, this-run AD-17 SUCCESS). During PR-C the deploy run `github.ref` is `main` (`workflow_run` / default branch). Gate true + `github.ref==main` is HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE` (N14), independent of the script. B cannot reach `eligible=true` on a `main` listener even if the candidate omits the new var.
- AD-14: PR-C installs AD-27 inline suppression on `main` without changing `workflow_run.branches`. Omitting the inline HOLD is not an install of AD-27.
- B3: `deploy` runs only if `eligible==true`. If A/AD-27/AD-14 already HOLDed, later jobs are not a first suppressor. `delivery-outcome` checkouts do not set `eligible`. Not the attack.

**CLOSED.** Join claimed by AD-27 + AD-14 + inherited AD-2 + N36.

---

## Pair 3 — `GITHUB_TOKEN` merge treated as starting Deploy UAT

**Attack (T24 inverted / N35 ignored).** `uat-merge.yml` (or an owner script) merges into `release/uat` with `secrets.GITHUB_TOKEN`. The implementer treats that merge as the start of Deploy UAT: either they assume the `push` listener fires, or they chain a `GITHUB_TOKEN` `workflow_dispatch` (documented exception) and call the merge the start.

**Units**

| Unit | Legal reading they claim |
| --- | --- |
| A | `cohestra-uat-merge` uses an installation access token on the pull-request merge API. GitHub emits a normal `push` to `refs/heads/release/uat`. AD-23 starts. Human OWNER UI / user token also emits `push`. Simulator is the required stand-in until the App exists. |
| B1 | `secrets.GITHUB_TOKEN` is “an installation token for this workflow.” Merge with it. Treat merge success as Deploy UAT started. |
| B2 | N35 expected is “No Deploy UAT `push` run.” Therefore a `GITHUB_TOKEN` merge is a licensed test/production path; start Deploy UAT via the documented `workflow_dispatch` / `repository_dispatch` exception (`simulate-migration-contracts.py` asserts `GITHUB_TOKEN workflow_dispatch still starts`). |
| B3 | Live App→`push` is UNVERIFIED, so fall back to `GITHUB_TOKEN` until the owner installs the App (Deferred). |

**Why B does not obey every Rule**

- AD-15 Rule: the only automation that may merge into `release/uat` is App `cohestra-uat-merge` with an **installation access token only (AD-26)**. `secrets.GITHUB_TOKEN` **must not** perform the merge. Humans merge with user token / UI, not `secrets.GITHUB_TOKEN`.
- AD-26 Rule: `GITHUB_TOKEN` must not be the merge credential. A `GITHUB_TOKEN` merge or push into `release/uat` is a contract FAIL (N35) — **AD-23 never starts.** Treating it as a start contradicts the same sentence.
- AD-26 documents the dispatch exception as a GitHub fact, not a license to merge with `GITHUB_TOKEN` or to start Deploy UAT from that merge. AD-23 `on:` may include optional `workflow_dispatch`; that does not make a `GITHUB_TOKEN` **merge** the start event.
- AD-24 (if that XOR is chosen): `GITHUB_TOKEN` must not start Deploy UAT. B2’s dispatch chain is forbidden under AD-24. Under default AD-23 the merge credential ban in AD-15/AD-26 still holds; B2 still performed the merge with `GITHUB_TOKEN`.
- AD-23: Deploy UAT starts from `push` to `release/uat` (or optional dispatch). A `GITHUB_TOKEN` `push` does not create that run. Calling the merge “the start” is a false start, which AD-26 names as N35 FAIL, not a HOLD that counts as having started.
- Deferred “install the App” does not rewrite AD-15/AD-26. UNVERIFIED is an evidence class, not a fallback credential.

A who uses the App token or OWNER UI is the required unit. B1–B3 are not letter-compliant.

**CLOSED.** Join claimed by AD-15 + AD-26 + AD-23 + N35.

---

## Pair 4 — PR-C retarget of `workflow_run.branches`

**Attack (T12 / N37).** PR-C changes `on.workflow_run.branches` from `[main]` to `[release/uat]`, `[main, release/uat]`, a second `workflow_run` entry on `release/uat`, or deletes `branches` so every branch listens.

**Units**

| Unit | Legal reading they claim |
| --- | --- |
| A | PR-C adds the AD-27 inline steps only. `on.workflow_run.branches` remains exactly `[main]`. `ci.yml` may gain `release/uat`; Deploy UAT does not. |
| B1 | Dual-listen during transition; HOLD (AD-27) makes extra branches safe. “Do not change away from `main`” allows **adding** `release/uat`. |
| B2 | Second `workflow_run` list item keeps a `[main]` entry and adds `[release/uat]`. The path `on.workflow_run.branches` still contains `[main]`. |
| B3 | Drop the `branches` filter (listen to all) or add `push: {branches: [release/uat]}` in the same PR as “CI expansion.” |

**Why B does not obey every Rule**

- AD-27 Rule: do **not** change `on.workflow_run.branches` (still `[main]`). Still `[main]` is the entire list, not a member of a larger list. Adding `release/uat` is a change. N37 contract FAIL.
- AD-14 Rule: PR-C installs AD-27 on `main` **without changing** `workflow_run.branches`.
- AD-1 Rule: in PHASE_MAIN_LISTEN and PHASE_SUPPRESS the file still lists `workflow_run.branches: [main]`. One `deploy.yml` at a time. PR-D is the retarget, not PR-C.
- AD-14 phase clock: PHASE_SUPPRESS → AD-21 drain → PR-D on `main`. PR-C is not authorized to retarget.
- AD-23: `push` to `release/uat` is after PR-D, and `workflow_run` is name-forbidden then. B3’s PR-C `push` is a PR-D file. Leftover `workflow_run` after PR-D is N25, not a PR-C license.
- A second `workflow_run` entry with `branches: [release/uat]` changes the trigger set away from `[main]`. AD-27 / N37 do not require the first list item to move before the change counts.

**CLOSED.** Join claimed by AD-27 + AD-14 + AD-1 + N37.

---

## Cross-joins that looked open and are not

These are the weasels that almost produced a pair. Each dies on a Rule sentence already cited.

| Weasel | Closed by |
| --- | --- |
| FF only when `main` tip tree equals exclusive PR-D paths | AD-25 “do **not**” FF is unconditional; simulator `ff_live_main_tip(False)` is DENY |
| Create `release/uat` from post-PR-D `main` (not an FF of an existing branch) | AD-21 “updated only by AD-25”; AD-25 required method is an owner PR |
| Merge `main` → `release/uat` via UI so exclusive `ls-tree` matches *and* other paths come along | AD-25 unintended-path ban; N38 |
| Alias / raw git materializes `TARGET_SHA` then trusted inline HOLD | First **eligibility** suppressor is still the inline YAML step; candidate script must not be first (AD-27); AD-14 N14 refuses `eligible=true` on `github.ref==main` |
| `GITHUB_TOKEN` merge + `workflow_dispatch` to “really” start Deploy UAT | AD-15 / AD-26 merge-credential ban; AD-24 also bans `GITHUB_TOKEN` as a Deploy UAT starter |
| `GITHUB_TOKEN` is “the App’s installation token in this workflow” | AD-15 / AD-26 name `secrets.GITHUB_TOKEN` as forbidden and require a distinct App installation access token |
| PR-C adds `release/uat` to `workflow_run.branches` but HOLDs on the new var | AD-27 “still `[main]`”; AD-14 “without changing”; HOLD is not a license to retarget |
| Leave `workflow_run` on `main` after PR-D as Environment-deny residual | AD-13 / AD-14 / AD-20 / AD-21: N25 FAIL of PR-D, not a licensed deny (out of the four attacks; already closed) |

---

## Residuals (not surviving pairs)

These are letter nits. They do not let two Rule-obedient implementers ship a named attack.

1. **AD-25 names one git argv.** Equivalent FF spellings are refused by the same sentence’s force-push / bypass / unintended-path clauses, not only the `--ff-only` token. NIT.
2. **AD-25 exclusive-path set is “`deploy.yml` and the PR-D exclusive scripts.”** Migration PR-D exclusive and `simulate-migration-contracts.py` `PR_D_EXCLUSIVE` are not identical (simulator omits fetch / provenance). Two exclusive-tree PRs can disagree on file set. Neither is an FF of the live `main` tip. MINOR join for PR-D packaging, not T23.
3. **AD-27 says `actions/checkout` of `TARGET_SHA`.** Intent is the candidate object. A raw `git checkout` of that SHA before the inline HOLD is ugly and should be name-forbidden in PR-C tests (N36). It does not by itself grant `eligible=true` if the inline step is the first suppressor and AD-14 N14 holds. NIT on action-name vs object.
4. **AD-27 “both evidence files” are unnamed** in the AD (brownfield: `uat-predeploy-gate.json` + `uat-delivery-status.json`). Naming drift is an AD-8 honesty issue, not a first-suppressor bypass. NIT.
5. **AD-26 / simulator: `GITHUB_TOKEN workflow_dispatch still starts` is a documented GitHub fact** (`check(..., True)`). It must not be read as a merge-credential license. The Rule already forbids that reading. NIT on the tautology.
6. **N35 table expected is “No Deploy UAT `push` run.”** The AD-26 Rule upgrades that to “contract FAIL — AD-23 never starts” plus “must not be the merge credential.” Implementers who only read the N-table still fail AD-15/AD-26 if they merge with `GITHUB_TOKEN`. Not a pair.
7. **Q2 remains open.** Pair 1 does not reopen: whatever the initial SHA, post-PR-D update is AD-25 exclusive PR, not FF of live `main`.
8. **Live App→`push`→Deploy UAT remains UNVERIFIED.** AD-26 names the simulator as required. Unverified is not a `GITHUB_TOKEN` fallback.

---

## What the letters already lock

- Protected `release/uat` after PR-D is not a fast-forward of `origin/main`. Exclusive-tree owner PR only (AD-25, AD-21, AD-20).
- PR-C first suppressor is trusted default-branch YAML, before candidate checkout, not `validate-uat-predeploy-gate.sh` (AD-27, AD-14, AD-2).
- Merge into `release/uat` that must start AD-23 uses an App installation token or OWNER UI. `secrets.GITHUB_TOKEN` cannot be that merge and cannot be treated as a start (AD-15, AD-26, AD-23).
- PR-C does not retarget `workflow_run.branches`. Still `[main]` until PR-D deletes `workflow_run` (AD-27, AD-14, AD-1, AD-23).

---

## Verdict

**PASS** — Rule letters close every constructed pair for the four named attacks. No unresolved BLOCKER or MAJOR. No surviving incompatible pair.
