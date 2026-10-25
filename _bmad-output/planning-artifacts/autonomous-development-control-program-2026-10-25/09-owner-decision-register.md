---
title: ADCP owner decision register
status: pending-owner-architecture-approval
created: 2026-10-25
updated: 2026-10-25
related: 10-architecture-amendment-proposal.md
---

# Owner decision register

**STOP AT OWNER_GATE FOR ARCHITECTURE ADOPTION, CREDENTIALS, LIVE DISPATCH AND MERGES.** The Product Owner has instructed ChatGPT to **proceed** with the autonomous-control workstream and selected the recommended GitHub-native pilot direction, but **has not approved the AD-1..AD-10 architecture as written**. See [amendment proposal](10-architecture-amendment-proposal.md).

Decision status vocabulary:
- **DIRECTION SELECTED** = intended route acknowledged by Product Owner; not authority to change settings, start a model-unverified agent, or adopt an unreconciled ADR.
- **PRELIMINARY DIRECTION AGREED** = owner agrees with the proposed approach **in principle only**; final ADR adoption, implementation, settings, credentials, merges and Production require separate explicit authorization and completion of review/security gates.
- **OWNER_GATE OPEN** = new explicit owner approval required.
- **APPROVED** = explicit, recorded owner decision with evidence link (not merely a planner assertion).
- **NOT ACTIVATED** = no implementation or credential/agent activity yet.

