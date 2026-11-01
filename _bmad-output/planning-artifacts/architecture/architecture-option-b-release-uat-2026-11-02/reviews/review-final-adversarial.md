# Final adversarial review — Option B spine

**Lens:** Two implementers who obey every AD **Rule** letter. Success for the attack is shipping either (1) a `workflow_run` / `repository_dispatch` / `workflow_call` Deploy UAT path after PR-D, or (2) a stuck post-merge HOLD (green `release/uat` SHA, SSH skipped, no later event retries).

**Authority:** `ARCHITECTURE-SPINE.md` only. Companions named solely where an AD claims they close a join. Brownfield `deploy.yml`, `validate-uat-predeploy-gate.sh`, and `commission-uat-hold.sh` named as holes PR-D must close, not as current Option B design. Prior `reviews/*` ignored.

**Date:** 2026-11-02

---

## Gate verdict

**PASS.** No surviving letter-compliant pair ships a forbidden Deploy UAT trigger after PR-D, or a stuck HOLD on a green `release/uat` SHA. Named attacks close on the Rule letters. Do not treat brownfield leftovers as licensed residuals.

- BLOCKER: 0
- MAJOR: 0
- MINOR / NIT: none filed (would be invented)

---

## Method

For each attack: construct Implementer A and Implementer B, both reading every Rule body as written. If the pair still produces a forbidden path or stuck HOLD, file BLOCKER or MAJOR. If a Rule sentence forbids one of the two readings, the pair is **CLOSED** — no finding.

Inherited AD-6 as restated here (“Superseded after PR-D… Do not wait on a separate check-run”) is treated as binding in this spine. Parent AD-6’s old check-run gate is not.

---

## Pair 1 — leftover `workflow_run` listener on main-only PR-D

**Attack.** A merges PR-D only to `release/uat` (UAT source) and leaves `deploy.yml` on `main` with `on.workflow_run`. B merges PR-D to `main` and fast-forwards `release/uat`. A’s leftover is a live listener: GitHub reads `workflow_run` from the default-branch copy, so `main` CI still creates a Deploy UAT run.

**Rules that close it.**

- AD-13: after PR-D, Deploy UAT has **no** `workflow_run`; a `main` CI completion must not create a Deploy UAT run; residual listeners are a contract FAIL.
- AD-14: PR-D on **main and** `release/uat`; `workflow_run` on either ref after PR-D is N25, not an Environment-deny fallback.
- AD-20: PR-D must land on `main` and be fast-forwarded to `release/uat`.
- AD-21: both copies have no `workflow_run`; leftover on either copy is N25.

A is not letter-compliant. Inverse (PR-D on `main` only, old YAML left on `release/uat`) is the same FAIL.

**CLOSED.** Join claimed by AD-13/14/20/21 + CAT-SEC N25 / T17.

---

## Pair 2 — `workflow_run` / `repository_dispatch` / `workflow_call` on Deploy UAT after PR-D

**Attack.** A ships AD-23 `on: {push: release/uat, workflow_dispatch?}`. B keeps or adds `workflow_run`, `repository_dispatch`, or `workflow_call` “as a fallback / reusable.”

**Rules that close it.**

- AD-23: `on:` may contain only `push: {branches: [release/uat]}` and optional `workflow_dispatch`. Name-forbid `workflow_run`, `repository_dispatch`, `workflow_call`, `pull_request`, `pull_request_target`.
- AD-24: exclusive `on:` is **only** `workflow_dispatch` (explicitly no `push` / `workflow_run` / `repository_dispatch` / `workflow_call`).
- AD-22: `workflow_call` is name-forbidden **because** a `ci.yml` caller on `release/uat` would set `GITHUB_REF` to the caller and **match** Environment `uat`.
- AD-13/20/21: residual `workflow_run` is N25, not a licensed deny.

B violates name-forbid. `workflow_call` is the Environment-matching case; the letter forbids the key on Deploy UAT rather than relying on policy deny.

Companion `ENVIRONMENT-REF-ANALYSIS.md` + `simulate-github-refs.py` are the claimed join for T21 / N28. They do not license B.

**CLOSED.**

---

## Pair 3 — AD-23 XOR AD-24 (hybrid push + split file)

**Attack.** A implements default AD-23 (AD-17 jobs in `deploy.yml`, `push` + optional dispatch, no split file). B adds `post-merge-uat.yml` and/or the dispatch App while leaving `push` on Deploy UAT. Hybrid: push starts Deploy UAT before split-file jobs finish, or push + split + no App never dispatches — stuck HOLD.

