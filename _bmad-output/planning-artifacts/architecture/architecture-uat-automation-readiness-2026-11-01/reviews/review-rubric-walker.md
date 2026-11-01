# Rubric Walker — Cohestra UAT Automation Readiness

- **Spine:** `_bmad-output/planning-artifacts/architecture/architecture-uat-automation-readiness-2026-11-01/ARCHITECTURE-SPINE.md`
- **Parent:** `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-45-2026-10-15/ARCHITECTURE-SPINE.md`
- **Reviewer:** BMAD architecture rubric walker
- **Date:** 2026-11-01
- **Altitude:** feature
- **Mechanical lint (`lint_spine.py`):** PASS — 0 findings (placeholders, AD IDs, Binds/Prevents/Rule fields, Stack pins)

## Verdict

**FAIL**

The spine names the right paradigm and most of the real forks (main-only SHA, exact-string suppressor, identity-bound dual-review, reporter ≠ controller, no auto-merge, dedicated post-merge gate, HOLD-honest artifacts, Environment `uat` branch policy, no implied rollback). Mechanical shape is clean. It still fails the good-spine checklist: at least two Rules do not prevent their stated divergence, the operational envelope leaves load-bearing brownfield contracts silent, and the Inherited table drops Epic 45 constraints this feature will execute against. Two stories built independently from this file can still ship incompatible deploy provenance, correction-loop machinery, and ops wiring.

## Checklist

| Good-spine test | Result | Note |
| --- | --- | --- |
| Fixes real divergence points for the level below; misses none | **FAIL** | Provenance model, correction budget/schema, concurrency, missing-secret fail-closed, and GitGuardian secret class are unset |
| Every AD Rule is enforceable and prevents its stated divergence | **FAIL** | AD-7 and AD-10 fail this test; AD-2 and AD-6 are only partly enforceable |
| Nothing under Deferred could let two units diverge | **PASS with residual** | Listed Deferred items are activation/owner residuals or explicit NO-GOs. The live-dispatcher deferral is safe only if AD-10 is tightened; it is not. Branch-protection deferral is safe because AD-5 already forbids auto-merge |
| Named tech verified-current | **PASS for this lens** | Stack pins match `deploy.yml` / `ci.yml` / `web/package.json` on this workspace. Version-currency vs the public registry is the version-reality reviewer |
| Ratifies rather than contradicts brownfield | **FAIL** | Ratifies suppressor, tip-pin, Environment names, and HOLD-first fetch skip. Omits `remote-deploy.sh`, `concurrency: deploy-uat`, and `MISSING_SECRET`. Verdict vocabulary fights the live evidence schema |
| Covers driving spec capabilities | **N/A / PASS** | No `SPEC.md`. Capability map covers the audit/issue/PR surfaces that drove the run |
| No new AD weakens or contradicts an inherited Epic 45 AD | **FAIL** | No local override text. Weakening is by omission: Epic 45 AD-2 concurrency, AD-3 missing-secret fail-closed, AD-4 evidence-scrubbing, and AD-5 `remote-deploy.sh` entrypoint are not inherited and not rebound |
| Every owned dimension is decided, deferred, or an open question | **FAIL** | Operational/environment envelope is only partly written. Concurrency, on-host entrypoint, GitGuardian secret class, and missing-secret behavior are silent — not Deferred, not Qn |

## Findings

### High

#### H1 — AD-7 Rule does not prevent its stated divergence

- **AD:** AD-7
- **Test:** enforceable Rule prevents stated divergence; brownfield ratification; inherited Epic 45 AD-5
- **Evidence:** Rule allows “artifact digest **or** checkout.” Prevents “stale images, rebuilt-from-later-tip, or host checkout drift.”
- **Why it fails:** Those are different provenance models. Builder A SHA-pins a host checkout and rebuilds via `remote-deploy.sh` (today’s `deploy.yml` + Epic 45 AD-5: “`remote-deploy.sh` remains the on-host deploy entrypoint”). Builder B ships a registry digest, refuses host rebuild, and never calls `remote-deploy.sh`. Both obey the Rule. Neither is forced to refuse a cached host layer from an older build of the same SHA. Epic 45 AD-5 is not in the Inherited table, so the brownfield entrypoint is optional.
- **Disposition:** Autofix — pick one provenance model (ratify SHA-pinned host checkout + `remote-deploy.sh` until a later AD introduces attested digests). Name mismatch → `REFUSE`. Do not leave the OR in the Rule.

