# AD25-HARDENING — owner-control enforcement design

**Architecture authority:** Issue #538  
**Related loop:** Issue #536  
**Do not reuse PR-E** (reserved for the future UAT auto-merge App)  
**This document does not change live GitHub settings.**

## Investigated live state (read-only)

Ruleset `26322151` “Cohestra - Protected UAT Release”:

- Target: `refs/heads/release/uat` only. **No ruleset on `main`.**
- Enforcement: active. Bypass: empty (`current_user_can_bypass: never`).
- Required PR reviews: **0**. CODEOWNERS review: **false**. Last-push approval: false.
- Required checks (7): `.NET build and test`, `API integration tests`, `Next.js build`, `Docker stack smoke`, `Exact-SHA security scan`, `UAT isolation contract` (GitHub Actions `integration_id` 15368), `GitGuardian Security Checks` (`integration_id` 46505).
- `strict_required_status_checks_policy`: false.
- Allowed merge method: merge commit.

Repository: `allow_auto_merge: false`. No `CODEOWNERS` file.

Environments (not modified):

- `uat`: `can_admins_bypass: false`, custom branch policy, **no required reviewers**.
- `production`: required reviewer `fad16papa`, `prevent_self_review: false`.
- `adcp`: still present and retired; do not restore.

## Separation

### Control-plane changes — owner-authorized only

Includes `.github/workflows/`, `deploy/`, authorization manifests (`deploy/ad25-sync-allowlist.txt`, `deploy/ad25-owner-policy.json`, `deploy/lib/ad25_sync_allowlist.py`), GitHub App permissions, Environment protections, and release policy.

- Never eligible for unattended AD-15 auto-merge.
- Never eligible for the future PR-E feature auto-merge App.
- `auto_merge_eligible()` in the validator returns false if any changed path is control-plane.

### Approved feature changes — later PR-E candidates only

May become eligible for a **separately installed, restricted** auto-merge App after owner activation. That App is out of scope here. Eligibility still requires immutable task manifests, exact-SHA checks, independent BMAD/CAT-SEC evidence, and path classification that excludes control-plane.

## What is enforceable today (in this PR)

| Control | Enforceable now? | How |
| --- | --- | --- |
| Fail-closed 21-path set | Yes, when this module runs | `APPROVED_PATHS` + allowlist equality |
| Canonical POSIX paths, secrets, Production, ADCP, traversal, symlinks | Yes, when this module runs | `canonicalize_repo_path` / `exact_tree_errors` |
| Trusted-ref policy match | Yes, when `authorize_from_trusted_ref` runs | Extract validator + policy from `trusted_ref` |
| Exact source / dest-parent / blob equality / subset | Yes, same gate | `authorize_sync` |
| Refuse missing evidence / stale approval / unexpected parent | Yes, same gate | `authorize_sync` |
| PR-head rewrite of allowlist+validator | Yes, **if** the trusted copy is the process that decides | Demonstrated in the hardening contract |
| Block merge of a control-plane PR to `main` or `release/uat` | **No** (in-repo) | `main` has no ruleset; `release/uat` has 0 required reviews; Actions checks are produced by PR-head workflows (`integration_id` 15368) |
| Stop a PR-head workflow from skipping the validator | **No** (in-repo) | A malicious `ci.yml` / `deploy.yml` can omit the call |
| Native CODEOWNERS required review | **Not enabled**; would deadlock a single-owner author | GitHub forbids self-approval of the author’s own PR |

**Do not claim that this mutable script is independent authorization.** It is the in-repo policy copy. Authority is: owner-controlled trusted ref + (future) source-bound check from code that does not live on the PR-head.

## Source-bound required checks

GitHub Actions checks on this repository are **not** source-bound. `pull_request` and same-repo pushes execute the workflow YAML from the head commit. Required check names can be satisfied by a rewritten workflow that `echo PASS`.

GitGuardian (`46505`) is an external App and is the only current required check that is not authored by repo workflow YAML.

To make AD-25 authorization source-bound, the owner must later install **one** of:

