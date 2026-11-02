---
label: AD25-OWNER-AUTH
status: design
not_pr_e: true
do_not_install: true
authority: issue-538
cat_sec: ad25-owner-auth-cat-sec.md
---

# Owner-policy enforcement design (external, source-bound)

This is an owner-reviewable design. **Do not install the App. Do not change rulesets, Environments, or secrets in this story.**

PR #542’s in-repo validator is **not** an independent authorization root. A PR-controlled workflow or `authorize_from_trusted_ref` invoked from PR-head YAML cannot prove owner approval. The #541 merge is the existence proof: GitHub allowed cursor[bot] to merge a control-plane PR with zero human reviews after fad16papa marked it ready.

## What GitHub can and cannot prove

| Claim | Proven by |
| --- | --- |
| Merge was not performed by user `fad16papa` | REST `merged_by.login=cursor[bot]` |
| Cursor Cloud can act as fad16papa for some events | `ready_for_review` actor = fad16papa |
| Required Actions checks were green | integration 15368 on PR head |
| Human was at the keyboard | **Not a GitHub-native fact** |

`login=fad16papa` is **not** proof of human presence. Cursor Cloud already minted a user-attributed event on #541. Comment attestation and Environment `pending_deployments` approval both accept a fad16papa user token. This design **stops the observed cursor[bot] installation-token merge** and **stops PR-head 15368 from spoofing the owner-policy check**. It does **not** invent a human-presence bit GitHub does not have on a single-owner personal repository.

Accepted residual (must remain visible; never rebranded as independence):

- After Layer A, an agent holding a **fad16papa user OAuth/PAT** can still `gh pr merge` (`mergedBy` would then be fad16papa) and can mint attestation as fad16papa.
- Closing that residual requires a second GitHub identity, an out-of-band signed factor Cursor does not hold, or owner process (merge only on GitHub.com after hardware step-up). Those are owner decisions, not this App.

## Invariants

1. Control-plane paths (`.github/**`, `deploy/**`, authorization manifests, App/Environment/release policy) require a verifiable **owner-identity** authorization signal. Cursor installation-token (`cursor[bot]`) must not be able to merge those PRs.
2. The merge-blocking check identity must be a **GitHub App `integration_id` other than 15368** (GitHub Actions), other than Cursor (`1210556`), and other than GitGuardian (`46505`). The live ruleset JSON must **pin** that id, not match a check name from “any source.”
3. No control-plane auto-merge. Repo `allow_auto_merge` is already false. PR-E (future feature auto-merge App) is a **different** App, installed later, and must be refused on control-plane paths.
4. No direct push or force-push to `main` or `release/uat`.
5. The PR under evaluation cannot supply its own authorization (not via rewritten `ci.yml`, not via rewritten validator, not via cursor[bot] review, not via a 15368 job named `AD25-Owner-Policy`).
6. Missing owner attestation, missing checks, SHA mismatch, unpinned `integration_id`, App timeout, or stale policy → **FAIL / HOLD**, never success, never `neutral` as a mergeable state.
7. Single-owner workflow must remain possible: fad16papa must be able to merge without a second human and without GitHub self-review deadlock. **Cursor must not substitute as `cursor[bot]`**. Cursor substituting as **fad16papa user token** is a residual of single-owner GitHub identity, not a solved control.
8. The owner-policy evaluator must not receive UAT or Production secrets (`DROPLET_*`, `PROD_*`). It must not have `deployments: write`, `actions`, `environments`, or repository secret access. `GITGUARDIAN_API_KEY` is unnecessary here.
9. The evaluator **must not execute Python (or any code) extracted from a git blob**. App-bundled code only. Repository blobs are **data** (path lists, SHA tuples) compared by the App. `exec_module` of `origin/main:deploy/lib/ad25_sync_allowlist.py` is an RCE root, especially while `main` has no ruleset.

## Recommended mechanism (two layers)

### Layer A — stop cursor[bot] from merging (immediate, GitHub installation)

Owner reduces the **Cursor** GitHub App installation on `fad16papa/Cohestra`. Advertised App **maximum** is not the installation grant; owner must change the **installation** (or request a reduced permission set and re-approve).

| Permission | Advertised App max | Required installation for control-plane lock |
| --- | --- | --- |
| `contents` | write | **read** |
| `pull_requests` | write | write (open/update Draft PRs). Merge still needs `contents: write`. |
| `workflows` | write | **none** (preferred) or read |
| `merge_queues` | write | **none** |
| `actions` | write | **read** or **none** (drops `workflow_dispatch` of Deploy UAT / Deploy Production as the App) |
| `administration` | read | read or none |
| `checks` | write | write if Cursor must post checks; else read. Must **not** be allowed to satisfy `AD25-Owner-Policy` (that name is pinned to the other App). |
| `deployments` | read | read or none |

GitHub: merging a PR creates a commit on the base branch, which requires `contents: write`. Dropping that permission is the installation change that **mechanically** stops cursor[bot] from being `mergedBy`. Owner then merges in the GitHub.com UI as `fad16papa`.

