# Reviewer — CAT-SEC + BMAD rubric (Option B)

- **Spine:** `_bmad-output/planning-artifacts/architecture/architecture-option-b-release-uat-2026-11-02/ARCHITECTURE-SPINE.md`
- **Companions:** `CAT-SEC-THREAT-MODEL.md`, `MIGRATION-PLAN.md`, `ADR-OPTION-B.md`
- **Parent:** `architecture-uat-automation-readiness-2026-11-01` spine + CAT-SEC (T1–T11)
- **Reviewer:** independent CAT-SEC and BMAD rubric walker
- **Date:** 2026-11-02
- **Altitude:** feature
- **Scope of this pass:** first-merge hazard; untrusted PR workflows; #536 cannot merge; Environment `uat` restriction; no auto promotion to `main`; Production isolation; each AD Rule actually prevents its stated divergence; inherited ADs not silently weakened
- **Mechanical lint (`lint_spine.py`):** PASS — 0 findings (placeholders, AD IDs, Binds/Prevents/Rule, Stack pins)
- **Spine modified:** no

## Verdict

**FAIL**

The package is an honest *target* (not a live cutover) and it names the right new planes: dual suppressor, drain-before-retarget, dedicated merge App, Environment `uat` → `release/uat`, no `release/uat` → `main` automation, Production left on `workflow_dispatch` from `main`. Parent residuals T1/T3/T5/T7/T10 stay open. That honesty is not enough.

Two load-bearing controls do not prevent the divergences they claim:

1. **AD-14 / N14 disagree on the actual first-merge state** (`UAT_DEPLOY_GATE_ACTIVE=true`, `UAT_MAIN_DEPLOY_SUPPRESSED` unset, trigger `main`). That state is live SSH on today’s `deploy.yml`. The Rule only HOLDs *after* the owner has already set the second variable. The Prevents clause claims the dual suppressor stops the owner from enabling the gate while `main` can still fire Deploy UAT. It does not.
2. **AD-20 does not cover the privileged workflows Option B adds.** `workflow_run` uses the default-branch YAML. `workflow_dispatch` (explicitly allowed from `release/uat`) and any `pull_request` consumer (`uat-merge.yml`, `uat-correction.yml`) do not. Forbidding `pull_request_target` without an alternate default-branch trigger leaves same-repo PR YAML + repo secrets as the natural merge-bot shape. That is T2/T14 for the new merge token, and AD-20 only names `DROPLET_*` / “UAT secrets.”

Auto-merge then reuses inherited AD-3 (still the parent’s leaky `or`) as a *write* gate, and AD-15’s token “can push or merge” can skip AD-16 entirely. Those are MAJOR, not style.

Architecture is **not** a sufficient fail-closed contract for PR-C/D/E. Not authorized to cut over. Do not set `UAT_DEPLOY_GATE_ACTIVE=true`.

---

## Rubric checklist

| Good-spine / CAT-SEC test | Result | Note |
| --- | --- | --- |
| First-merge hazard fail-closed | **FAIL** | AD-14 Rule ≠ Prevents ≠ N14. Same-SHA window makes SHA-only tip-pin accept `main`. Process order in the migration plan is not a Rule |
| Untrusted PR / privileged workflow | **FAIL** | AD-20 true only for `workflow_run`. Dispatch YAML-from-ref and PR-authored merge/correction workflows unbound |
| #536 cannot merge | **PASS** | AD-4, tightened AD-5, AD-10, AD-15, PR-E “no #536 files”, N19. Residual: AD-15’s “If auto-merge is enabled” qualifier |
| Environment `uat` restriction | **PASS with residual** | AD-18 + T13 + owner-before-gate. T1 remains FAIL. Parent AD-9 → AD-18 is an explicit conflict, not silent |
| No auto promotion to `main` | **PASS** | AD-13, AD-19, T19, N23. No automation opens `release/uat` → `main` |
| Production isolation | **PASS with residual** | Inherited owner dispatch, `PROD_*`, Environment `production`, T20, N24. “Production interface” path list unnamed |
| Every AD Rule prevents its stated divergence | **FAIL** | AD-14, AD-15, AD-16, AD-20 overclaim or contain an `or` that implementers can pick opposite sides of |
| Inherited ADs not silently weakened | **FAIL** | AD-1/AD-5/AD-9 conflicts are surfaced. AD-3 is reused as auto-merge authorization without closing parent T3. Epic 45 AD-5 (CI-on-main) is not listed as superseded |
| Nothing under Deferred lets two units diverge | **PASS with residual** | Owner UI / Apps / gate-true are correctly parked. Q1 (merge queue vs button) is safe because `merge_group` is required either way. Manifest storage is *not* Deferred — it is missing from AD-16 |
| Fixes real divergence points for the level below | **FAIL** | PR-C vs PR-G will fork on N14; PR-E will fork on merge-workflow trigger and token capabilities |
| Named tech / brownfield | **PASS for this lens** | Version-reality companion PASS. Live `deploy.yml` still `workflow_run.branches: [main]` + `ORIGIN_MAIN_REF: origin/main` (AD-1) |
| Every owned dimension decided / deferred / Qn | **PASS with residual** | Cutover order, branch/env names, concurrency groups, GG key class are written. Merge-App ruleset and privileged-script checkout pin are silent |