#### H2 — Operational envelope is silent on load-bearing brownfield ops contracts

- **Test:** no silent owned dimension (deployment / environments / operations); inherited invariants not weakened
- **Silent, not decided / deferred / Qn:**
  1. **Concurrency.** Epic 45 AD-2 and `deploy.yml` bind `concurrency.group: deploy-uat` and forbid `deploy-production` on this path. Contract tests in `deploy/validate-deploy-uat-workflow.sh` fail if the group moves. This spine adds `post-merge-uat.yml` and `uat-correction.yml` and never says which group they use. Builder A puts the controller on `deploy-uat` and serializes/blocks SSH. Builder B invents `uat-correction` or accidentally uses `deploy-production`.
  2. **Missing-secret fail-closed.** Epic 45 AD-3: before SSH, required *names* are checked; missing names emit `MISSING_SECRET=<NAME>` and fail; values never printed. Live path is `deploy/fail-closed-uat-secrets.sh` after `eligible=true`. AD-9 binds store and branch policy only. Q1 asks where secrets live; it does not bind the miss path.
  3. **`GITGUARDIAN_API_KEY` class.** `uat-gated-promotion.md` and `ci.yml` already bind: repository secret, scan-only, `push` to `main` only, not Environment `uat`/`production`, not `pull_request`. AD-6 requires “exact-SHA security plus GitGuardian” and does not say where the key may live. Builder A copies it onto Environment `uat`. Builder B puts it on the reporter or controller.
- Environments, suppressor, Production NO-GO, and `DROPLET_*` naming *are* decided. The failure is the unlisted ops contracts two new workflows will have to invent.
- **Disposition:** Autofix — inherit Epic 45 AD-2/AD-3 in full; add one ops convention or AD: `deploy-uat` only on Deploy UAT; new workflows get their own named groups; `MISSING_SECRET` before SSH; `GITGUARDIAN_API_KEY` stays a scan-only repo secret on push-main.

#### H3 — Inherited Epic 45 invariants are weakened by omission

- **Test:** parent ADs are binding and not re-derived; a local AD that drops a parent constraint is a conflict
- **Inherited table actually carries:** Epic 45 AD-1 (no Cursor SSH), a narrowed AD-2 (secret *location* only), shared-host compose name, Production owner-only, first-merge suppressor, reporter ≠ controller.
- **Dropped, still executed by this feature:**
  | Parent | Constraint dropped here |
  | --- | --- |
  | AD-2 | Concurrency group `deploy-uat`; `deploy-production` forbidden |
  | AD-3 | `MISSING_SECRET=<NAME>` fail-closed; names only in chat |
  | AD-4 | Artifacts never contain secrets; no `.env` dumps |
  | AD-5 | CI-on-main + `workflow_run.head_sha` + `remote-deploy.sh` entrypoint |
  | AD-8 | UAT story close requires `acceptance-summary.json`; missing evidence is FAIL |
- Feature AD-1/AD-6/AD-8 re-derive slices of AD-5/AD-8 instead of inheriting the parent IDs. AD-6 *strengthens* “CI success on main” with a dedicated post-merge workflow — that part is not a weaken. Dropping the entrypoint, concurrency, and missing-secret rules *is* a weaken: a compliant feature builder can ignore them.
- No `Conflicts with prior decisions` row records this. The “None” claim is false for the omitted parent constraints.
- **Disposition:** Autofix — list parent AD-2, AD-3, AD-4, AD-5, AD-8 by original IDs with the *full* bind-here text. Do not re-number. Local ADs may tighten, not replace.

#### H4 — AD-10 Rule cannot be enforced; Deferred live-dispatcher does not close the fork

