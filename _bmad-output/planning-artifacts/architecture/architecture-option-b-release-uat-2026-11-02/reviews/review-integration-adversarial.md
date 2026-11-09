# Reviewer — integration adversarial (workflow_run deploy / stuck post-merge HOLD)

**Lens:** Two implementers who obey every AD Rule to the letter — specifically AD-13, AD-17, AD-20, AD-22, AD-23, AD-24 and the Triggers convention — and still ship either a `workflow_run` Deploy UAT path or a T22 stuck post-merge HOLD (green `release/uat` SHA, SSH skipped, no later event retries).

**Inputs:** `ARCHITECTURE-SPINE.md` (read-only). Companions (`ADR-OPTION-B.md`, `MIGRATION-PLAN.md`, `ENVIRONMENT-REF-ANALYSIS.md`, `CAT-SEC-THREAT-MODEL.md`, parent 2026-11-01 AD-6, brownfield `deploy.yml` / `validate-uat-predeploy-gate.sh` / `uat-predeploy-gate.py` / `commission-uat-hold.sh`) used only to name the join the ADs claim to close.

**Date:** 2026-11-02
**Spine modified:** no

## Verdict

**FAIL**

Successful SSH via `workflow_run` is locked if AD-14 (`github.ref==refs/heads/release/uat`) + AD-18 + AD-22 are all applied. A leftover or hybrid `workflow_run` *trigger* is still shippable. A stuck post-merge HOLD is still shippable while citing the AD letters.

The same-run `needs` story (AD-23 mermaid, ENVIRONMENT-REF-ANALYSIS) would close T22. That order is not in any AD Rule. The Rule text still licenses the brownfield evaluator shape: query job/check-run SUCCESS now, and on `pending` skip SSH and finish the run.

---

## What the letters already lock (attacks that failed)

- After PR-D, Deploy UAT may not list `workflow_run` as a trigger (AD-13, AD-20, AD-23, Triggers). `ci.yml` is not a deploy trigger (AD-17).
- `workflow_run` / `repository_dispatch` `GITHUB_REF` is `main`. Those events cannot satisfy Environment `uat`=`release/uat` (AD-22). Checkout and `head_branch` do not change that.
- SSH `eligible=true` requires `github.ref==refs/heads/release/uat` (AD-14). A `workflow_run` run cannot pass that conjunct.
- AD-23 SSH `needs` every AD-17 job in the same workflow. FAILURE / CANCELLED / SKIPPED skip SSH.
- AD-24 dispatch is `--ref release/uat` after `success()`, exclusive of a second CI/`workflow_run` deploy. `GITHUB_TOKEN` must not start Deploy UAT.

Those locks kill *successful* `workflow_run` SSH. They do not kill the pairs below.

---

## Incompatible pair 1 — Predeploy evaluates AD-17 SUCCESS before those jobs finish (BLOCKER)

**Failure mode:** stuck post-merge HOLD

**Join:** AD-14 “this run” conjunct × AD-17 `pending` skip × AD-23 `needs` (SSH only)

| Unit | Legal reading |
| --- | --- |
| SEQ | Spine mermaid and ENVIRONMENT-REF-ANALYSIS: `Push → Tests → Pre → Env`. Predeploy `needs` every AD-17 job, then evaluates AD-14. Pending cannot occur. A green push reaches the gate, then SSH. |
| PAR | AD-23 Rule binds `needs` on the **SSH** job only. Predeploy is the AD-14 evaluator and has no `needs`. Default Actions graph is `Tests ∥ Pre → SSH`. AD-14 requires “every AD-17 job in **this run** is SUCCESS.” AD-17: “pending required jobs skip SSH.” PAR queries this-run jobs (or check-runs of those names) from predeploy. First look is `pending` → `eligible=false` → SSH skipped → run completes. Tests later SUCCESS. No retry. |

**Why both obey every AD**

