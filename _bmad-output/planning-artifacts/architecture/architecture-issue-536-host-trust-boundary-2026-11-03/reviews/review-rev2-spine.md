# Review rev2 — Issue 536 host trust boundary spine

- Reviewer: BMAD architecture + CAT-SEC
- Artifact: `ARCHITECTURE-SPINE.md` revision 2 (uncommitted working tree; spine not edited)
- Date: 2026-11-03
- Verdict: **revise**
- Mechanical lint: `lint_spine.py` ok, 0 findings
- Evidence: local `git show` / `git rev-parse` / `git grep` only. No GitHub write, no live API read, no push.

No BLOCKER. Three MAJOR findings. AD-9 does not still say “reject replay.” The `pull_request_target` checkout, permission, and `run` rules are safe as written. AD-10 does not claim a key was created. Reviewer Apps are not claimed installed or live-verified. The #551 blob paths match.

## Checks

| Check | Result |
| --- | --- |
| 1. “Reject replay” vs AD-9 | Holds. The only uses of “reject replay” are the superseded revision-1 task words (lines 131 and 146). The operative rule is idempotent read-only reuse with no new side-effect authority. |
| 2. AD-7 `pull_request_target` checkout, permissions, interpolation | The three safety properties hold. The “base is not main ⇒ workflow does not run” sentence does not (finding 1). |
| 3. AD-8 allowlist bypasses | Same-name other App, author-bot, and stale event SHA are closed in the prose. Skipped/neutral is not closed against the check-runs API default (finding 2). Required-check acceptance of App id `15368` is a separate bypass (finding 3). |
| 4. AD-10 key delivery | Holds. Names, formats, and the fingerprint check match `authorization.py` blob `0ceeaaa5`. No key creation is claimed. |
| 5. Apps created / installed / live-verified | Holds, with a wording nit (finding 7) and an unverified branch-protection citation (finding 6). |
| 6. #551 file and blob references | Holds. See the verification list below. |

## Findings

### 1. MAJOR — AD-7 says a non-`main` base does not run the workflow. The trigger it specifies does run.

Line 118: “A pull request whose base is not `main` does not run this workflow, because the default-branch definition is used. A stacked draft therefore does not execute it.”

The same line specifies `pull_request_target` types `opened`, `synchronize`, `reopened`, and `ready_for_review`, and no `branches` filter. GitHub’s current event table sets `GITHUB_SHA` to the last commit on the default branch and `GITHUB_REF` to the default branch. That is what makes `ref: ${{ github.sha }}` a default-branch checkout. It does not filter which pull-request bases fire the event. The `branches` filter does that, and this rule does not set it. Docs: [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) (`pull_request_target` row and “Running your `pull_request_target` workflow based on the head or base branch”).

Once `.github/workflows/cohestra-trust-evaluator.yml` is on `main`, a pull request into `cursor/issue-536-program-ci-c2e5` runs this workflow. AD-10 does not require `base.ref` to be `main`, so that run can return PASS. Two units diverge: one adds `branches: [main]` to make the last sentence true, and one omits it because the trigger list does not include it.

This is not a pull-request code checkout. `github.sha` on this event is the default-branch commit (GitHub changelog, 2025-11-07, in effect on this review date). The rule never checks out `github.event.pull_request.head`, never runs a PR script, and passes only the PR number and head SHA as environment variables.

Required change: put `branches: [main]` on the `pull_request_target` trigger, and state that a run whose API `base.ref` is not `main` is HOLD. Keep the checkout on `github.sha` with `persist-credentials: false`.

### 2. MAJOR — AD-8’s “no other state” rule is bypassed by the check-runs API default.

Line 124 requires, for each reviewer role, that the commit check-runs endpoint list at least one completed `success` for that name and allowlisted `app.id`, and that no run with the same name and App id have any other state. It then says `skipped`, `neutral`, `cancelled`, `timed_out`, `failure`, `action_required`, `stale`, pending, and missing are not success.

