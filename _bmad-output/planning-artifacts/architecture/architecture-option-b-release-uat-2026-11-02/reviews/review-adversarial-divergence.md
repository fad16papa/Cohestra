# Reviewer — adversarial divergence (Option B)

**Lens:** Two units one level down (feature → stories) that obey every AD to the letter and still cannot compose — specifically on **deploy source**, **suppressors**, **merge tokens**, and **cutover order**.

**Inputs:** `ARCHITECTURE-SPINE.md`, `ADR-OPTION-B.md`, `MIGRATION-PLAN.md`. Companions (`CAT-SEC-THREAT-MODEL.md`, parent 2026-11-01 spine) used only to name the join the ADs claim to close. Spine is read-only.

**Verdict:** FAIL

Option B names the right planes and closes several parent cheats (named post-merge check-run, `ci.yml` Layer A is not an alternate gate, no auto-merge to `main`, Environment name stays `uat`). It does not lock the *join contracts* between those planes. Several Rules contain an `or`, a when-clause, a conditional "if auto-merge", or an unnamed store. The migration plan then licenses a different cutover order and a different drain set than the ADs.

No pair below violates an AD. Each pair is legal under the spine as written and produces a deploy source, suppressor behavior, merge identity, or cutover artifact the other unit cannot consume.

---

## Incompatible pair 1 — Deploy script at the SHA does not contain the suppressor (BLOCKER)

**Join:** deploy source × suppressors × cutover order

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| C | PR-C suppression contract | AD-14 HOLD lives in `deploy/validate-uat-predeploy-gate.sh` / `uat-predeploy-gate.py` (PR-C exclusive; brownfield home of AD-2). `workflow_run.branches` stays `[main]`. Var unset → same as #451. |
| D | PR-D retarget + SHA checkout | AD-20: workflow YAML from `main`. AD-7: checkout `candidate_sha` with `persist-credentials: false` and run host/predeploy scripts from that tree. AD-12: `candidate_sha` is `origin/release/uat` tip. |
| B | Owner cutover / runbook | Q2: initial `release/uat` SHA is current `main` `22ffe635` unless `main` moved. Migration step 2 merges PR-C to `main`; step 3 creates `release/uat` from Q2. Checklist requires PR-D on `release/uat`, **not** PR-C. |

**Why both obey every AD**

- AD-14 binds the *variable* and the HOLD reason. It does not bind the file that evaluates it, nor require that file to exist on `release/uat`.
- AD-20 binds the *workflow file* to `main`. It does not bind `deploy/*.sh` or `deploy/lib/*.py` to `main`. Those follow the SHA (AD-7).
- AD-1 is still live until "cutover step H completes", so creating `release/uat` at `22ffe635` is not an AD-12 violation yet.
- Q2 is an open question, not a HOLD-until-answered lock. Both `22ffe635` and "main moved" are legal.

**Incompatibility**

After the documented cutover, D checks out `origin/release/uat` and runs C's *pre-PR-C* gate script. That script has no `UAT_MAIN_DEPLOY_SUPPRESSED` arm. A delayed `workflow_run` of `main` CI whose `head_sha` still equals the shared `22ffe635` tip satisfies AD-12 (commit, ancestor, equal to tip). AD-14's HOLD never executes because the evaluator at the SHA does not know the var.

If B instead fast-forwards `release/uat` to post-PR-C `main`, C's script is present and the pair composes. The spine and the plan both allow the other arm. T17 / N15 become `NOT_RUN` or a silent miss depending on which story the cutover agent read.

The Structural Seed line `deploy.yml # retarget after AD-14 suppression` and PR-D exclusive (`fetch-origin-main.sh sibling or ORIGIN_UAT_REF`) encode the same fork: the suppressor can live in YAML-on-`main` or in the script-at-SHA. Only one of those is on the deploy source after Q2.

---

## Incompatible pair 2 — "After cutover" is three different instants (BLOCKER)