- AD-14 names a predicate, not a `needs:` edge from predeploy to the test jobs.
- AD-17’s `pending → skip SSH` is poll-once semantics. GitHub `needs` *waits*; it never observes `pending`. The word is only live if someone evaluates status before the jobs finish.
- AD-23 “A fully passing `release/uat` push starts deploy in the same run (gate still required)” is ambiguous: PAR’s run starts; the gate HOLDs. “Gate still required” lets PAR claim the HOLD is the gate.
- Triggers convention does not order jobs inside the run.

**Incompatibility**

SEQ ships T22-closed. PAR ships T22 on every push: the AD-17 jobs go green in the same run that already HOLDed. That is the CI-first race with the race moved inside one workflow file. N27 (“AD-23 avoids stuck HOLD”) is true only for SEQ.

Brownfield `uat-predeploy-gate.py` already queries other jobs/check-runs and HOLDs on `queued` / `in_progress` / `pending`. PAR is the letter-shaped port of that script onto “this run.”

---

## Incompatible pair 2 — AD-23 push is unconditional; AD-24 Prevents do not forbid the hybrid (BLOCKER)

**Failure mode:** stuck post-merge HOLD (and a second deploy start)

**Join:** AD-23 first sentence × AD-24 Prevents vs Rule × AD-17 job names as check-runs

| Unit | Legal reading |
| --- | --- |
| C | Combined file. `on.push.branches: [release/uat]`. AD-17 jobs in `deploy.yml`. SSH `needs` them. `post-merge-uat.yml` omitted. AD-24 `if` is false. |
| H | Owner refuses a combined file (AD-24 `if` true). Jobs live in `post-merge-uat.yml`. AD-23’s first sentence is not qualified by that `if`, so Deploy UAT still has `on.push.branches: [release/uat]`. AD-24 Prevents only names “a second **CI/`workflow_run`** deploy,” not push+dispatch. H does **not** add App dispatch (reads “not both” as “not two start mechanisms”). AD-17 job names are enforced by Checks API because `needs` cannot cross workflows. Push starts Deploy UAT while post-merge is `pending` → skip SSH → run ends. Nothing retries. |

**Why both obey every AD**

- AD-23 Rule opens with an unconditional after-PR-D trigger. The exclusive `or` is only in AD-24.
- AD-24 Prevents is narrower than AD-24 Rule. Push + split file + no `workflow_run` satisfies Prevents.
- AD-17 lists **names** (the same names `ci.yml` already emits) and says pending skips SSH. It also says “same run,” which H cannot satisfy if the owner refused a combined file. H implements the sentences that remain possible.
- Structural Seed “`post-merge-uat.yml` — AD-24 only; omitted under AD-23” is a seed, not a Rule.

**Incompatibility**

C is T22-closed. H is T22. A third unit that adds AD-24 dispatch on top of H retries and is not stuck — but that unit implements both start mechanisms, which another reader of “not both” will refuse. The owner-refuses path has no single AD-legal file layout.

---

## Incompatible pair 3 — Two `deploy.yml` copies; PR-D retargets the executed copy only (MAJOR)

**Failure mode:** leftover `workflow_run` trigger on `main`

**Join:** AD-20 execution source × AD-22 default-branch listener × AD-13 residual

| Unit | Legal reading |
| --- | --- |
| D-uat | AD-20 / AD-23: after PR-D, GitHub executes Deploy UAT YAML from the `release/uat` tip (`push` / dispatch). PR-D replaces *that* file: delete `workflow_run`, add `push`. AD-21 “merges PR-D (remove `workflow_run`, add `push` to `release/uat`)” does not name `main` as a base. |
| D-both | AD-22: a `workflow_run` listener is executed from the **default branch**. AD-13: after PR-D a `main` CI completion must not create a Deploy UAT run; residual listeners are a contract FAIL. D-both therefore changes `main` and fast-forwards `release/uat` (migration checklist only). |

**Why both obey every AD**

- AD-20 binds the copy GitHub runs for `push` / dispatch, not the copy GitHub runs for `workflow_run`.
- AD-1 “one `deploy.yml` at a time” names a path, not two branch trees.
- AD-13’s “after PR-D” clock assumes one file. D-uat’s PR-D never touched the listener GitHub still loads from `main`.