- **AD:** AD-10
- **Test:** enforceable Rule; Deferred must not let two #536 builders diverge
- **Binds:** Issue #536 controller (in scope; capability map + AD-4).
- **Rule states:** owner-approved immutable manifest; persist attempt, SHA, manifest ID, lock by PR+SHA; invalidate stale CI/reviews; classify `RETRYABLE_SCOPED` / `WAITING_EXTERNAL` / `HOLD_OWNER_ACTION_REQUIRED`; fail closed on 403, spoof, scope drift, budget exhaust, or PR #505; no `pull_request_target`.
- **Unset:** budget number or exhaustion function; manifest schema and who signs it; lock store (artifact vs issue vs cache vs check-run); how reviews are invalidated; how BLOCKER/MAJOR is read off a check-run.
- Deferred “Live Cursor dispatcher” only sequences `SIMULATED_PASS` then `LIVE_SCOPED_LOOP_VERIFIED`. Two Draft-PR authors can both stay mocked and still ship different manifests, locks, and retry ceilings. “Fail closed on … or PR #505” is the only crisp refusal.
- **Disposition:** Autofix — pin budget, manifest fields, lock key/store, and stale-review invalidation in AD-10. Keep live dispatch Deferred.

### Medium

#### M1 — AD-2 Rule cites a “decision table” that is not in the spine

- **Rule:** keep `UAT_DEPLOY_GATE_ACTIVE` false “until every control in the decision table is PASS or an explicit owner residual.”
- The table lives in `uat-automation-readiness-audit.md`, not in this spine. “Owner residual” can be read as “Q1–Q3 may remain UNVERIFIED and the owner may still flip the var.”
- The exact-string / HOLD-first / no-fetch half of the Rule *is* enforceable and matches `deploy.yml` lines 65–70 and run 41321497962. The activation-threshold half is not.
- **Disposition:** Autofix — copy the PASS/UNVERIFIED/FAIL controls into the spine, or change the Rule to “remain `false` until a later owner AD cites a complete PASS table.”

#### M2 — AD-6 “applicable regression” and unnamed required check

- Prevents treating pre-merge PR HEAD success as deploy eligibility — the dedicated-workflow + merge-SHA half does that.
- “Applicable regression,” “authz tests,” and “billing/entitlement regression” are not named jobs, filters, or a required check-run. Seed says `post-merge-uat.yml`; predeploy bind is unspecified (new `workflow_run` vs extra Layer A check vs both).
- Layer A today (`uat-predeploy-gate.py`) requires CI success, Exact-SHA, GitGuardian API scan, tip-pin, and duplicate-deploy refusal — not named auth/billing/provenance jobs. Two PR-C authors will invent different required job lists and different Deploy UAT triggers. Both will claim AD-6.
- **Disposition:** Autofix — name the workflow, the required job IDs/filters, and the exact predeploy predicate. Replace “applicable.”

#### M3 — Verdict vocabulary contradicts brownfield evidence

- Convention: `PASS` / `HOLD` / `REFUSE` / `FAIL`; config `VERIFIED` / `UNVERIFIED` / `FAIL`; “Never invent PASS.” AD-5 adds `READY_FOR_OWNER_MERGE_DECISION`. AD-8 mentions READY.
- Live contracts also use Epic 45 `pass` \| `fail` \| `owner_gate`, plus `DEPLOYED_ACCEPTED`, `DEPLOYED_REJECTED`, `HELD`, `ATTEMPTED`, `UNKNOWN`, `uat_deployed`, `eligibility=HOLD`.
- A builder who “follows the spine” will rename fields and break `uat-final-outcome.sh` / commissioning artifacts. A builder who follows the scripts will ignore the convention.
- **Disposition:** Autofix — ratify the existing JSON enums; map spine verdicts onto them. Do not introduce a second vocabulary.

#### M4 — AD-3 human-OR-App and unspecified BLOCKER/MAJOR extraction

- Distinct allowlisted Apps, forbidden slugs, comments-untrusted, and one-App-cannot-be-both are enforceable.
- “Or two distinct non-author OWNER/MEMBER/COLLABORATOR humans” plus “or owner-pinned slugs/IDs” lets Builder A require Apps and Builder B accept two humans with no Apps (Q3 is already UNVERIFIED). #535 consumer vs #536 producer can disagree on the happy path.
- How a check-run proves “no BLOCKER/MAJOR” is unspecified (output text, annotation, attached JSON).
- **Disposition:** Discuss — keep the human fallback as emergency-only with the same exact-HEAD + distinct-identity tests, and cite the #535 parse contract.

### Low

#### L1 — AD-8 “omit downloads **or** treat as expected-absent”

Both options prevent the stated #451 `##[error]` / fail-open pair. Dual implementation is a nit, not a new eligibility path. Tighten to one.

#### L2 — Acceptance identities and artifact schema not inherited

