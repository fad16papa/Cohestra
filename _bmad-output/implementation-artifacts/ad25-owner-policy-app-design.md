---
label: AD25-OWNER-AUTH
status: design
not_pr_e: true
do_not_install: true
authority: issue-538
---

# Owner-policy enforcement design (external, source-bound)

This is an owner-reviewable design. **Do not install the App. Do not change rulesets, Environments, or secrets in this story.**

PR #542’s in-repo validator is **not** an independent authorization root. A PR-controlled workflow or `authorize_from_trusted_ref` invoked from PR-head YAML cannot prove owner approval. The #541 merge is the existence proof: GitHub allowed cursor[bot] to merge a control-plane PR with zero human reviews.

## Invariants

1. Control-plane paths (`.github/**`, `deploy/**`, authorization manifests, App/Environment/release policy) require a verifiable **human owner** authorization signal that Cursor cannot mint as `cursor[bot]`.
2. The merge-blocking check identity must be a **GitHub App `integration_id` other than 15368** (GitHub Actions) and other than the Cursor App (`cursor` / 1210556).
3. No control-plane auto-merge. PR-E (future feature auto-merge App) is a **different** App, installed later, and must be refused on control-plane paths.
4. No direct push or force-push to `main` or `release/uat`.
5. The PR under evaluation cannot supply its own authorization (not via rewritten `ci.yml`, not via rewritten validator, not via cursor[bot] review).
6. Missing owner approval, missing checks, SHA mismatch, or stale policy → **FAIL / HOLD**, never success.
7. Single-owner workflow must remain possible: fad16papa must be able to approve and merge without a second human, **without** GitHub self-review deadlock and **without** Cursor substituting for that approval.
8. The owner-policy evaluator must not receive UAT or Production secrets (`DROPLET_*`, `PROD_*`, `GITGUARDIAN_API_KEY` is unnecessary here).

## Recommended mechanism (two layers)

### Layer A — stop cursor[bot] from merging (immediate, GitHub installation)

Owner reduces the **Cursor** GitHub App installation on `fad16papa/Cohestra`:

| Permission | Today (advertised App max) | Required for control-plane lock |
| --- | --- | --- |
| `contents` | write | **read** |
| `pull_requests` | write | write (create/update PRs only; merge needs contents write) |
| `workflows` | write | read or none if possible |
| `merge_queues` | write | **none** |
| `administration` | read | read or none |
| `actions` | write | read |
| `checks` | write | write if Cursor posts checks; else read |

GitHub: merging a PR creates a commit on the base branch, which requires `contents: write`. Dropping that permission is the only installation change that **mechanically** stops cursor[bot] from being `mergedBy`. Owner then merges in the GitHub.com UI as `fad16papa`.

This layer does **not** evaluate path policy. It only removes a merger.

Do **not** perform this change from an agent.

### Layer B — source-bound owner-policy check (App, not PR-E)

Install a **new** GitHub App, slug proposal `cohestra-owner-policy` (name: “Cohestra Owner Policy”). Separate from Cursor. Separate from future PR-E.

**Check name (exact):** `AD25-Owner-Policy`

**Installation permissions (minimum):**

| Permission | Access | Why |
| --- | --- | --- |
| `contents` | **read** | Clone default branch / read blobs. Never write. Never merge. |
| `metadata` | read | Repository identity |
| `pull_requests` | **read** | Read PR head SHA, files, comments |
| `checks` | **write** | Post `AD25-Owner-Policy` only |
| `members` | none | |
| `actions` | none | |
| `workflows` | none | |
| `administration` | none | |
| `deployments` | none (preferred) | Avoid `uat` / `production` deployment objects |
| `environments` | none | |
| secrets / variables | none | |

If the owner prefers GitHub Environment wait UI instead of a comment attestation, `deployments: write` **only** to create deployments targeting Environment `ad25-owner-policy` (no secrets). Still never `uat` or `production`. Prefer comment/attestation to keep deployments:write off.

**Private key / webhook** live in owner-controlled hosting (separate repo or small service). Not in Cohestra Actions secrets that PR-head workflows can read.

### Attestation (single-owner, non-deadlocking)

Do **not** set `required_approving_review_count: 1` while fad16papa is the PR author. GitHub will reject self-approval and freeze the queue.

Use one of these **owner-identity** signals (App accepts **only** `login=fad16papa`, never `cursor[bot]`, `cursoragent`, `github-actions[bot]`):

1. **Preferred:** GitHub Environment `ad25-owner-policy`
   - Required reviewer: user `fad16papa`
   - `prevent_self_review`: **false** (owner may approve even if they opened the PR)
   - `can_admins_bypass`: **false**
   - **No secrets.** No `DROPLET_*`. Deployment branches: none required, or the PR ref.
   - Owner clicks **Review pending deployments** on GitHub.com.
   - Cursor App is **not** a listed reviewer.