**Join:** deploy source × cutover order

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| A1 | Keep AD-1 live | AD-1 Rule: until cutover **step H completes**, `deploy.yml` still tip-pins `origin/main` and `workflow_run` still listens to CI on `main`. H's checklist includes `UAT_DEPLOY_GATE_ACTIVE=true` as a late item. A1 therefore forbids merging PR-D (retarget + `ORIGIN_UAT_REF`) until the gate is already true — or treats a merged PR-D as AD-1-illegal until H is fully checked. |
| A12 | AD-12 is the only source after retarget | AD-12 / AD-14: owner suppresses, drains (AD-21), **then retargets**, *then may* set the deploy gate. PR-D Must-not: do not merge while suppression is not `true`. After that merge, `candidate_sha` must be `origin/release/uat` tip. Gate is still false. |
| H | Owner checklist vs graph | Graph: `E → H`, `F → H`, `D → H`, `G → H`. Checklist for H names PR-C, PR-D, PR-G, and the gate — **not** PR-E or PR-F. H can set the gate true after D+G only, or can wait for E+F. |

**Why both obey every AD**

- AD-1's clock is "step H completes". H is defined in the migration plan as the whole owner checklist, last box `UAT_DEPLOY_GATE_ACTIVE=true`.
- AD-14's clock is suppress → drain → retarget → *may* set gate. Retarget precedes the gate.
- AD-12's clock is "after cutover". The Conflicts table says "AD-1 stays live until cutover; AD-12 applies after." It does not name the commit, the var, or the checklist box that flips the clock.
- ADR "What Option B changes after owner-authorized cutover" lists retarget *and* Environment policy *and* "main must not start Deploy UAT" as one blob.

**Incompatibility**

A1 and A12 cannot both merge a legal `deploy.yml`. A12's PR-D makes AD-1's Rule false while H is still open. A1's tests fail the moment PR-D lands. A third story that writes N17 ("candidate is `main` tip after cutover → HOLD") has to pick a clock; the other clock makes the test wrong.

H-checklist vs H-graph is the same hole one step later: first live SSH can occur with no `accepted-uat-release.json` writer (PR-F / AD-19) and no merge controller (PR-E / AD-15). Both are legal because AD-15 is conditional ("If auto-merge is enabled") and AD-19 binds "after live UAT acceptance", not "before first SSH".

---

## Incompatible pair 3 — AD-14 HOLD predicate is an unparenthesized `or`/`and` (BLOCKER)