Paradigm still ends at “Live UAT acceptance.” Epic 45 AD-10 (dedicated automation tenants / mailbox on Environment `uat`) and the `acceptance-summary.json` / `uat-predeploy-gate.json` / `uat-final-outcome.json` names are not inherited. Out of this run’s SSH freeze, but the next acceptance story will invent logins and filenames.

#### L3 — Infra/provider left implicit

Shared-host compose `cohestra-uat` is inherited. DigitalOcean, `docker-compose.uat.yml`, droplet `deploy` user, and `DROPLET_DEPLOY_PATH` default are undocumented here. Acceptable only if H1 binds `remote-deploy.sh` and isolation stays inherited.

## AD enforceability map

| AD | Prevents (claimed) | Rule actually prevents it? | Notes |
| --- | --- | --- | --- |
| AD-1 | Integration branch becomes deploy source while tip-pin assumes `origin/main` | **Yes** | `candidate_sha` is commit + ancestor + current tip; no `uat` branch in this feature. Escape hatch is Deferred, not a local override |
| AD-2 | Truthy suppressor; fetch-before-HOLD | **Partial** | Exact `true`, HOLD evidence, `eligible=false`, no tip-pin fetch: yes. Activation “decision table”: no (M1) |
| AD-3 | Self-attestation, `cursor[bot]`, one App two roles, stale SHA, PASS-with-BLOCKER | **Partial** | Identity and comment rules: yes. Human-OR-App and BLOCKER parse: no (M4) |
| AD-4 | Evaluator gains dispatch/write/privileged creds | **Yes** | Separate PRs; #535 evaluation-only Draft; no “operational” claim without mocked + authorized live evidence |
| AD-5 | Auto-merge from READY comment or controller token | **Yes** | Terminal state is `READY_FOR_OWNER_MERGE_DECISION`; no `contents: write` on `main`; no env/secret/var mutation. Q4 is a *later* revision, not a current fork |
| AD-6 | Pre-merge PR HEAD treated as deploy eligibility | **Partial** | Dedicated merge-SHA workflow: yes. Job set and bind mechanism: no (M2) |
| AD-7 | Stale image / later-tip rebuild / host checkout drift | **No** | Digest-or-checkout OR; entrypoint unbound (H1) |
| AD-8 | HOLD skips annotated as errors; missing post-deploy treated as READY | **Yes** | HOLD + no SSH → expected-absent; SSH started → artifacts mandatory; HOLD/FAIL never READY. Dual omit-vs-annotate is L1 |
| AD-9 | Fork/feature/unprotected `DROPLET_*`; empty Environment policy | **Yes** | Env `uat` only; `main` branch policy; `can_admins_bypass=false`; no empty `protection_rules`; `environment: uat` only after `eligible=true`; Production `PROD_DROPLET_*` only. Q1 verifies, does not reopen |
| AD-10 | Unbounded retries, duplicate agents, untrusted PR code + privileged tokens | **No** | `pull_request_target` forbidden and #505 refuse: yes. Budget/manifest/lock: no (H4) |
| AD-11 | Claiming automatic rollback from dry-run / unmerged #532 | **Yes** | Automatic rollback unavailable until a merged workflow implements *and* live-tests it. Partial recovery = HOLD + owner rollback |

## Deferred items — divergence test

| Deferred | Could two in-scope builders diverge? | Judgment |
| --- | --- | --- |
| Dedicated UAT integration branch | No. AD-1 forbids creating/retargeting/auto-merging it in this feature | Safe |
| Live SSH connectivity proof | No. Authorization withheld; not a design fork | Safe |
| Live Cursor dispatcher | **Yes, if AD-10 stays thin.** Mocked #536 is in scope | Unsafe until H4 is fixed |
| Automatic rollback | No. AD-11 forbids claiming it; #532 stays separate | Safe |
| Production activation | No. Explicit NO-GO | Safe |
| Secret-value inspection | No. Forbidden; owner verifies names | Safe |
| GitHub branch-protection API details | No for merge mechanics (AD-5). Residual only for assuming required-check names (overlaps M2) | Safe as owner residual; do not implement a ruleset under Q4 in this feature |

Q1–Q3 are verification residuals (403 / no App check-runs), not undecided architecture. Q4 correctly marks a *future* AD-5 revision and must not be implemented now.

## Brownfield ratification (what matches / what fights)

**Ratified (keep):**

