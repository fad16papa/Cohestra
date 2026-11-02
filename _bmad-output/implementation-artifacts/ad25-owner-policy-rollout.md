---
label: AD25-OWNER-AUTH
status: rollout
do_not_execute: true
authority: issue-538
as_of: 2026-11-02T20:50:00+08:00
---

# Owner-only staged rollout (do not execute in this agent)

Keep `UAT_DEPLOY_GATE_ACTIVE=false`, `UAT_MAIN_DEPLOY_SUPPRESSED=true`. Production NO-GO. No PR-E.

Current SHAs to re-read before every stage: `origin/main` `9ccca77e…`, `origin/release/uat` `6e8388ee…`, PR #542 `ade3c828…`.

## A. Feasible Cursor permission containment

**Recommended (keeps Cloud Agents):** leave Cursor installed. Do not hunt for a contents:read dropdown (it does not exist). Do not add a Contents:write PAT as `GH_TOKEN`.

**Optional (stops `cursor[bot]` on this repo, breaks Cloud Agents on Cohestra):** Settings → Applications → Installed GitHub Apps → Cursor → Configure → remove Cohestra from repository access. Optionally Revoke Authorized GitHub Apps.

Do not suspend “to try it” if other repos on the same installation need Cloud Agents.

## B. Independent App implementation and external hosting

1. Copy `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/` to a **new private repo** (proposal `fad16papa/cohestra-owner-policy`).
2. Add a webhook host. Env: GitHub App id, private key, webhook secret, `OWNER_ATTESTATION_SECRET`.
3. Never store those values in Cohestra Actions secrets or Cursor Cloud secrets.
4. Run `python3 tests/test_negatives.py` in that repo on every App change.

## C. Installation with verified least-privilege permissions

Register `cohestra-owner-policy` (private App).

| Permission | Access |
| --- | --- |
| contents | read |
| pull_requests | read |
| metadata | read |
| checks | write |
| statuses | write |
| everything else | none |

Install on `fad16papa/Cohestra` only. Record `integration_id`. Confirm the installation JSON has no `contents: write`.

## D. Source-pinned required check on `release/uat`

1. App posts a `failure` check named `AD25-Owner-Policy` on a throwaway Draft.
2. PATCH ruleset `26322151` so the **existing** seven checks remain and `AD25-Owner-Policy` is appended with `integration_id` already set. Do not replace the array.
3. Set `strict_required_status_checks_policy: true`. Confirm `bypass_actors` empty after the PATCH.
4. Confirm live JSON. Abort if `integration_id` is null, 15368, 1210556, or 46505.
5. Keep required reviews at 0. Do not enable CODEOWNERS.
6. A green `AD25-Owner-Policy` after A–F is a **probe receipt** for T1/T7 at that SHA/etag, not a durable `OWNER_CONTROL_READY` stamp. Residual: HMAC paste, user-token merge after green, App private-key theft, owner-token ruleset unpin.

## E. New protected `main` ruleset

Same pin. `pull_request` required. `non_fast_forward`. `deletion`. Bypass empty. Cursor is not a bypass actor. Reviews 0.

## F. Unauthorized-merge and check-spoof negative probes

Throwaway PRs (not #542/#543):

1. Control-plane Draft → ready; HMAC absent; check stays `failure`; `gh pr merge` fails.
2. PR-head job named `AD25-Owner-Policy` does not satisfy the ruleset.
3. Valid HMAC on exact HEAD → check `success`; new commit → `failure`.
4. Record SHAs and ruleset JSON.

## G. Controlled owner merge of PR #542

Only after A–F. Owner mints HMAC on a machine Cursor does not control. Posts the comment on GitHub.com. Merges as `fad16papa` in the GitHub UI. Verify `merged_by.login=fad16papa`. Treat as owner-identity, not human-presence.

## H. Owner-approved hardening policy expansion and follow-on sync

1. Expansion PR to `main` adding the four extra hardening files. Verdict `policy_expansion`. HMAC. Owner merge.
2. Update App-bundled `expansion_paths` / `sync_approved_paths` if the path set changed, **in the App repo**, then dest-sync.
3. Dest-sync PR onto then-current `origin/release/uat` (today `6e8388ee`, re-read). Verdict `dest_sync`. Exact blobs. HMAC. Owner merge.
4. Do not 21-path-only copy `ade3c828` onto `6e8388ee`.

## I. Separate UAT canary authorization

Unrelated to Layer B. Gate stays false. Canary is a later owner checklist. No SSH from this plan. Production remains NO-GO.

## Abort (any one)

Cursor omitted from Cohestra **and** Cloud Agents still expected to push; Owner-Policy App `contents:write`; unpinned check; required workflow used as the gate; HMAC secret in Cursor/Cohestra; UAT gate true; Production change; merge of #542 before F probes; PR-E installed as this App.
