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

`owner_manifest_authorized` is always false. `SIMULATED_PASS` does not set either live flag.

## What this build does not authenticate

The manifest digest is SHA-256 of the canonical field JSON. The controller recomputes that digest and binds one store to one manifest id and one digest. A matching digest proves the accepted fields were not replaced after `Manifest.from_dict`. It does not prove that an owner signed the file, and it is not owner authorization.

Reviewer identity is a host-supplied `Review`. `authenticated` must be boolean true and `authentication_source` must be the exact string `host-verified`. Event text cannot set either field. A future live adapter must set both only after it has verified the GitHub identity. It must not copy them from webhook, comment, or pull-request JSON. This package does not contain that adapter.

`budget.max_corrections` counts simulated assignments and must be from 1 to 5. Elapsed time, token consumption, and cost are not fields and are not enforced. A later clean head can still become READY after the assignment cap. That is not a claim that a time, token, or cost budget was met.

The follow-on boundary is `_bmad-output/implementation-artifacts/issue-536-follow-on-requirements.md`.

## Run the tests

```bash
python3 -m unittest discover -s _bmad-output/implementation-artifacts/cohestra-correction-controller/tests -v
```

The tests use an in-memory port. They do not need GitHub credentials, Postgres, or Redis.

## Owner dependencies still required

- An owner-controlled trust root for the manifest. The content digest is not that signature.
- An immutable manifest approved for a real pull request, including the base SHA and allowed paths.
- A non-author BMAD reviewer and a non-author CAT-SEC reviewer whose GitHub identity the host verified on that exact SHA, both using `grok-4.7-high-fast`. The host must set `authentication_source` to `host-verified` only after that check.
- Separate budgets for elapsed time, token consumption, and cost. `max_corrections` is only an assignment count.
- A separate approval before any live read-only transport pilot.
- A further approval before any live scoped Cursor dispatch.
- No GitHub App installation, ruleset change, or UAT activation is included here.