`GET /repos/{owner}/{repo}/commits/{ref}/check-runs` defaults to `filter=latest` and `per_page=30` ([REST: list check runs for a Git reference](https://docs.github.com/en/rest/checks/runs)). `latest` returns the most recent run and omits earlier conclusions for that name. A later `success` hides an earlier `skipped`, `neutral`, or `failure` of the same App id. Page 1 can also omit a non-success that sits past 30 runs. A unit that “calls the endpoint” and reads the body it gets can PASS while a non-success run exists. That is the skipped/neutral bypass, and it is the same hole as “cannot hide a failing allowlisted run.”

The same-name rule for a different App id holds if the full set is what is judged: those runs are ignored and are not in the allowlisted failure set. The event head SHA is a stale hint (line 118); the query SHA is the GET pull’s `head.sha`, and each run’s `head_sha` must equal it. That part holds. The author-bot comparison holds when `app.slug` is present (finding 5).

Required change: the list is not complete unless `filter=all`, every page is followed, and a short page or a `total_count` mismatch is HOLD. Judge “any other state” on that full set. Do not treat the default response as the list.

### 3. MAJOR — AD-8 accepts a required check produced by App id `15368`, which the PR author can mint.

Line 124: required checks other than the reviewers “must have every run of that name on the exact head with conclusion `success`, produced by App id `15368` or, when the name contains `gitguardian` case-insensitively, by App id `46505`.”

App id `15368` is `github-actions`. On a same-repo pull request, a workflow job on the head creates a check run under that id, and the job’s `name` is chosen by the head. The reviewer half of the same line correctly refuses `15368` as a reviewer id. The required-check half accepts it.

`Manifest.from_dict` in blob `ab0cd40d48145fe13b047f6b4cfe5425d034b891` at `bb16fa24` requires version 2 `required_checks` to include the exact strings `gitguardian`, `integration`, `regression`, `security`, and `tdd` (`BASELINE_CHECKS`). Those are not the check names on `main` (`ci.yml` uses display names such as `API integration tests` and `GitGuardian exact-SHA API scan`). A unit that follows AD-8 therefore does not bind the real CI jobs. A head that is allowed to edit `.github/workflows/` can add a job whose check name is exactly one of those strings and whose conclusion is `success`. AD-8 counts that run. AD-10’s `path_allowed` blocks the edit only when the workflow path is outside `allowed_paths`. The check rule itself does not require the workflow file from `main`.

The `or` is permissive as written: `15368` qualifies for every name, and `46505` also qualifies when the name contains `gitguardian`. A `github-actions` job named `gitguardian` satisfies the baseline token. The exclusive reading (gitguardian names only from `46505`, every other name only from `15368`) is not what the sentence says.

Required change: a required check passes only when every run of that exact name on the exact head is `completed` / `success` and the producer is the owner-pinned App id for that name. `15368` is acceptable only for a name whose workflow file at that path on the default branch is the file that produced the run. A name that contains `gitguardian` is App id `46505` only. A `github-actions` run does not satisfy it. Same `filter=all` and full pagination as finding 2.

### 4. MINOR — AD-4’s Rule still forbids the implementation pull request revision 2 allows.

Lines 98–99 lift the revision-1 block and allow a stacked draft whose base is `cursor/issue-536-program-ci-c2e5`. The Rule on line 99 still says “No implementation pull request is opened for this slice,” and calls the rest of that Rule the revision-1 record. The structural seed (lines 174–185) lists the evaluator files that draft adds. One unit opens the draft. Another treats the Rule sentence as the ban. AD-6’s matching “no implementation starts until…” sentence is explicitly marked satisfied (line 111). AD-4’s Rule sentence is not.

Required change: one sentence. This revision opens no pull request. A later stacked draft on that base is the only allowed implementation, and it still must not push, retarget, merge, close, or edit PRs 545–551.

### 5. MINOR — The author-App exclusion is not fail-closed when `app.slug` is missing.

Line 124: a reviewer App is an author App when `app.slug` plus the literal suffix `[bot]` equals the pull author’s login. An id match with no slug never forms that string, so the id can still satisfy the role. The check-runs payload is otherwise the right source, and a present slug compared to the API author login closes the bot-author case. A human author who does not control an allowlisted id is not a bypass. Missing slug should be HOLD for that run, same as a non-matching id.

### 6. MINOR — Two live claims are not in the memlog and were not re-read here.

Line 124: “Both ids were read from the branch-protection response for `main` in this run” (`15368` and `46505`). Line 118: “`main` reports `protected: true` through the branches API.” The memlog records HTTP 403 for Actions permissions and records that Apps and variables were not created. It does not record a branch-protection body or these two ids. This pass did not call the API. Do not treat those sentences as verified by this review. They are not a claim that the Cohestra BMAD or CAT-SEC Apps exist.

Line 142 says `UAT_DEPLOY_GATE_ACTIVE` stays false and `UAT_MAIN_DEPLOY_SUPPRESSED` stays true. Line 105 says those live values were not read. The `deploy.yml` conditions on `9ccca77e` match the gate text (hold unless both variables are the string `true`, and hold when `GITHUB_REF` is not `refs/heads/release/uat`). The current variable values are still unread.

### 7. NIT — “owner-created” is a creation phrase the next sentence withdraws.

Line 124 opens with “the owner-created Apps Cohestra BMAD … and Cohestra CAT-SEC,” then says they are NOT created and NOT installed and that no claim is made that they exist. Lines 187 and 202 repeat that they are not created. The withdrawal is enough. Drop “owner-created” so a quote of the first clause cannot stand alone.

### 8. NIT — `230bc33` does not contain revision 2.

Line 14 says `origin/main` `230bc33bf81a8c9ed851a100ba0130fbef06aaa1` “contains this spine through PR 552.” That commit contains the spine through AD-6 only. Revision 2 (AD-7 through AD-11) is the uncommitted working tree. The file path is on that commit. The revision 2 text is not.

## What holds

### Replay (check 1)

Lines 44, 67, 111–112, 129–131, and 146 agree. Same event id and same fingerprint returns the stored result with `replayed: true`, without another read, verify, or store write. A different fingerprint is HOLD and is not described as the replay rule. A replayed result and every side-effect request in this build are HOLD. Story AD-1 at `bb16fa24` says “Replay returns the stored flag and does not verify again” (story spine line 65). AD-9 keeps that and refuses new side-effect authority. The side-effect HOLD is not a second “reject replay” rule. No Rule tells a unit to discard a same-fingerprint replay.

Cross-run durability is already deferred (lines 131 and 205): the local file lasts one runner, and the side-effect gate does not depend on it. That is consistent with “no new authority.” It does not reintroduce reject-replay.

### AD-7 checkout, token, and `run` (check 2, apart from finding 1)

Line 118. Workflow and Python are taken from a commit on `main`. The only `uses` is `actions/checkout` at `11d5960a326750d5838078e36cf38b85af677262`, which this repo already pins as v4.4.0 in `ci.yml` and `deploy.yml`, with `ref: ${{ github.sha }}` and `persist-credentials: false`. That SHA is the default-branch commit for `pull_request_target`, not the PR head. Permissions are `contents: read`, `checks: read`, and `pull-requests: read`. PR title, body, branch names, and labels are not interpolated into `run`. The only event values passed through are the numeric PR number and the head SHA, as environment variables, pattern-checked. The manifest is contents-API bytes at the authoritative head, size-limited, parsed as JSON, not executed. Fork PRs are HOLD. The enable variable must be the string `true` or the result is HOLD. Actions settings are marked NOT VERIFIED. No secret other than the read-scoped `GITHUB_TOKEN` (line 142).

### AD-8 cases that hold (check 3, apart from findings 2, 3, and 5)

A same-name run whose `app.id` is not the allowlisted id is not evidence and is not allowed to mask a failing allowlisted run, provided finding 2’s full list is what is judged. The event head is not the query SHA. `skipped` and `neutral` are not `success` when they appear in that list. Reviewer ids are positive, distinct, and not `15368`. Check names are distinct. Comments, review bodies, check output, labels, and Cursor messages are not evidence. Integer ids come from the check-runs response.

### AD-10 (check 4)

Line 136. Variable names are `COHESTRA_OWNER_KEY_ID`, `COHESTRA_OWNER_PUBLIC_KEY`, `COHESTRA_OWNER_PUBLIC_KEY_SHA256`, `COHESTRA_APPROVED_TASK_ID`, `COHESTRA_REVIEW_APP_BMAD_ID`, `COHESTRA_REVIEW_APP_CATSEC_ID`, `COHESTRA_REVIEW_BMAD_CHECK_NAME`, `COHESTRA_REVIEW_CATSEC_CHECK_NAME`, and `COHESTRA_TRUST_EVALUATOR_ENABLED`. The key id pattern is `^[A-Za-z0-9._-]{1,64}$`, the same as `KEY_ID_RE` in `manifest.py`. The public key is standard base64 of 32 raw bytes. The fingerprint is 64 lowercase hex and must equal `hashlib.sha256(public_key_bytes).hexdigest()`. The manifest `key_id` and `public_key_sha256` must equal those configured values. Any miss is HOLD.

`verify_owner_authorization` in blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` compares `hashlib.sha256(public_key).hexdigest()` to the manifest fingerprint and verifies Ed25519 over `signing_payload` (`json.dumps` with `sort_keys=True`, separators comma and colon, UTF-8). `OwnerKeyring` stores caller-supplied 32-byte keys. The module has no generate and no sign function. The spine says no value is created, read, or stored in this task, the evaluator has no sign or key-generation function, and test keys stay inside the test process. Deferred line 203 leaves key-pair creation undone. That matches the code. The admin-swap residual is labeled inferred, not tested.

### Apps and live flags (check 5, apart from findings 6 and 7)

Lines 124, 142, 187, 202, and 207. The Apps are NOT created and NOT installed. No existence claim survives the paragraph. `live_read_only_transport_verified`, `live_identity_verified`, `live_scoped_loop_verified`, `owner_control_ready`, `automerge_ready`, `uat_deploy_ready`, and `production_ready` are false on PASS and on HOLD. A fake transport is not live verification. A pilot is deferred.

### Blob and path check (check 6)

`git rev-parse` and `git show` against the local objects:

| Claim | Result |
| --- | --- |
| `authorization.py` blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` at `379ec80a`, `63e08eaa`, `79076ea2`, `e2ee0de3`, `bb16fa24`, and ancestor `61f74ca6` | Same blob at each |
| That path absent on `9ccca77e`, on `230bc33`, and at `d29a51dd` (memlog’s PR 545 head) | Absent |
| `github_readonly.py` blob `60c5cca4937ae7e584a9aec844d097409c84bd2c` at `bb16fa24` | Match |
| Blob `b568f31a22c194f16e91c15eabe633028d446247` at `63e08eaa` | Match |
| Blob `53c7240301e8cd9f455c74070535acace06ad049` at ancestor `c4ccd671` | Match, and `c4ccd671` is an ancestor of `bb16fa24` |
| `github_readonly.py` absent at `d29a51dd`, `379ec80a`, `79076ea2`, `e2ee0de3`, and `9ccca77e` | Absent |
| `manifest.py` blob `ab0cd40d48145fe13b047f6b4cfe5425d034b891` at `bb16fa24` | Match |
| `9ccca77e` has no `verify_owner_authorization` and no correction-controller tree | Match |
| Diff `9ccca77e`..`bb16fa24` under `.github/workflows` | Only `correction-controller-tests.yml` added |
| Workflow added in `892c0089`; `cryptography==50.0.2` first appears in `61f74ca6`; `bb16fa24` does not touch the file | Match |
| Workflow `permissions: contents: read` | Match |
| `ReviewIdentity.authenticated` defaults false; `parse_recorded` appends `False`; `LiveReadOnlyClient.fetch` raises for an incomplete grant and again for a complete grant | `github_readonly.py` lines 45, 74–81, 223 |
| READY when roles `bmad` and `catsec` are both present and distinct pass ids are at least 2 | `controller.py` line 620 |
| `_replay` returns the stored decision and does not verify again | `controller.py` lines 854–877 |
| `deploy.yml` and `deploy-production.yml` on `9ccca77e` do not reference `verify_owner_authorization` | No match |
| PR 535 `73c31457`: `parse_review_blob` returns a JSON object; `authentic_review` checks `role`, `independent`, and `head_sha`; `collect_reviews` can store `authentic` true with `collaborator_comment`; `collect_app_reviews` can store `authentic` true with `github_app_check_run` after those marker fields; `merge_review_sources` can keep the check-run row; roles `BMAD` / `CAT-SEC`; file absent on `9ccca77e` | Match |

PR numbers were not re-fetched. Heads were checked as the SHAs written in the spine and the memlog.

## Close

Revise findings 1–3 before treating revision 2 as final. Findings 4–8 do not by themselves reopen checkout, key creation, or replay. The spine file was not changed. No production behavior was weakened.
