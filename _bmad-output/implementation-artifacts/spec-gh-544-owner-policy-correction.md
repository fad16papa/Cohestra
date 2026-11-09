---
title: 'Correct Owner-Policy prototype trust boundaries'
type: 'bugfix'
created: '2026-11-02'
status: 'in-progress'
baseline_commit: 'e1db6e50e96f69eb10611945c915388b57700cc8'
context:
  - '{project-root}/_bmad/custom/mandatory-code-review-loop.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-ad25-owner-policy-2026-11-02/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `_classify()` returns `feature` success for secret-like paths when the PR has no control-plane files, and `evaluate()` trusts caller-supplied SHAs, blob maps, and integration ids.

**Approach:** Canonicalize paths and refuse secrets on every PR. Build evaluation requests only from a GitHub-shaped snapshot verifier. Bind HMAC to repo, PR, base, HEAD, and expiry. Keep the prototype offline.

## Boundaries & Constraints

**Always:** Fail closed to `failure`/`hold`. Allow ordinary `src/` and `web/` code. Refuse secrets, traversal, and ambiguous paths. Never return neutral or skipped. Never log the HMAC secret. State that unit tests simulate GitHub, they do not prove a live pin. Do not set `OWNER_CONTROL_READY`.

**Ask First:** Installing the App, changing rulesets, merging, or touching UAT/Production.

**Never:** Live GitHub writes, Cursor permission changes, PR-E, executing git blobs, putting the HMAC secret in the repo, workflows, or CI logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Feature code | `src/Api/Program.cs`, `web/package.json` | success `feature` | N/A |
| Secret only | `.env`, `src/.env.local`, `web/id_rsa` | failure | secret-like path |
| Traversal | `src/../.env`, `%2e%2e/.env` | failure | traversal or secret |
| Case trick | `src/.ENV`, `WEB/id_RSA` | failure | secret-like path |
| Control-plane | approved path + valid HMAC | success `policy_expansion` or `dest_sync` | N/A |
| Caller request | `EvaluationRequest` built outside the verifier | failure | unverified evidence |
| Stale/edited HMAC | wrong SHA, expired ts, edited comment, conflicting comments | failure | attestation error |
| Bad ruleset | pin missing, 15368, bypass, not strict, truncated files, timeout | failure | hold |

</frozen-after-approval>

## Code Map

- `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/owner_policy/evaluate.py` -- classify and seal
- `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/owner_policy/paths.py` -- canonical paths and secret filenames
- `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/owner_policy/evidence.py` -- snapshot verifier
- `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/owner_policy/attestation.py` -- HMAC v2
- `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/tests/test_negatives.py` -- retained cases
- `_bmad-output/implementation-artifacts/cohestra-owner-policy-app/tests/test_paths.py` -- red-first secret regressions

## Tasks & Acceptance

**Execution:**
- [x] `tests/test_paths.py` -- failing tests for `.env`, nested env, keys, traversal, case, normalization -- prove the defect
- [x] `owner_policy/paths.py` -- canonicalize and classify secrets vs ordinary `src/`/`web/`
- [x] `owner_policy/evidence.py` -- only sealed requests from a snapshot; ruleset pin, merge-base, pagination, timeout
- [x] `owner_policy/attestation.py` -- ts, expiry, edits, conflicts, rotation, compare_digest
- [x] `tests/test_negatives.py` -- keep prior guarantees on the verifier path
- [x] Review docs -- simulated vs live guarantees; HMAC is not human presence

**Acceptance Criteria:**
- Given only `.env` on `main`, when evaluated, then conclusion is failure.
- Given `src/Api/Program.cs`, when evaluated, then conclusion is success feature.
- Given a hand-built `EvaluationRequest`, when evaluated, then conclusion is failure.
- Given compare merge-base unequal to PR base SHA, when dest-sync is evaluated, then conclusion is failure.

## Spec Change Log

- 2026-11-02: Activating message is the approval for this autonomous correction. Step-02 checkpoint is not re-asked. Scope stays inside PR #544.
- 2026-11-02: Red run of `tests/test_paths.py` on e1db6e50 failed 6 of 7. `.env` classified as feature success. Green run classifies those paths as failure and keeps ordinary `src/` and `web/` as feature success.

## Design Notes

Secret match is filename-shaped (`.env`, `.env.*`, `id_rsa`, `*.pem`, `*.key`), not the substring `secret`, so `src/SecretRotation.cs` stays ordinary code.

Ancestry is `compare_merge_base_sha == pulls_api_base_sha` inside the verifier. The evaluator does not accept a free merge-base argument.

## Verification

**Commands:**
- `python3 tests/test_paths.py` -- expected: FAIL before the path fix, PASS after
- `python3 tests/test_negatives.py` -- expected: PASS on the corrected HEAD
