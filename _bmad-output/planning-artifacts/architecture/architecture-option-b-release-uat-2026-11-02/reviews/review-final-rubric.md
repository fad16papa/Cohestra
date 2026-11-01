# Rubric walk — Option B release/uat spine

- **Walker:** independent BMAD architecture rubric (good-spine checklist + must-verify set)
- **Workspace:** `/tmp/cohestra-534/_bmad-output/planning-artifacts/architecture/architecture-option-b-release-uat-2026-11-02/`
- **Spine HEAD reviewed:** `ARCHITECTURE-SPINE.md` (status `draft`, created/updated 2026-11-02)
- **Companions read:** `ADR-OPTION-B.md`, `CAT-SEC-THREAT-MODEL.md`, `MIGRATION-PLAN.md`, `ENVIRONMENT-REF-ANALYSIS.md`, `simulate-github-refs.py`, `.memlog.md`
- **Parent (inherited ADs only):** `architecture-uat-automation-readiness-2026-11-01/ARCHITECTURE-SPINE.md`
- **Brownfield ratification:** live `/workspace/.github/workflows/deploy.yml`, `deploy-production.yml`, `deploy/validate-uat-predeploy-gate.sh`, `deploy/lib/uat-predeploy-gate.py`, `deploy/commission-uat-hold.sh`
- **Stale `reviews/*`:** ignored
- **Date:** 2026-11-02

## Verdict

**PASS** — 0 BLOCKER, 0 MAJOR.

The spine fixes the real PR-D divergence points (Environment identity, trigger, post-merge completion, leftover `workflow_run`, Production isolation). Companions do not re-open the c6ec3370 opposite outcome. Inherited conflicts are recorded, not silently overwritten. Live `deploy.yml` remains `workflow_run` on `main`; that is AD-1, not cutover.

---

## Must-verify

| # | Check | Result |
| --- | --- | --- |
| 1 | No remaining design uses `workflow_run` + Environment `uat`=`release/uat` after cutover | **PASS** |
| 2 | No post-merge completion race (CI-first stuck HOLD) | **PASS** |
| 3 | AD-23 is the adopted trigger; AD-24 exclusive XOR | **PASS** |
| 4 | Predeploy needs every AD-17 job (not poll-once pending) | **PASS** |
| 5 | Leftover `workflow_run` is PR-D FAIL, not a licensed residual | **PASS** |
| 6 | Production isolation unchanged | **PASS** |

### MV-1 — no denied pair after cutover

After PR-D the adopted path is Model C (AD-23): `on.push.branches: [release/uat]` (+ optional same-file `workflow_dispatch`). Exclusive alt is Model D (AD-24): App `workflow_dispatch --ref release/uat` only. Models A/B (`workflow_run`, `repository_dispatch`) are rejected in `ENVIRONMENT-REF-ANALYSIS.md` and name-forbidden in AD-13/AD-20/AD-22/AD-23/AD-24. ADR after-table matches: “No `workflow_run` / `repository_dispatch` / `workflow_call`.” Until PR-D, AD-1 keeps today’s `workflow_run` on `main` with Environment `uat` still unrestricted (audit FAIL) — that is not the denied pair.

### MV-2 — no CI-first stuck HOLD

AD-17/AD-23 put the eleven named jobs in the same Deploy UAT run. `predeploy` `needs` all of them; GitHub `needs` does not start a dependent while needed jobs are pending. AD-14 forbids Checks-API / `ci.yml` evaluation of those names. Parent AD-6 check-run `Post-merge UAT validation` is recorded as superseded after PR-D. Exclusive AD-24 may dispatch only after every named job `conclusion==success` (not workflow `conclusion`, not Actions `success()`). T22 / N26 / N27 / N31 encode the negatives. Simulator: PENDING/FAILURE/CANCELLED/SKIPPED/HOLD do not start deploy (`SIMULATE=PASS`).

### MV-3 — AD-23 adopted, AD-24 XOR

AD-23: “Default after PR-D **unless exclusive AD-24**.” AD-24: “Implement AD-23 **XOR** AD-24, never both.” N29 contract-FAIL if both. Structural seed omits `post-merge-uat.yml` under AD-23. Migration PR-D is the AD-23 file shape. ADR after-table lists AD-24 only as “Exclusive alt.” Memlog matches.