- HOLD-first exact-string suppressor; no `origin/main` fetch when the var is not `true` (`deploy.yml` 65–70; run 41321497962).
- `environment: uat` only after `eligible==true`.
- `TARGET_SHA` is 40-hex; `workflow_run` SHA must equal `head_sha`.
- Production is a different workflow, `PROD_DROPLET_*`, `concurrency: deploy-production`, owner `workflow_dispatch` from `refs/heads/main`.
- Stack pins: checkout `11d5960a…` / 4.4.0, upload-artifact `ea165f8d…` / 4.6.2, download-artifact `d3f86a10…` / 4.3.0, appleboy `2ead5e36…` / 1.2.2, ggshield 1.56.1, Next.js 16.3.6.
- #535 reporter vs #536 controller split; no ADCP; no #505 edits.
- Lifecycle: an authorized skip still uploads evidence; AD-8 “absence is FAIL” after SSH is compatible if skip ≠ missing file.

**Not ratified (must bind or Deferred):**

- `remote-deploy.sh` as the SSH script entrypoint (contract-tested).
- `concurrency: deploy-uat` / `cancel-in-progress: false`.
- `fail-closed-uat-secrets.sh` / `MISSING_SECRET`.
- `GITGUARDIAN_API_KEY` push-main-only repo secret.
- Evidence filenames and enums listed above.
- Layer A required job set vs AD-6’s broader mandatory list.

**Proposed change, correctly marked (not a contradiction):**

- `post-merge-uat.yml` and `uat-correction.yml` are “proposed; not on main.”
- AD-8 requires changing today’s unconditional `continue-on-error` downloads.

## Inherited Epic 45 — conflict surface

| Parent | Feature treatment | Conflict? |
| --- | --- | --- |
| Paradigm control / execution / evidence | Reframed as fail-closed gated pipeline; seed still has PR / main / deploy planes | No |
| AD-1 Cursor is not SSH | Inherited | No |
| AD-2 Environment `uat` owns secrets + `deploy-uat` concurrency | Inherited only the secret-location slice | **Yes — weaken (H2/H3)** |
| AD-3 `MISSING_SECRET` | Not inherited | **Yes — weaken (H2/H3)** |
| AD-4 Evidence never contains secrets | Convention “no secret-like strings” only | Partial weaken |
| AD-5 Main SHA + `remote-deploy.sh` | Re-derived as AD-1/AD-6/AD-7; entrypoint dropped | **Yes — weaken (H1/H3)** |
| AD-6 Shared-host isolation | Inherited (compose `cohestra-uat`; no CRM takeover) | No |
| AD-7 Dual-layer recaptcha | Out of this altitude | No |
| AD-8 Artifacts only execution evidence | Not inherited; AD-8 here is HOLD-honesty | Residual for acceptance close |
| AD-9 Real owner gates | Tightened by AD-2/AD-5 | No (strengthen) |
| AD-10 Dedicated automation identities | Not inherited | Residual (L2) |
| AD-11 Autonomous merge not assumed | Tightened by AD-5 | No (strengthen) |
| AD-12 Grok 4.6 control plane | Out of this altitude | No |
| Production owner-only | Inherited + Deferred NO-GO | No |
| No live Paddle on UAT | Not listed | Residual if this feature owns live `.env` deploy |

No new AD *textually* reverses a parent Rule. The defect is the Inherited table presenting a subset as the full parent contract.

## What already holds

- Paradigm diagram refuse-paths (fail/skip/forged/MAJOR/stale/`UAT_DEPLOY_GATE_ACTIVE` not `true`) match the audit and CAT-SEC T1/T3/T5.
- AD-1 + Deferred integration branch correctly refuse to reopen Epic 45 tip-pin.
- AD-4 / AD-5 / AD-9 / AD-11 are builder-safe as written.
- Production stays a different plane with different secrets and an owner dispatch.
- Open questions are labeled as verification or a future AD, not hidden in Rule prose — except AD-2’s external “decision table.”
- Structural seed marks reporter / post-merge / correction files as not on `main`. That honesty should stay.

## Gate disposition

Do not treat this spine as build-substrate until H1–H4 are closed in an Update (stable AD IDs; tighten Rules in place; add inherited rows; do not renumber). M1–M3 should land in the same distill. M4 and L-series can ride along.

Under Validate: do not edit `ARCHITECTURE-SPINE.md`. This file is the record.
