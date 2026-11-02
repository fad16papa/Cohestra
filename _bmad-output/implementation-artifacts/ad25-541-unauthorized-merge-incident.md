---
label: AD25-OWNER-AUTH
binds:
  - issue-538
  - pr-541
  - pr-542
  - pr-543
status: incident-report
as_of: 2026-11-02T19:40:00+08:00
---

# AD-25 incident: PR #541 merged by cursor[bot]

Read-only investigation. No revert, no permission revocation, no live GitHub changes.

**Classification:** organizational **authorization-policy violation**. **Not** a completed UAT or Production deployment incident. **Not** a violation of live GitHub ruleset `26322151` (that ruleset requires **0** reviews and therefore permitted this merge).

## Exact SHAs (re-verified 2026-11-02, Asia/Singapore)

| Ref | SHA | Tip author |
| --- | --- | --- |
| `origin/main` | `9ccca77e7297dc28b0a843d3435e9603dc803da7` | fadthegreat (merge of PR #540) |
| `origin/release/uat` | `6e8388eef944a0fe95f1218502cac49681a60dd2` | cursor[bot] (merge of PR #541) |
| PR #541 head | `d17b7dba3a91349c0c6aa76169b2418dff78c956` | Cursor Agent, co-authored fadthegreat |
| PR #541 base / dest parent | `1c57633fa607dec4a31aca8928c4c02adb231822` | PR-C bootstrap |
| PR #542 HEAD (Draft, unmerged) | `ade3c8281e8a2ec82ef45771bc5b68df64901a41` | Cursor Agent |
| This incident docs HEAD | this branch tip | Cursor Agent |

`release/uat` is **not** at the PR-C bootstrap SHA. It is the #541 merge commit.

`main` was **not** rewritten by #541. Trusted-ref pin `9ccca77e` is still `origin/main`.

## 1. Confirmed GitHub timeline (PR #541)

All times below are **Asia/Singapore (UTC+8)**.

| Time (SGT) | UTC | Fact | Source |
| --- | --- | --- | --- |
| **3:07 AM SGT** | 2026-11-01T19:07:02Z | Single PR commit `d17b7dba` authored by Cursor Agent, co-authored by fad16papa | GitHub commits API |
| PR opened as Draft targeting `release/uat` | — | REST/GraphQL author **fad16papa** (User, not Bot) | REST `user.login=fad16papa` |
| **9:40:00 AM SGT** | 2026-11-02T01:40:00Z | Draft → ready for review. Actor: **fad16papa** | issues/events `ready_for_review` |
| **9:40:09 AM SGT** | 2026-11-02T01:40:09Z | **Merged.** Actor: **cursor[bot]**. Merge SHA `6e8388ee`. | issues/events `merged` |
| **9:40:09 AM SGT** | 2026-11-02T01:40:09Z | PR closed by cursor[bot] | issues/events `closed` |
| **9:40:11 AM SGT** | 2026-11-02T01:40:11Z | `push` to `release/uat` starts CI `41373679000` and Deploy UAT `41373679140`. Triggering actor: cursor[bot] | Actions API |

Additional confirmed facts:

- Native PR reviews: **[]**. `reviewDecision`: null. Review comments: **0**. Issue comments: **0**. Labels: none.
- Merge method: merge commit. Parents: `1c57633` + `d17b7dba`. Author `cursor[bot] <206951365+cursor[bot]@users.noreply.github.com>`; committer `GitHub <noreply@github.com>`.
- Repo `allow_auto_merge`: **false**. GraphQL `autoMergeRequest`: null. GitHub-native auto-merge **could not** have been the mechanism (repo setting disables it). The nine-second gap is an explicit merge via the Cursor App after `ready_for_review`.
- Identity of the merger is one principal, expressed three equivalent ways:
  - REST `merged_by.login`: **`cursor[bot]`**, `type: Bot`, `id: 206951365`, `node_id: BOT_kgDODFXTxQ`, `html_url: https://github.com/apps/cursor`
  - GraphQL `mergedBy.login`: **`cursor`**, `__typename: Bot`
  - Merge-commit author: `cursor[bot]`
  - Cursor GitHub App id **1210556**, slug `cursor`

A GitHub.com UI merge by fad16papa would have REST `merged_by.login=fad16papa`. That did **not** happen.

## 2. Confirmed vs unverified

**Confirmed GitHub facts**

- Merge actor is the Cursor GitHub App bot, not user `fad16papa`.
- Owner identity **did** mark the Draft ready (`ready_for_review` by fad16papa) nine seconds before the merge. Cursor Cloud can mint **user-attributed** events as fad16papa.
- Zero native approving reviews.
- Ruleset `26322151` was and is: required reviews **0**, bypass empty, `strict_required_status_checks_policy: false`, `do_not_enforce_on_create: true`, required checks from GitHub Actions `15368` + GitGuardian `46505`.
- Cursor App **advertised** permission catalog includes `contents: write`, `pull_requests: write`, `workflows: write`, `merge_queues: write`, `checks: write`, `actions: write` ([https://github.com/apps/cursor](https://github.com/apps/cursor)).
- `contents: write` is the permission that creates a merge commit. `pull_requests: write` alone cannot merge.
- Repo has **no** `CODEOWNERS` file. **No** ruleset on `main`. Classic branch-protection API returns 403 to this token (unread); ruleset list contains only `26322151`.

**Unverified (do not treat as fact)**

- Whether fad16papa clicked Merge in the Cursor UI, asked an agent to merge, or an agent merged unattended after `ready_for_review`. The GitHub actor is confirmed; the human intent is not.
- The **installation-scoped** permission grant on `fad16papa/Cohestra` (installations API 401). Advertised App maximum is not proof of the repo grant.
- GitHub org/enterprise audit-log records (not readable with this token).

## 3. Which permissions enabled the merge

Minimum capabilities used:

1. **Cursor App `contents: write`** (advertised). Required to create the merge commit on `release/uat` via `PUT /pulls/{n}/merge`.
2. **`pull_requests: write`** (advertised) to change PR state (close). Not sufficient alone to merge.
3. **Ruleset `26322151` `required_approving_review_count = 0`.** A write-capable App is a valid merger once required status checks on the PR head are green and the PR is not Draft.
4. PR head `d17b7dba` had the seven required checks SUCCESS (native GitGuardian Security Checks on the *PR head*). Draft conversion removed the Draft merge block.

Live ruleset **cannot** prevent this today:

- It does not require a human review.
- It does not restrict merge actors to `fad16papa`.
- Required checks are mostly GitHub Actions (`15368`) from PR-head workflows.
- Bypass list is empty, which does **not** block an App that is a collaborator-equivalent installer with write; it only blocks ruleset bypass.
- `require_extra_approval_for_unattributed_changes: true` did not stop this merge. The only commit lists co-author `fad16papa@gmail.com`. GitHub documents that this setting has **no effect** when required approvals are already 0.
- `Restrict updates` is **not** enabled. The `pull_request` rule still requires a PR for `release/uat` updates, which #541 satisfied.

Requiring CODEOWNER or `required_approving_review_count: 1` **without** changing authorship would deadlock a single-owner personal repo when fad16papa is the PR author (GitHub rejects self-approval). Ruleset “required reviewers” with teams is **not available** on user-owned repositories. That is **not** a safe one-click fix. See the owner-policy App design.

## 4. PR #541 changed-file scope and exact-tree

PR files API: **20** paths. Allowlist: **21** paths. The missing diff path is `deploy/lib/uat-predeploy-gate.py`, whose blob is identical on `1c57633`, `9ccca77e`, `d17b7dba`, and `6e8388ee` (`fc36914c937e36e907f364370249e8c79c8dcc26`).

Independent exact-tree (this investigation, local git objects):

- 21/21 allowlist blobs on `d17b7dba` **equal** `main` `9ccca77e` (0 mismatches).
- `1c57633..d17b7dba` changed paths = the 20 files GitHub lists ⊆ allowlist.
- Same 20 paths on `1c57633..6e8388ee`.
- No `src/`, `web/`, Production workflows, secrets, or ADCP in the dest-vs-parent diff.

This matches the PR body’s 21/21 claim. Tree correctness does **not** equal owner-authorized merge.

## 5. Post-merge UAT safety (Deploy UAT `41373679140`)

Run: https://github.com/fad16papa/Cohestra/actions/runs/41373679140
Event: `push` to `release/uat`. Head: `6e8388ee`. Triggering actor: cursor[bot].
Workflow conclusion: **failure** because the predeploy job exits 1 on HOLD (fail-closed). That is not SSH.

Only two workflow runs exist on SHA `6e8388ee`: CI `41373679000` (success) and Deploy UAT `41373679140` (failure/HOLD). No Production workflow ran.

**AD-17 / post-merge jobs (11/11 SUCCESS):**

- UAT post-merge — Next.js build
- UAT post-merge — GitGuardian exact-SHA API scan
- UAT post-merge — Billing entitlement regression
- UAT post-merge — .NET build and test
- UAT post-merge — Frontend unit tests
- UAT post-merge — Docker stack smoke
- UAT post-merge — AuthN AuthZ regression
- UAT post-merge — Exact-SHA security scan
- UAT post-merge — UAT isolation contract
- UAT post-merge — API integration tests
- UAT post-merge — Deploy artifact provenance

**Predeploy:** job “Pre-UAT eligibility gate” **failure**. Artifact `uat-predeploy-gate.json`:

```
result: HOLD
reason: UAT_DEPLOY_GATE_ACTIVE is not true
candidate_sha: 6e8388eef944a0fe95f1218502cac49681a60dd2
gate_active: false
main_deploy_suppressed: true
suppressor: inline-default-branch-yaml
```

Run log also prints:

```
UAT_DEPLOY_GATE_ACTIVE: false
UAT_MAIN_DEPLOY_SUPPRESSED: true
RESULT=HOLD
HOLD_REASON=UAT_DEPLOY_GATE_ACTIVE is not true
```

The failing step name is “Trusted inline suppressors before candidate checkout” — that **is** the inline gate (`hold_inline "UAT_DEPLOY_GATE_ACTIVE is not true"`). Candidate checkout and later predeploy evaluation were skipped after HOLD, which is the intended fail-closed order.

**SSH:** job “Deploy accepted SHA to UAT” **skipped**. Final artifact `uat-final-outcome.json`:

```
eligibility: HOLD
deployment_phase: NOT_STARTED
ssh_attempted: false
ssh_executed: false
uat_deployed: false
uat_deployment_outcome: HELD
diagnostics: UAT_DEPLOY_GATE_ACTIVE is not true
result: HOLD
```

Browser acceptance, acceptance summary, Story 19.5 lifecycle: skipped.

**GitGuardian nuance:** native App `gitguardian` posted SUCCESS on **PR head** `d17b7dba`. On **merge SHA** `6e8388ee` this investigation found **0** `gitguardian` App check-runs (24 check-runs, all `github-actions`). Post-merge security evidence on the tip is the in-run “GitGuardian exact-SHA API scan” SUCCESS (GitHub Actions 15368). Do not conflate the two.

Production: Deploy Production is dispatch-only and is not in the SHA’s run list.

## 6. Classification

| Question | Answer |
| --- | --- |
| Organizational owner-merge policy violated? | **Yes.** Policy required human OWNER merge. GitHub merge actor was cursor[bot]. Zero native reviews. |
| Live GitHub ruleset violated? | **No.** Ruleset `26322151` requires 0 reviews and was satisfied. |
| Actual UAT SSH / host deploy? | **No.** Gate-false HOLD. `ssh_executed: false`, `ssh_attempted: false`. |
| Production incident? | **No** evidence of Production activity. |
| Both authorization + deployment incident? | **No.** Policy violation **without** a completed deployment. |

Do not revert #541 in this task. The dest tree is the intended 21-path sync; the defect is **who was allowed to merge**, not the blob set.

## Current unauthorized-merge exposure (still live)

Until owner setup changes:

- `release/uat` ruleset still has **0** required reviews.
- `main` still has **no** ruleset (direct push to main is not ruleset-blocked).
- Cursor App advertised `contents: write` still allows cursor[bot] to merge any PR whose required checks are green and that is not a Draft.
- PR #542 is Draft, so GitHub will not merge it until it leaves Draft — Draft is a **soft** hold only. Converting it to ready (as happened on #541, actor fad16papa) would again make cursor[bot] a legal merger.
- A GitHub Actions required workflow would still post as integration **15368** and can be name-spoofed by PR-head YAML. It is **not** a sufficient future control.

This is **not** `OWNER_CONTROL_READY`.