**Rules that close it.**

- AD-24: implement AD-23 **XOR** AD-24, never both. Prevents “AD-23 `push` together with a split-file or CI/`workflow_run`/`workflow_call` deploy.” “Push + split file + no App dispatch is a contract FAIL (stuck HOLD).”
- AD-17: `post-merge-uat.yml` **only** under exclusive AD-24.
- AD-23: default **unless exclusive AD-24**.

A hybrid is not letter-compliant. Two implementers who each pick one side of the XOR produce two legal trees, not one broken tree. N29 is the claimed join.

**CLOSED.**

**AD-24 vs AD-14 “this run” / `needs` (checked, not filed).** Under AD-24, AD-17 jobs live in `post-merge-uat.yml` and the App is the SUCCESS gate (AD-17). AD-14’s `needs` edge is the AD-23 same-run order. A letter-compliant AD-24 tree either (i) treats that `needs` sentence as AD-23-only and uses the App, or (ii) duplicates AD-17 jobs into `deploy.yml` so `needs` is real. A script that HOLDs because AD-17 names are absent from the dispatch run is a Checks/jobs query, which AD-14 forbids. Neither legal reading is a stuck HOLD.

---

## Pair 4 — evaluator HOLDs `GITHUB_EVENT_NAME=push`

**Brownfield hole (not design).** `validate-uat-predeploy-gate.sh` HOLDs unless the event is `workflow_run` or `workflow_dispatch`. `commission-uat-hold.sh` requires `workflow_run:` in `deploy.yml` and commissions with `GITHUB_EVENT_NAME=workflow_run`. After an AD-23 `push`, that pair is a stuck HOLD: AD-17 jobs SUCCESS, predeploy HOLD, SSH skipped, no later event.

**Attack.** A rewrites the evaluator and commissioner. B leaves the brownfield allowlist and claims “evaluator” means the YAML `on:` block.

**Rules that close it.**

- AD-23: “Evaluator must accept `GITHUB_EVENT_NAME=push`.”
- AD-14: after PR-D under AD-23, `push` is a legal event.
- AD-20: after PR-D the evaluator must accept `push` (AD-23) or `workflow_dispatch` (AD-24); `commission-uat-hold` must not require `workflow_run`.
- Conflicts table: brownfield allowlist is superseded; N30 is the claimed join.

B is not letter-compliant. “Evaluator” in this spine is the predeploy gate, not only `on:`.

**Also closed (same family).**

- Layer A / GG `head_branch==main` on UAT: AD-20 Rule, “GG / Layer A `head_branch==main` is Production-only.”
- Extra `origin/main` tip-pin beside AD-12: AD-12 tip-pin is `origin/release/uat`; AD-14 eligible conjuncts use that tip-pin; AD-23 “then SSH if AD-14 PASS”; conventions: no parallel `origin/main` UAT tip-pin. Extra HOLD after AD-14 PASS violates AD-23.
- Keeping `TARGET_SHA=workflow_run.head_sha` so `push` has an empty SHA: AD-12/AD-23 require a real `release/uat` tip candidate on the legal event.

**CLOSED.** PR-D exclusive list in `MIGRATION-PLAN.md` (evaluator, commissioner, `validate-deploy-uat-workflow.sh`) is the claimed close of the brownfield hole.

---

## Pair 5 — AD-17 names vs `ci.yml` Checks

**Attack.** Parent AD-6 used the same display names as `ci.yml` (`.NET build and test`, …). A uses the AD-17 prefixed names and same-run `needs` (job IDs). B polls Checks / Actions jobs for the unprefixed `ci.yml` names, or for `Post-merge UAT validation`, and treats those as AD-17.

**Rules that close it.**

- AD-17: required names are the `UAT post-merge — …` set, **distinct** from `ci.yml` Checks; do not poll check-runs of these names; `ci.yml` is not a deploy trigger; parent AD-6 check-run is not a gate after PR-D.
- AD-14: do not evaluate AD-17 names via the Checks API or `ci.yml` jobs; order is a `needs` edge.
- Inherited AD-6 (this spine): superseded after PR-D; do not wait on a separate check-run.

B is not letter-compliant. Prefix + `needs` (AD-23) or per-name `conclusion==success` on those exact strings (AD-24) cannot legally bind `ci.yml` jobs.

**CLOSED.**

---

## Pair 6 — AD-24 skip-matrix / Actions `success()`

**Attack.** B dispatches when the `post-merge-uat.yml` workflow `conclusion==success` or when a job `if: success()` is true. A skipped required job (matrix exclude, `if: false`) still leaves the workflow successful → dispatch → SSH. Or the inverse: B uses `success()` as the only predicate and never dispatches.