### MV-4 — predeploy needs every AD-17 job

AD-17 lists eleven distinct job names and says `predeploy` `needs` all of them (`needs` waits; it never observes pending). AD-14: job order is a `needs` edge, then `deploy` `needs` `predeploy`. AD-23 repeats the same graph. SSH `needs` `predeploy` and runs only if each needed job is SUCCESS and AD-14 PASS. No poll-once path remains as a licensed design.

### MV-5 — leftover `workflow_run` is PR-D FAIL

Repeated, not hedged: AD-13, AD-14 (N25), AD-20, AD-21, AD-22, ADR after-table, CAT-SEC T12/T14/T17/N25, Migration PR-D “Must not” + cutover step 8, ENVIRONMENT-REF “not a licensed safe deny.” T14 forbids keeping a leftover listener “for YAML safety.” This is a contract FAIL of PR-D, not an Environment-deny fallback.

### MV-6 — Production isolation unchanged

ADR “What Option B does not change”: Production stays `workflow_dispatch` from `main`, `PROD_DROPLET_*`, Environment `production`, two-parent provenance, `PRODUCTION CUTOVER: AUTHORIZED`. AD-13: Production provenance unchanged; no automated `release/uat` → `main`. AD-18: `PROD_DROPLET_*` stay on Environment `production`. Inherited Production owner-only. T20 / N24. Live `deploy-production.yml` is `workflow_dispatch` only; simulator denies Production policy for `refs/heads/release/uat`. Concurrency `deploy-uat` must never be `deploy-production`.

---

## Good-spine checklist

### 1. Fixes real divergence points for implementers of PR-D Deploy UAT — PASS

Load-bearing PR-D forks that two units could choose incompatibly, and where they are fixed:

| Divergence | Binding |
| --- | --- |
| Trigger after cutover | AD-23 closed `on:` (push + optional same-file dispatch); name-forbid `workflow_run` / `repository_dispatch` / `workflow_call` / `pull_request` / `pull_request_target` |
| Environment identity | AD-12 / AD-22: `GITHUB_REF` of the deploy run; not checkout, not `workflow_run.head_branch`, not `ORIGIN_UAT_REF` |
| Tip-pin source | AD-12: `origin/release/uat` tip; SHA also on `main` still REFUSE if `github.ref` is `main` |
| Post-merge completion | AD-17/AD-23 same-run `needs`; not parent AD-6 Checks poll |
| Evaluator event | AD-14/AD-20/AD-23: `GITHUB_EVENT_NAME=push` is eligible; `commission-uat-hold` must not require `workflow_run` |
| GG / Layer A `head_branch==main` | AD-20 + Conflicts: Production-only after PR-D |
| YAML landing | AD-20/AD-21: PR-D lands on `main` and is fast-forwarded to `release/uat` |
| Dual suppressor / drain | AD-14 conjunction; AD-21 drain before merge; gate true last |
| Leftover listener | N25 contract FAIL on either copy |
| AD-23 vs AD-24 | XOR; default AD-23 |
| Production | unchanged |

Migration PR-D exclusive list matches those files (`deploy.yml`, predeploy/fetch, provenance, `validate-deploy-uat-workflow.sh`, `commission-uat-hold.sh`, `validate-uat-predeploy-gate.sh`).

### 2. Every AD Rule is enforceable and prevents its stated divergence — PASS

Each Option B AD carries Binds / Prevents / Rule. Spot-check of “does the Rule actually prevent that Prevents?”:

| AD | Prevents | Rule actually stops it? |
| --- | --- | --- |
| AD-1 | Pretending Option B is already live | Yes. One `deploy.yml`; PHASE_MAIN_LISTEN/SUPPRESS still `workflow_run.branches: [main]` + `origin/main`. Matches live file. |
| AD-12 | Deploy `main` / feature SHA / branch `uat` | Yes. Tip-pin + `github.ref==refs/heads/release/uat`. Ref refusal, not SHA uniqueness. |
| AD-13 | Post-cutover `main` push starting UAT SSH | Yes. No `workflow_run`; residual is FAIL. Production dispatch unchanged. |
| AD-14 | Gate true while `main` can still trigger | Yes. Dual exact conjuncts + `needs` graph + N14/N25. |
| AD-15 | #536/#535 `contents: write` on `release/uat` or `main` | Yes. Distinct App, merge API only, no force-push, no Environment secrets. |
| AD-16 | Auto-merge of control-plane / #505 | Yes. Owner-merged manifest on `main`; path denylist; AD-3 re-eval. |
| AD-17 | Feature HEAD / `main` CI / `ci.yml` names as eligibility | Yes. Distinct job names; `needs`; no Checks poll. |
| AD-18 | Feature/`main` jobs reading `DROPLET_*` | Yes. Policy `release/uat` only, `can_admins_bypass=false`, before PR-D and before gate true. |
| AD-19 | UAT PASS as `main` merge right | Yes. `AWAIT_BUSINESS_RELEASE`; no automated PR. |
| AD-20 | Feature-branch `deploy.yml` using `DROPLET_*` | Yes. YAML from protected tip; no `pull_request_target`; AD-16 denylist. |
| AD-21 | Pre-retarget run completing SSH after “quiet” | Yes. Drain statuses listed; `cancel-in-progress: false`; wait for HOLD. |
| AD-22 | Assuming checkout/`head_branch` satisfies Environment | Yes. Documents `GITHUB_REF`; leftover listener is FAIL not “safe deny.” |
| AD-23 | CI-complete-before-post-merge HOLD; Environment mismatch | Yes. Same-run `needs`; closed `on:`; evaluator accepts `push`. |
| AD-24 | AD-23 push plus split-file / CI / `workflow_run` / `workflow_call` | Yes. XOR; named-job `conclusion==success`; `GITHUB_TOKEN` cannot dispatch. |

Inherited AD-2/3/4/5/7/8/10/11 remain enforceable as restated.

### 3. Nothing under Deferred lets two units diverge on Environment identity or post-merge completion — PASS

Deferred items are owner UI / later authorization: create+protect `release/uat`, apply Environment policy, install Apps, merge-queue vs button, live SSH, flip `UAT_DEPLOY_GATE_ACTIVE`, automatic rollback, Production activation. The **values** those items must take are already bound (AD-12/AD-18/AD-22/AD-23/AD-17). Q1 is “AD-16 wiring only.” Q2 is initial SHA (owner create-branch). Q3 is secret **names** in UI. None of those reopen trigger identity or the `needs` graph.

### 4. Companions do not re-open an opposite outcome (especially ADR after-table vs AD-23) — PASS

| Companion | After-cutover trigger | Leftover `workflow_run` |
| --- | --- | --- |
| ADR after-table | `push` + in-run AD-17 `needs` (AD-23); exclusive AD-24 dispatch | Forbidden |
| CAT-SEC | AD-22/AD-23 close T21/T22 | T12/T14/T17/N25 = PR-D FAIL |
| Migration PR-D | Remove `workflow_run`; add AD-23 `on:` | Must not treat leftover as Environment-deny fallback |
| ENVIRONMENT-REF | Adopted Model C; rejected A/B | “not a licensed safe deny” |
| Simulator | `trigger_legal` AD-23 / AD-24 / BOTH / leftover | `SIMULATE=PASS` |
| Memlog | AD-23 default, AD-24 XOR, N25 | Matches |

CAT-SEC verdict’s last sentence (“`workflow_run` + Environment `uat`=`release/uat` is a documented deny”) states the GitHub fact that sank c6ec3370. It is not a remaining design and is not a license to keep the listener; T12/T17 already close that misread (see NIT-1).

### 5. Inherited ADs are not silently weakened; conflicts are recorded — PASS