1. **Restricted GitHub App** (recommended; this is not PR-E). Permissions: contents read, checks write. No `contents: write`, no merge, no Environment secrets. The App clones `origin/main` (or an owner-pinned SHA), runs `authorize_from_trusted_ref` from **that** blob, and posts check-run `AD25-Owner-Policy`. Ruleset adds that check as required. Control-plane path filter: App reports failure (not success) on `.github/**` and `deploy/**` for any auto-merge context.
2. **Organization required workflow** stored outside this repository, pinned to a SHA, required on `main` and `release/uat`.
3. **`pull_request_target` default-branch workflow** — rejected here. It runs trusted YAML but grants the default-branch secret context to a PR event. Too easy to leak UAT/Production secrets.

## CODEOWNERS and single-owner deadlock

Recommended advisory file (do **not** enable `require_code_owner_review` while the only owner is the PR author):

```
.github/ @fad16papa
deploy/ @fad16papa
```

If the ruleset required CODEOWNER review today, Cursor/owner-authored control-plane PRs could not merge: GitHub does not accept the author as the approving reviewer. `prevent_self_review: false` on Production Environment reviewers is a related footgun; do not copy that pattern onto `release/uat` as the sole control-plane gate.

Safe single-owner pattern:

- Keep required **reviews at 0** until a second human or a trusted App exists.
- Require the **App check** (source-bound) plus the existing seven checks.
- Owner merges control-plane PRs in the GitHub UI. Never `GITHUB_TOKEN`. Never AD-15. Never PR-E.

## Ruleset recommendations (owner setup later — not this task)

For `release/uat` (update ruleset `26322151` only after this PR is accepted):

- Keep required reviews at 0 until an App or second reviewer exists.
- Add required check `AD25-Owner-Policy` from the restricted App’s `integration_id` (not 15368).
- Set `strict_required_status_checks_policy: true` so the tip must contain the checks.
- Keep bypass empty.
- Do not enable CODEOWNER reviews.

For `main` (new ruleset, owner-created):

- Same seven checks + GitGuardian + `AD25-Owner-Policy`.
- No auto-merge.
- Control-plane path-specific rules if GitHub path filters are used: block force-push, require the App check.

## Demonstrating PR-head cannot mint authority

`authorize_from_trusted_ref` writes the trusted-ref validator to a temp file and imports that module. The hardening contract:

1. Commits a trusted tree with the hardened validator + 21-path allowlist.
2. Commits a malicious tree that replaces `authorize_sync` with `return ['src/Api/Program.cs']`.
3. Shows the PR-head copy accepts.
4. Shows the trusted-ref copy refuses.

A workflow on the malicious head that never calls `authorize_from_trusted_ref` can still print PASS. That is why the App/required-workflow is the external enforcement point.

## PR-E boundary

PR-E remains reserved for a future restricted auto-merge App for **approved feature** PRs into `release/uat`. This AD25-HARDENING work must not implement, install, or permission that App. Control-plane paths stay owner-only forever.

## Manual GitHub configuration required later

Owner actions **not performed by this agent**:

1. Merge this Draft PR to `main` only after independent BMAD + CAT-SEC and owner decision.
2. Install the restricted owner-policy App (or org required workflow). Record App id / `integration_id`.
3. Add `AD25-Owner-Policy` as a required check on `release/uat` and a new `main` ruleset.
4. Optionally add advisory CODEOWNERS without enabling required CODEOWNER review.
5. Restrict Environment `uat` deployments to `release/uat` only; keep admin bypass disabled; do not add self-reviewer-only required reviewers.
6. Keep `UAT_DEPLOY_GATE_ACTIVE=false` and `UAT_MAIN_DEPLOY_SUPPRESSED=true` until the separate canary plan is owner-authorized.
7. Do not install PR-E in this loop.

## Verdict of this design

In-repo: fail-closed path policy and trusted-ref authorization are implemented and tested.  
Out-of-repo: merge blocking and “workflow cannot skip the gate” need the owner-installed App or org workflow. Until that exists, control-plane merges stay **human OWNER only**.
