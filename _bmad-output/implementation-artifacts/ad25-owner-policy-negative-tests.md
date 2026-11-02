---
label: AD25-OWNER-AUTH
status: test-spec
prototype: _bmad-output/implementation-artifacts/cohestra-owner-policy-app/
as_of: 2026-11-02T21:40:00+08:00
---

# Fail-closed negative-case matrix

Local prototype, simulated GitHub snapshots only:

- `python3 tests/test_paths.py` — 8 tests
- `python3 tests/test_negatives.py` — 47 tests

These do **not** prove a live ruleset pin or a live check-run. N3/N4 refuse spoofable integration ids inside the snapshot contract. Live F probes must prove T7.

GitHub-live probes in the rollout plan are **owner-executed later**. This agent must not run them against production rulesets.

Every unauthorized path must yield check conclusion `failure`. `success`, `neutral`, and `skipped` are forbidden on these cases.

| ID | Case | Layer | Local test | Expected |
| --- | --- | --- | --- | --- |
| N1 | Cursor installation-token merge attempt | Ruleset + evaluator | `test_cursor_installation_token_does_not_mint_success` | Check `failure`; live probe: `gh pr merge` as IAT fails on required check |
| N2 | User-authorized token comment without HMAC | Evaluator | `test_user_authorized_token_comment_without_hmac` | `failure` / without HMAC |
| N3 | PR-head workflow check-name spoof | Evaluator + ruleset pin | `test_pr_head_workflow_check_name_spoof` | `failure` / 15368; live: job named `AD25-Owner-Policy` does not satisfy pin |
| N4 | Incorrect GitHub App `integration_id` | Evaluator + ruleset | `test_incorrect_integration_id`, `test_unpinned_integration_id`, `test_cursor_app_check_name_spoof` | `failure` |
| N5 | Missing owner attestation | Evaluator | `test_missing_attestation` | `failure` / missing owner HMAC |
| N6 | Stale owner attestation | Evaluator | `test_stale_attestation_sha` | `failure` / SHA mismatch |
| N7 | Changed PR HEAD | Evaluator | `test_changed_pr_head_invalidates_mac` | `failure` |
| N8 | Modified allowlist / Production workflow | Evaluator | `test_modified_allowlist_outside_approved_set` | `failure` / forbidden path |
| N9 | Missing dest parent | Evaluator | `test_missing_destination_parent` | `failure` |
| N10 | Stale dest parent (not ancestor) | Evaluator | `test_stale_destination_parent_not_ancestor` | `failure` |
| N11 | Unexpected control-plane paths | Evaluator | `test_unexpected_control_plane_paths` | `failure` |
| N12 | Missing check-run / App failure | Evaluator | `test_app_failure_unknown_exception_is_failure`, `test_missing_hmac_secret_fails_closed` | `failure` (never skipped) |
| N13 | Attempted Production or secret access | Evaluator | `test_production_environment_access_refused`, `test_secret_access_refused` | `failure` |
| N14 | Blob mismatch / missing evidence | Evaluator | `test_blob_mismatch`, `test_missing_blob_evidence` | `failure` |
| N15 | Secret, traversal, case, encoding | Classifier | `tests/test_paths.py` | `failure`; ordinary `src/` and `web/` still `feature` |
| N16 | HMAC expiry, edit, delete, conflict, rotation, one-nibble MAC | Evaluator | `test_expired_and_future_attestation`, `test_edited_and_deleted_attestation`, `test_conflicting_attestations_fail_closed`, `test_hmac_rotation_window`, `test_one_hex_mac_difference_fails` | `failure` |
| N17 | Replay across PR or repo | Evaluator | `test_hmac_replay_across_pull_requests`, `test_hmac_replay_across_repos` | `failure` |
| N18 | Incomplete page, timeout, truncated tree, stale event | Snapshot | `test_incomplete_timeout_truncation_and_stale_event` | `failure` / hold |
| N19 | Ruleset not strict, bypass, or unpinned | Snapshot | `test_ruleset_strict_and_bypass`, `test_unpinned_integration_id` | `failure` |
| N20 | Published check app id mismatch | Check post | `test_published_check_identity` | success body refused |
| N21 | Hand-built request or post-seal field swap | Seal | `test_hand_built_request_is_not_evidence`, `test_seal_binds_request_fields` | `failure` / unverified evidence |
| N22 | Malformed SHA | Snapshot | `test_malformed_head_sha` | `failure` |
| N23 | Rename drops the old secret name | Snapshot | `test_rename_keeps_previous_secret_path` | `failure` |
| N24 | Check body SHA differs from the evaluated HEAD | Check post | `test_published_check_identity` | post refused |

Happy paths (must remain the only `success` conclusions):

- Feature PR, no control-plane paths
- Policy expansion on `main` with valid HMAC
- Dest-sync on `release/uat` with valid HMAC, ancestor dest_parent, exact blobs

## Host mapping (when the App is later hosted)

| Host event | Must post |
| --- | --- |
| Webhook timeout / 5xx | `completed` + `failure` |
| GitHub API 403/404 while reading the PR | `failure` |
| Missing `OWNER_ATTESTATION_SECRET` | `failure` |
| Check re-request | Re-evaluate current HEAD; never copy an old `success` |