**Incompatibility**

D-uat ships a live `workflow_run` Deploy UAT path on `main`. With AD-18 already applied that path is Environment-deny (no `DROPLET_*`) — not SSH, but it is a `workflow_run` deploy *run*. With AD-18 not yet applied and the gate later true, it is SSH from `main` (T12). D-both closes it. N25 passes in one tree and fails in the other.

AD-22’s “if a leftover listener remains, Environment policy plus AD-22 deny secrets” (AD-21) treats leftover as an expected residual, which licenses D-uat.

---

## Additional holes the pairs use

These are not extra pairs. They are the underspecifications.

1. **Parent AD-6 is neither inherited nor superseded.** Parent Rule still requires `post-merge-uat.yml`, check-run `Post-merge UAT validation`, and `uat-predeploy-gate.py` to require that check-run when the suppressor is `true`. Option B AD-17 dropped the check-run name and moved the jobs into Deploy UAT. Conflicts table does not retire AD-6. A parent-faithful unit adds the check-run gate on top of AD-23. Same-run tests can be green while that check-run is still pending → T22. (MAJOR)

2. **ADR “What Option B changes after cutover” still says `workflow_run` CI on `release/uat` only.** Spine Conflicts supersede c6ec3370. ADR `status: accepted-target` does not. An implementer who treats the ADR table as the contract ships T21 (Environment mismatch) and T22 (CI-first HOLD). Not an AD-legal path, but it is the document a second implementer will open first. (MAJOR)

3. **Brownfield evaluator still forbids `push`.** `validate-uat-predeploy-gate.sh` HOLDs unless `GITHUB_EVENT_NAME` is `workflow_run` or `workflow_dispatch`. `commission-uat-hold.sh` / `.test.sh` fail if `deploy.yml` lacks `workflow_run`. `require_gitguardian_api_scan_job` HOLDs unless the CI run `head_branch` is `main`. No AD says the evaluator must accept `event_name=push` or `head_branch=release/uat`. PR-D exclusive lists the scripts; the AD Rules do not. Unit YAML-only (AD-23) + unit GATE-keep (brownfield, not contradicted) = every post-cutover push HOLDs, or GATE-keep refuses to delete `workflow_run`. (MAJOR)

4. **AD-17 job names collide with `ci.yml`.** Convention: `ci.yml` still runs on `push` to `release/uat` and already uses those names. A Checks-API reading of “Required job names” (pair 1 PAR / pair 2 H) sees the in-progress CI copy as `pending` even after the in-run copies SUCCESS. (MAJOR)

5. **AD-17 and AD-24 cannot both be implemented.** AD-17: jobs “in the same Deploy UAT workflow run”; SSH `needs` them. AD-24: jobs in another file; Deploy UAT is `workflow_dispatch` after `success()`. No exception clause. The owner-refuses path is forced to violate AD-17, which is how H appears. (MAJOR)

6. **AD-22 leftover-deny + UNVERIFIED canary license a “safe” `workflow_run` listener.** If the documented `GITHUB_REF=main` fact is wrong live, leftover `workflow_run` of CI on `release/uat` *would* match Environment `uat` and could SSH. The simulator is not GitHub. AD-13 still forbids leftover; pair 3 shows leftover is still a legal PR-D. (MAJOR)

7. **AD-23 trigger list is not closed.** `on.push.branches` is exactly `[release/uat]`; optional `workflow_dispatch`; no `workflow_run`. `repository_dispatch` and `workflow_call` are unnamed. `workflow_call` from `ci.yml` on `release/uat` starts Deploy UAT on CI completion with `GITHUB_REF=release/uat` (Environment allow). That is a CI-complete deploy that is not `workflow_run`. If AD-17 jobs are not in the called run, pending-skip HOLDs with no retry. (MAJOR)