**Rules that close it.**

- AD-17 / AD-24: App fires only when **every named job** `conclusion==success` on that SHA — **not** workflow `conclusion`, **not** Actions `success()` (skipped jobs can leave a workflow successful).
- AD-23: FAILURE / CANCELLED / SKIPPED required jobs skip dependents; SSH runs only if each needed job is SUCCESS and AD-14 PASS.
- N26 / N31 / T22 are the claimed joins.

B is not letter-compliant. Fail-closed skip (no dispatch / dependents skipped) is the required behavior, not a stuck HOLD of a green SHA.

**CLOSED.**

---

## Pair 7 — Environment identity via checkout / `head_branch`

**Attack.** B keeps `workflow_run` (or `repository_dispatch`), checkouts `release/uat` or reads `workflow_run.head_branch`, and treats that as Environment identity so policy `release/uat` appears satisfied.

**Rules that close it.**

- AD-22: Environment selected-branch policy matches workflow-run `GITHUB_REF`. Documented: `workflow_run` and `repository_dispatch` set `GITHUB_REF` to the default branch (`main`). Checkout, `head_branch`, and `ORIGIN_UAT_REF` do not change it. Leftover `workflow_run` is N25, not a licensed “safe deny.”
- AD-12: source ref is `github.ref` of the **deploy** run; do not use `workflow_run.head_branch` as Environment identity.
- Pair 2 already name-forbids those triggers on Deploy UAT.

B cannot keep the trigger and obey Pair 2. Even if they did, Environment `uat`=`release/uat` would deny `GITHUB_REF=main`; that deny is not a legal Deploy UAT path and is not a licensed residual.

**CLOSED.** Join: AD-22 + `ENVIRONMENT-REF-ANALYSIS.md` + `simulate-github-refs.py` (live canary remains UNVERIFIED; that does not reopen the letter).

---

## Pair 8 — CI-first completion race (classic T22)

**Attack.** Listener starts Deploy UAT when CI completes; AD-17 jobs still pending; predeploy HOLDs; no later event retries.

**Rules that close it.**

- AD-23: required jobs live in **this** Deploy UAT run; `predeploy` `needs` every AD-17 job (`needs` waits; it never observes pending); “a fully passing `release/uat` push reaches predeploy after tests finish, then SSH if AD-14 PASS.”
- AD-24: App dispatches only after every named job `conclusion==success` (not workflow success).
- AD-6 restated: do not wait on a separate check-run after PR-D.
- Pair 3 forbids the hybrid that would restore the race.

**CLOSED.** T22 / N27.

---

## Brownfield holes (named, not findings)

These are live on `main` today. They are **not** Option B after PR-D if the Rules above are implemented. They **are** the holes PR-D must delete; leaving them is a contract FAIL of PR-D, not a documented residual.

| Hole | File | Rule that forbids leaving it |
| --- | --- | --- |
| `on.workflow_run` of CI / `main` | `.github/workflows/deploy.yml` | AD-13, AD-21, AD-23 |
| `TARGET_SHA` from `workflow_run.head_sha` | `deploy.yml` | AD-12, AD-23 |
| Event allowlist `{workflow_run, workflow_dispatch}` | `deploy/validate-uat-predeploy-gate.sh` | AD-14, AD-20, AD-23 |
| Tip-pin `origin/main` | same | AD-12 |
| Layer A / GG `head_branch==main` | `deploy/lib/uat-predeploy-gate.py`, `production-github-provenance.py` | AD-20 |
| Commission requires `workflow_run:` and commissions as `workflow_run` | `deploy/commission-uat-hold.sh` | AD-20, AD-23 |
| Validator requires `workflow_run.head_sha` | `deploy/validate-deploy-uat-workflow.sh` | AD-23 (PR-D exclusive in migration plan) |

---

## What was not filed

- A new sibling workflow that SSHes to Environment `uat` under another `name:` is not two implementers of this spine; it is a new control-plane file (AD-16 owner-merge). Not a letter pair on Deploy UAT.
- Operational gap between merge-to-`main` and fast-forward of `release/uat` is forbidden as a finished PR-D (AD-21), not a licensed window.
- Live Environment-ref canary remains UNVERIFIED (AD-22). Simulation is required. That is an evidence class, not a surviving implementer pair.

---

## Verdict

**PASS** — Rule letters close every constructed pair. No unresolved BLOCKER or MAJOR. No surviving incompatible pair.
