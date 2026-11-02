# Issue 536 follow-on requirements

These items are outside the simulated controller. This build does not implement them. A later change needs its own owner approval. Do not treat a simulated READY decision as evidence that any item below is done.

## Owner-controlled manifest trust root

The controller digest is SHA-256 of the canonical manifest body. `Manifest.from_dict` rejects a caller-supplied digest as an unknown field and computes the digest from the accepted fields. `assert_manifest_authentic` compares that recomputation with the stored digest. `Decision.owner_manifest_authorized` is literal false on every decision, including `READY_FOR_OWNER_MERGE_DECISION`.

A future trust root must verify a signature over that same canonical body. The verifying key must be an owner-controlled key that this controller does not mint, store, or substitute. The content digest remains an integrity check for the store binding. A matching digest must not, by itself, set `owner_manifest_authorized`.

## Live reviewer authentication

`Review.authenticated` and `Review.authentication_source` are fields on the host-supplied port object. Event text is not parsed into them. READY requires `authenticated is True` and `authentication_source == "host-verified"`. Any other source, including `payload`, is unauthenticated.

A future live adapter must set those two fields only after it has verified the reviewer's GitHub identity for that exact head. It must not copy `authenticated`, `authentication_source`, or `role` from webhook JSON, comment bodies, or pull-request JSON. This package has no live adapter. `LIVE_READ_ONLY_TRANSPORT_VERIFIED` and `LIVE_SCOPED_LOOP_VERIFIED` stay false.

## Execution budgets beyond assignment count

`budget` accepts only `max_corrections`, an integer from 1 to 5. Unknown keys, including `elapsed_seconds`, `token_budget`, and `cost`, are rejected. The counter limits how many simulated assignments may be recorded. A head that already meets every gate can still become READY after that cap.

Elapsed time, token consumption, and cost are not measured and are not enforced. `max_corrections` does not satisfy those budgets. A later implementation must add them as separate owner-approved limits. It must not redefine the assignment cap as a time, token, or cost ceiling.

## Requirement map

| Issue 536 requirement | Where it is enforced | Status |
| --- | --- | --- |
| Immutable manifest: task, paths, base SHA, acceptance criteria, model, review requirements, assignment budget | `Manifest.from_dict`; manifest tests | Implemented for the simulated controller |
| Owner authorization of that manifest | `owner_manifest_authorized` is always false | Deferred. Content digest is not a signature |
| Durable per-PR state, restart, idempotency, concurrency, stale-event rejection | Ledger, flock, duplicate-event, restart, and stale-SHA tests | Implemented |
| Classify failed tests, security findings, review findings, missing evidence | `_decide` and the negative tests | Implemented |
| Bounded simulated correction on a retryable in-scope failure | Demo loop. `dispatcher` is `simulated` and `live_dispatch` is false | Implemented |
| Changed commit before re-evaluation | New-commit tests, including restart with a new event id | Implemented |
| Exact-head checks, including skipped, cancelled, missing, failed, and stale | Check tests | Implemented as classification. Live GitHub evidence is deferred |
| Trustworthy fresh independent BMAD and CAT-SEC | Host policy, `host-verified`, two roles, model pin | Simulated host evidence only. Live identity verification is deferred |
| Repeat until gates pass; refuse missing, skipped, stale, canceled, or failed mandatory evidence | READY only when every gate passes. Failed checks assign and still cannot READY | Implemented |
| Elapsed time, token consumption, and cost budgets | Unknown budget keys are rejected | Deferred. `max_corrections` is not those budgets |
| Escalate on no progress, exhausted assignment cap, scope drift, missing credentials, secret material | Negative tests. Scope, secret, and live-port holds stick | Implemented |
| Never equate a passing simulation with a live integration | `SIMULATED_PASS` versus both live flags, always false | Implemented. Live planes remain deferred |
