---
title: 'Issue 536 correction controller'
type: 'feature'
created: '2026-11-02'
status: 'in-progress'
baseline_commit: '9ccca77e7297dc28b0a843d3435e9603dc803da7'
context:
  - '{project-root}/_bmad/custom/mandatory-code-review-loop.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Approved Cohestra stories stop between a failed test or review and the next correction because a person has to paste findings back into Cursor.

**Approach:** Add a manifest-gated controller that stores per-PR state, classifies failures, and records a simulated Cursor correction only when a new commit is required. It never merges, deploys, or claims a live agent run.

## Boundaries & Constraints

**Always:** Start from an immutable owner manifest. Reject PR 505. Reject skipped, missing, stale, canceled, or failed mandatory evidence. Require a new HEAD after a correction before READY. Keep simulation distinct from live verification.

**Ask First:** Installing credentials, changing rulesets, merging, enabling UAT, or pointing the controller at a live Cursor API.

**Never:** Autonomous merge, ADCP restoration, Production changes, copying untrusted comment text into an assignment, or setting LIVE_SCOPED_LOOP_VERIFIED in this build.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Failing in-scope test | New head, budget left | One simulated assignment | Duplicate event does not assign again |
| Review major on the next head | Fresh CI, trusted reviewer | Second assignment | Same fingerprint again holds |
| All gates on a newer head | Tests, CI, GitGuardian, two reviewers | READY_FOR_OWNER_MERGE_DECISION | verification_plane SIMULATED_PASS |
| Forged or author review | Unauthenticated or author id | Not ready | HOLD forged or ignored as approval |
| Same SHA after assignment | Success payload for the old head | Not ready | Reason requires a new commit |
| Budget, API error, PR 505, secret, scope drift | As labeled | HOLD_OWNER_ACTION_REQUIRED | No live dispatch |

</frozen-after-approval>

## Code Map

- `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/controller.py` — ledger and transitions
- `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/manifest.py` — immutable manifest
- `_bmad-output/implementation-artifacts/cohestra-correction-controller/tests/test_demo_loop.py` — end-to-end mock
- `_bmad-output/implementation-artifacts/cohestra-correction-controller/tests/test_negatives.py` — fail-closed cases

## Tasks & Acceptance

**Execution:**
- [x] Manifest, ledger, classifier, and controller
- [x] Demo loop reaches READY only after two corrections and a new head
- [x] Negative tests for the matrix above
- [x] Local unit tests green
- [ ] Draft PR CI and native GitGuardian on the exact HEAD

**Acceptance Criteria:**
- Given a failing in-scope test, when the controller handles it, then it records one simulated correction and does not record a second for the same event.
- Given a later head that still has a review finding, when CI for that head succeeded, then it records another correction.
- Given a newer head whose tests, required checks, and two trusted reviews pass, when it is not a head already assigned, then the decision is READY_FOR_OWNER_MERGE_DECISION and live_scoped_loop_verified is false.
- Given PR 505, a forged reviewer, a skipped check, or an exhausted budget, when evaluated, then the decision is not READY.

## Spec Change Log

- 2026-11-02: Issue #536 and the activating message approve this draft implementation. Live Cursor dispatch stays unauthorized.
- 2026-11-02: Controller, demo, and negative tests landed under `cohestra-correction-controller`. CI on the draft PR is still open.
- 2026-11-02: Review correction. Failed checks stay retryable and still cannot become READY. A foreign pull cannot sticky-hold the ledger. Secret patterns include GitHub app tokens and temporary AWS keys. Empty diffs, out-of-scope green tests, and pathless pass reviews cannot READY.
- 2026-11-02: Gap review. The manifest digest is a content hash, not owner authorization. `owner_manifest_authorized` stays false. Reviewer `authentication_source` must be `host-verified`. Elapsed time, token consumption, and cost are rejected unknown budget keys and remain follow-on requirements. The CI checkbox stays open until the exact final HEAD is green.
- 2026-11-02: Second gap pass. Manifest binding is rechecked on every locked handle. A secret padded past the size cap still sticks. A file allow entry is not a directory prefix. A symlink store is refused. Replay of a non-integer assignment count holds and does not rewrite the ledger.