---

## Required-check results

### 1. First-merge hazard — FAIL (BLOCKER)

Live today (`deploy.yml` on `main` `22ffe635`):

```
on.workflow_run.branches: [main]
TARGET_SHA = workflow_run.head_sha or dispatch github.sha
UAT_DEPLOY_GATE_ACTIVE != true → HOLD, skip environment: uat  (#451 LIVE_READ_ONLY_VERIFIED)
```

The hazard is not today’s false gate. It is an unordered cutover that makes a `main` `workflow_run` eligible. The package *describes* that correctly (AD-1, T12, migration “Safe order”). The **Rule does not close it**.

**AD-14 Prevents:** “Enabling `UAT_DEPLOY_GATE_ACTIVE` while `main` can still trigger Deploy UAT.”

**AD-14 Rule (code path):** HOLD only when `(triggering ref is main OR workflow_run.head_branch is main) AND UAT_MAIN_DEPLOY_SUPPRESSED == true`.

**N14 (required negative):** Gate true, `UAT_MAIN_DEPLOY_SUPPRESSED` false, trigger `main` → HOLD or REFUSE; no SSH (cutover forbidden).

Those three sentences cannot be implemented by one predeploy. Two legal builders:

| Builder | Legal reading | Outcome of N14 state |
| --- | --- | --- |
| C (PR-C, AD-14 letter) | Add HOLD only when suppression is already `true`. Unset var → same as #451. Gate true + `main` → SSH (parent happy path) | **SSH** |
| G (PR-G, N14 letter) | Treat gate true + suppression false + trigger `main` as forbidden cutover | **HOLD/REFUSE** |

Both obey a companion. Only G prevents the first-merge SSH. C is what AD-14’s Rule actually specifies.

The owner-order sentence (“suppression first, drain, retarget, then gate”) is a procedure, not an enforceable conjunct. `vars.UAT_DEPLOY_GATE_ACTIVE` is a single owner click. Nothing in predeploy refuses SSH because the workflow file still lists `main` or because suppression is unset.

Migration plan steps 1–9 are the right order. They are not a substitute for the AD. PR-C “Must not change `workflow_run.branches`” and PR-D “Must not listen to both branches” prevent *dual-listen* if followed; they do not prevent *gate true on the old single-listen `main` path*, which is T12 vector 1 and N14.

**Same-SHA aliasing (feeds the BLOCKER; also MAJOR M4).** Q2 creates `release/uat` from `main` `22ffe635`. Until the tips diverge, `candidate_sha == origin/release/uat` tip is also `origin/main` tip. A SHA-only copy of today’s tip-pin (`CANDIDATE_SHA == rev-parse origin/<ref>`) accepts a `main` trigger after cutover. AD-12 says “Refuse `main`, `uat`, and any other ref” — that is a *ref-name* check, not a SHA check. N17 says “Candidate is `main` tip after cutover → HOLD”, which is **false** while tips are equal. Implementers who implement N17 as SHA inequality will ship the aliasing hole. AD-14’s `head_branch == main` HOLD (when suppressed) and AD-18’s Environment policy are the real refusals; they must not be treated as optional backups.

**AD-21** is sound: `cancel-in-progress: false` is load-bearing; drain waits for `eligible=false` / `ssh_executed=false`; do not cancel to “speed” the drain. It only works if AD-14 actually HOLDs stale `main` `workflow_run`s. Today that HOLD is gated on the suppression var already being `true` — which the safe order does set before retarget. The gap is the *other* order (gate first), which AD-14 claims to prevent and does not.

### 2. Untrusted PR workflows — FAIL (BLOCKER)

**What is bound**