| Parent / Epic | Treatment | Silent weaken? |
| --- | --- | --- |
| Parent AD-1 (`origin/main` only) | Conflict: Issue #538 accepts Option B. Child AD-1 stays live until cutover; AD-12 after. | No |
| Parent AD-2 exact gate | Inherited; “not replaced by AD-14” | No |
| Parent AD-3 / AD-4 | Inherited unchanged | No |
| Parent AD-5 no auto-merge | Conflict: tightened — still no auto-merge to `main`, no #536 merge; AD-15 is a new narrower writer to `release/uat` | No |
| Parent AD-6 dedicated check-run + Checks poll | Conflict: superseded after PR-D by AD-17/AD-23 `needs` | No — recorded replacement that **closes** the race AD-6’s poll would create |
| Parent AD-7 `remote-deploy.sh` SHA | Inherited; SHA becomes `release/uat` merge SHA | No |
| Parent AD-8 honest artifacts | Inherited | No |
| Parent AD-9 Environment policy `main` | Conflict: after cutover AD-18 is `release/uat`; until cutover remains FAIL-unrestricted | No |
| Parent AD-10 / AD-11 | Inherited | No |
| Epic 45 AD-5 `workflow_run` + `remote-deploy.sh` | Conflict: entrypoint remains; trigger removed at PR-D | No |
| Epic 45 AD-1/3/4 SSH/secrets/evidence | Inherited | No |
| Epic 45 / 46 Production owner-only | Inherited; AD-13/AD-18/T20 | No |
| Brownfield evaluator `workflow_run`/`workflow_dispatch` + GG `head_branch==main` | Conflict: after PR-D `push` is eligible; `head_branch==main` is Production-only; `commission-uat-hold` must not require `workflow_run` | No |
| #519 per-feature owner merge | Conflict: superseded only for manifest-eligible `release/uat` PRs | No |
| c6ec3370 `workflow_run` after cutover | Conflict: superseded by AD-22/AD-23 | No |

Parent AD-6 is listed in both the Inherited table and the Conflicts table. That is the required pattern (surface, don’t locally override).

### 6. Named tech / brownfield ratified — PASS

Live `deploy.yml` (workspace copy, same shape as the audited `main` path):

```
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
  workflow_dispatch:
concurrency:
  group: deploy-uat
  cancel-in-progress: false
```

`TARGET_SHA` is `workflow_dispatch && github.sha || workflow_run.head_sha`. Predeploy HOLDs unless `GITHUB_EVENT_NAME` ∈ {`workflow_run`,`workflow_dispatch`}. `commission-uat-hold.sh` still requires a `workflow_run:` listener. `uat-predeploy-gate.py` still HOLDs GG API scan unless `head_branch==main`. `deploy-production.yml` is `workflow_dispatch` only.

The spine treats that as **AD-1 / PHASE_MAIN_LISTEN**, not as Option B already live. PR-C is forbidden from retargeting `workflow_run.branches`. PR-D is the only retarget. Stack pins match the parent spine and live Actions SHAs (checkout `11d5960a…`, upload-artifact `ea165f8d…`, download-artifact `d3f86a10…`, appleboy `2ead5e36…`).

---

## AD enforceability notes (no extra findings)

- AD-14’s SSH conjunct keeps `UAT_MAIN_DEPLOY_SUPPRESSED==true` after cutover. That is belt-and-suspenders, not an open fork: the Rule is exact.
- AD-23 optional `workflow_dispatch` still runs the same AD-17 jobs in the same file. That is not AD-24.
- AD-18 “this agent does not apply the policy” defers **who** clicks GitHub UI, not **what** the policy is.
- `simulate-github-refs.py` run for this walk: `SIMULATE=PASS` (live canary remains `UNVERIFIED`, as documented).

---

## Findings

None at BLOCKER or MAJOR.

### MINOR-1 — Phase clock naming (AD-14 vs AD-12 / conventions)

**Where:** AD-14 Rule last sentence vs AD-12 + Consistency Conventions.

- AD-12 binds tip-pin in `PHASE_RETARGET` **and** `PHASE_ARMED`.
- Conventions: `PHASE_MAIN_LISTEN → PHASE_SUPPRESS → PHASE_RETARGET → PHASE_ARMED` and “one `deploy.yml` per phase.”
- AD-14: `PHASE_MAIN_LISTEN → PHASE_SUPPRESS → AD-21 drain → PR-D on main and release/uat → PHASE_ARMED` (does not name `PHASE_RETARGET`).

