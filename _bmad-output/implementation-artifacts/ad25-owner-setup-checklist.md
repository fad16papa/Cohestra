# Owner-only GitHub setup checklist (do not execute in this agent)

All steps are **owner** actions in GitHub.com. This agent must not perform them.

Keep `UAT_DEPLOY_GATE_ACTIVE=false`, `UAT_MAIN_DEPLOY_SUPPRESSED=true`. Production NO-GO.

## Phase 0 — stop recurrence (authorization lock)

- [ ] Repository → Settings → GitHub Apps → **Cursor** → permissions: set **Repository contents** to **Read-only**. Save / accept the permission request as fad16papa.
- [ ] Confirm cursor[bot] can still open Draft PRs (pull_requests write) but **cannot** merge (contents read).
- [ ] Leave PR #542 as **Draft**. Do not mark ready until Phase 2 probes pass.
- [ ] Do not revert PR #541 in this phase.

## Phase 1 — empty owner-policy Environment (no secrets)

- [ ] Create Environment `ad25-owner-policy`.
- [ ] Required reviewers: `fad16papa` only. `prevent_self_review=false`. `can_admins_bypass=false`.
- [ ] **Zero secrets. Zero variables.** Not `uat`. Not `production`.
- [ ] Do not add cursor[bot] as a reviewer.

## Phase 2 — Owner-Policy App (not PR-E)

- [ ] Register GitHub App `cohestra-owner-policy` on the owner account.
- [ ] Permissions: contents **read**, pull_requests **read**, checks **write**, metadata read. Nothing else.
- [ ] Host the evaluator **outside** this repo. Pin its policy copy.
- [ ] Check name exactly `AD25-Owner-Policy`.
- [ ] Install on `fad16papa/Cohestra` only. Record `integration_id`.
- [ ] Add required check `AD25-Owner-Policy` (that `integration_id`) to ruleset `26322151`.
- [ ] Create a **main** ruleset: PR required, no force-push, same checks + `AD25-Owner-Policy`. Reviews stay 0.
- [ ] `strict_required_status_checks_policy: true` on both.
- [ ] Bypass lists empty. Cursor is not a bypass actor.

## Phase 3 — probes (still no UAT)

- [ ] Control-plane probe PR: check fails without owner attestation; cursor[bot] merge attempt fails.
- [ ] Owner attestation on exact HEAD: check succeeds.
- [ ] New commit: check returns to failure (stale SHA).
- [ ] PR-head `ci.yml` rewrite does not create an `AD25-Owner-Policy` success from integration 15368.

## Phase 4 — merge #542 (owner GitHub UI only)

- [ ] Phases 0–3 recorded with SHAs and `integration_id`.
- [ ] Owner merges https://github.com/fad16papa/Cohestra/pull/542 as **fad16papa** on GitHub.com. Never cursor[bot]. Never `GITHUB_TOKEN`.
- [ ] Verify `mergedBy.login=fad16papa`.

## Phase 5 — policy expansion + dest sync (after #542 is on main)

See `ad25-follow-on-sync-after-541.md`. Do not merge a sync PR until Phase 2 is live on `release/uat`.

## Never in this checklist

- UAT gate true
- SSH
- Production
- PR-E install
- ADCP restore
- PR #505
- Agent-performed permission or ruleset edits