This layer does **not** evaluate path policy. It only removes the **installation-token** merger. It does not revoke fad16papa user PATs/OAuth.

Do **not** perform this change from an agent.

### Layer B — source-bound owner-policy check (App, not PR-E, not a required workflow)

Install a **new** GitHub App, slug proposal `cohestra-owner-policy` (name: “Cohestra Owner Policy”). Separate from Cursor. Separate from future PR-E.

**Do not use a GitHub ruleset required workflow as the owner-policy gate.** Required workflows still execute as GitHub Actions **integration 15368**. A PR-head job with the same check name can satisfy a name-only required status check. That fails invariant 2.

**Check name (exact):** `AD25-Owner-Policy`

**Installation permissions (minimum, and maximum for this App):**

| Permission | Access | Why |
| --- | --- | --- |
| `contents` | **read** | Read default-branch blobs as **data**. Never write. Never merge. |
| `metadata` | read | Repository identity |
| `pull_requests` | **read** | Read PR head SHA, files, comments |
| `checks` | **write** | Post check-run `AD25-Owner-Policy` |
| `statuses` | **write** | Required by GitHub ruleset UI/API to **pin** this App as the expected source of the required check |
| `members` | none | |
| `actions` | none | |
| `workflows` | none | |
| `administration` | none | |
| `deployments` | **none** | GitHub `deployments` is repo-wide; do not let this App create `uat` / `production` deployment objects |
| `environments` | none | |
| secrets / variables | none | |

**Private key / webhook** live in owner-controlled hosting **outside** this repository. Not in Cohestra Actions secrets that PR-head workflows can read.

Chicken-and-egg pin: GitHub requires the App to have **recently posted a check-run** before the ruleset UI will list it as an expected source. Prefer **one REST PATCH** of ruleset `26322151` that adds `AD25-Owner-Policy` with `integration_id` already set (no “any source” window). If the UI forces a two-step add-then-pin, keep the repo frozen (no ready-for-review control-plane PRs) until live JSON shows the pin. Abort if the pin is missing.

### Attestation (single-owner, non-deadlocking, honestly weak)

Do **not** set `required_approving_review_count: 1` while fad16papa is the PR author. GitHub will reject self-approval and freeze the queue. Ruleset team-based `required_reviewers` is unavailable on this user-owned repository.

The App accepts **only** `login=fad16papa`, never `cursor[bot]`, `cursor`, `cursoragent`, `github-actions[bot]`.

**In-scope attestation (pick one; both are user-token mintable):**

1. **Preferred in-scope (no `deployments: write`):** PR issue comment from `fad16papa` whose body is exactly:
   `OWNER_APPROVE_CONTROL_PLANE sha=<40-char lowercase hex of current HEAD>`
   SHA must equal the PR head at evaluation time. Any other SHA is stale → fail. Bot comments ignored. Edited comments ignored (use the original body + `user.type=User`). Re-evaluate on `issue_comment`.
2. **Optional later, owner-only, not this App:** GitHub Environment `ad25-owner-policy` with required reviewer `fad16papa`, `prevent_self_review: false`, `can_admins_bypass: false`, **zero secrets**, Cursor not a reviewer. Use ruleset `required_deployments` if the owner wants the GitHub.com “Review pending deployments” UI. **Do not** give the Owner-Policy App `deployments: write` to create those deployments. Until a secretless creator that is not 15368 exists, Environment wait UI is out of Layer B scope.

**Rejected:** CODEOWNERS required review as the only gate (deadlock on personal repo / self-review). `pull_request_target` workflows (secret leak). PR-head `ci.yml` echoing PASS. Cursor review or Cursor comment. Name-only required check. Required workflow (15368). Executing PR-head or `origin/main` Python as the evaluator.

Feature-only PRs (no control-plane paths per the **App-bundled** classifier): check may succeed without attestation, and still **must not** be auto-merged by this App.

### Evaluation algorithm (fail closed)

App code is hosted outside this repository (bundled with the App). On `pull_request` `{opened, synchronize, reopened, ready_for_review}` **and** `issue_comment` **and** `check_suite.rerequested` for bases `main` and `release/uat`:

**Common:**

1. Resolve exact PR head SHA. If missing → fail.
2. Read changed files via GitHub API (not by executing PR scripts).
3. Classify paths with **App-bundled** policy copy. Optionally also read `origin/main:deploy/ad25-sync-allowlist.txt` as **text data** and refuse dest-sync PRs if the App copy and main copy disagree until the owner ships an App update. Never `exec` that blob.
4. If SHA moved after attestation → fail (stale).
5. On App errors, 403, timeout → fail (do not skip; do not post `neutral`).
6. Post check-run `AD25-Owner-Policy` with `head_sha=<exact>`, conclusion success|failure. Never success on missing data.