- AD-20: no `pull_request_target`; `workflow_run` uses default-branch (`main`) YAML; no PR-authored scripts with **UAT** secrets; checkout of deploy SHA `persist-credentials: false`; `GITGUARDIAN_API_KEY` never on Environments or PR jobs.
- AD-16: `.github/workflows/**`, `deploy/**`, `docs/deploy/**` are owner-merge only (for auto-merge).
- T14 / N18: PR-modified `deploy.yml` under `pull_request` must not see `secrets.DROPLET_` or `environment: uat`.
- Live `deploy.yml` has no `pull_request` trigger, so a PR that edits it does not execute that copy. Good for Deploy UAT itself.

**What is not bound, and is new in Option B**

GitHub Actions executes **the workflow file from the event ref**, except `workflow_run` / `pull_request_target`:

| Event | YAML source | Option B use |
| --- | --- | --- |
| `workflow_run` | default branch (`main`) | Deploy UAT after cutover — AD-20 correct |
| `workflow_dispatch` | **the ref the actor selected** | Conventions: Deploy UAT dispatch from `refs/heads/release/uat` |
| `push` / `merge_group` | the pushed / merge-group tree | `post-merge-uat.yml` on `release/uat` (AD-17) |
| `pull_request` (same repo) | **the PR merge ref, including the PR’s YAML** + repo secrets | Natural shape for `uat-merge.yml` / `uat-readiness.yml` / a mistaken `uat-correction.yml` |

AD-20’s Rule (“`workflow_run` **and Environment `uat` jobs** execute the workflow file from `main`”) is **false** for `workflow_dispatch`. Environment `uat` jobs run inside whichever YAML started them. Dispatch from `release/uat` after an owner-merge or App **push** of a gate-skipping `deploy.yml` on that branch uses that copy with Environment `uat` (AD-18 allows `release/uat`). T14’s mitigation therefore does not hold for the dispatch path the spine itself authorizes.

Worse: AD-20 forbids `pull_request_target` (the pattern that uses *default-branch* YAML) and does not name a replacement trigger for the merge controller. `uat-merge.yml` is “AD-15 later; no `DROPLET_*`.” A builder who puts `on: pull_request` + the `cohestra-uat-merge` private key as a **repository** secret ships T2:

1. Feature PR rewrites `uat-merge.yml` to skip the path allowlist / AD-3.
2. Same-repo `pull_request` runs the PR copy.
3. Repo secrets are available (forks excluded; this repo’s feature PRs are same-repo).
4. Token has `contents: write` and “can push or merge to `release/uat`” (AD-15).

AD-20’s “Do not run PR-authored scripts with UAT secrets” does not apply: the merge token is not a UAT secret. N18 only asserts no `DROPLET_*`. There is no N-test that PR YAML cannot read the merge App credential.

`post-merge-uat.yml` is a `push` workflow on `release/uat`. It is the deploy-eligibility oracle (AD-17). It has no Environment `uat` (seed), but a pushed / auto-merged (if AD-16 is bypassed) always-green `post-merge-uat.yml` on `release/uat` makes Deploy UAT eligible. AD-20 does not pin that file to `main`.

Live `deploy.yml` already checks out `TARGET_SHA` and runs `deploy/validate-uat-predeploy-gate.sh` from **that tree** (lines 47–70). After cutover the SHA is `release/uat` tip. `workflow_run` YAML is from `main`; the **scripts** are from the candidate. AD-16 owner-merge on `deploy/**` is the only pin, and it is skipped if the merge App **pushes**.

### 3. #536 cannot merge — PASS

This check holds.

- Inherited AD-4: #535 evaluates; #536 corrects; neither is the merge controller.
- Inherited AD-5 tightened in Conflicts: still no auto-merge to `main`; #536 still cannot merge; AD-15 is a *new* writer.
- AD-10: #536 stays `SIMULATED_PASS` first; no merge token.
- AD-15: #535 / #536 must not gain `contents: write` on `release/uat` or `main`; they must not approve their own merge; merge App cannot edit repository variables or read Environment secrets.
- Migration: #536 is a separate Draft, “non-merging producer”; PR-E exclusive “No #536 files”; “#536 must not share the App.”
- T15 / N19: #536 token merge attempt denied.

Residual (not a fail of this check): AD-15 opens with “**If** auto-merge is enabled, the only writer is … `cohestra-uat-merge`.” When auto-merge is off, inherited AD-5 still forbids a #536 merge token. Keep that reading; do not implement the `If` as “#536 may merge when auto-merge is disabled.”

Graph `S536 --> E` plus “land before or with PR-E only as a non-merging producer” is acceptable if PR-E’s exclusive list is enforced. Combining files would violate AD-4.

### 4. Environment `uat` restriction — PASS with residual

