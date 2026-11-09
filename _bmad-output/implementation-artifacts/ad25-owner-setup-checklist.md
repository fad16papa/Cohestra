# Owner-only GitHub setup checklist (do not execute in this agent)

All steps are **owner** actions in GitHub.com. This agent must not perform them.

Keep `UAT_DEPLOY_GATE_ACTIVE=false`, `UAT_MAIN_DEPLOY_SUPPRESSED=true`. Production NO-GO.

This checklist, when complete, makes `OWNER_CONTROL_READY` true for **cursor[bot] installation-token merges** and **15368 check spoofing**. It does **not** prove human presence. A fad16papa user token can still merge and attest. Record that residual; do not hide it.

## Phase 0 — stop cursor[bot] merge recurrence

- [ ] Repository → Settings → GitHub Apps → **Cursor** → permissions:
  - Repository contents: **Read-only**
  - Merge queues: **No access**
  - Actions: **Read-only** or **No access** (not write)
  - Workflows: **No access** (preferred)
  - Pull requests: remain write so Draft PRs can still be opened
- [ ] Save / accept the permission request as fad16papa.
- [ ] Confirm cursor[bot] can still open Draft PRs but **cannot** merge (contents read).
- [ ] Leave PR #542 as **Draft**. Do not mark ready until Phase 3 probes pass.
- [ ] Do not revert PR #541 in this phase.
- [ ] Do not title this phase “full authorization lock.” User PATs/OAuth are unchanged.

## Phase 1 — empty owner-policy Environment (optional, no secrets)

Only if the owner later wants GitHub.com deployment-review UI. Not required for Layer B.

- [ ] Create Environment `ad25-owner-policy`.
- [ ] Required reviewers: `fad16papa` only. `prevent_self_review=false`. `can_admins_bypass=false`.
- [ ] **Zero secrets. Zero variables.** Not `uat`. Not `production`.
- [ ] Do not add cursor[bot] as a reviewer.
- [ ] Do **not** grant the Owner-Policy App `deployments: write`.

## Phase 2 — Owner-Policy App (not PR-E, not a required workflow)

- [ ] Register GitHub App `cohestra-owner-policy` on the owner account.
- [ ] Permissions: contents **read**, pull_requests **read**, checks **write**, statuses **write**, metadata read. Nothing else. Especially not contents write, deployments, actions, secrets.
- [ ] Host the evaluator **outside** this repo. Pin its policy copy. **Do not exec git blobs as Python.**
- [ ] Check name exactly `AD25-Owner-Policy`.
- [ ] Install on `fad16papa/Cohestra` only. Record `integration_id`.
- [ ] Throwaway Draft: App posts a **failure** check on the current HEAD (satisfies GitHub’s “recently submitted a check-run”).
- [ ] Add required check `AD25-Owner-Policy` to ruleset `26322151` with `integration_id` already set (prefer one REST PATCH; no lingering “any source” window).
- [ ] Confirm live ruleset JSON: `context=AD25-Owner-Policy` and `integration_id=<Owner-Policy App>`. Abort if null / 15368 / 1210556 / 46505.
- [ ] Create a **main** ruleset: PR required, no force-push, same seven checks + GitGuardian + pinned `AD25-Owner-Policy`. Reviews stay 0.
- [ ] `strict_required_status_checks_policy: true` on both. Remember: strict ≠ pin.
- [ ] Bypass lists empty. Cursor is not a bypass actor.
- [ ] Do not add a ruleset required-workflow rule as a substitute.

## Phase 3 — probes (still no UAT)

- [ ] Control-plane probe PR: check fails without owner attestation; cursor[bot] merge attempt fails.
- [ ] Owner attestation comment on exact HEAD (`OWNER_APPROVE_CONTROL_PLANE sha=<40-hex>`): check succeeds.
- [ ] New commit: check returns to failure (stale SHA).
- [ ] PR-head `ci.yml` job named `AD25-Owner-Policy` does **not** satisfy the ruleset (15368 mismatch).
- [ ] Cursor App check-run of that name does **not** satisfy the ruleset (1210556 mismatch).
- [ ] Record probe SHAs, `integration_id`, and ruleset JSON snippet.

## Phase 4 — merge #542 (owner GitHub UI only)

- [ ] Phases 0–3 recorded with SHAs and `integration_id`.
- [ ] Owner merges https://github.com/fad16papa/Cohestra/pull/542 as **fad16papa** on GitHub.com. Never cursor[bot]. Never `GITHUB_TOKEN`.
- [ ] Verify REST `merged_by.login=fad16papa`.
- [ ] Treat that as owner-identity, not proven human presence.

## Phase 5 — policy expansion + dest sync (after #542 is on main)

See `ad25-follow-on-sync-after-541.md`. Do not merge a sync PR until Phase 2 is **pinned** on `release/uat`.

Expansion and dest-sync are **different** App verdicts. Do not 21-path-copy `ade3c828` onto `6e8388ee` without the extra hardening files or the dest CI/fixture will HOLD.

## Never in this checklist

- UAT gate true
- SSH
- Production
- PR-E install
- ADCP restore
- PR #505
- Agent-performed permission or ruleset edits
- Required workflow as the owner-policy gate
- Executing repository Python inside the App
- Claiming `login=fad16papa` is human-presence
