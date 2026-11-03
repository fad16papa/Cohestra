# Issue 536 model routing checkpoint

This file records the routing policy and the handoff this repository can actually express. It does not enable a model, change a Cursor setting, or authorize a live run.

## Policy

| Task | Requested model slug |
| --- | --- |
| Architecture, requirements, planning, complex debugging, security and trust review, BMAD review, CAT-SEC review, final acceptance | `grok-4.7-high-fast` |
| Bounded implementation and routine fixes that leave trust, identity, owner keys, evidence authentication, Actions permissions, merge gates, UAT, and production control untouched | `composer-2.5` |
| Unclear task type or unclear risk | `grok-4.7-high-fast` |

A complex coding task is three linked records for one task and one source SHA: a Grok plan with acceptance criteria, a Composer change, and a Grok review of that exact source SHA. The reviewer decides acceptance.

Trust, identity, owner-key, evidence-authentication, Actions-permission, merge-gate, UAT, and production-control changes stay on `grok-4.7-high-fast`. The correction controller keeps its existing pin: `correction/cursor_dispatch.py` sets `MODEL = "grok-4.7-high-fast"` and holds any other dispatch model. This checkpoint does not edit that file. That pin lives on the unmerged program branch and is absent from `main`.

## What was verified

| Claim | Label | Evidence |
| --- | --- | --- |
| This session's subagent catalog includes `grok-4.7-high-fast` and `composer-2.5` | VERIFIED | Model list supplied to this cloud-agent session |
| This cloud-agent run reports `originalModelName` `grok-4.7` | VERIFIED | `cursor-cloud` `run-info` for `bc-01a19fbb-7b87-74e6-b5d7-c7c8bc6570e0` |
| A Cursor plan cannot assign a different model to each step | VERIFIED as a Cursor staff statement | [Multi-model plans](https://forum.cursor.com/t/multi-model-plans/147966), deanrie, 5 Jan 2026: "This feature isn't available right now. You can't assign different models to individual steps in a plan." The stated workaround is a manual model switch before Build |
| An Automation runs as the single model shown on that automation | VERIFIED as a Cursor staff statement | [Hardcoded models on automations](https://forum.cursor.com/t/hardcoded-models-on-automations/171456/5), deanrie, 13 Sep 2026: "The model shown on an automation is the one it actually runs with." The Automations picker is a separate curated list |
| `grok-4.7-high-fast` and `composer-2.5` are present in this account's Automations picker | NOT VERIFIED | No dashboard read was performed, and no setting was changed |
| A subagent launched with `model: grok-4.7-high-fast` actually ran that slug | NOT VERIFIED | The launch accepts the slug. The tool result does not return the runtime model |
| Spend against the owner-stated $20 on-demand cap | UNKNOWN | `run-info` has no usage field. The cap was not read, raised, or topped up |

## Handoff that this repository can express

One Automation, one plan, and one cloud-agent run each keep one model. The enforceable handoff is a new run:

1. Start a run and select `grok-4.7-high-fast` in the Cursor UI. The run writes the plan and the acceptance criteria, and records the source SHA.
2. Start a second run and select `composer-2.5`. Its prompt carries the plan, the acceptance criteria, and the SHA. Its diff stays inside the plan.
3. Start a third run and select `grok-4.7-high-fast`. It reviews that exact source SHA.

Each run records the requested slug and the `originalModelName` from its own run record. A config value in a prompt is a request. The run record is the observation. When the observed name does not match the requested slug, the stage stops. Auto and silent fallback stay off: the owner selects the model for that run, and a run that cannot show its model stops.

There is no in-repo classifier. There is no workflow file that switches models. `cursor_dispatch.py` is a fail-closed pin for one model, and it is not a router.

## Status

The split is a written policy plus a manual three-run handoff. It is not an operational single-automation router. No live routing run was executed for this checkpoint.
