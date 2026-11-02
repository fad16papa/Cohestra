---
story_key: ad25-hardening-owner-control
status: review
baseline_commit: 9ccca77e7297dc28b0a843d3435e9603dc803da7
label: AD25-HARDENING
binds:
  - issue-538
  - issue-536
  - pr-541
---

# Story: AD25-HARDENING — fail-closed allowlist and owner-control design

## Story

As the Cohestra owner, I want AD-25 path authorization to be fail-closed and anchored to owner-controlled policy, so that a feature PR cannot authorize itself by rewriting the allowlist and validator, and so that control-plane merges stay owner-gated.

## Acceptance Criteria

1. Local fixtures record the baseline (`9ccca77e`) loader's actual behavior for traversal, absolute paths, secrets, Production scripts, privileged `.github` files, duplicates, malformed entries, dot segments, case/Unicode, symlinks, and PR-head self-authorization.
2. The permitted path set remains the current 21 approved AD-25 paths.
3. `load_allowlist` accepts only canonical repository-relative POSIX paths and refuses absolute paths, traversal, normalization ambiguities, duplicates, invalid characters, secrets, application trees, Production control-plane files, retired ADCP, unapproved privileged scripts, and symlink escapes.
4. Authorization requires trusted-ref policy evidence, exact source commit, destination parent, changed-path subset, and destination blob equality. Missing evidence, stale approvals, unexpected commits, and unauthorized additions are refused.
5. Executing the validator extracted from a trusted ref refuses a PR-head that rewrites the allowlist and validator together. A mutable PR-head script is not claimed as independent authorization.
6. Owner-control architecture is documented: what is enforceable in-repo today, what requires owner GitHub App/ruleset setup, and how a single-owner repository avoids deadlock. No live settings are changed.
7. Deterministic positive and negative tests cover the required cases and run without live deployment credentials. Existing AD-23 / AD-25 release/uat workflow behavior is retained.
8. This story ships as a separate Draft PR against `main`, labeled AD25-HARDENING. It is not PR-E. Do not merge, do not update `release/uat`, do not change Environments/secrets/rulesets/variables, do not deploy or SSH.

## Tasks / Subtasks

- [x] Reproduce baseline trust-boundary weakness with local fixtures
- [x] Implement fail-closed allowlist + owner-approved 21-path authority
- [x] Implement trusted-ref authorization (exact SHA, subset, blob equality)
- [x] Demonstrate PR-head self-authorization cannot create its own signal
- [x] Document owner-control enforcement design and required manual GitHub setup
- [x] Add deterministic positive/negative regression tests
- [x] Prepare follow-on AD-25 synchronization plan (do not open the sync PR)
- [x] Prepare controlled positive UAT canary plan (do not execute)
- [x] Open Draft PR vs main (keep Draft / unmerged)

## File List

- `deploy/lib/ad25_sync_allowlist.py`
- `deploy/lib/ad25_hardening_contract.py`
- `deploy/ad25-sync-allowlist.txt`
- `deploy/ad25-owner-policy.json`
- `deploy/reproduce-ad25-trust-boundary.sh`
- `deploy/validate-ad25-hardening.test.sh`
- `deploy/validate-ad25-sync-procedure.sh`
- `deploy/validate-ad25-sync-fixture.test.sh`
- `.github/workflows/ci.yml`
- `_bmad-output/implementation-artifacts/ad25-hardening-owner-control.md`
- `_bmad-output/implementation-artifacts/ad25-hardening-trust-boundary.md`
- `_bmad-output/implementation-artifacts/ad25-owner-control-enforcement-design.md`
- `_bmad-output/implementation-artifacts/ad25-hardening-follow-on-sync-plan.md`
- `_bmad-output/implementation-artifacts/ad25-hardening-uat-canary-plan.md`

## Dev Agent Record

Implementation Plan: Keep the 21-path exclusive tree. Put fail-closed validation and `authorize_from_trusted_ref` in the existing validator. Treat `origin/main` / owner-pinned SHA as the in-repo trusted policy source. Document that only an external GitHub App or default-branch-bound required workflow can stop a PR-head wrapper from skipping those checks. No ruleset, Environment, or `release/uat` mutation in this story.

## Change Log

- 2026-11-02 (Asia/Singapore): AD25-HARDENING fail-closed allowlist, trusted-ref authorization, owner-control design, local reproduction, and canary/sync plans. Draft PR only.
- 2026-11-02 (Asia/Singapore): Review fixes — fixture calls `authorize_from_trusted_ref` against owner-pinned `9ccca77e` (never PR-head); hardening contract is mandatory HOLD; fail-closed auto-merge classifier; case-insensitive secrets; whitespace refuse; dest-not-descendant and changed-manifest tests.
