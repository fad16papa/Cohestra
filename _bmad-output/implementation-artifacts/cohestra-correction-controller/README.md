# Cohestra correction controller (Issue 536)

Manifest-gated ledger for approved development corrections. This package records **simulated** Cursor assignments. It does not call Cursor, merge a pull request, deploy, or change UAT flags.

`UAT_DEPLOY_GATE_ACTIVE` stays false. `UAT_MAIN_DEPLOY_SUPPRESSED` stays true. Production is NO-GO.

## What a passing run means

| Plane | This build |
| --- | --- |
| `SIMULATED_PASS` | A mocked GitHub port satisfied every manifest gate on a head that was not itself a correction assignment. |
| `LIVE_READ_ONLY_TRANSPORT_VERIFIED` | Always false. No live GitHub read was performed. |
| `LIVE_SCOPED_LOOP_VERIFIED` | Always false. No live Cursor dispatch was performed. |

A simulated READY decision is `READY_FOR_OWNER_MERGE_DECISION` for the mock only. It is not permission to merge and it is not evidence that the live Cursor execution plane works.

`live_usage_verified` is always false. `SIMULATED_PASS` does not set either live flag.

## Owner authorization

Version 1 manifests keep the previous contract. Their digest is SHA-256 of the canonical engineering fields, and `owner_manifest_authorized` stays false.

Version 2 adds an owner signature over the canonical story body. The signed payload is sorted-key compact JSON. It includes repository, task, pull number, base SHA, base ref, allowed paths, model, required checks, manifest version, requirements, budgets, the key id, and the SHA-256 of the 32-byte public key. The signature bytes themselves are outside the signed payload and inside the store digest. `verify_owner_authorization` accepts the manifest only when the host key for that id hashes to the signed fingerprint and the Ed25519 signature verifies. The ledger stores that fingerprint. A later process with a different public key does not rewrite the store. Replay returns the stored decision and does not verify again. The controller has no signing function and no private key. A matching digest does not set `owner_manifest_authorized`. Check success does not set it either.

The production signing key stays with the owner, outside Cursor, GitHub Actions, and this repository. A key generated inside a unit test is not that key. Until the owner supplies the production public key out of band, owner control of a real story remains unverified.

## What this build does not authenticate

The manifest digest is SHA-256 of the canonical field JSON. The controller recomputes that digest and binds one store to one manifest id and one digest. A matching digest proves the accepted fields were not replaced after `Manifest.from_dict`. It does not prove that an owner signed the file.

Reviewer identity is a host-supplied `Review`. `authenticated` must be boolean true and `authentication_source` must be the exact string `host-verified`. Event text cannot set either field. A future live adapter must set both only after it has verified the GitHub identity. It must not copy them from webhook, comment, or pull-request JSON. This package does not contain that adapter.

Version 1 `budget` still accepts only `max_corrections`, from 1 to 5. The old key names `elapsed_seconds`, `token_budget`, and `cost` stay rejected. A later clean version-1 head can still become READY after the assignment cap.

Version 2 requires six budget fields: `max_corrections`, `max_elapsed_seconds`, `max_tokens`, `max_cost_cents`, `max_no_progress`, and `max_repeated_failures`. A missing, non-integer, or wrong-head usage counter is unknown. Unknown is not stored or treated as zero. A counter above its maximum holds without sticking, so a later head under the limit can continue. `usage_gate` `host_supplied` means the host object carried integers. It does not mean a live meter was verified.

A future usage integration must work like this. An owner-operated meter outside this repository attests elapsed seconds, token count, and cost in cents for one exact commit SHA. The host copies those integers onto `UsageEvidence` and sets `authentication_source` to `host-verified` only after checking that attestation. A missing counter stays null. This package does not call a meter.

Version 2 also requires the baseline checks `tdd`, `regression`, `integration`, `gitguardian`, and `security`. A story may add a check name. It may not remove one. Independent `bmad` and `catsec` reviews stay a separate gate. A green check row is not owner authorization.

Mandatory story requirements must each have host evidence with the same evidence name, the current head SHA, result `pass`, source `bmad` or `catsec`, and `authentication_source` `host-verified`. A trusted `fail` is a simulated correction. Missing, unverified, stale, or mismatched evidence refuses READY and does not assign. Event text cannot satisfy a requirement. After an assignment, evidence from the assigned head does not count for a later head.

The follow-on boundary is `_bmad-output/implementation-artifacts/issue-536-follow-on-requirements.md`.

## Run the tests

```bash
python3 -m unittest discover -s _bmad-output/implementation-artifacts/cohestra-correction-controller/tests -v
```

The tests use an in-memory port. They do not need GitHub credentials, Postgres, or Redis.

## Owner dependencies still required

- The production Ed25519 private key, held outside Cursor, GitHub Actions, and this repository, plus out-of-band delivery of its public key. A unit-test key does not authorize a real story.
- An immutable version-2 manifest the owner actually signed for a real pull request.
- A non-author BMAD reviewer and a non-author CAT-SEC reviewer whose GitHub identity the host verified on that exact SHA, both using `grok-4.7-high-fast`. The host must set `authentication_source` to `host-verified` only after that check.
- An owner-operated usage meter whose attestation the host checks before supplying elapsed time, tokens, and cost. Host-supplied numbers in tests are not that meter.
- A separate approval before any live read-only transport pilot.
- A further approval before any live scoped Cursor dispatch.
- No GitHub App installation, ruleset change, or UAT activation is included here.
