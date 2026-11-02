# Cohestra Owner-Policy App — reference prototype

**Not installed. Not wired to Cohestra CI. Not PR-E.**

This directory is a reviewable snapshot of the evaluator that a future GitHub App
`cohestra-owner-policy` must run. Production runtime, private key, webhook
secret, and `OWNER_ATTESTATION_SECRET` must live in a **separate private
repository** the owner controls (proposal: `fad16papa/cohestra-owner-policy`).

Cohestra workflows (`integration_id` 15368) must never import this package as
an authorization root.

## What this prototype proves locally

```bash
python3 tests/test_negatives.py
```

27 tests (happy paths plus fail-closed negatives). The evaluator returns only
`success` or `failure`. It never returns `neutral` or `skipped`.

## What this prototype does not do

- Install a GitHub App
- Call the GitHub API
- Hold UAT/Production secrets
- Execute Python from a git blob
- Merge pull requests
- Implement PR-E

## Owner HMAC (out-of-band)

On a machine Cursor does not control:

```bash
export OWNER_ATTESTATION_SECRET='…'   # never in Cohestra or Cursor secrets
python3 -m owner_policy.mac --repo fad16papa/Cohestra --pr 542 --base release/uat --sha <40-hex>
```

Paste the printed line as a GitHub.com issue comment. Do not paste the secret
or the MAC into a Cursor chat.

## Hosting sketch (owner later)

1. Copy this directory into a private repo.
2. Register GitHub App `cohestra-owner-policy` (private).
3. Permissions: contents read, pull_requests read, checks write, statuses write.
4. Host a small HTTPS service (Fly.io / Cloud Run / a $5 VM). Env: App id,
   private key, webhook secret, `OWNER_ATTESTATION_SECRET`.
5. Subscribe: `pull_request`, `issue_comment`, `check_suite`, `check_run`.
6. On each event: build `EvaluationRequest` from GitHub API **reads**, call
   `evaluate()`, `POST /check-runs` with name `AD25-Owner-Policy`.
7. Pin that App's `integration_id` on ruleset `26322151` and a new main ruleset.
