# Reviewer — BLOCKER/MAJOR recheck (Option B)

- **Scope:** Re-check only the eight previously reported BLOCKER/MAJOR items against the updated spine, CAT-SEC, and migration plan.
- **Inputs:** `ARCHITECTURE-SPINE.md`, `CAT-SEC-THREAT-MODEL.md`, `MIGRATION-PLAN.md` (updated HEAD). Prior reports used only as the item list.
- **Spine modified:** no
- **Date:** 2026-11-02

## Verdict

**PASS**

No remaining BLOCKER or MAJOR among the eight items. Each claimed lock is now in an AD Rule (and, where it mattered, in N14 / T12 / AD-18 / AD-20). Companions do not re-open an opposite outcome.

---

## Item-by-item

### 1. SSH eligible conjunction vs N14 (gate true + main source) — CLOSED

**Was:** AD-14 HOLDs only when suppression is already `true`. N14 requires HOLD on `gate=true` + suppression unset + trigger `main`. PR-C letter SSH'd; PR-G letter HOLDed.

**Now:**

- AD-14: SSH `eligible=true` only when every conjunct is exact: gate `==true` AND suppressed `==true` AND event source ref is `release/uat` AND AD-12 tip-pin AND AD-17 post-merge SUCCESS.
- AD-14: Gate true with source `main` is HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE` (N14). Independent of the suppression var.
- N14: Gate true, `UAT_MAIN_DEPLOY_SUPPRESSED` false, trigger `main` → HOLD `CUTOVER_INCOMPLETE_MAIN_SOURCE`; no SSH.
- T12: same conjunction; N14–N16.

One predeploy can implement both sentences. Gate true + main source cannot be SSH.

### 2. Inline default-branch HOLD vs old candidate SHA without suppressor code — CLOSED

**Was:** `workflow_run` YAML from `main` (AD-20); scripts from `candidate_sha` (AD-7). Q2 `22ffe635` has no suppressor arm. Delayed `main` run with a shared tip never evaluates AD-14.

**Now:**

- AD-14: N14, N15, and AD-2 gate HOLDs are evaluated in **inline `deploy.yml` steps on the default-branch workflow** before candidate scripts can set `eligible=true`. Candidate-tree scripts at an old SHA cannot skip them.
- T12: same “inline on the default-branch workflow before candidate scripts.”
- AD-20: `workflow_run` still executes Deploy UAT YAML from `main`.

The SHA-at-`22ffe635` script hole is not a legal skip of the HOLD.

### 3. Same-SHA main vs release/uat must use event ref — CLOSED

**Was:** After cutover the tips can be the same commit. SHA-only AD-12 / N17 (“candidate is `main` tip”) accepts a `main` trigger.

**Now:**

- AD-12: source ref is `workflow_run.head_branch` or `github.ref`, **not** SHA uniqueness. A SHA that is also `origin/main` tip is still REFUSE if the event ref is `main`.
- AD-14: event source ref must be `release/uat` for `eligible=true`.
- AD-21: delayed `main` `workflow_run` after suppression or retarget HOLDs on **event ref, not on SHA**.

Same-SHA is not a permit.

### 4. Single cutover phase clock and one deploy.yml at a time — CLOSED

**Was:** AD-1 clock = “step H completes” (includes gate true). AD-14 clock = suppress → drain → retarget → *may* set gate. AD-12 clock = “after cutover.” Two legal `deploy.yml` files.

**Now:**

- AD-1: live only in `PHASE_MAIN_LISTEN` and `PHASE_SUPPRESS` (`branches: [main]`, tip-pin `origin/main`). **One `deploy.yml` at a time.** PR-D replaces that file; AD-12 then applies. AD-1 does not authorize SSH. “Step H completes” is gone.
- AD-13: after PR-D, `on.workflow_run.branches` is exactly `[release/uat]`.
- AD-14: `PHASE_MAIN_LISTEN` → `PHASE_SUPPRESS` → AD-21 drain → `PHASE_RETARGET` (merge PR-D) → `PHASE_ARMED` (owner may set the gate).
- Conventions: those four phases; one `deploy.yml` per phase; PR-D is the only retarget.

Retarget precedes the gate. Gate true is a later latch, not the AD-1 retirement clock.

### 5. AD-15 merge App != #536; merge API only; no force-push — CLOSED

**Was:** “If auto-merge is enabled” + “can push or merge.” #536 could share the App and push a feature HEAD. `contents: write` is repo-scoped without a ruleset.

**Now:**

- AD-15: the only automation that may merge into `release/uat` is App `cohestra-uat-merge` (slug + distinct numeric id from #535/#536).
- Merge API only. Must not force-push, must not write `main`, must not read Environment `uat`/`production` secrets, must not edit vars.
- Owner installs a ruleset that encodes those denies.
- #536 must not be installed as `cohestra-uat-merge`. Neither review App nor the correction App may merge.
- Humans with OWNER may merge. No `If auto-merge` qualifier.
- T15 / N19 / PR-E “No #536 files” / “#536 must not share the App” still hold.

### 6. AD-16 authorization manifest on main, not PR head — CLOSED

**Was:** AD-16 named fields, not a store. PR-head `TASK.md` was a legal authorization copy. T16 forbade that.

**Now:**

- AD-16: authorization copy is a file on `main` at `deploy/uat-task-manifests/<task_id>.json`, owner-merged (control-plane).
- `TASK.md` on the PR head is evidence only.
- T16: stored outside the PR head; PR-head `TASK.md` is evidence, not the authorization copy.

PR-head cannot authorize a merge.

### 7. workflow_dispatch from feature ref refused — CLOSED

**Was:** Dispatch YAML comes from the selected ref. Feature-ref dispatch of a gate-skipping `deploy.yml` was unbound.

**Now:**

- AD-20: `workflow_dispatch` allowed only when `github.ref` is `refs/heads/release/uat` (after PR-D) or, in PHASE_MAIN_LISTEN/SUPPRESS, `refs/heads/main` with AD-14 HOLD.
- Feature-ref dispatch is REFUSE.

### 8. Environment policy before PR-D and before gate true — CLOSED

**Was:** AD-18 only required policy before gate true (legal after PR-D). Migration required policy before suppress / PR-D.

**Now:**

- AD-18: policy `release/uat` only and `can_admins_bypass=false` **before PR-D merges and before the deploy gate is `true`**.
- Migration safe order step 4 is still before suppress (5), drain (6), PR-D (7), gate (9).
- T13: policy before any `environment: uat` job can run with the gate true; gate stays false during prep.

E18-after-PR-D is no longer AD-legal.

---

## Residuals (not BLOCKER/MAJOR; out of close-criteria)

These do not restore an opposite SSH/merge outcome for the eight items:

- N17 title still says “candidate is `main` tip.” AD-12/AD-14/AD-21 already refuse on **event ref**. A SHA-inequality N17 would false-HOLD a same-SHA `release/uat` deploy (fail-closed), not authorize `main` SSH.
- T16 still lists “repository variable / signed OWNER comment **or** file on `main`.” AD-16 picks the file. Neither arm is PR-head.
- T17 still says refuse `head_branch == main` **when suppressed**. N14 + AD-14 already HOLD gate-true + main source without that var.
- PR-C “unset matches #451” is leftover procedure. AD-14 conjunction is the Rule; unset + gate true + main source is N14 HOLD.
- Q2 may still be `22ffe635`. Item 2’s inline default-branch HOLD is what makes that SHA safe, not a Q2 rewrite.
- H graph still lists E/F → H while the checklist does not name PR-E/PR-F. That is first-SSH tooling, not the deploy.yml clock (item 4).

---

## Gate

**PASS.** All eight previously reported BLOCKER/MAJOR items are closed on the updated letters. Not authorization to cut over or set `UAT_DEPLOY_GATE_ACTIVE=true`.
