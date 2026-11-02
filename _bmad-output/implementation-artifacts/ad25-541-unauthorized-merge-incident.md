---
label: AD25-OWNER-AUTH
binds:
  - issue-538
  - pr-541
  - pr-542
status: incident-report
as_of: 2026-11-02T11:00:00+08:00
---

# AD-25 incident: PR #541 merged by cursor[bot]

Read-only investigation. No revert, no permission revocation, no live GitHub changes.

**Classification:** authorization-policy violation. **Not** a successful UAT or Production deployment incident.

## Exact SHAs (verified 2026-11-02, Asia/Singapore)

| Ref | SHA | Tip author |
| --- | --- | --- |
| `origin/main` | `9ccca77e7297dc28b0a843d3435e9603dc803da7` | fadthegreat (merge of PR #540) |
| `origin/release/uat` | `6e8388eef944a0fe95f1218502cac49681a60dd2` | cursor[bot] (merge of PR #541) |
| PR #541 head | `d17b7dba3a91349c0c6aa76169b2418dff78c956` | Cursor Agent, co-authored fadthegreat |
| PR #541 base / dest parent | `1c57633fa607dec4a31aca8928c4c02adb231822` | PR-C bootstrap |
| PR #542 HEAD (Draft, unmerged) | `ade3c8281e8a2ec82ef45771bc5b68df64901a41` | Cursor Agent |

`release/uat` is **not** at the PR-C bootstrap SHA. It is the #541 merge commit.

## 1. Confirmed GitHub timeline (PR #541)

All times below are converted to **Asia/Singapore (UTC+8)**.

| Time (SGT) | UTC | Fact | Source |
| --- | --- | --- | --- |
| **3:07 AM SGT** | 2026-11-01T19:07:02Z | Single PR commit `d17b7dba` authored by Cursor Agent, co-authored by fad16papa | GitHub commits API |
| PR opened as Draft targeting `release/uat` | — | GraphQL/REST author **fad16papa** (not a bot) | REST/GraphQL `author.login=fad16papa` |
| **9:40:00 AM SGT** | 2026-11-02T01:40:00Z | Draft → ready for review. Actor: **fad16papa** | issues/events `ready_for_review` |
| **9:40:09 AM SGT** | 2026-11-02T01:40:09Z | **Merged.** Actor: **cursor[bot]**. Merge SHA `6e8388ee`. | issues/events `merged`; GraphQL `mergedBy.login=cursor` `__typename=Bot` |
| **9:40:09 AM SGT** | 2026-11-02T01:40:09Z | PR closed by cursor[bot] | issues/events `closed` |
| **9:40:11 AM SGT** | 2026-11-02T01:40:11Z | `push` to `release/uat` starts CI `41373679000` and Deploy UAT `41373679140`. Triggering actor: cursor[bot] | Actions API |

Additional confirmed negatives:

- Native PR reviews: **[]**. `reviewDecision`: null.
- Review comments: **0**. Issue comments: **0**.
- `autoMergeRequest`: **null** *now*. GitHub clears this after merge, so auto-merge **cannot be confirmed or denied** from current GraphQL.
- Labels: none.
- Merge method: merge commit (two parents: `1c57633` + `d17b7dba`). Author `cursor[bot]`; committer `GitHub <noreply@github.com>` (GitHub merge API / merge button via App).

## 2. Confirmed vs unverified

**Confirmed GitHub facts**

- Merge actor identity is the **Cursor GitHub App bot**, not user `fad16papa`.
  - REST `mergedBy.login`: `app/cursor` (`is_bot: true`).
  - GraphQL `mergedBy.login`: `cursor`, `__typename: Bot`, node `BOT_kgDODFXTxQ`.
  - Merge-commit author: `cursor[bot] <206951365+cursor[bot]@users.noreply.github.com>`.
- Owner **did** mark the Draft ready (`ready_for_review` by fad16papa) **nine seconds** before the merge.
- Zero native approving reviews.
- Ruleset `26322151` was and is: required reviews **0**, bypass empty, required checks from GitHub Actions `15368` + GitGuardian `46505`.
- Cursor App public permission set includes `contents: write` and `pull_requests: write` ([https://github.com/apps/cursor](https://github.com/apps/cursor), App id `1210556`). Those two permissions are **sufficient** for an installed App to merge a PR when the ruleset does not require a human review.

**Unverified (do not treat as fact)**

- Whether fad16papa clicked Merge in the Cursor UI, asked an agent to merge, or an agent merged unattended after `ready_for_review`.
- Whether GitHub auto-merge was enabled at merge time (`autoMergeRequest` is null after merge).
- The **installation-scoped** permission grant on `fad16papa/Cohestra` (installations API 401/403 from this token). The public App permission catalog is not proof of the repo grant; it is only the App’s advertised maximum.
- GitHub org/enterprise audit-log records (not readable with this token).

A GitHub UI merge by fad16papa would have `mergedBy.login=fad16papa`. That did **not** happen.

## 3. Which permissions enabled the merge

Minimum capabilities used:

1. **Repository write** for the Cursor GitHub App (`contents: write` on the advertised App). Required to create the merge commit on `release/uat`.
2. **`pull_requests: write`** (advertised) to change PR state (merge/close).
3. **Ruleset `26322151` required_approving_review_count = 0.** With zero required reviews, a write-capable App is a valid merger once required status checks on the PR head are green.
4. PR head `d17b7dba` had the seven required checks SUCCESS (including native GitGuardian Security Checks on the *PR head*). Draft conversion removed the Draft merge block.

Live ruleset **cannot** prevent this today:

- It does not require a human review.
- It does not restrict merge actors to `fad16papa`.
- Required checks are mostly GitHub Actions (`15368`) from PR-head workflows.
- Bypass list is empty, which does **not** block an App that is a collaborator-equivalent installer with write; it only blocks ruleset bypass.

`require_extra_approval_for_unattributed_changes: true` did not stop this merge. The only commit lists co-author `fad16papa@gmail.com`.

Requiring CODEOWNER or `required_approving_review_count: 1` **without** changing authorship would deadlock a single-owner repo when fad16papa is the PR author (GitHub rejects self-approval). That is **not** a safe one-click fix. See the owner-policy App design.

## 4. PR #541 changed-file scope and exact-tree

PR files API: **20** paths. Allowlist: **21** paths. The missing diff path is `deploy/lib/uat-predeploy-gate.py`, whose blob is identical on `1c57633`, `9ccca77e`, `d17b7dba`, and `6e8388ee` (`fc36914c937e36e907f364370249e8c79c8dcc26`).

Independent exact-tree (this investigation, local git objects):

- 21/21 allowlist blobs on `d17b7dba` **equal** `main` `9ccca77e`.
- `1c57633..d17b7dba` changed paths = the 20 files GitHub lists ⊆ allowlist.
- Same 20 paths on `1c57633..6e8388ee`.
- No `src/`, `web/`, Production workflows, secrets, or ADCP in the dest-vs-parent diff.

This matches the PR body’s 21/21 claim. Tree correctness does **not** equal owner-authorized merge.

## 5. Post-merge UAT safety (Deploy UAT `41373679140`)

Run: https://github.com/fad16papa/Cohestra/actions/runs/41373679140  
Event: `push` to `release/uat`. Head: `6e8388ee`. Triggering actor: cursor[bot].  
Workflow conclusion: **failure** because the predeploy job exits 1 on HOLD (fail-closed). That is not SSH.

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

**Predeploy:** job “Pre-UAT eligibility gate” **failure** with log:

```
UAT_DEPLOY_GATE_ACTIVE: false
UAT_MAIN_DEPLOY_SUPPRESSED: true
RESULT=HOLD
HOLD_REASON=UAT_DEPLOY_GATE_ACTIVE is not true
```

**SSH:** job “Deploy accepted SHA to UAT” **skipped**. Final delivery outcome:

```
RESULT=HOLD
UAT_DEPLOYMENT_OUTCOME=HELD
DIAGNOSTICS=UAT_DEPLOY_GATE_ACTIVE is not true
UAT_DEPLOYED=false
SSH_EXECUTED=false
SSH_ATTEMPTED=false
```

Browser acceptance, acceptance summary, Story 19.5 lifecycle: skipped.

**GitGuardian nuance:** native App `gitguardian` posted SUCCESS on **PR head** `d17b7dba`. On **merge SHA** `6e8388ee` this investigation found **0** `gitguardian` App check-runs. Post-merge security evidence on the tip is the in-run “GitGuardian exact-SHA API scan” SUCCESS (GitHub Actions). Do not conflate the two.

CI on the merge SHA (`41373679000`) SUCCESS.

Production: no Production workflow run was started by this merge (not investigated as a Production deploy; Deploy Production is dispatch-only and was not in the SHA’s run list).

## 6. Classification

| Question | Answer |
| --- | --- |
| Authorization-policy violation? | **Yes.** Policy required human OWNER merge. GitHub merge actor was cursor[bot]. Zero native reviews. |
| Actual UAT SSH / host deploy? | **No.** Gate-false HOLD. `SSH_EXECUTED=false`. |
| Production incident? | **No** evidence of Production activity. |
| Both? | **No.** Policy violation **without** a completed deployment. |

Do not revert #541 in this task. The dest tree is the intended 21-path sync; the defect is **who was allowed to merge**, not the blob set.

## Current unauthorized-merge exposure (still live)

Until owner setup changes:

- `release/uat` ruleset still has **0** required reviews.
- `main` still has **no** ruleset.
- Cursor App advertised `contents: write` still allows cursor[bot] to merge any PR whose required checks are green and that is not a Draft.
- PR #542 is Draft, so GitHub will not merge it until it leaves Draft — Draft is a **soft** hold only. Converting it to ready (as happened on #541) would again make cursor[bot] a legal merger.

This is **not** OWNER_CONTROL_READY.