**Verdict A — policy expansion (base `main`, control-plane paths, not an AD-25 dest sync):**

- Require a fresh owner attestation for **this** SHA.
- Do **not** run dest-tree exact-match against `release/uat`.
- Success = attestation + App-bundled classifier says the changed-path set is the intended expansion (explicit allow of new paths in the App-bundled policy, or attested expansion list). Unexpected Production / `src/` / `web/` / secrets / ADCP → fail.

**Verdict B — dest-tree sync (base `release/uat`):**

- Require a fresh owner attestation for **this** SHA.
- Compare GitHub-reported changed paths ⊆ App-bundled approved set.
- Read blobs from `origin/main` and from the PR head **as data**; require exact blob match on every approved path present, and changed paths ⊆ approved set vs dest parent.
- Ancestor check: dest must be a descendant of the stated dest parent (git merge-base via `git` in the App, or compare merge-base SHAs via API). Do not skip this on a “pre-hardening fallback.”
- Success only if attestation + exact-tree both pass.

### Ruleset requirements (owner applies later)

**Update `26322151` (release/uat):**

- Keep required reviews at **0** (avoid deadlock). Do not enable `require_code_owner_review`.
- Add required status check:
  - context: `AD25-Owner-Policy`
  - `integration_id`: **the Owner-Policy App**, recorded after install. Not 15368, not 1210556, not 46505, not null.
- Set `strict_required_status_checks_policy: true` (requires the tip to be up to date). **Strict is not app pinning.** Pinning is `integration_id`.
- Keep `non_fast_forward`, `deletion`, `pull_request`, bypass empty.
- Do not add Cursor as a bypass actor.
- Do **not** add a ruleset `workflows` required-workflow rule as a substitute for this check.

**New ruleset on `main`:**

- `pull_request` required (no direct push).
- `non_fast_forward`, `deletion`.
- Same seven current checks + GitGuardian + `AD25-Owner-Policy` pinned to the Owner-Policy App.
- Reviews remain 0; Owner-Policy check is the owner-identity gate.
- Bypass empty. Cursor not bypass.

### PR-E separation

| | Owner-Policy App | Future PR-E (do not install now) |
| --- | --- | --- |
| Purpose | Prove owner-identity / path policy | Auto-merge **feature** PRs into `release/uat` |
| `contents` | read | write **only if** owner later accepts; never on `main` |
| Control-plane PRs | check **failure** without owner attestation | **must refuse** (no merge) |
| Check name | `AD25-Owner-Policy` | never reuse this name |
| Secrets | none | none |
| `integration_id` | recorded, distinct | must never equal Owner-Policy App |

### What this design does not claim

- Installing the App is not done here.
- PR #542 remaining Draft is not owner authorization.
- Trusted-ref Python on PR-head CI is not owner authorization.
- Native GitGuardian is source-bound for secrets, not for merge authority.
- `login=fad16papa` attestation is not human-presence.
- Layer A does not revoke user PATs.
- `OWNER_CONTROL_READY` is false until Layer A + pinned Layer B + probes exist.

## Approval checkpoints (after owner setup, not now)

1. Cursor installation `contents` is **read**; `merge_queues` none; `actions` not write.
2. Owner-Policy App installed with the table above; `integration_id` recorded.
3. Live ruleset JSON shows `AD25-Owner-Policy` with that `integration_id` (not null, not 15368, not 1210556).
4. Probe: a throwaway Draft control-plane PR cannot be merged by cursor[bot]; check stays **failure** without `fad16papa` attestation.
5. Probe: owner attestation on the exact SHA turns the check green; SHA bump turns it red.
6. Probe: rewriting `ci.yml` on the PR to add a job named `AD25-Owner-Policy` does **not** satisfy the ruleset (integration_id mismatch).
7. Probe: Cursor App posting a check-run of that name does not satisfy the ruleset.
8. Only then: owner may merge PR #542 as `fad16papa` from GitHub.com. Verify `merged_by.login=fad16papa`. Treat that as owner-**identity**, not proven human presence.
9. Only then: owner-policy expansion + AD-25 sync to `release/uat`.
10. UAT canary still requires the separate canary checklist. Production remains NO-GO.

## Abort criteria (any one → HOLD)

- Owner-Policy App granted `contents: write` or `deployments: write`.
- Cursor App still has `contents: write` after the owner intended Layer A.
- Required check `AD25-Owner-Policy` is produced by GitHub Actions 15368, Cursor 1210556, or `integration_id` is null.
- Check succeeds without `fad16papa` attestation on a control-plane PR.
- Attestation SHA ≠ current HEAD.
- Evaluator executes repository Python.
- `UAT_DEPLOY_GATE_ACTIVE` changed from false.
- Any Production Environment, secret, or workflow change.
- Follow-on sync PR opened/merged before Layer B is **pinned** on `release/uat`.
- PR-E installed or reused as the owner-policy App.
- A ruleset required workflow is used as a substitute for `AD25-Owner-Policy`.