**Why not MAJOR:** Migration checklist still separates PR-D merge (step 7) from `UAT_DEPLOY_GATE_ACTIVE=true` (step 9). AD-2 keeps the gate false until owner attestation. Dual suppressor and N14 still refuse a `main` source. Two PR-D units cannot choose different Environment identities from this naming slip.

**Autofix if updated:** AD-14 should say drain → `PHASE_RETARGET` (merge PR-D) → `PHASE_ARMED` (owner may set the gate). Conventions should say two `deploy.yml` shapes (listen vs push), not “one file per phase.”

### MINOR-2 — Provenance field alias (`merge_sha` vs `release_sha`)

**Where:** Inherited parent AD-7 records `{merge_sha, git_tree, compose_config_hash}`. Child AD-19 and CAT-SEC T18 use `release_sha`. Conflicts table does not alias them.

**Why not MAJOR:** Same SHA, same refuse-on-mismatch. Does not reopen Environment identity or the completion race. PR-D provenance + PR-F acceptance could still emit incompatible keys if they read different ADs.

**Autofix if updated:** Record `release_sha` as the Option B name for parent AD-7 `merge_sha` (same 40-hex).

### MINOR-3 — Brownfield Deploy UAT job ids / post-SSH chain not drawn on the AD-23 graph

**Where:** Live job id is `predeploy-gate`; `deploy` uses `if: needs.predeploy-gate.outputs.eligible == 'true'` plus `environment: uat`. Post-SSH jobs `browser` / `lifecycle` / `evidence` / `delivery-outcome` exist and are what inherited AD-8 / Epic 45 AD-8 consume. Spine mermaid after cutover is `Push → Tests → Pre → Env`. Rules say `predeploy` / `deploy`.

**Why not MAJOR:** AD-8 still forbids silent post-SSH absence. AD-18/AD-23 still require Environment only after eligible. A mermaid-only rewrite that dropped acceptance jobs would fail inherited AD-8, not ship a wrong Environment identity. `commission-uat-hold.sh` (PR-D exclusive) currently keys on `predeploy-gate:`.

**Autofix if updated:** Ratify live job id `predeploy-gate` (or require a rename in PR-D exclusive tests) and keep the post-SSH chain on the after-cutover graph.

### NIT-1 — CAT-SEC verdict sentence is easy to misread

Verdict: “`workflow_run` + Environment `uat`=`release/uat` is a documented deny.” Factually true and the reason c6ec3370 died. T12/T17/N25 already say leftover is not a licensed residual. Prefer the ENVIRONMENT-REF phrasing (“not a licensed safe deny”) in the verdict line so a skimmer cannot treat the pair as a residual control.

### NIT-2 — Simulator leftover-listener assertion is tautological

`check("leftover workflow_run after PR-D is contract FAIL", True)` always passes. The real check is `not trigger_legal("AD-23", {"push", "workflow_run"})`, which does fail closed. Cosmetic.

### NIT-3 — AD-21 drain sentence hard-codes AD-23 `push`

AD-21 parenthetically “add `push` to `release/uat` under AD-23.” Default is AD-23, XOR is already a contract FAIL (N29). Fine; exclusive AD-24 would delete `workflow_run` without adding `push`.

---

## What this walk did not treat as a finding

- Spine `status: draft` / “not live cutover” — correct.
- Live canary UNVERIFIED — honest; simulator is the required stand-in.
- Parent spine still describing `workflow_run` on `main` — that file is the 2026-11-01 audit contract; child AD-1 + Conflicts own the cutover story.
- Expanding GitGuardian API scan from `main` to `release/uat` — recorded (PR-C; Production-only `head_branch==main`).
- AD-24 mechanism for *how* the dispatch App observes named-job conclusions — AD-23 is the adopted path; AD-24 Rule already forbids workflow-`success()` and hybrid push+split-without-App.

---

## Gate recommendation

Architecture is acceptable as a **target** for PR-D design. It is not authorization to merge PR-D, set the gate, restrict Environments, or SSH. Unresolved BLOCKER/MAJOR for this walk: **none**. MINOR/NIT items do not reopen MV-1…MV-6.
