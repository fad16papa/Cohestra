# Permanent autonomous engineering workflow

This is the engineering execution contract for owner-approved Cohestra stories. It is not ADCP. The retired ADCP system stays retired.

The Product Owner and ChatGPT finalize requirements, architecture, security, UI/UX, and acceptance criteria, then send one execution prompt. Cursor Cloud and the installed BMAD workflows run the engineering cycle. Ordinary test and review failures are corrected inside the approved scope. The loop stops for verified acceptance, an exhausted budget, a missing dependency, or an owner-authorization boundary.

## Cycle

Approved story, architecture validation, implementation, TDD, regression, integration, security, BMAD review, CAT-SEC, automatic correction, repeat until pass or hold, draft PR, eligible merge, post-merge validation, UAT, final report.

Eligible merge and UAT are not active. `correction/release_gate.py` keeps both closed. `UAT_DEPLOY_GATE_ACTIVE` is false. `UAT_MAIN_DEPLOY_SUPPRESSED` is true. Production is NO-GO.

## Who does what

The owner authorizes privileged changes and release-control transitions. Cursor Cloud implements, tests, reviews, and corrects inside the prompt. BMAD validates architecture and reviews the diff through `bmad-architecture`, `bmad-quick-dev`, `bmad-testarch-atdd`, `bmad-testarch-test-design`, and `bmad-code-review` (Blind Hunter `bmad-review-adversarial-general`, Edge Case Hunter `bmad-review-edge-case-hunter`, Acceptance Auditor). CAT-SEC is the Cursor `security-review` subagent. The reviewer model for this program is `grok-4.7-high-fast`.

The durable controller is the manifest-gated ledger under `_bmad-output/implementation-artifacts/cohestra-correction-controller/`. It is not a single agent session. Restart tests reload the ledger and return the stored decision without a second assignment. The simulated dispatcher reloads receipts the same way.

## Evidence rules

The manifest content hash is not owner authorization. Version 2 sets `owner_manifest_authorized` only after Ed25519 verify of a host public key. The private key stays outside Cursor, GitHub Actions, and the repository.

A decision is an engineering pass only when every applicable requirement, test, check, and independent review matches the current HEAD. Skipped required checks and zero tests are not a pass. Reviews on an earlier HEAD are stale. An implementation agent cannot authenticate its own review. Pull-request comments cannot change scope.

Missing usage is unknown, not zero. Budgets come from the owner-authorized manifest. Exhausted budgets hold.

GitHub `github.sha` on a pull request is the synthetic merge commit. It is not the source HEAD. A GitGuardian API scan that did not run, including the pull-request skip in `ci.yml`, is not an executed pass. Native GitGuardian is a separate check.

## Live boundaries

| Capability | This program |
| --- | --- |
| Simulated controller | Implemented and tested |
| Owner manifest authorized | True only for a verified version-2 test or owner signature. A unit-test key is not the production key |
| Live read-only transport | Hold. `correction/github_readonly.py` parses recorded envelopes and refuses HTTP |
| Live scoped Cursor loop | Hold. `correction/cursor_dispatch.py` records simulated receipts and refuses the provider |
| Independent review | Required on the exact implementation HEAD. A GitHub comment is not that review |
| Owner control ready | False until the production public key is supplied outside this repository |
| Automerge ready | False. `merge_feature` raises |
| UAT deployment ready | False. `deploy_uat` raises |
| Production ready | False |

These flags are independent. A simulated READY decision does not set any live flag.

## Resume

The ledger file is the execution record. A new process loads it, rejects a foreign manifest, and replays an applied event id without calling the port again. The simulated dispatcher accepts a saved receipt list and will not send that assignment again. That is the resume proof. It is not a live provider callback.

## What still needs the owner

A production signing key, a live read-only grant, a live Cursor pilot grant, verified owner-policy enforcement, and a separate release-control authorization before any merge or UAT activation. This document does not grant those.
