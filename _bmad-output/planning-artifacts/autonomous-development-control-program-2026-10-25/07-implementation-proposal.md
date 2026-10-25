---
title: ADCP implementation proposal
status: draft
created: 2026-10-25
---

# Implementation proposal

Do not implement until the owner signs `09-owner-decision-register.md`.

## Scope

In: ADCP routing, GitHub-native dispatch (only if D3 = A), Cloud Agents API client, architecture halt, milestone reports, least-privilege Environment design.

Out: tenant features, Epic 46 Production cutover, dedicated orchestrator host, GitHub org settings changes in this planning PR.

## Technical requirements

1. Closed-set BMAD skill router
2. GitHub Actions dispatch workflow (only after D8 and Environment exist)
3. Cursor API client: create, follow-up, poll, cancel
4. Optional ChatGPT suggest (D6; non-authoritative; catalog-checked; recommended off for the pilot)
5. Path-based architecture detector
6. Milestone commenter that rejects complete-without-evidence
7. Contract tests that prove: secret-name allowlist on the ADCP workflow; cancel-on-timeout covering CI wait; halt on the full `04-governance.md` path set; occupancy refuse; self-dispatch ignore

## Governance matrix

See `04-governance.md`. Implementation stories may not grant Cursor `production` Environment access.

## Security and permission model

| Secret / permission | Where | Who creates |
| --- | --- | --- |
| `CURSOR_API_KEY` | proposed Environment `adcp` | Product Owner (service account) |
| ChatGPT API key (if used) | same Environment | Product Owner |
| `GITHUB_TOKEN` in the dispatch job | `contents:read`, `issues:write`, `pull-requests:write`, `actions:read` only. Forbidden: `id-token:write`, `actions:write`, `contents:write` on `main`, Environment `production`/`uat` | Workflow YAML after D8 |
| UAT deploy key | Environment `uat` (existing) | Unchanged; ADCP must not read it |
| Production secrets | Environment `production` | Unchanged; ADCP must not read them |

Workflow must set `persist-credentials: false` on checkout. No SSH private keys.

## Integration design

```text
workflow_dispatch by allowlisted human
  → Actions (Environment adcp or D4 name)
      → optional ChatGPT suggest (non-authoritative; catalog check)
      → POST /v1/agents { repos:[{url: fad16papa/Cohestra, startingRef}], prompt, model }
      → poll GET run
      → on FINISHED: comment milestone skeleton + PR URL
      → on architecture or privilege-expansion path: OWNER_GATE
      → on timeout (agent or CI): POST cancel + escalate
```

`startingRef` defaults to `main` unless the task names an approved feature branch. Never `startingRef` a Production host checkout.

## Dependencies

- Owner decisions **D1 + D3 + D4 + D8 + D12** before any implementation story is created. D2 before `N.n` tracker IDs. D5 (keys) only after D1+D3+D4+D8+D11+D12.
- Cursor **service-account** API key (owner). Personal owner keys are refused.
- GitHub Environment `adcp` (or owner-chosen name) + required reviewer (owner)
- Existing BMAD skills and Epic 45 merge policy (already present)
- Epic 46 continues independently; do not block it

## Parallelization

- Planning review of this PR can proceed in parallel with Epic 46 integration
- After D1+D3+D4+D8+D12: ADCP-P1 (contracts + halt) then ADCP-P2 (dispatch, only if D3=A) are sequential
- ChatGPT assessor is optional, non-authoritative, and can trail the Cursor dispatcher
- Dedicated orchestrator (Option B) is not parallelized; it is a later epic or story after a correct-course

## Pilot validation

Pilot task (after implementation stories exist): run one **documentation-only** or **test-only** non-prod story through dispatch → agent → draft PR → milestone report. Do not use a Production file as the pilot target.

Pilot PASS:

- Agent id and run id recorded
- Draft PR opened
- Architecture halt does **not** fire
- Milestone refuses complete without CI URL
- No ADCP workflow log contains secret values (names-only contract, not a glance)

Pilot FAIL / rollback:

- Disable the workflow (`on:` empty or `if: false`) without deleting history
- Revoke the API keys
- Leave draft PRs open for owner inspection

## Risks

| Risk | Mitigation |
| --- | --- |
| Cursor API v1 changes (public beta) | Pin documented endpoints; contract tests; no webhooks in pilot |
| Actions job timeout | 120-minute budget; cancel API; escalate |
| Key leak in logs | Names-only logging; Environment isolation |
| Agent self-dispatch loop | Ignore dispatcher-created events; retry budget does not increment on ignored events |
| Accidental Production touch | Path halt + Environment isolation + merge policy |
| Epic 46 collision | Separate branches; AD-10 |

## Recommended sequence (after owner approval)

1. Owner signs D1, D8, D12 (authorize + adopt architecture + privilege list)
2. Owner signs D3, D4, D11 (topology, Environment `adcp` + reviewers, actor allowlist)
3. Owner signs D2 before any `N.n` story files
4. Owner creates Environment `adcp` + service-account keys (D5)
5. ADCP-P1: detector + closed-set router (no live API)
6. ADCP-P2: dispatch workflow against a dry-run / mock API (only if D3=A)
7. ADCP-P3: milestone reporter completeness
8. ADCP-P4: live pilot on a harmless task
9. Retrospective; Option B remains a later owner decision (D9)
