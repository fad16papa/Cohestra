---
title: ADCP implementation proposal
status: draft
created: 2026-10-25
---

# Implementation proposal

Do not implement until the owner signs `09-owner-decision-register.md`.

## Scope

In: ADCP routing, GitHub-native dispatch (owner-selected pilot direction, subject to adopted ADR), Cloud Agents API client, semantic + path-based architecture halt, strict Grok 4.6 pinning, milestone reports, least-privilege Environment and protected GitHub governance design.

Out: tenant features, Epic 46 Production cutover, dedicated orchestrator host, GitHub org settings changes in this planning PR.

## Technical requirements

1. Closed-set BMAD skill router
2. GitHub Actions dispatch workflow (only after D8 and Environment exist)
3. Cursor API client: create, follow-up, poll, cancel
4. Human-invoked ChatGPT creates contract/routing and reviews via authenticated GitHub integration (no copying). A future OpenAI API advisor is **separately owner-gated**, not an assumed pilot dependency
5. **Semantic + protected-path** architecture detector: stage at contract dispatch and on final PR HEAD
6. Milestone commenter that rejects complete-without-evidence and reports requested/verified model, budget, actor and independent Grok 4.6 review
7. Contract tests that prove: exact Grok 4.6 model ID required and no default fallback; secret-name allowlist; fail-closed ambiguous semantic impact; cancel-on-timeout covering CI wait; entire protected-path set; occupancy and idempotency refuse; self-dispatch ignore
8. Credential-free mock dispatcher path tested before introducing any Cursor key

## Governance matrix

See `04-governance.md`. Implementation stories may not grant Cursor `production` Environment access.

## Security and permission model

| Secret / permission | Where | Who creates |
| --- | --- | --- |
| `CURSOR_API_KEY` | proposed Environment `adcp` | Product Owner (service account) |
| OpenAI API key (later and separately approved) | Dedicated, separately assessed secret boundary; never implicitly included in pilot `adcp` | Product Owner at future API/data approval gate |
| `GITHUB_TOKEN` in the dispatch job | `contents:read`, `issues:write`, `pull-requests:write`, `actions:read` only. Forbidden: `id-token:write`, `actions:write`, `contents:write` on `main`, Environment `production`/`uat` | Workflow YAML after D8 |
| UAT deploy key | Environment `uat` (existing) | Unchanged; ADCP must not read it |
| Production secrets | Environment `production` | Unchanged; ADCP must not read them |

Workflow must set `persist-credentials: false` on checkout. No SSH private keys.

## Integration design

```text
workflow_dispatch by allowlisted human
  → Actions (Environment adcp or D4 name)
      → validate owner-approved task contract and catalog-verified BMAD skill
      → authenticated GET /v1/models and fail-closed verified Grok 4.6 model.id
      → POST /v1/agents { repos:[{url: fad16papa/Cohestra, startingRef}], prompt, model:{id:verified_id} }
      → poll GET run and exact-HEAD CI/review
      → on FINISHED: comment milestone skeleton + PR URL
      → on architecture or privilege-expansion path: OWNER_GATE
      → on timeout (agent or CI): POST cancel + escalate
```

`startingRef` can point to reviewed `main` as read-only starting commit, but `workOnCurrentBranch` must be false and no write to `main` is permitted. Actual agent output goes to a dedicated `cursor/<slug>-<id>` branch/draft PR. Do not confuse `startingRef` (git ref) with Production host checkout. No Production or UAT environment access.

## Dependencies

- **Before implementation:** owner adopts the *amended* ADCP ADRs (D8), approves any privilege-expanded workflow design (D12) and confirms the story boundaries. Reserve Epic 47, but do not update the sprint tracker before owner signs its final assignment.
- **Credential-free dry run:** execute only mock functionality after architecture approval; no `adcp` secrets or live API necessary.
- **Before live dispatch:** D4 + D5 + D10 + D11 + D12 must be explicitly approved and enforced; protected `main`, reviewed workflow scope and repo/org secrets inventory are mandatory. A separate Cursor **service-account** API key is required; personal owner keys are refused.
- The GitHub Environment `adcp` (or owner-chosen name) must have effective required reviewers and a documented solution to GitHub's prevent-self-review deadlock, not simply 'owner' assumed to be able to approve their own run.
- Authenticated Cursor model inventory must prove an available Grok 4.6 `model.id`, explicitly passed on every engineering run (and reviewers/subagents controlled or prohibited).
- Existing BMAD skills and Epic 45 merge policy (already present)
- Epic 46 continues independently; do not block it

## Parallelization

- Planning review of this PR can proceed in parallel with Epic 46 integration
- After owner-adopted amended ADCP architecture: ADCP-P1 (contracts + semantic halt) then credential-free ADCP-P2 (mock dispatcher, only if D3=A) are sequential. Secret-backed/live activation requires all additional D4/D5/D10/D11/D12 prerequisites
- ChatGPT is the **human-invoked GitHub-contract/orchestration advisor** during the pilot; an automatic advisory API worker remains a separate future architecture and credential decision
- Dedicated orchestrator (Option B) is not parallelized; it is a later epic or story after a correct-course

## Pilot validation

Pilot task (after implementation stories exist): run one **documentation-only** or **test-only** non-prod story through dispatch → agent → draft PR → milestone report. Do not use a Production file as the pilot target.

Pilot PASS:

- ChatGPT can submit the task in GitHub without the owner manually copying prompts
- Authorized GitHub dispatch obtains model catalog and pins **Grok 4.6**; missing model ID refuses dispatch
- Agent id/run id and independent requested-versus-actual model evidence recorded; no unsupported runtime attestation claims
- Draft PR opened without touching `main`; no merge or UAT deploy as part of first pilot
- Semantic and protected-path architecture halt does **not** fire for approved harmless target
- Exact-HEAD CI, GitGuardian, Grok 4.6 BMAD review and milestone report complete
- No workflow log or agent input contains secret values (contract tests plus independent inspection)
- Failed/timeout paths exercise bounded cancel/rollback without Production or UAT changes

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

1. Reconcile this PRD, architecture spine, governance and story set with 10-amendment-proposal; obtain current-HEAD Grok 4.6 adversarial, edge-case and security reviews
2. Product Owner adopts amended ADCP ADRs and approves technical boundaries (D8, D12), with Epic 47 assignment recorded only when confirmed
3. ADCP-P1: protected-path **and semantic** impact halt plus catalog-closed BMAD router, no credentials
4. ADCP-P2: **credential-free mock** dispatcher with fail-closed model checking, idempotency, retries/cancellation and no live API call
5. ADCP-P3: milestone reporter with exact-SHA verification and independent review gate
6. Product Owner approves effective `main`/workflow protection, `adcp` reviewer identities, actor allowlist and separate service-account credentials (D4/D5/D10/D11/D12). Verify Grok 4.6 in authenticated Cursor model inventory
7. ADCP-P4: one owner-gated docs/test-only live run; verify zero UAT/Production changes and no merge
8. Retrospective; separately design ADCP-P5 full unattended delivery and optional later external host (D9) without silently authorizing OpenAI API or privileges

## Scope separation

The controlled pilot proves model-pinned dispatch, GitHub PR/CI evidence and no-copy contract submission. It does **not** prove full unattended ChatGPT-guided autonomy. A later owner-approved advisory/API-worker design must address API credentials, payload redaction/PII, data retention, spend limits, queues and state replay; no such worker is built or credentialed by the pilot.