8. **AD-17 “Do not start deploy from a `workflow_run` of CI” is narrower than AD-13.** A `workflow_run` of `post-merge-uat.yml` (or of a renamed CI) obeys that sentence and still sets `GITHUB_REF=main` (AD-22). AD-13/AD-20/AD-23 forbid it; a unit that only tightens AD-17 will keep it. Environment-deny forever looks like a stuck HOLD. (MINOR as long as AD-13 is applied; MAJOR if AD-17 is the only trigger sentence a story copies)

9. **AD-24 `success()` is the Actions function.** Skipped required jobs do not make `success()` false. Dispatch can fire after a skip-matrix post-merge. Opposite of stuck HOLD (SSH without those tests) unless Deploy UAT re-applies AD-17 SKIPPED → skip SSH and never retries. (MINOR)

10. **Epic 45 AD-5 (CI-on-`main` + `workflow_run.head_sha` entrypoint) is still unlisted** as inherited or superseded. A unit that still honors the parent inherited row will not delete `workflow_run`. (MAJOR, feeds pair 3)

11. **N15 still names a delayed `main` `workflow_run` HOLD.** After PR-D that event must not exist (AD-13). Keeping N15 as a live arm licenses a listener so the HOLD can fire. (MINOR)

12. **Triggers convention restates the `or` without closing pair 2.** “`push` … (AD-23) or exclusive AD-24 … Never `workflow_run`.” Same exclusive that AD-23’s first sentence does not honor. (feeds pair 2)

---

## Required locks (not applied; spine is read-only)

1. **Order inside the run is a Rule.** Predeploy `needs` every AD-17 job. Delete “pending” from AD-17, or define it as “GitHub has not started the SSH job yet” (i.e. `needs` waits). AD-14 “this run SUCCESS” is that `needs` edge, not a Checks API query. Forbid querying `ci.yml` check-runs for AD-17 names.

2. **One after-PR-D Deploy UAT trigger block.** Either AD-23 or AD-24, named in AD-13/AD-20/AD-23 as a single closed `on:` map. AD-23’s first sentence becomes “unless AD-24.” AD-24 Prevents must also name push+split-without-in-run-jobs. AD-24 must say: AD-17 jobs live in `post-merge-uat.yml`; Deploy UAT does not re-check them; no `on.push` on Deploy UAT.

3. **PR-D updates both trees.** After PR-D, the `deploy.yml` on `main` and on `release/uat` both have no `workflow_run`. Residual listener on either copy is a contract FAIL *of PR-D*, not an Environment-deny fallback.

4. **Conflicts: parent AD-6 and Epic 45 AD-5 are superseded after PR-D.** Until PR-D, AD-1 + current `main` `workflow_run` remain. After PR-D, check-run `Post-merge UAT validation` is not a gate. Layer A / `ci.yml` jobs are not a gate.

5. **Bind the evaluator to `push`.** `GITHUB_EVENT_NAME=push` is eligible. `commission-uat-hold` must not require `workflow_run` after PR-D. GG / Layer A `head_branch==main` is Production-only.

6. **ADR table must match AD-13/AD-23.** After cutover the automatic path is `push` to `release/uat` (or exclusive AD-24 dispatch), not `workflow_run` of CI.

7. **Closed trigger set:** `on:` may contain only `push` (`branches: [release/uat]`) and optional `workflow_dispatch`. Name-forbid `workflow_run`, `repository_dispatch`, `workflow_call`, `pull_request`, `pull_request_target`.

8. **Retire AD-22 leftover-deny as a license.** Leftover listener is PR-D FAIL, not a documented deny path.

---

## Gate

**FAIL.** Pair 1 (parallel predeploy + AD-17 `pending` skip) and pair 2 (unconditional AD-23 push + AD-24 split without in-run `needs`) obey the Rule letters and still ship a stuck post-merge HOLD. Pair 3 ships a leftover `workflow_run` listener from a release/uat-only PR-D. Successful `workflow_run` SSH stays locked by AD-14 + AD-18 + AD-22 when those are all applied; that is not enough. The spine is not a sufficient join contract for PR-D.
