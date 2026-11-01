# Reviewer — independent BMAD + CAT-SEC (corrected Option B)

- **Scope:** Corrected Option B architecture (Environment identity + post-merge completion). Independent of prior review letters.
- **Inputs (required):** `ARCHITECTURE-SPINE.md`, `ENVIRONMENT-REF-ANALYSIS.md`, `CAT-SEC-THREAT-MODEL.md`, `MIGRATION-PLAN.md`, `simulate-github-refs.py`
- **Companions loaded for join:** `ADR-OPTION-B.md` (spine-listed), `.memlog.md`
- **Parent:** `architecture-uat-automation-readiness-2026-11-01` spine + CAT-SEC (T1–T11)
- **Live brownfield (read-only ratification):** `.github/workflows/deploy.yml`, `.github/workflows/deploy-production.yml`
- **Official docs fetched 2026-11-02:** [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- **Simulator:** `python3 simulate-github-refs.py` → `SIMULATE=PASS` (exit 0). `LIVE_CANARY=UNVERIFIED`
- **Reviewer:** independent BMAD (adversarial + edge-path + acceptance) and CAT-SEC
- **Date:** 2026-11-02
- **Altitude:** feature
- **Spine modified:** no
- **Prior reviews in this folder:** treated as stale (they describe pre-AD-22/AD-23 letters). Not used as evidence.

## Verdict

**FAIL**

The corrected *binding* design (spine AD-12…AD-24, Environment-ref analysis, CAT-SEC T21/T22/N25, migration PR-D, simulator) closes the six must-verify planes:

1. Post-cutover Deploy UAT is not `workflow_run` + Environment `uat`=`release/uat`.
2. Post-merge is same-run `needs` (AD-23). The CI-first stuck-HOLD race is not the adopted trigger.
3. AD-23 is the adopted trigger.
4. AD-24 is exclusive, not both.
5. Production isolation is unchanged.
6. The new trigger/Environment/needs chain does not bypass deploy authorization.

One companion still *specifies* the denied pair as the after-cutover target. That is a remaining design, not a comment.

---

## Must-verify results

| # | Check | Result | Note |
| --- | --- | --- | --- |
| 1 | No remaining design uses `workflow_run` + Environment `uat`=`release/uat` | **FAIL (MAJOR M1)** | Binding ADs, analysis, CAT-SEC verdict, PR-D, and simulator **deny** that pair. `ADR-OPTION-B.md` after-table still **adopts** it |
| 2 | No post-merge race (CI completes first, deploy stuck HOLD) | **PASS** | AD-17/AD-23 same-run `needs`. AD-24 only after `success()`. N26/N27. Simulator pending/SKIPPED/FAILURE/CANCELLED block deploy |
| 3 | AD-23 same-run `needs` is the adopted trigger | **PASS** | Analysis “Primary (AD-23): Model C.” Capability map. Seed `deploy.yml` after PR-D. AD-24 is the refused-combined-file alternative |
| 4 | AD-24 is exclusive, not both | **PASS** | AD-24 Rule, analysis “not both,” PR-D Must-not, seed `post-merge-uat.yml` omitted under AD-23 |
| 5 | Production isolation unchanged | **PASS** | AD-13, T20, N24, seed `deploy-production.yml` unchanged. Live file still `workflow_dispatch` + `require-main` + `PROD_DROPLET_*` + `environment: production` + `concurrency: deploy-production` |
| 6 | No authorization bypass | **PASS for the correction** | See Authorization walk. Residual merge-App PR-YAML placement is PR-E later, not introduced by AD-22/AD-23 |

---

## Official-doc ratification (AD-22)

Fetched, not inferred:

| Trigger | Documented `GITHUB_REF` | Matches analysis / simulator |
| --- | --- | --- |
| `workflow_run` | Default branch | Yes (`refs/heads/main` here) |
| `repository_dispatch` | Default branch | Yes |
| `push` | Updated ref | Yes (`refs/heads/release/uat` on that push) |
| `workflow_dispatch` | Branch or tag that received the dispatch | Yes |

Environment “Selected branches and tags”: “The deployment branch or tag rule is matched against the `GITHUB_REF` of the workflow run.” Checkout, `workflow_run.head_branch`, and `ORIGIN_UAT_REF` do not change that value.

Therefore: `workflow_run` Deploy UAT **cannot** satisfy Environment `uat` policy `release/uat`. Option B cannot keep both. AD-22/AD-23/AD-24 are the only legal resolutions. Live canary of that pair remains UNVERIFIED (honest).

---

## Rubric checklist

| Good-spine / CAT-SEC test | Result | Note |
| --- | --- | --- |
| First-merge / dual-trigger fail-closed | **PASS** | AD-14 exact conjunction; N14 HOLD on `github.ref==refs/heads/main` independent of the suppression var; after PR-D no `workflow_run` so `main` cannot start the workflow |
| Environment identity is `GITHUB_REF` | **PASS** | AD-22 + documented table + simulator. `head_branch` / checkout explicitly non-identity |
| Post-merge completion race | **PASS** | Same-run `needs`. No polling. Retry = re-run the same workflow |
| AD-23 adopted; AD-24 exclusive | **PASS** | See must-verify 3–4 |
| Untrusted PR / privileged Deploy UAT YAML | **PASS for Deploy UAT** | After PR-D YAML is the protected `release/uat` tip; AD-16 forbids auto-merge of `.github/workflows/**`; no `environment: uat` / `DROPLET_*` on `pull_request` / `pull_request_target`; feature-ref dispatch REFUSE |
| #536 cannot merge | **PASS** | AD-15 merge API only; distinct App; ruleset denies; N19 |
| Environment `uat` restriction | **PASS as owner residual** | AD-18 before PR-D **and** before gate true. T1 remains FAIL until owner UI |
| No auto promotion to `main` | **PASS** | AD-13, AD-19, T19, N23 |
| Production isolation | **PASS** | Unchanged dispatch/`PROD_*`/Environment `production` |
| Every AD Rule prevents its stated divergence (correction set) | **PASS** | AD-12 ref (not SHA); AD-13 no listener; AD-14 conjunction; AD-22/23/24 |
| Inherited ADs not silently weakened | **PASS with residual** | Conflicts table records AD-1/AD-5/AD-9/c6ec3370. Epic 45 AD-5 CI-on-`main` still omitted (MINOR) |
| Companions do not re-open an opposite outcome | **FAIL** | ADR after-table re-opens T21 (MAJOR M1). CAT-SEC T14 mitigation sentence is stale (MINOR) |
| Nothing under Deferred lets two units diverge on this correction | **PASS** | Owner UI / Apps / gate-true / Q1–Q3 do not restore `workflow_run` after PR-D |
| Named tech / brownfield | **PASS for this lens** | Live `deploy.yml` still `workflow_run.branches: [main]` + `ORIGIN_MAIN_REF` (AD-1). Option B is not pretending cutover landed |

---

## Required-check walks

### 1. Remaining `workflow_run` + Environment `uat`=`release/uat` — FAIL (companion)

**Binding letters (deny the pair)**

- AD-12: source ref is `github.ref` of the deploy run. Do not use `workflow_run.head_branch` as Environment identity.
- AD-13: after PR-D, Deploy UAT has **no** `workflow_run`. Residual listener = contract FAIL.
- AD-14: after PR-D, `workflow_run` must not exist.
- AD-17: do not start deploy from a `workflow_run` of CI (races AD-17 and breaks AD-22).
- AD-20: leftover `workflow_run` forbidden because its `GITHUB_REF` is `main`.
- AD-21: PR-D removes `workflow_run`, adds `push` to `release/uat`.
- AD-22: documented deny of the pair. Simulator required. Live canary UNVERIFIED.
- AD-23: `on.push.branches` exactly `[release/uat]`. No `workflow_run`.
- AD-24 Prevents: a second CI/`workflow_run` deploy.
- Conventions: “Never `workflow_run`.” Production unchanged.
- Conflicts: c6ec3370 `workflow_run` after cutover **superseded** by AD-22/AD-23.
- Analysis: Models A and B rejected. Adopted C (AD-23) or exclusive D (AD-24).
- CAT-SEC T21/T12/T17/N25 and the threat-model verdict: documented deny.
- Migration PR-D: “Must not keep `workflow_run`.” Safe order step 7 deletes it. Checklist: no Deploy UAT `workflow_run` remains.
- Simulator: `workflow_run GITHUB_REF=refs/heads/main ENV_uat=DENY`.

Pre-cutover `PHASE_MAIN_LISTEN` / `PHASE_SUPPRESS` still list `workflow_run.branches: [main]`. That is AD-1 (live today). Environment `uat` is still unrestricted (audit FAIL). That is **not** the forbidden pair. After the owner sets AD-18 and before PR-D, a leftover `workflow_run` is fail-closed (ref=`main` ≠ policy).

**Remaining design that still adopts the pair**

`ADR-OPTION-B.md` (spine companion, `status: accepted-target`) “What Option B changes after cutover”:

| After owner-authorized cutover |
| --- |
| `workflow_run` CI on `release/uat` only |
| Environment `uat` allows `release/uat` only |

That is exactly T21 / c6ec3370. Two builders:

| Builder | Letter obeyed | Post-cutover Deploy UAT |
| --- | --- | --- |
| S | AD-13 / AD-23 / PR-D / N25 | `push` + in-run `needs`. No `workflow_run` |
| A | ADR after-table | `workflow_run` of CI on `release/uat` + Environment policy `release/uat` |

A cannot compose with S. A is the documented deny (job rejected before AD-14, or Environment left unrestricted → T1).

CAT-SEC T14 mitigation still says “`workflow_run` uses the default-branch workflow.” That is stale AD-20 prose, not a second adopted trigger. Logged MINOR, not a second MAJOR.

Prior reviews in this folder (`review-blocker-recheck.md` still writes “after PR-D, `on.workflow_run.branches` is exactly `[release/uat]`”) describe **older** letters. They are not current design. Do not implement from them.

### 2. Post-merge race — PASS

T22 vector: CI `workflow_run` starts Deploy UAT while AD-17 jobs are still pending → predeploy HOLD → no later event retries → a green `release/uat` never deploys.

Adopted path (AD-23 / analysis “Post-merge completion contract”):

```
push release/uat
  → required AD-17 jobs (no environment)
  → predeploy (no environment; AD-14)
  → deploy (environment: uat; needs: every required job AND predeploy; if eligible)
```

| Event | SSH job |
| --- | --- |
| All required SUCCESS + AD-14 PASS | Starts (gate still required) |
| Any FAILURE / CANCELLED / SKIPPED / pending | Skipped / not eligible |
| Duplicate CI `workflow_run` | Does not start Deploy UAT after PR-D |
| Stale SHA / not tip | Predeploy HOLD |
| Newer commit | New run; old run tip-pin HOLDs |
| Retry | Re-run the same workflow on the same SHA |

`ci.yml` on `release/uat` remains a pre-merge / extra push signal. It is not a deploy trigger and not an alternate gate (AD-17). No polling. No “wait for a later check-run.” Happy path does not require manual dispatch.

AD-24 (exclusive): dispatch only after post-merge `success()`. That alternative cannot start while jobs are pending.

Simulator asserts pending / FAILURE / CANCELLED / SKIPPED / predeploy HOLD cannot start deploy.

### 3. AD-23 is adopted — PASS

- Analysis: “**Primary (AD-23):** Model C.”
- AD-23 Rule: `on.push.branches: [release/uat]`; optional `workflow_dispatch` only on `refs/heads/release/uat`; AD-17 jobs in this workflow without `environment: uat`; SSH `needs` every required job.
- Capability map: post-merge tests live in the same `deploy.yml` run (AD-17, AD-23).
- Seed: `deploy.yml` after PR-D is push + in-run needs. `post-merge-uat.yml` is AD-24 only.
- Migration PR-D purpose matches AD-23.

AD-23’s optional `workflow_dispatch` is owner/manual re-run of the **combined** file (same-run jobs still execute). It is not AD-24.

### 4. AD-24 exclusive — PASS

- AD-24: “Implement AD-23 or AD-24, not both.”
- Analysis: “**Equivalent (AD-24), not both.**”
- PR-D Must-not: “Must not implement AD-23 and AD-24 together.”
- Seed omits `post-merge-uat.yml` under AD-23.
- Conventions: “`push` … (AD-23) **or** exclusive AD-24.”

AD-24 Prevents “a second CI/`workflow_run` deploy,” so a builder cannot keep a CI listener “as backup.”

Residual (MINOR, not a second adopted path): AD-17 still *Binds* `.github/workflows/post-merge-uat.yml` while the Rule places those jobs in Deploy UAT. Under AD-23 the bind is stale. Under AD-24, AD-14’s “every AD-17 job in **this run** is SUCCESS” requires the deploy run to contain those jobs (re-run on dispatch) or SSH is fail-closed. Join is fail-closed, not a bypass.

### 5. Production isolation — PASS

Unchanged by the correction:

| Control | Evidence |
| --- | --- |
| Dispatch from `refs/heads/main` | Inherited Production owner-only; AD-13; live `require-main` |
| `PROD_DROPLET_*` / Environment `production` | AD-18; T20; isolation contract; live `deploy-production.yml` |
| Concurrency `deploy-production` | Conventions: never share with `deploy-uat` |
| No `release/uat` → `main` automation | AD-13, AD-19, T19, N23 |
| Production dispatch from `release/uat` | N24 REFUSE |
| Seed | `deploy-production.yml` unchanged |
| ADR “does not change” | Production phrase, `PROD_*`, Environment, two-parent provenance |

T20: Production actor permissions must not broaden. Adopted AD-23 adds no Production-capable App. AD-24’s dispatch App is `actions: write` without Environment secrets and is not the adopted path; N24 still REFUSE.

### 6. Authorization bypass — PASS for this correction

Hostile walks against the **corrected** trigger / Environment / needs chain. Untrusted inputs must not become `DROPLET_*`, Production secrets, or a `main` write.

| Attempt | Outcome | Lock |
| --- | --- | --- |
| `workflow_run` + checkout `release/uat` / read `head_branch` | Environment deny; leftover listener is contract FAIL | AD-22, N25, simulator |
| `repository_dispatch` | `GITHUB_REF=main`; Environment deny | AD-22, analysis Model B rejected |
| Feature-ref `workflow_dispatch` | REFUSE; `github.ref` ≠ `release/uat` | AD-20, AD-14, AD-18 |
| Dispatch `--ref main` after cutover | HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE`; Environment deny | AD-14 / N14, AD-18 |
| Gate true, suppression unset, trigger `main` | HOLD N14 (ref, not SHA) | AD-14 |
| Gate true, suppression true, `github.ref=main` | HOLD N14 | AD-14 |
| Same SHA on `main` tip and `release/uat` tip | `main` ref still REFUSE | AD-12 |
| CI completes; AD-17 still pending | Deploy UAT does not start (no listener); same-run `needs` would skip SSH | AD-17, AD-23, T22, N27 |
| Required job SKIPPED / CANCELLED / FAILURE | SSH skipped | AD-17, AD-23, N26 |
| AD-17 jobs declare `environment: uat` | Forbidden | AD-18, AD-23 |
| `eligible=true` without gate / suppress / tip-pin / this-run SUCCESS | Conjunction fails; no Environment attach | AD-14, AD-2, Epic 45 AD-3 |
| PR-modified `deploy.yml` under `pull_request` | No `DROPLET_*`; no `environment: uat` | AD-20, N18, T14 |
| Auto-merge of `.github/workflows/**` or `deploy/**` | Denied | AD-16 |
| `GITHUB_TOKEN` starts Deploy UAT | Forbidden under AD-24; AD-23 is `push` | AD-24 |
| Merge App force-push / write `main` / read Environment secrets | Denied; owner ruleset required | AD-15 |
| Auto `release/uat` → `main` | No PR opened | AD-13, AD-19, T19, N23 |
| `PROD_*` in Deploy UAT | Isolation contract + T20 | inherited, N24 |
| Queued pre-retarget run SSHs after “main is quiet” | Drain list includes `requested`; wait HOLD; no cancel | AD-21, N16 |
| Inline HOLD skipped because Q2 SHA lacks suppressor scripts | HOLD lives on the workflow file GitHub executes | AD-14, AD-20 |

`UAT_DEPLOY_GATE_ACTIVE` exact `true` remains the SSH brake (AD-2 not replaced). Missing evidence is HOLD. CI PASS is not deploy authorization.

**Not claimed closed by this correction (out of close-criteria; not MAJOR here):**

- Merge-App private key as a repository secret visible to same-repo `pull_request` `uat-merge.yml` (parent T2 shape for PR-E). AD-20 still names UAT secrets, not the merge credential. `uat-merge.yml` is “AD-15 later.”
- Parent T1 Environment unrestricted until owner AD-18.
- Parent T3 review Apps uninstalled; AD-3 human fallback still inherited. AD-16 requires named check-runs on branch policy before auto-merge.
- Live canary UNVERIFIED.

Those residuals do not restore `workflow_run`+restricted Environment, the CI-first race, dual AD-23/AD-24, Production via the new line, or an eligible SSH without the AD-14 conjunction.

---

## CAT-SEC catalog vs correction

| ID | Status on corrected letters |
| --- | --- |
| T12 first-merge / dual-trigger | Closed by no `workflow_run` after PR-D + AD-14 conjunction + AD-22 deny on leftovers |
| T13 unprotected `release/uat` well | Owner residual; policy + protection before gate true (AD-18, migration steps 3–4) |
| T14 branch-modified privileged workflow | Deploy UAT closed (AD-20/AD-16). Mitigation sentence still says `workflow_run` YAML-from-default (MINOR) |
| T15 correction controller self-merge | Closed (AD-15, N19) |
| T16 auto-merge control-plane / PR-head manifest | Closed in AD-16 (file on `main`; `TASK.md` evidence only; control-plane prefixes + billing/auth/migration/#505) |
| T17 stale `workflow_run` replay | Closed if PR-D deletes the trigger; leftovers Environment-denied (AD-22) |
| T21 Environment identity mismatch | Closed as *adopted* design. Re-opened as *specified* design in ADR (M1) |
| T22 post-merge completion race | Closed by AD-23; AD-24 only after `success()` |
| T18 wrong tree | Inherited AD-7 + AD-17 provenance |
| T19 silent promotion | Closed (AD-13/AD-19) |
| T20 Production via new line | Closed (isolation kept) |
| Parent T1, T3, T5, T7, T10 | Still open. Honest. Option B does not mark them PASS |

N14–N16, N25–N27 match the corrected Rules. N1 remains VERIFIED by run #451 (gate false). N14–N27 are `NOT_RUN` until Draft PR-G. Correct.

---

## Adversarial / edge residuals (not MAJOR)

Ten issues were found. Only M1 is MAJOR. The rest do not re-open SSH, Environment identity, the race, dual triggers, Production, or an eligibility bypass.

### MINOR

1. **CAT-SEC T14 mitigation is stale.** Still: “`workflow_run` uses the default-branch workflow.” After PR-D, AD-20 executes Deploy UAT YAML from the `release/uat` tip. Do not keep a listener “for YAML safety.”
2. **AD-17 Binds `post-merge-uat.yml`** while AD-23 omits that file and places the jobs in `deploy.yml`. Fail-closed if someone splits files without re-running jobs in the deploy run (AD-14 “this run”).
3. **AD-16 “Production interfaces”** still has no path list. Isolation contract (secret names / `environment: production`) is the real Production lock. Path classifier drift is merge-allowlist only.
4. **Epic 45 AD-5 (CI-on-`main` + `workflow_run.head_sha`)** is not in Inherited or Conflicts. AD-17/AD-23 supersede the trigger; say so so a parent-only reader does not keep a listener.
5. **Q2 may still be `22ffe635`.** Safe because AD-14 HOLD is inline on the executed workflow file, not only on SHA-tree scripts. Fast-forward `release/uat` to post-PR-D `main` remains the migration letter.
6. **H graph lists E/F → H; checklist does not name PR-E/PR-F.** First live SSH can occur with owner merge and without the acceptance writer. AD-15 is not required for first SSH; AD-19 binds “after live UAT acceptance.” Composition smell, not a trigger hole.
7. **T16 still lists “repository variable / signed OWNER comment **or** file on `main`.”** AD-16 picks the file. Neither arm is PR-head.
8. **N17 title** still reads “candidate is `main` tip.” AD-12/AD-14 refuse on **ref**. A SHA-inequality N17 would false-HOLD a same-SHA `release/uat` deploy (fail-closed), not authorize `main` SSH.
9. **Simulator does not encode AD-23 XOR AD-24** or Production `require-main`. Docs+Rules do. Completeness, not a contradicting sim.
10. **`workflow_dispatch` requires the workflow file on the default branch** (official note). Migration “PR-D merged to `main` and fast-forwarded or merged into `release/uat`” is the lock. AD-23 does not restate it.

### NIT

- Structural seed exclusives (`uat-readiness.yml` #535 only; `uat-correction.yml` #536 later) still hold.
- `ggshield` 1.56.1 and action SHA pins unchanged; not re-litigated (prior version-reality PASS).
- Verdict classes `SIMULATED_PASS` / `LIVE_*` / `NOT_RUN` remain uncollapsed.
- Prior review files in this directory are stale relative to AD-22/AD-23; supersede them with this letter.

---

## What already holds (attacks that died on a Rule)

- **`workflow_run` after cutover as a legal AD** — AD-13/AD-23/N25. The ADR table is the leftover, not the Rule.
- **Environment identity via checkout or `head_branch`** — AD-22 + official docs + simulator.
- **CI-first stuck HOLD** — AD-23 same-run `needs`; AD-17 forbids CI `workflow_run` as the start.
- **Implement both AD-23 and AD-24** — Rule + PR-D Must-not.
- **Same-SHA `main` trigger** — `github.ref`, not SHA uniqueness.
- **AD-14 vs N14 first-merge fork** — gate true + `github.ref==main` is HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE` regardless of suppression.
- **Three cutover clocks** — four named phases; PR-D retires AD-1; gate true is PHASE_ARMED, later.
- **AD-15 `if auto-merge` / `push or merge`** — gone. Merge API only; distinct App; ruleset.
- **AD-16 PR-head `TASK.md` as authorization** — file on `main` only.
- **#536 / #535 as merge controller** — AD-4 + AD-15 + N19.
- **Automatic `release/uat` → `main`** — AD-13 + AD-19 + T19 + N23.
- **Production via new UAT line** — isolation + T20 + unchanged `deploy-production.yml`.
- **AD-2 replaced by AD-14** — inherited table says no.
- **Pretending cutover already happened** — AD-1 kept; live workflow still listens to `main`.
- **Cancel-to-drain** — AD-21; `requested` now in the drain set.
- **Parent residuals silently marked PASS** — T1/T3/T5/T7/T10 remain open.
- **This planning run applying protections or setting the gate** — Deferred + migration + ADR `does_not_authorize`.

---

## Companion consistency

| Claim | Spine | CAT-SEC | Migration | Analysis / simulator | ADR | Result |
| --- | --- | --- | --- | --- | --- | --- |
| After PR-D, no `workflow_run` | AD-13/23 | T12/T21/N25 | PR-D Must-not | Models A/B rejected; `SIMULATE=PASS` | After-table still `workflow_run` on `release/uat` | **Contradict — M1** |
| Environment identity = `GITHUB_REF` | AD-22 | T21 | PR-D why | Official table + sim | Silent (implies old pair) | Align except ADR |
| Same-run `needs` | AD-17/23 | T22, N26/N27 | PR-D purpose | Completion contract | “fresh post-merge tests” (no trigger) | Align |
| AD-24 exclusive | AD-24 | T22 “only after `success()`” | PR-D Must-not | “not both” | Silent | Align |
| Production unchanged | AD-13, inherited | T20/N24 | checklist last item | Production unchanged | “does not change” | Align |
| Gate stays false until H | AD-2, Deferred | Verdict: not authorized | Step 1 + checklist | — | `does_not_authorize` | Align |
| #536 no merge token | AD-15, AD-10 | T15/N19 | Separate Draft | — | must not merge | Align |
| Environment policy before PR-D and gate | AD-18 | T13 | steps 4 then 5–9 | before PHASE_ARMED | “allows `release/uat` only” after cutover | Align (ADR omits before-PR-D clock; AD-18 binds it) |

Threat-model self-verdict (“acceptable as a target after AD-22/AD-23; not authorized to cut over”) matches this review **except** the ADR after-table, which that verdict does not mention.

---

## Findings

### BLOCKER

None.

### MAJOR

#### M1 — ADR after-table still adopts `workflow_run` + Environment `uat`=`release/uat`

- **Checks:** must-verify 1; companions must not re-open an opposite outcome; T21
- **Evidence:** `ADR-OPTION-B.md` lines 22–31 (`workflow_run` CI on `release/uat` only **and** Environment `uat` allows `release/uat` only); spine AD-13/AD-22/AD-23; Conflicts “c6ec3370 … superseded”; `ENVIRONMENT-REF-ANALYSIS.md` Models A rejected / C adopted; CAT-SEC T21 + verdict; `MIGRATION-PLAN.md` PR-D Must-not; `simulate-github-refs.py` `ENV_uat=DENY` for `workflow_run`
- **Why it is major:** The ADR is a spine companion with `status: accepted-target`. A PR-D builder who implements the ADR table ships the documented deny (T21) or leaves Environment `uat` unrestricted (T1). The binding ADs and N25 already make that letter illegal — the package still *contains* the denied design as the decision summary. That fails “no remaining design uses this pair.”
- **Required lock (not applied; spine is read-only):** Rewrite the ADR after-table to AD-23 (`push` to `release/uat`, in-run `needs`, no `workflow_run`) and name AD-24 as the exclusive alternative. Do not leave `workflow_run` CI on `release/uat` as the after-cutover row.

### MINOR / NIT

See Adversarial / edge residuals. Do not block on these alone.

---

## Gate

**FAIL.** Unresolved **MAJOR M1** (ADR after-table still specifies `workflow_run` + Environment `uat`=`release/uat`). **BLOCKER = 0.**

Must-verify 2–6 **pass** on the corrected binding letters. Not authorization to cut over, merge PR-D, or set `UAT_DEPLOY_GATE_ACTIVE=true`. Spine was not edited.