2. **Acceptable:** PR issue comment from `fad16papa` whose body is exactly:
   `OWNER_APPROVE_CONTROL_PLANE sha=<40-char lowercase hex of current HEAD>`
   SHA must equal the PR head at evaluation time. Any other SHA is stale → fail. Bot comments ignored.
3. **Rejected:** CODEOWNERS required review as the only gate (deadlock). `pull_request_target` workflows (secret leak). PR-head `ci.yml` echoing PASS. Cursor review or Cursor comment.

Feature-only PRs (no control-plane paths per a classifier run on the **trusted** App code): check may succeed without attestation, and still **must not** be auto-merged by this App.

### Evaluation algorithm (fail closed)

App code is hosted outside this repository. On `pull_request` `{opened, synchronize, reopened, ready_for_review}` for bases `main` and `release/uat`:

1. Resolve exact PR head SHA. If missing → fail.
2. Read changed files via GitHub API (not by executing PR scripts).
3. Classify paths with **App-bundled** policy copy, independently of PR-head `ad25_sync_allowlist.py`. Optionally also `git show origin/main:deploy/lib/ad25_sync_allowlist.py` and refuse if App copy and main copy disagree until owner updates the App.
4. If any control-plane path:
   a. Require a fresh owner attestation for **this** SHA.
   b. Fetch `origin/main` (or owner-pinned policy SHA).
   c. Extract validator/allowlist blobs from that trusted ref.
   d. Run `authorize_from_trusted_ref` **in the App process**, never `python3` from the PR checkout as the sole evaluator.
   e. Success only if attestation + trusted-ref evaluation both pass.
5. If SHA moved after attestation → fail (stale).
6. On App errors, 403, timeout → fail (do not skip).
7. Post check-run `AD25-Owner-Policy` with `head_sha=<exact>`, conclusion success|failure. Never success on missing data.

### Ruleset requirements (owner applies later)

**Update `26322151` (release/uat):**

- Keep required reviews at **0** until Layer A+B work (avoid deadlock).
- Add required status check:
  - context: `AD25-Owner-Policy`
  - `integration_id`: **the Owner-Policy App**, not 15368, not Cursor, not GitGuardian.
- Set `strict_required_status_checks_policy: true`.
- Keep `non_fast_forward`, `deletion`, bypass empty.
- Do not add Cursor as a bypass actor.
- Optional later: `required_deployments` for Environment `ad25-owner-policy`.

**New ruleset on `main`:**

- Same seven current checks + GitGuardian + `AD25-Owner-Policy`.
- `pull_request` required (no direct push).
- `non_fast_forward`, `deletion`.
- Reviews remain 0; Owner-Policy check is the owner gate.
- Bypass empty. Cursor not bypass.

**Do not** enable `require_code_owner_review` as the only owner gate.

### PR-E separation

| | Owner-Policy App | Future PR-E (do not install now) |
| --- | --- | --- |
| Purpose | Prove owner authorization / path policy | Auto-merge **feature** PRs into `release/uat` |
| `contents` | read | write **only if** owner later accepts; never on `main` |
| Control-plane PRs | check **failure** without owner attestation | **must refuse** (no merge) |
| Check name | `AD25-Owner-Policy` | never reuse this name |
| Secrets | none | none |

### What this design does not claim

- Installing the App is not done here.
- PR #542 remaining Draft is not owner authorization.
- Trusted-ref Python on PR-head CI is not owner authorization.
- Native GitGuardian is source-bound for secrets, not for merge authority.

## Approval checkpoints (after owner setup, not now)

1. Cursor installation `contents` is **read**.
2. Owner-Policy App installed with the table above; `integration_id` recorded.
3. Probe: a throwaway Draft control-plane PR cannot be merged by cursor[bot]; check stays failure without `fad16papa` attestation.
4. Probe: owner attestation on the exact SHA turns the check green; SHA bump turns it red.
5. Probe: rewriting `ci.yml` on the PR does not produce `AD25-Owner-Policy` success (integration_id mismatch).
6. Only then: owner may merge PR #542 as `fad16papa` from GitHub.com.
7. Only then: owner-policy expansion + AD-25 sync to `release/uat`.
8. UAT canary still requires the separate canary checklist. Production remains NO-GO.

## Abort criteria (any one → HOLD)

- Owner-Policy App granted `contents: write`.
- Cursor App still has `contents: write` after the owner intended Layer A.
- Required check `AD25-Owner-Policy` is produced by GitHub Actions 15368 or Cursor.
- Check succeeds without `fad16papa` attestation on a control-plane PR.
- Attestation SHA ≠ current HEAD.
- `UAT_DEPLOY_GATE_ACTIVE` changed from false.
- Any Production Environment, secret, or workflow change.
- Follow-on sync PR opened/merged before Layer B is required on `release/uat`.
- PR-E installed or reused as the owner-policy App.
