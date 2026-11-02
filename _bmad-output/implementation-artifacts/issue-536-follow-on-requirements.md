# Issue 536 follow-on requirements

The story-acceptance controller verifies an owner signature, story requirements, a baseline check floor, and host-supplied execution budgets inside the simulated loop. It does not make the live autonomous loop operational. A simulated READY decision is not evidence that a live item below is done.

## Implemented in the simulated controller

Version 2 `owner_manifest_authorized` is true only when `verify_owner_authorization` accepts an Ed25519 signature over the canonical story body. The signed body binds repository, task, pull number, base SHA, base ref, allowed paths, model, required checks, manifest version, requirements, and budgets. The controller does not sign. A matching content digest does not authorize. Version 1 decisions stay false, which preserves the parent controller contract.

Mandatory requirements record a stable id, expected behavior, evidence name and kind, exact head SHA, result, and independent source (`bmad` or `catsec`, `authentication_source` exactly `host-verified`). READY is refused when any mandatory requirement is missing, unverified, stale, mismatched, or failed. A trusted failure on the current head is a simulated correction. Event text cannot verify a requirement.

`BASELINE_CHECKS` are `tdd`, `regression`, `integration`, `gitguardian`, and `security`. A manifest may add a check. Removing one is rejected at parse. A successful check row is not owner authorization, and pull-request workflow output is not a substitute for the signature.

Version 2 budgets are `max_corrections`, `max_elapsed_seconds`, `max_tokens`, `max_cost_cents`, `max_no_progress`, and `max_repeated_failures`. Unknown usage is a hold named unknown. It is not coerced to zero. Exhausting time, tokens, or cost holds without sticking. `live_usage_verified` stays false.

## Still outside this build

## Production owner key

The private key must be created and held by the owner outside Cursor, GitHub Actions, and the Cohestra repository. This package accepts only a host-supplied 32-byte public key. Keys generated in unit tests are fixtures. They do not authorize a production story. `OWNER_CONTROL` for a real owner key remains unverified until that public key is supplied out of band and the signature verifies.

## Live reviewer authentication

`Review.authenticated` and `Review.authentication_source` are fields on the host-supplied port object. Event text is not parsed into them. READY requires `authenticated is True` and `authentication_source == "host-verified"`. Any other source, including `payload`, is unauthenticated.

A future live adapter must set those two fields only after it has verified the reviewer's GitHub identity for that exact head. It must not copy `authenticated`, `authentication_source`, or `role` from webhook JSON, comment bodies, or pull-request JSON. This package has no live adapter. `LIVE_READ_ONLY_TRANSPORT_VERIFIED` and `LIVE_SCOPED_LOOP_VERIFIED` stay false.

## Live usage meter

A future trusted integration supplies usage like this:

1. An owner-operated meter, outside this repository, attests elapsed seconds, token count, and cost in cents for one exact commit SHA.
2. The host checks that attestation, then copies the three integers onto `UsageEvidence`.
3. The host sets `authentication_source` to `host-verified` only after that check. A missing counter stays null.
4. The controller already treats null, a non-integer, a wrong head, and any other source as unknown, and it does not coerce unknown to zero.

This package does not call a meter. Tests that pass integers exercise the gate only. `usage_gate` `host_supplied` is not live verification, and `live_usage_verified` is not set from those tests.

## Requirement map

| Issue 536 requirement | Where it is enforced | Status |
| --- | --- | --- |
| Immutable manifest: task, paths, base SHA, acceptance criteria, model, review requirements, assignment budget | `Manifest.from_dict`; version 1 tests | Implemented for the simulated controller |
| Owner authorization of that manifest | `correction/authorization.py` Ed25519 verify | Implemented for a host public key. Production key custody is deferred |
| Story requirements with exact-head evidence | Version 2 requirements and `tests/test_story_acceptance.py` | Implemented in simulation |
| Baseline CI and security floor | `BASELINE_CHECKS` | Implemented. Live GitHub evidence is deferred |
| Durable per-PR state, restart, idempotency, concurrency, stale-event rejection | Ledger, flock, duplicate-event, restart, and stale-SHA tests | Implemented |
| Classify failed tests, security findings, review findings, missing evidence | `_decide` and the negative tests | Implemented |
| Bounded simulated correction on a retryable in-scope failure | Demo loop. `dispatcher` is `simulated` and `live_dispatch` is false | Implemented |
| Changed commit before re-evaluation | New-commit tests, including restart with a new event id | Implemented |
| Exact-head checks, including skipped, cancelled, missing, failed, and stale | Check tests | Implemented as classification. Live GitHub evidence is deferred |
| Trustworthy fresh independent BMAD and CAT-SEC | Host policy, `host-verified`, two roles, model pin | Simulated host evidence only. Live identity verification is deferred |
| Repeat until gates pass; refuse missing, skipped, stale, canceled, or failed mandatory evidence | READY only when every gate passes | Implemented |
| Elapsed time, token consumption, cost, no-progress, and repeated-failure budgets | Version 2 usage gate | Implemented for host-supplied numbers. Live metering is deferred |
| Escalate on no progress, exhausted assignment cap, scope drift, missing credentials, secret material | Negative tests | Implemented |
| Never equate a passing simulation with a live integration | `SIMULATED_PASS` versus both live flags and `live_usage_verified`, always false for the live flags | Implemented. Live planes remain deferred |