**Join:** suppressors × deploy source

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| S1 | Conjunction | `(triggering ref is main OR workflow_run.head_branch is main) AND UAT_MAIN_DEPLOY_SUPPRESSED == true` → HOLD. Unset var → no AD-14 HOLD (PR-C hazard control: matches #451). |
| S2 | Left-or escape | `triggering ref is main OR (head_branch is main AND suppressed == true)`. A `workflow_dispatch` / job `github.ref == refs/heads/main` HOLDs even when the var is unset. Changes #451. |
| S3 | Dual-listen + HOLD | AD-13 Rule is a *when*-clause: "After `UAT_MAIN_DEPLOY_SUPPRESSED` is `true` **and** `workflow_run.branches` is only `release/uat`, a `main` CI completion must not start a run that can become eligible." S3 keeps `branches: [main, release/uat]`, relies on S1 HOLD, and claims AD-13's obligation never attaches because the when-clause is false. PR-D "Must not listen to both" is a migration sentence, not an AD. |
| S4 | Latch then unset | After retarget, delete or unset `UAT_MAIN_DEPLOY_SUPPRESSED` (cutover leftover). AD-14 HOLD no longer fires. AD-13's when-clause is also false. Same-SHA `main` `head_sha` (pair 1) passes AD-12. |

**Why both obey every AD**

- AD-14 Rule text is exactly: "If the triggering ref is `main` or `workflow_run.head_branch` is `main` and `UAT_MAIN_DEPLOY_SUPPRESSED == true`". No parentheses. "Triggering ref" is unnamed (`github.ref` vs `workflow_run.head_branch` vs `workflow_run.path` vs dispatch ref).
- AD-14 requires the var `true` *before* retarget. It does not require the var remain `true` forever.
- AD-13's only hard obligation is "must not become eligible" *after* both conjuncts. Dual-listen is T12's vector; the AD encodes it as a precondition, not a Prevents-as-Rule.
- Conventions say post-cutover trigger is CI on `release/uat` only. Conventions are not ADs.

**Incompatibility**

S1 vs S2 disagree on #451 compatibility and on `workflow_dispatch` from `main`. S3 vs a single-listen story disagree on whether a `main` CI completion *starts* a Deploy UAT run (HOLD vs never queued). S4 vs S1 disagree on delayed `workflow_run` after the owner "cleans up" vars. N14–N16 can all pass in one tree and fail in the other while every AD is cited.

Inherited AD-2 still forbids fetch of `origin/main` when the *deploy* gate is not `true`. It is silent on `origin/release/uat` and on the new var. A fifth story can skip all fetches on HOLD (no tip to compare) or fetch `release/uat` anyway. AD-14 does not pick.

---

## Incompatible pair 4 — Merge writer identity is conditional and shareable (BLOCKER)

**Join:** merge tokens

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| M | PR-E `uat-merge.yml` | AD-15: dedicated App slug `cohestra-uat-merge`. Token "can **push or merge** to `release/uat`". Cannot write `main`, cannot read Environment secrets, cannot edit vars. Manifest path check (AD-16). |
| R | Issue #536 producer | AD-10 / AD-15: no merge token, `SIMULATED_PASS` first, assigns scoped Cursor repairs. Needs a writer that can push a new HEAD to the *feature* branch. AD-15 does not say R cannot *use* `cohestra-uat-merge` to push feature commits. "Neither App may **approve** its own merge" — R does not approve; R pushes, M merges. |
| O | Owner / classic merge | AD-15 opens with **"If auto-merge is enabled"**. Q1 / Deferred: owner may enable merge queue, classic auto-merge, or neither. O uses a human OWNER token or `GITHUB_TOKEN` `contents: write` on a required-check merge and never installs the App. AD-16 never applies because this is not "auto-merge". |

**Why both obey every AD**

- AD-15's only-writer sentence is inside the `if`. No auto-merge → no App requirement.
- "Push or merge" is a first-class `or`. M-push bypasses PR required checks unless branch protection (Deferred, owner UI) also blocks the App. M-merge uses the merge API / merge queue.
- AD-4 / AD-5: #536 is not *the* merge controller and must not have `contents: write` on `main`. Pushing a feature branch with the merge App's token does not write `main`.
- Migration "must not share the App" is not an AD. PR-E "No #536 files" only splits trees, not identities.
- Inherited AD-3 still allows Apps *or* two human APPROVED reviews. AD-16 requires "named check-runs" in branch policy *and* lists `reviewer_app_slugs` as a per-manifest field — a second `or`.

**Incompatibility**

M-push and M-merge leave different trees and different required-check evidence on `release/uat`. R sharing M's App means the same installation both authors the new HEAD and merges it; AD-3/AD-15 "neither App may approve its own merge" is satisfied as letter and failed as identity. O and M both ship as "AD-15 done": one repo has no `cohestra-uat-merge`, the other will not accept a human merge of a manifest-eligible PR.

AD-16 evidence is exact-HEAD CI, native GG, AD-3 reviews, mergeable, not draft, not stale. It does **not** consume #535 `READY_FOR_OWNER_MERGE_DECISION`. #535 can emit an artifact or check-run that M never reads. That is the parent pair-2 channel hole, reopened for the new writer.

---

## Incompatible pair 5 — Manifest store and reviewer slugs are not a join (MAJOR)

**Join:** merge tokens × inherited AD-10 / AD-3

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| R10 | #536 per parent AD-10 | Manifest JSON persisted as Actions artifact `uat-correction-state` plus an issue-comment marker that is evidence, not authorization. Lock key `pr_number+head_sha+manifest_id`. `max_attempts` default 3. `reviewer_app_slugs` from that copy. PR-head `TASK.md` is fine as the owner-approved source if the owner approved the PR. |
| M16 | PR-E per AD-16 | Same field list minus `max_minutes`. No store. CAT-SEC T16 (companion, not AD) wants a copy on `main` or a signed OWNER comment. M16 may also treat PR-head `TASK.md` as the authorization copy. `reviewer_app_slugs` in *this* manifest may list different Apps than inherited AD-3 defaults. |
| A3 | Dual-review consumer (#535) | Inherited AD-3: check-runs exactly `Cohestra BMAD` / `Cohestra CAT-SEC` from slugs `cohestra-bmad` / `cohestra-cat-sec` (or owner-pinned slug+id). Structured output `severity` with no BLOCKER/MAJOR. Human fallback: two PR reviews. |

**Why both obey every AD**

- AD-16 names fields, not a filename, not an Actions artifact, not "must equal the AD-10 copy".
- AD-10's store is binding for #536, not for the merge controller (AD-15/16 is a new writer the parent did not have).
- Option B's inherited AD-3 *summary* drops structured `severity`, slug+id conjunction, and the `cursor*` prefix ban. A story that only reads this spine (not the parent file) uses the compressed `or`.
- Hard deny of `.github/workflows/**`, `deploy/**`, `docs/deploy/**` is in AD-16 regardless of manifest — control-plane cannot auto-merge. Feature-path allowlists still diverge.

**Incompatibility**

R10 exhausts budget from artifact `max_attempts=3` while M16 merges because its `TASK.md` says `max_attempts=8`. A3 never sees M16's alternate `reviewer_app_slugs`. M16 accepts two human APPROVED reviews (AD-3 fallback) while branch policy (AD-16 last sentence) waits for named check-runs that do not exist — fail-closed forever *or* M16 skips policy because Q1 is Deferred.

---

## Incompatible pair 6 — Drain set and Environment clock disagree (MAJOR)

**Join:** cutover order × suppressors

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| D21 | AD-21 drain | List `queued` / `in_progress` / `waiting`. Wait until `completed` with `eligible=false` and `ssh_executed=false`. Do not cancel. Then merge the retarget. |
| Dmig | Migration drain | Same, plus **`requested`**. Checklist: "Zero in-flight Deploy UAT runs; last runs `ssh_executed=false`". |
| E18 | AD-18 Environment clock | Policy `release/uat` only + `can_admins_bypass=false` **before the deploy gate is `true`**. May happen after suppress, after drain, after PR-D. |
| Emig | Migration Environment clock | Policy is step 4, **before** suppress (5), drain (6), PR-D (7). |

**Why both obey every AD**

- AD-21's status list does not include `requested`. GitHub uses `requested` for newly submitted and approval-gated runs.
- AD-8: expected HOLD skips may omit `ssh_executed`. D21-missing treats absent artifact as `ssh_executed=false`. D21-strict treats absent as "drain incomplete".
- AD-18's only order constraint is "before gate true". AD-14's order constraint does not mention Environment policy. Both clocks satisfy both ADs.

**Incompatibility**

D21 can merge PR-D while a `requested` Deploy UAT (from `main` CI) still exists. That run later becomes `queued`/`in_progress` against the *new* `deploy.yml` (AD-20, from `main`, now listening to `release/uat` — or still listening to `main` if S3). AD-21's purpose statement fails.

E18 can retarget Deploy UAT to `release/uat` while Environment `uat` is still unrestricted (parent T1 / Option B T13). Gate is false, so `eligible` should block `environment: uat`. A single `eligible=true` bug, or any other workflow on an unprotected ref with `environment: uat`, reads `DROPLET_*`. Emig closed that window; E18 is equally AD-legal.

---

## Incompatible pair 7 — Tip-pin mechanism is an explicit `or` (MAJOR)

**Join:** deploy source

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| Tvar | Convention `ORIGIN_UAT_REF` | After cutover, `ORIGIN_UAT_REF=origin/release/uat`. `ORIGIN_MAIN_REF` remains Production-only. Same `fetch-origin-main.sh` with a different env var. |
| Tsib | PR-D exclusive `or` | " `fetch-origin-main.sh` **sibling** or `ORIGIN_UAT_REF` ". Adds `fetch-origin-uat.sh` (or similar) and leaves `ORIGIN_MAIN_REF` wired in UAT predeploy. |
| Trb | Rollback bind (PR-F / AD-11) | AD-12 Prevents: `main`, a feature SHA, or a branch named `uat`. A prior accepted `release_sha` that is an **ancestor** of `origin/release/uat` but **not** the tip is none of those. AD-12 Rule's "and equal to the current tip" is the forward-deploy sentence; rollback is a different AD (AD-11, not automatic). |

**Why both obey every AD**

- AD-12 names the ref `origin/release/uat`, not the script or the env var.
- Migration PR-D exclusive text is an `or`.
- AD-12 Rule is three conjuncts (commit, ancestor, equal to tip) whose Prevents list does not mention historical `release/uat` SHAs. AD-11 says rollback is not implied automatic; it does not say rollback must move the tip first.

**Incompatibility**

Tvar tests fail if the sibling exists and the old var still tip-pins `origin/main` on the UAT path. Tsib tests fail if only the var changed. Trb cannot SSH a prior SHA if Tvar/Tsib implement the three conjuncts literally; Trb can SSH it if they implement the Prevents list. Acceptance (`accepted-uat-release.json`) and #532 then pin different objects.

---

## Deferred / plan rows that license divergence

The gate test: *nothing under Deferred could let two units diverge*.

| Item | Divergence it licenses | Severity |
| --- | --- | --- |
| **Q2 initial `release/uat` SHA = `22ffe635`?** | Pair 1. Not "blocks implementation". A story may create the branch from the audited SHA after PR-C moved `main`. | BLOCKER (feeds pair 1) |
| **Q1 merge queue vs classic auto-merge** | Pair 4. "CI will include `merge_group` so either works" licenses M-push, M-merge, merge queue enqueue, and human O. AD-15 `if` + `push or merge` is the same hole. | BLOCKER (feeds pair 4) |
| **Creating and protecting `release/uat`** | Owner UI. Until it happens, M-push to an unprotected `release/uat` is AD-15-legal. T13. | MAJOR |
| **Environment `uat` branch policy** | Owner. AD-18 vs migration clock (pair 6). | MAJOR |
| **Installing the three Apps** | Owner. A3/M/R can each no-op until install and still claim AD-3/15 `SIMULATED_PASS`. | MAJOR |
| **Choosing merge queue vs auto-merge button** | Duplicate of Q1. | (same) |
| **`UAT_DEPLOY_GATE_ACTIVE=true` last** | Correct as a no-op *if* "last" is the same list. Pair 2 shows three lists (AD-1 H, AD-14, checklist-minus-E/F). | BLOCKER (feeds pair 2) |
| **PR-G does not depend on C or D** | Graph is `A → G → H`. G can merge N14–N24 fixtures that pass against *current* `main` (no suppression arm, still `origin/main` tip-pin) and never re-run after C/D. | MAJOR |
| **PR-D "sibling or ORIGIN_UAT_REF"** | Pair 7. An `or` in a plan exclusive-column is a licensed fork. | MAJOR |
| **Live SSH / automatic rollback / Production** | Honest parks. Rollback still inherits pair 7's pin. | MINOR / none |

---

## Additional AD holes the pairs exploit

These are not extra pairs. They are the underspecifications the pairs use.

1. **No single "cutover complete" predicate.** AD-1, AD-12, AD-13, AD-14, ADR table, migration H, and the checklist each name a different subset of {suppression var, drain, retarget, Environment policy, PR-D on both lines, PR-E, PR-F, PR-G, gate true}.

2. **AD-13 is a when-clause, not a must.** Dual-listen + HOLD is AD-legal. CAT-SEC T12 called that vector a BLOCKER.

3. **AD-14 "exact-string" does not say the new var stays true, nor what unset means after PR-C.** Paradigm "missing evidence is HOLD" vs PR-C "unset matches #451" is an unresolved `or`.

4. **AD-21 drain statuses ≠ migration statuses.** `requested` is the live hole. Missing `ssh_executed` is the AD-8 hole carried forward.

5. **AD-15 `if auto-merge` + `push or merge` + no "must not share with #536".** Token identity is not a join.

6. **AD-16 has no store and does not consume #535.** Manifest fields collide with AD-10 without pointing at AD-10's artifact. `reviewer_app_slugs` can override inherited AD-3.

7. **Option B's inherited AD-3 row is a compression, not a pointer.** Stories that only read this spine lose structured `severity`, slug+id, and the `cursor*` prefix ban.

8. **AD-20 binds YAML, not scripts.** Pair 1 is possible only because of this.

9. **AD-12 Prevents list is narrower than the Rule.** Rollback and same-SHA `main` both slip through the Prevents list.

10. **PR-C "Must not change `workflow_run.branches` away from `main`"** does not forbid *adding* `release/uat` (pair 3 / S3).

11. **Epic 45 AD-5 (CI-on-`main` + `workflow_run.head_sha` is the entrypoint) is silently unlisted** in this spine's Inherited table. A story that still honors the parent inherited row will not retarget. A story that only reads this spine will.

12. **"Any Production interface" (AD-16) is undefined.** Two path-classifiers will not agree.

---

## What the spine already prevents (attacks that failed)

Recorded so the FAIL is not "the spine decides nothing."

- Treating `ci.yml` Layer A as the post-merge *eligibility* gate — AD-17 names check-run `Post-merge UAT validation` and says Layer A is not an alternate gate. (The *trigger* remains `workflow_run` of CI; that is fail-closed, not a second gate.)
- Auto-merge to `main`, or #536 as the merge controller of record — AD-5 tightened + AD-15 "cannot write `main`" + AD-19 no automated promotion PR. (The hole is a *shared App* and the `if`, not a second destination.)
- Git branch named `uat`, or Environment renamed — AD-12 / ADR.
- Truthy deploy gate (`True`, `1`, `yes`) — inherited AD-2 exact `"true"`, restated in AD-14 for that var.
- `pull_request_target` or PR-authored scripts with `DROPLET_*` — AD-20.
- Feature-SHA or non-tip `release/uat` as a *forward* deploy while the implementer applies all three AD-12 conjuncts — the Rule holds; the Prevents list and rollback are the leaks.
- Production `PROD_*` / Environment `production` from Deploy UAT — inherited + AD-13 + AD-18.
- Combining #535 and #536 in one PR — AD-4.
- Cancel-to-drain — AD-21 `cancel-in-progress: false`.
- Enabling the deploy gate *as the first* cutover write while citing AD-14 — the Rule order forbids it. (The hole is the other clocks, pair 2.)

---

## Required locks (not applied; spine is read-only)

To kill the pairs, the spine needs join contracts, not more intent:

1. **One cutover predicate.** Name the exact var+ref+SHA state that retires AD-1 and activates AD-12. Suggested: `UAT_MAIN_DEPLOY_SUPPRESSED==true` AND `workflow_run.branches==[release/uat]` AND `release/uat` tip contains the suppression evaluator AND Environment policy is `release/uat` only. Gate true is a later, separate latch. Delete "step H completes" as AD-1's clock.

2. **Suppression evaluator on `main` YAML, not only on the SHA.** AD-14 HOLD must execute from the default-branch workflow (AD-20) *before* checkout of `candidate_sha`. Bind `UAT_MAIN_DEPLOY_SUPPRESSED` to remain exact `true` after retarget (no cleanup). Parenthesize the predicate: `(github.event.workflow_run.head_branch==main OR github.ref==refs/heads/main) AND var==true`. Unset after PR-C is "not suppressed" (keep #451); unset after retarget is HOLD.

3. **`workflow_run.branches` must be exactly `[release/uat]` after retarget.** Promote the Conventions/PR-D sentence into AD-13's Rule, not its when-clause. Forbid adding `release/uat` in PR-C.

4. **Q2 cannot be `22ffe635` after PR-C.** Initial `release/uat` SHA must be the post-PR-C `main` tip (or a SHA that contains the AD-14 evaluator). Fast-forward `release/uat` to that SHA before PR-D merge. Strike the `22ffe635` default or mark Q2 as blocking PR-D.

5. **Drain set is one list.** AD-21 = migration = `queued|in_progress|waiting|requested`. Missing `ssh_executed` on a HOLD run is `false`, not "drain incomplete".

6. **AD-15 without the `if`.** The only writer to `release/uat` that is not a human OWNER is App `cohestra-uat-merge`. Method is merge API or merge queue, **not** raw push. #535, #536, and that App are three installations. #536 token cannot push using the merge App. Human OWNER merge remains legal for control-plane and for `main`.

7. **One manifest copy.** AD-16 store = AD-10 artifact schema, or a file on `main` only. PR-head `TASK.md` is evidence. `reviewer_app_slugs` cannot override inherited AD-3 defaults. #535 verdict is either required input to M or explicitly not.

8. **AD-12 rollback pin.** Forward deploy = current `origin/release/uat` tip. Rollback (when AD-11 later allows it) names `accepted-uat-release.json.release_sha` and must not use `main`. Delete the ancestor conjunct or define it only as a sanity check on the tip.

9. **PR-D exclusive: pick `ORIGIN_UAT_REF`, delete the sibling `or`.**

10. **Inherited AD-3 is the parent Rule, not the one-line summary.** Point at parent IDs; do not re-compress.

11. **H graph = H checklist.** If E/F are not required before first SSH, say so in both places. If AD-19 writer must exist before first live acceptance, F is on the checklist.

---

## Gate

**FAIL.** Two story-pairs (SHA-at-`22ffe635` missing the suppressor evaluator; three different "cutover" clocks for AD-1 vs AD-12 vs H) obey every AD and cannot compose a single deploy source. A third pair (unparenthesized AD-14 + AD-13 when-clause + unset-after-retarget) lets `main` still start or still qualify Deploy UAT. A fourth pair (AD-15 `if` / `push or merge` / shareable App) lets two merge identities ship as "AD-15 done". Drain status, Environment clock, tip-pin `or`, and manifest store are MAJOR joins. The spine is not a sufficient consistency contract for the stories that will implement Option B.
