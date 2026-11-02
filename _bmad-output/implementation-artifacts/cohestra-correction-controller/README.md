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

## Run the tests

```bash
python3 -m unittest discover -s _bmad-output/implementation-artifacts/cohestra-correction-controller/tests -v
```

The tests use an in-memory port. They do not need GitHub credentials, Postgres, or Redis.

## Owner dependencies still required

- An immutable manifest approved for a real pull request, including the base SHA and allowed paths.
- A non-author BMAD reviewer and a non-author CAT-SEC reviewer authenticated on that exact SHA, both using `grok-4.7-high-fast`.
- A separate approval before any live read-only transport pilot.
- A further approval before any live scoped Cursor dispatch.
- No GitHub App installation, ruleset change, or UAT activation is included here.
