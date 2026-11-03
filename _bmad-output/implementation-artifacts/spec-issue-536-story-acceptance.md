---
title: 'Issue 536 trusted story acceptance'
type: 'feature'
created: '2026-11-03'
status: 'in-progress'
baseline_commit: 'd29a51dde67a72b4c3d7553314ac00f0cb3f70a5'
context:
  - '{project-root}/_bmad/custom/mandatory-code-review-loop.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-issue-536-correction-controller.md'
---

## Intent

**Problem:** The simulated correction controller can reach READY from engineering gates while a story requirement is unverified, and its content digest is not an owner signature.

**Approach:** Add a version-2 manifest. Verify an owner Ed25519 signature with a host public key. Require versioned story requirements, a baseline check floor, and host-supplied execution budgets. Keep version 1 behavior, and keep every live flag false.

Workflows used for this change: `bmad-architecture`, `bmad-testarch-atdd`, `bmad-quick-dev`, `bmad-testarch-test-design`, and `bmad-code-review` (Blind Hunter `bmad-review-adversarial-general`, Edge Case Hunter `bmad-review-edge-case-hunter`, Acceptance Auditor). CAT-SEC is the Cursor `security-review` subagent. Reviewer model: `grok-4.7-high-fast`.

## Boundaries & Constraints

**Always:** The private key stays outside Cursor, GitHub Actions, and the repository. The controller does not sign. A digest is not authorization. Unknown usage is not zero. A story may add checks and may not remove `tdd`, `regression`, `integration`, `gitguardian`, or `security`. READY requires every mandatory requirement plus the existing engineering gates. Version 1 `owner_manifest_authorized` stays false.

**Ask First:** Live GitHub transport, live Cursor dispatch, a production key ceremony, a live usage meter, ruleset changes, UAT, or Production.

**Never:** Autonomous merge, GitHub App installation, UAT deploy, SSH, Production changes, ADCP restoration, or edits to pull requests 542, 543, 544, or 505. Do not claim the live autonomous loop is operational.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Requirement fails on a signed story | Trusted fail, usage under budget | One simulated assignment | Owner flag true only because verify succeeded |
| Tests pass, one requirement unverified | New head, green checks and reviews | Not READY | No second assignment |
| Remaining requirement verified | New trusted evidence, all gates | READY_FOR_OWNER_MERGE_DECISION | SIMULATED_PASS, live flags false |
| Forged event or untrusted evidence | Text or source other than host-verified | Not READY | No assignment from the forgery |
| Missing tests, wrong head, altered manifest, bad signature, unknown key | As labeled | Not READY | Authorization failure sticks |
| Omitted security check | Version 2 without security | Manifest rejected | Baseline floor |
| Unknown or exhausted usage | Null counter, or over a maximum | HOLD | Null is not zero; live usage stays false |

## Code Map

- `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/authorization.py` — public-key verify
- `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/manifest.py` — version 2 contract
- `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/controller.py` — gates and ledger trace
- `_bmad-output/implementation-artifacts/cohestra-correction-controller/tests/test_story_acceptance.py` — demonstration and negatives

## Tasks & Acceptance

**Execution:**
- [x] Version 2 verifier, requirements, baseline checks, and budgets
- [x] Story demonstration and negative tests
- [x] Version 1 tests still green
- [ ] Draft PR CI and native GitGuardian on the exact HEAD

**Acceptance Criteria:**
- Given a signed story whose registration requirement fails, when the controller handles that head, then it records one simulated correction and does not dispatch Cursor.
- Given the next head whose tests pass and whose notification requirement is unverified, when checks and both reviews pass, then READY is refused.
- Given a later head where every mandatory requirement, baseline check, test, and both reviews pass, when usage is known and under budget, then the decision is READY_FOR_OWNER_MERGE_DECISION, `owner_manifest_authorized` is true, and `live_usage_verified` is false.
- Given a forged result, a missing test, an altered manifest, a wrong head, an omitted security check, an invalid signature, or an unknown usage counter, when evaluated, then the decision is not READY.

## Spec Change Log

- 2026-11-03: Story-acceptance follow-on approved as a separate draft stacked on the unmerged correction-controller PR. Live transport and live dispatch stay unauthorized.