| ID | Decision | Recommended choice | Current status / gate |
| --- | --- | --- | --- |
| D1 | Autonomous Control as separate workstream | proceed | **DIRECTION SELECTED** — [owner direction](https://github.com/fad16papa/Cohestra/issues/506#issuecomment-6395401988); no unrestricted implementation |
| D2 | Reserve next epic number | 47 | **DIRECTION SELECTED** — next unused at reviewed baseline; no `sprint-status.yaml` changes until final architecture |
| D3 | Pilot orchestrator topology | A: GitHub Actions + Cursor Cloud Agents API | **DIRECTION SELECTED** — owner authorization for detailed design; credential-free dry run follows ADR approval |
| D4 | New Environment and reviewers | **single owner** required reviewer in `adcp`; **Prevent self-review OFF for `adcp` only** for owner-started pilot | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner agrees in principle with solo-owner `adcp`. **OWNER_GATE OPEN** for actual reviewer settings, secret scope, credential provisioning and live use. No second human review is implied |
| D5 | Create credentials | dedicated service-account Cursor API key only after safeguards | **OWNER_GATE OPEN** — NO KEYS until D4/D8/D10/D11/D12 and model eligibility are verified; separate consent and cost/rotation |
| D6 | ChatGPT invocation | interactive ChatGPT for controlled pilot; OpenAI API only in separately approved later phase | **DIRECTION SELECTED FOR PILOT**; full autonomy API/data flow is **OWNER_GATE OPEN** |
| D7 | Engineering executor model | Grok 4.6 hard pin, no Auto/default fallback | **DIRECTION SELECTED**; concrete `GET /v1/models` id **NOT VERIFIED**; refuse launch until verified |
| D8 | Adopt AD-1..AD-10 architecture | **amend before adoption** per A1–A6 | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner agrees in principle with proposed responsibilities and architecture direction. **OWNER_GATE OPEN** for current-HEAD Grok 4.6 reviews and separate **final ADR adoption**; all ADs remain `[PROPOSED]` |
| D9 | Dedicated orchestrator host later | may be proposed only after pilot retrospective | **NOT APPROVED** — no server/new vendor/data flow authorized |
| D10 | Harden `main` and protected workflow paths | required PR + exact-HEAD checks + no force-push + controls on privileged changes, **without mandatory second-human PR approval** | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner supports proposed protections in principle. **OWNER_GATE OPEN** for concrete rules, compatibility assessment and any GitHub settings change; preserve two-parent Production history |
| D11 | Who may launch a run | owner-initiated `workflow_dispatch` for first pilot | **DIRECTION SELECTED**; actor/identity allowlist policy must be approved and tested; no label/comment trigger yet |
| D12 | Privilege expansion / secret classes | inherit existing approved merge-policy exceptions; explicitly owner-gate new permissions | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner supports least privilege in principle. **OWNER_GATE OPEN** for exact permissions, secrets classes and any expanded access. No Environment, workflow, credentials or settings authorized |
| D13 | Architecture participation | owner reviews material system, software/code, infrastructure, data and security decisions, even within existing standards | **BINDING INTENT** — execution contract must enforce semantic AND path-based escalation; implementation design still **OWNER_GATE OPEN** |
| D14 | Definition of "fully autonomous" | durable scheduled/event-driven loop, model-pinned Cursor, monitored PR/CI, advisor invocation, owner notifications | **OWNER_GATE OPEN FOR FULL AUTONOMY** — pilot alone does not satisfy this criterion |
| D15 | Permanent sole-owner operating structure | One human Product Owner, no second human collaborator or reviewer required; human approvals via owner-controlled gates; independent Grok/CI checks do not impersonate humans | **OWNER FACT CONFIRMED** — architecture change to comply is PROPOSED, not adopted |
| D16 | Unattended runtime without owner approval every task | Separate tightly restricted non-interactive P5 execution boundary for pre-approved low-risk tasks; preserve manual owner gates for privileged/material changes | **OWNER_GATE OPEN FOR P5** — do not weaken the pilot `adcp` reviewer protection to claim full autonomy |

## Preliminary owner review preferences — 2026-10-25 (Asia/Singapore)

**Source of preference:** Product Owner explicitly submitted these selections in the current ChatGPT conversation. This document change is performed by ChatGPT through the connected GitHub account and **does not** constitute GitHub-authenticated independent human approval or final architectural signoff.

| Decision | Preliminary owner preference | Scope and prohibition |
| --- | --- | --- |
| **D8** Architecture and responsibilities | **AGREE WITH PROPOSED DIRECTION** | No AD-1..AD-10 adoption, Grok 4.6 review attestation, implementation, merge or Production authorization |
| **D10** GitHub branch protections | **AGREE WITH PROPOSED DIRECTION** | No GitHub branch/ruleset settings changed or approved for immediate execution; exact control set and compatibility remain owner-gated |
| **D4** Single-owner `adcp` Environment | **AGREE WITH PROPOSED DIRECTION** | No Environment creation or reviewer setting change; `production` untouched; secret scope and pilot approval remain owner-gated |
| **D12** Least-privilege permissions | **AGREE WITH PROPOSED DIRECTION** | No new token permissions, credentials, workflow permissions, key access or privilege expansion authorized |

**Change requests from owner:** **NONE** for these four preliminary directions. This does not mean all technical prerequisites or residual findings have been resolved.

**Required next evidence before a final approval request:** fresh current-HEAD Grok 4.6 BMAD adversarial, edge-case, security and readiness review; proposed exact GitHub branch/ruleset + `adcp` configuration; secret/permission inventory and any material tradeoffs. Present the owner with exactly what will be adopted or changed, the risks, the evidence and separate approve/modify/defer choices.

**Unchanged:** all other decision rows, prior inherited owner policies, no running Cursor dispatch, no secret provisioning, no Production GO, and no new merge authority.

## Implementation and authorization sequence

1. Review the A1–A6 architectural amendments as **proposals** and verify consistency with Epic 45 AD-12 and the existing owner authority.
2. Grok 4.6 review of the new planning HEAD using actual installed BMAD adversarial, edge-case and security workflows. Previous FAILs remain historical; do not relabel without a real current-HEAD review.
3. Owner explicitly approves or amends D8, D12, identity/branch control D10/D11, and the **single-owner** Environment proposal D4; record the actual human approval action and timestamp. GitHub comments submitted via ChatGPT using the owner's account are not by themselves proof of human attestation.
4. Draft a **credential-free** dispatcher/milestone validation implementation in a separate PR after architectural approval; do not start any live Cursor run.
5. Independently verify `GET /v1/models` lists the requested Grok 4.6; the model ID is an owner-reviewed pin, never guessed.
6. Only after protected-main and the `adcp` Environment safeguards are demonstrably effective, obtain separate owner approval for D5 and launch one docs/test-only, non-main, model-pinned pilot.
7. Distinguish pilot success from full autonomous engineering. Later continuous advisory/model API credentials, data processing, spend budgets and event triggers require separate explicit owner decisions.

## Existing policies remain binding

- Epic 45 autonomous UAT/non-production merge authority continues **only** where its already-approved strict policy applies. There is **no new standing main-merge approval**; the Product Owner explicitly withdrew the broader proposal.
- Grok 4.6 exclusively owns Cohestra engineering planning, architecture, implementation, testing, security and review; Composer 2.5 exception only when separately authorized for small fixes; Auto disabled.
- No Cursor host SSH, no Production or UAT secret transfer, no Production deploy dispatch.
- Exact HEAD CI/security evidence, tenant and Production isolation, mandatory Code Review Loop, story approval and Product Owner architecture review remain mandatory.
- PR #505 and Epic 46 are separate; Production NO-GO.

## This planning PR does not authorize

- Merge of #507 or #505 (or closing #502/#503/#504).
- GitHub workflow, Environment, branch-protection or secret modification.
- Cloud API credential creation, model-unpinned Cursor dispatch, agent fanout or autonomous merges.
- Production environment changes, deploy, DNS, TLS, live billing, migrations or cutover.
- Marking any ADR `[ADOPTED]` without recorded Product Owner approval.

## Sole-owner constraint (confirmed by owner)

Product Owner states they have **no other collaborator and intend Cohestra to remain sole-owned**. Do not create requirements for a second GitHub human PR reviewer or a second Environment approval identity.

- For pilot `adcp`: propose sole owner as required reviewer with Prevent self-review disabled **only in `adcp`**, not Production. This allows owner-initiated dispatch, followed by a separate owner approval click. It is **not independent human scrutiny**.
- For `main`: required checks and PR reviewable history, **without one mandatory approving human review on owner-authored PRs**; Grok 4.6 BMAD validation is a recorded technical gate, not an impersonated human GitHub review.
- For full autonomy: an owner-approved no-manual-confirmation-per-task runtime must be designed separately from the pilot gated Environment, with task-class restrictions and audited escalation. No approval to implement that new runtime yet.
- Never treat GitHub comments authored through the owner's ChatGPT connector as automatic `OWNER_APPROVE` evidence without explicit human confirmation; role attribution and approval audit must be designed.