AD-18 is the right owner residual: deployment branch policy exactly `release/uat`, `can_admins_bypass=false`, before `UAT_DEPLOY_GATE_ACTIVE=true`. `DROPLET_*` stay Environment-scoped; `PROD_DROPLET_*` stay on `production`. This agent must not apply the policy. T1 remains FAIL (audited `protection_rules=[]`). T13 is correctly BLOCKER *if* `release/uat` is created unprotected or Environment stays open while a job with `environment: uat` can run with the gate true.

Migration order (protect branch → restrict Environment → suppress → drain → merge PR-D → then gate) is the correct defense in depth. After AD-18 is applied and *before* PR-D, a mistaken gate-true + `main` trigger would die at Environment even if AD-14 missed — **only if** the owner actually set the policy. That is owner UI, not code. Do not treat AD-18 as a predeploy conjunct.

Parent AD-9 required Environment policy `main`. Conflicts table records the retarget to `release/uat` after cutover and the choice to leave the environment FAIL-unrestricted until then. **Not silent.** The *restriction-before-gate* half of AD-9 is preserved (AD-18). The *main* branch half is the accepted Option B topology change (Issue #538).

### 5. No auto promotion to `main` — PASS

- AD-13: no automatic `release/uat` → `main` PR or merge.
- AD-19: `accepted-uat-release.json` state `AWAIT_BUSINESS_RELEASE`; no `main` PR from automation; promotion needs an independently authenticated owner instruction that names `release_sha`; then tree-equivalence or re-UAT plus exact-`main`-SHA CI/security and existing Production provenance.
- AD-15: merge App cannot write `main`.
- T19 / N23: `release/uat` → `main` automation opens no PR.
- ADR: “No automatic `release/uat` → `main`. No automatic Production.”
- Checklist last item: Production still dispatch-only; no `release/uat` → `main` automation.

PR-F must not grow a promoter. The spine forbids it. Two builders cannot “obey AD-19” and still open that PR.

### 6. Production isolation — PASS with residual

- Inherited Production owner-only; `PROD_*`; Environment `production`; dispatch from `refs/heads/main`.
- AD-13: Production provenance unchanged; `main` CI must not start an eligible Deploy UAT after suppression + retarget.
- T20: keep the isolation contract that forbids `PROD_*` in `deploy.yml`; Production actor permissions must not broaden.
- N24: Production dispatch from `release/uat` → REFUSE.
- Live `deploy-production.yml`: `require-main` refuses `GITHUB_REF != refs/heads/main`; `PROD_DROPLET_*` only; `concurrency: deploy-production`; `cancel-in-progress: false`. Option B seed says this file is unchanged.

Residual: AD-16 Prevents “Production” / “any Production interface” without a path list. `deploy-production.yml` is already under `.github/workflows/**` (owner-merge). Isolation contract should also refuse `environment: production` and `PROD_*` in `post-merge-uat.yml`, `uat-merge.yml`, `uat-correction.yml`, and `ci.yml`. N24 covers dispatch, not a new job that names Environment `production` from `release/uat` CI. T20 “keep the isolation contract” is enough if PR-G extends that contract to the new files. Name those files in the contract; do not leave “Production interface” as prose.

### 7. AD Rules vs stated divergences — FAIL

| AD | Prevents | Rule actually prevent it? |
| --- | --- | --- |
| AD-1 (until cutover) | Pretending Option B is already live | **Yes.** Live `deploy.yml` still tip-pins `origin/main`. Do not delete |
| AD-12 | Deploy `main`, feature SHA, or git branch `uat` | **Yes if** “Refuse `main`” is a ref-name check. **No if** SHA-only tip-pin (same-SHA window). N17 is the wrong test name |
| AD-13 | Post-cutover `main` push starts UAT SSH; silent promotion | **Yes** for promotion. For UAT SSH it is a post-condition (“After suppressed **and** `workflow_run.branches` is only `release/uat`”), not a fail-closed on the forbidden intermediate |
| AD-14 | Enable deploy gate while `main` can trigger Deploy UAT | **No.** See BLOCKER B1 |
| AD-15 | #535/#536 gain `contents: write` on `release/uat` or `main` | **Partial.** Separate App + N19 close #536. “can **push** or merge” and “cannot write `main`” are promises; GitHub tokens are not branch-scoped without a ruleset (MAJOR M1) |
| AD-16 | Auto-merge of workflows, deploy controls, secrets, Production, billing/auth/migrations, #505 | **Partial.** Rule owner-merge paths are `.github/workflows/**`, `deploy/**`, `docs/deploy/**`, “any Production interface.” Billing/auth/migrations and #505 are not in that list. Manifest “immutable / owner-approved” does not say **not on the PR head**; T16 does (MAJOR M2) |
| AD-17 | Feature HEAD or `main` CI as deploy eligibility | **Yes.** Named check-run, named jobs, `release/uat` only, `ci.yml` Layer A is not an alternate gate. This is the join contract the parent AD-6 review demanded |
| AD-18 | Feature-branch or `main` jobs read `DROPLET_*` | **Yes as owner residual.** Not a workflow Rule. Honest |
| AD-19 | UAT PASS as a `main` merge right | **Yes** |
| AD-20 | Branch-modified `deploy.yml` uses `DROPLET_*` | **No** for dispatch / PR consumers / candidate-tree scripts. See BLOCKER B2 |
| AD-21 | Pre-retarget run SSHs after owner believes `main` is quiet | **Yes if** AD-14 HOLD works. Drain + no-cancel is correct |

AD-2 is correctly **not** replaced by AD-14. Dual suppressor is additional. That inheritance is clean.

### 8. Inherited ADs not silently weakened — FAIL (contextual)

**Surfaced (not silent) — acceptable as Issue #538 topology**

| Parent | Option B | Handling |
| --- | --- | --- |
| AD-1 `origin/main` only UAT SHA; no `uat` integration branch | AD-1 live until cutover H; AD-12 after; branch name is `release/uat` not `uat` | Conflicts table + ADR `supersedes_for_topology`. Correct |
| AD-5 no auto-merge; `READY_FOR_OWNER_MERGE_DECISION` then owner merge | Restricted auto-merge into `release/uat` only; still no auto-merge to `main`; #536 cannot merge | Conflicts: “Tightened, not dropped.” Issue #519 superseded only for manifest-eligible `release/uat` PRs |
| AD-9 Environment `uat` policy `main` | AD-18 policy `release/uat` after cutover; until then stays FAIL-unrestricted | Conflicts table. Restriction-before-gate preserved |
| AD-7 host SHA checkout | Same entrypoint; SHA is `release/uat` merge SHA | Inherited table. Parent’s digest-`or` is already gone in the parent spine |
| AD-2 exact `true` | Still required; not replaced by AD-14 | Inherited table. Correct |
| AD-3, AD-4, AD-8, AD-10, AD-11, Epic 45 AD-1/AD-3/AD-4, Production owner-only | Carried | Inherited table |

**Silent or contextual weaken — findings**

1. **AD-3 used as auto-merge authorization (MAJOR M3).** Parent T3: dual-review is “BLOCKER for autonomous merge-readiness; HOLD is the correct current state.” Parent AD-3 still has the Apps-**or**-humans `or`, comment/check-run channel looseness the 2026-11-01 adversarial review called BLOCKER. Option B AD-16 requires “AD-3 reviews” and then **merges**. Issue #519 owner merge is removed for eligible PRs. The inherited Rule is unchanged; the *consequence* of a forged or loosely-matched review is now a write to `release/uat`. That is a silent sufficiency weaken of AD-3/AD-5 even though the Conflicts row claims a tighten.
2. **Epic 45 AD-5 (CI-on-main + `workflow_run.head_sha` + `remote-deploy.sh`) is not inherited and not listed as superseded.** Option B AD-7 keeps the script; AD-12/AD-17 change the CI source. A builder still reading the parent spine can treat `main` Layer A as legal eligibility. AD-17 says Layer A is not an alternate gate — only if they are looking at *this* spine.
3. **Parent AD-6 is not in the Inherited table.** AD-17 is the retargeted copy (same job names, `release/uat` trigger). Should say “AD-6 superseded after cutover; until cutover AD-1+AD-6 still describe the live `main` path.” Omission, not a live weaken (post-merge is still proposed; gate is false).
4. **Parent GG convention:** key on `push` to `main` only. Option B extends to `release/uat` push. AD-20 keeps it off Environments and PR jobs. Expansion, not a weaken.
5. **Parent AD-5 “controller tokens must not have `contents: write` on `main`.”** Option B’s merge App has `contents: write` (repo-wide in practice) and *promises* not to touch `main`. Same hole the parent adversarial review already logged (token vs path). Now there is a standing App whose job is to write. Needs a ruleset (MAJOR M1), not a sentence.

---

## Findings

### BLOCKER

#### B1 — AD-14 Rule does not prevent the first-merge state it claims to prevent; N14 specifies the opposite

- **Checks:** first-merge; AD Rule vs divergence
- **Evidence:** AD-14 Prevents vs Rule (spine 101–105); N14 (threat model 91); T12; migration safe-order 1 vs 9; live `deploy.yml` predeploy: `UAT_DEPLOY_GATE_ACTIVE != true` is the only SSH brake today
- **Why it is a blocker:** The forbidden cutover is `gate=true` + `main` still a Deploy UAT trigger + suppression unset. AD-14’s code conjunct does not match that state. N14 requires HOLD/REFUSE on that state. PR-C (AD-14 letter) and PR-G (N14 letter) cannot both be right. If C wins and an owner sets the gate before suppression — a single Actions variable click — SSH runs on `main`. That is T12. Process text in AD-14 and the migration checklist is not a predeploy Rule.
- **Required lock (not applied; spine is read-only):** Make one fail-closed conjunct and delete the contradiction. Suggested Rule: SSH requires `UAT_DEPLOY_GATE_ACTIVE == true` **and** (`UAT_MAIN_DEPLOY_SUPPRESSED == true` **and** candidate ref is exactly `release/uat` **and** `workflow_run.head_branch` / `github.ref` is not `main`). If the workflow file still lists `main` under `workflow_run.branches`, HOLD even when the gate is `true`. Rewrite N14 to that conjunct, or rewrite AD-14 to N14 — not both as they stand. N17 must refuse **ref** `main`, not “candidate equals main tip.”

#### B2 — AD-20 does not prevent untrusted / non-default-branch privileged YAML; merge and correction tokens are out of scope

- **Checks:** untrusted PR workflows; AD Rule vs divergence
- **Evidence:** AD-20 Rule (spine 137–141); Conventions trigger `workflow_dispatch` from `refs/heads/release/uat` (155); structural seed `uat-merge.yml` / `uat-correction.yml`; T14 mitigation only names `workflow_run` + no `DROPLET_*`; live `deploy.yml` `on.workflow_dispatch` + checkout of `TARGET_SHA` scripts; GitHub executes dispatch/`pull_request` YAML from the event ref
- **Why it is a blocker:** Option B introduces a write-capable App token and a `release/uat` push workflow that is the eligibility oracle. AD-20’s only hard refusals are `pull_request_target` and UAT secrets on PR jobs. The dangerous shape for the merge bot is ordinary `pull_request` + repo secret (PR YAML, same-repo secrets). Forbidding `pull_request_target` without naming `workflow_run`-from-default-branch (or an Environment that only `main` can read) for `cohestra-uat-merge` credentials recreates T2 for a token that can push `release/uat`. T14 is “BLOCKER if executed.” The written mitigation does not prevent execution on the dispatch or merge-bot paths.
- **Required lock:** Privileged jobs (Deploy UAT, merge, any job that can read merge-App or Environment secrets) execute YAML from `main` only. `workflow_dispatch` of Deploy UAT is either forbidden or must re-validate using scripts checked out from `origin/main` (not `TARGET_SHA`) before any Environment `uat` attachment. Merge/correction credentials live on an Environment whose branch policy is `main` (or a ruleset-protected secret), never a repository secret visible to `pull_request`. `uat-merge.yml` trigger is `workflow_run` of CI / readiness on `release/uat`, not `pull_request`. Add negatives: PR YAML cannot read merge-App secrets; dispatch from `release/uat` cannot use a `deploy.yml` that differs from `main`; candidate-tree `deploy/**` scripts are not the trust root.

### MAJOR

#### M1 — AD-15 “push or merge” + “cannot write `main`” is not an enforceable token split

- **Checks:** #536 / merge controller; inherited AD-5; AD Rule vs divergence
- **Evidence:** AD-15 Rule (spine 107–111); parent AD-5 (tokens must not have `contents: write` on `main`); GitHub App installation tokens are repo-scoped, not branch-scoped, unless a ruleset says so
- **Why it is major:** If the App can **push** to `release/uat`, AD-16’s merge-tree path check, AD-3 reviews, and “not draft / not stale SHA” never run. `contents: write` on the repository also writes `main` unless a ruleset denies that App on `main` and denies force-push. The Rule states the desired end state and does not bind the GitHub control (ruleset: App may update `release/uat` only, no bypass on `main`, no `administration`, no Environment secret read, no `variables` write). A builder who installs a classic App with repository `contents: write` and “promises” not to touch `main` obeys the letter.
- **Required lock:** Token capability is **merge via GitHub API of an AD-16-eligible PR** only — not `git push`. Bind a ruleset in AD-15 or Deferred-as-owner-residual that blocks close of PR-E. N19 stays; add “merge App push to `main` denied” and “merge App direct push to `release/uat` denied.”

#### M2 — AD-16 Rule does not lock the manifest or the Prevents path list

- **Checks:** AD Rule vs divergence; T16
- **Evidence:** AD-16 Prevents (workflows, deploy, secrets, Production, billing/auth/migrations, #505) vs Rule owner-merge prefixes (`.github/workflows/**`, `deploy/**`, `docs/deploy/**`, “any Production interface”); T16 (manifest stored outside PR head; PR `TASK.md` is evidence only; path check on merge-tree)
- **Why it is major:** Two PR-E builders: (A) owner-approved `TASK.md` on the PR head as the authorization copy — T16 forbids this, AD-16 allows it (“owner-approved immutable manifest” with no store). (B) signed owner comment / file on `main` / repository variable, as T16. Same for paths: (A) manifest `allowed_path_prefixes: ["src/"]` auto-merges billing, auth, and EF migrations; (B) treats those as owner-merge because Prevents listed them. #505 is in Prevents and absent from the Rule (parent AD-10 fail-closed on #505 is inherited for correction, not for merge).
- **Required lock:** Promote T16’s store rule into AD-16’s Rule. Enumerate owner-merge prefixes including `src/**/Migrations/**` (or explicitly drop “billing/auth/migrations” from Prevents if feature PRs in those trees are meant to auto-merge after post-merge tests). Name #505 as a hard deny on the merge-tree, not only on the correction loop.

#### M3 — Inherited AD-3 is not tightened before it becomes an auto-merge write gate

- **Checks:** inherited ADs not silently weakened; AD-5 / #519
- **Evidence:** Inherited AD-3 (Apps **or** two human APPROVED reviews; parent T3 still FAIL / Apps uninstalled); AD-16 “AD-3 reviews with no BLOCKER/MAJOR”; Conflicts “Issue #519 per-feature owner merge — superseded only for manifest-eligible `release/uat` PRs”; parent CAT-SEC T3 “BLOCKER for autonomous merge-readiness”
- **Why it is major:** Parent AD-3 was a HOLD-until-owner-looks control (AD-5 terminal state `READY_FOR_OWNER_MERGE_DECISION`). Option B keeps the same identity `or` and uses it to merge. Parent T3/T4 residuals are still open; checklist installs Apps before PR-E, but human fallback remains a legal AD-3 arm. A builder can auto-merge on two human APPROVED reviews with no Apps, or on check-runs whose BLOCKER/MAJOR field is not the one the sibling consumer reads (parent adversarial pair 2). Conflicts claim a tighten of AD-5; they do not close AD-3. That is a sufficiency weaken of the inherited review plane.
- **Required lock:** Before AD-16 may merge, close the parent AD-3 join: both slug **and** numeric App ID; one check-run name per role; one BLOCKER/MAJOR field; human fallback is owner-merge (not auto-merge), or drop human fallback for the auto-merge path. Do not treat T3 as an activation residual once auto-merge is in scope.

#### M4 — Same-SHA first-merge aliasing; N17 tests the wrong predicate

- **Checks:** first-merge; AD-12 enforceability
- **Evidence:** Q2 initial `release/uat` = `main` `22ffe635`; AD-12 SHA==tip **and** refuse ref `main`; N17 “Candidate is `main` tip after cutover → HOLD”; live tip-pin is SHA equality to `origin/main`
- **Why it is major:** At cutover the two tips are the same commit. SHA-only AD-12 passes a `main` `workflow_run` / dispatch. N17 as written is then unsatisfiable or vacuous. Builders who implement parent tip-pin with a renamed ref will ship this. Fold the ref-name refuse into B1’s conjunct; rewrite N17 to “trigger ref or `workflow_run.head_branch` is `main` after cutover → HOLD,” including when SHAs match.

### MINOR (tail; do not block on these alone)

1. **AD-6 not listed as inherited or superseded.** AD-17 is the post-cutover copy. Say so, so PR-C on `main` does not invent a third post-merge home.
2. **Epic 45 AD-5 (CI-on-main) omitted** from Inherited / Conflicts. AD-7 keeps `remote-deploy.sh`; the CI source change should be an explicit supersession.
3. **AD-15 “If auto-merge is enabled”** can be misread as allowing other writers when auto-merge is off. Inherited AD-5 already forbids #536 write; restate without the `If`.
4. **Permissions convention** from the parent (read-only default; write only after eligibility) is not restated for `uat-merge.yml`. A builder will put `contents: write` at workflow level.
5. **“Production interface”** and **“any Production interface”** have no path list (see Production isolation residual).
6. **AD-18 is owner UI.** Correct, but PR-D merge-to-`main` while Environment is still unrestricted recreates T13 if someone also sets the gate. Checklist order is right; AD-14 should not depend on it (B1).
7. **Q3 secret-name move** can fork DROPLET_* location (parent Q1). Owner residual; HOLD until answered, do not invent a second name set in PR-C.

### NIT

- Structural seed lists `uat-readiness.yml` as “PR #535 only” and `uat-correction.yml` as “Issue #536 later” — good exclusives.
- Verdict vocabulary adds `SIMULATED_PASS` / `LIVE_*` / `NOT_RUN` without dropping parent `PASS`/`HOLD`/`REFUSE`/`FAIL`. Compatible if classes stay uncollapsed (migration table).
- `ggshield` 1.56.1 and action SHA pins match the version-reality PASS; not re-litigated here.

---

## What already holds (attacks that died on a real Rule)

Recorded so FAIL is not “the spine decides nothing.”

- **#536 / #535 as merge controller** — AD-4 + AD-15 + PR-E exclusive + N19. The merge App is a third identity. This check PASSES.
- **Automatic `release/uat` → `main`** — AD-13 + AD-19 + T19 + N23. No builder who obeys AD-19 can open that PR.
- **Production via new UAT line (naming)** — isolation contract + T20 + unchanged `deploy-production.yml` `require-main`. N24 is the right negative.
- **AD-2 replaced by AD-14** — inherited table says no. Gate exact `true` remains the SSH brake.
- **Pretending cutover already happened** — AD-1 kept; live workflow still listens to `main`. Version-reality confirmed.
- **Dual-listen `main` + `release/uat`** — PR-D “Must not listen to both.” T12 vector 2 is bounded *if* PR-D is not merged early (migration + AD-14 process). Not the same as B1.
- **`pull_request_target` as the documented pattern** — AD-10 + AD-20 forbid it. The failure is the missing replacement (B2), not a resurrection of `pull_request_target`.
- **Cancel-in-progress drain** — AD-21 forbids it. `deploy-uat` / `cancel-in-progress: false` stays load-bearing.
- **Git branch named `uat`** — AD-12 + conventions. Environment name stays `uat`.
- **Parent residuals silently marked PASS** — T1/T3/T5/T7/T10 remain open. Honest.
- **This planning run applying protections or setting the gate** — Deferred + migration + ADR `does_not_authorize`. Correct.

---

## Companion consistency

| Claim | Spine | Threat model | Migration | Result |
| --- | --- | --- | --- | --- |
| Gate stays false until H | AD-2, Deferred | Verdict: not authorized | Step 1 and checklist | Align |
| Suppression then drain then retarget then gate | AD-14 last sentence, AD-21 | T12 mitigation | Safe order 5–9 | Align as **procedure** |
| N14 state HOLDs | AD-14 Rule does **not** HOLD that state | N14 HOLD/REFUSE | Implies owner never enters it | **Contradict** — B1 |
| Manifest not on PR head | AD-16 silent | T16 explicit | PR-E “manifest path check” only | **Contradict** — M2 |
| Privileged YAML from `main` | AD-20 claims Environment `uat` jobs too | T14 only `workflow_run` | Dispatch after PR-D from `release/uat` | **Contradict** — B2 |
| #536 no merge token | AD-15, AD-10 | T15 / N19 | Separate Draft, no merge token | Align |
| Environment policy before gate | AD-18 | T13 | Checklist before suppression | Align |
| No auto promotion | AD-13, AD-19 | T19 / N23 | Checklist last item | Align |
| Production unchanged | AD-13, inherited | T20 / N24 | “Production still dispatch-only” | Align |
| Parent T1–T11 still open | Inherited residuals | “does not retract” | Audit findings remain true (ADR) | Align |

Threat-model self-verdict (“acceptable as a target if AD-14/15/20/21 are implemented before the gate can become true”) is **not** this review’s verdict. Those four ADs are the ones whose Rules do not yet match their Prevents. Implementing the letters as written would not satisfy N14 or T14.

---

## Gate

**FAIL.** Unresolved **BLOCKER** B1 (first-merge: AD-14 ≠ N14; Rule does not prevent stated divergence) and **BLOCKER** B2 (untrusted/non-default-branch privileged YAML; merge token out of AD-20). Unresolved **MAJOR** M1–M4 (AD-15 push/ruleset, AD-16 manifest/path list, inherited AD-3 used as auto-merge write, same-SHA / N17).

#536-cannot-merge, no auto-promotion, Environment `uat` owner restriction, and Production naming isolation **pass** as written.

Do not mark PR-A reviews clean. Do not implement PR-C/D/E from these letters until B1/B2 are locked. Do not set `UAT_DEPLOY_GATE_ACTIVE=true`. Spine was not edited.
