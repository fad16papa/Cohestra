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
| D7 | Engineering task model routing | **Grok 4.6** for planning, architecture, substantive code changes, technical/code/security review, release evaluation; **Composer 2.5** only for qualified low-risk simple bug fixes, always with Grok 4.6 code review; no Auto | **OWNER APPROVED MODEL POLICY (2026-10-25)** — see `16-owner-model-routing-policy.md`. Runner/API model inventory and enforcement still NOT IMPLEMENTED; no agent/credential authorization |
| D8 | Adopt AD-1..AD-10 architecture | **amend before adoption** per A1–A6 | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner agrees in principle with proposed responsibilities and architecture direction. **OWNER_GATE OPEN** for current-HEAD Grok 4.6 reviews and separate **final ADR adoption**; all ADs remain `[PROPOSED]` |
| D9 | Dedicated orchestrator host later | may be proposed only after pilot retrospective | **NOT APPROVED** — no server/new vendor/data flow authorized |
| D10 | Harden `main` and protected workflow paths | required PR + exact-HEAD checks + no force-push + controls on privileged changes, **without mandatory second-human PR approval** | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner supports proposed protections in principle. **OWNER_GATE OPEN** for concrete rules, compatibility assessment and any GitHub settings change; preserve two-parent Production history |
| D11 | Who may launch a run | owner-initiated `workflow_dispatch` for first pilot | **DIRECTION SELECTED**; actor/identity allowlist policy must be approved and tested; no label/comment trigger yet |
| D12 | Privilege expansion / secret classes | inherit existing approved merge-policy exceptions; explicitly owner-gate new permissions | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner supports least privilege in principle. **OWNER_GATE OPEN** for exact permissions, secrets classes and any expanded access. No Environment, workflow, credentials or settings authorized |
| D13 | Architecture participation | owner reviews material system, software/code, infrastructure, data and security decisions, even within existing standards | **BINDING INTENT** — execution contract must enforce semantic AND path-based escalation; implementation design still **OWNER_GATE OPEN** |
| D14 | Definition of "fully autonomous" | durable scheduled/event-driven loop, model-pinned Cursor, monitored PR/CI, advisor invocation, owner notifications | **OWNER_GATE OPEN FOR FULL AUTONOMY** — pilot alone does not satisfy this criterion |
| D15 | Permanent sole-owner operating structure | One human Product Owner, no second human collaborator or reviewer required; human approvals via owner-controlled gates; independent Grok/CI checks do not impersonate humans | **OWNER FACT CONFIRMED** — architecture change to comply is PROPOSED, not adopted |
| D16 | Unattended runtime without owner approval every task | Separate tightly restricted non-interactive P5 execution boundary for pre-approved low-risk tasks; preserve manual owner gates for privileged/material changes | **OWNER_GATE OPEN FOR P5** — do not weaken the pilot `adcp` reviewer protection to claim full autonomy |
| D17 | Accountable executor/reviewer model vs internal helper model visibility | Require explicit task-level primary/reviewer model selection and evidence. Do **not** require full provider-internal helper inference provenance. Disclose unavailable helper model IDs without falsely claiming Grok-only internal execution | **OWNER APPROVED REVISED STANDARD (2026-10-25)** — old every-inference hard-stop superseded, prior D18-A result remains historically incomplete. Main-model routing controls and independent Grok review still to be implemented/tested; no runner/go-live approval |
| D18 | One-time Grok 4.6 architecture-review bootstrap | Option A: one owner-initiated, review-only Cursor run under Issue #509 | **ONE AUTHORIZED ATTEMPT CONSUMED — MODEL_USAGE_UNVERIFIED (2026-10-25)**. Run `bc-c5e02c5f-bc63-4516-9ce8-b11b4bf74c6d` stopped in preflight before BMAD workflows; report [original PR comment](https://github.com/fad16papa/Cohestra/pull/507#issuecomment-6397452132), [Issue #509 mirror](https://github.com/fad16papa/Cohestra/issues/509#issuecomment-6397471609). Any second attempt needs NEW owner authorization and verifiable model policy |
| CAT-SEC | Security review and iterative code-review methodology | Use the real installed `bmad-code-review` workflow with explicit security/threat-model checks; inspect BLOCKER/MAJOR findings, fix in approved scope, rerun affected tests and independent exact-new-HEAD `bmad-code-review` until clean; bounded iterations and escalation on unresolved findings | **OWNER APPROVED METHODOLOGY (2026-10-25)** — owner explicitly agreed to the review→inspect/fix→retest→review loop. **DESIGN ONLY**, no current-HEAD review execution, no waiver of Grok 4.6 model integrity D17, new dispatch, code implementation, ADR adoption, merge or Production authorization |

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
- **Owner-approved 2026-10-25 model policy:** Grok 4.6 for planning, substantive implementation, reviews, security and release decisions; Composer 2.5 for **qualified isolated simple bug fixes only** with a fresh Grok review. No Auto. `16-owner-model-routing-policy.md` is the controlling scope.
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

## Owner D18 Option A authorization — 2026-10-25 (Asia/Singapore)

**Owner's explicit direction (in ChatGPT):** "ok I will take option A". This authorizes **one owner-initiated, planning-only Cursor Grok 4.6 review attempt**, using the prewritten review instructions in [Issue #509](https://github.com/fad16papa/Cohestra/issues/509). This is a narrow **execution-attempt authorization** for D18 A only, not permission for ChatGPT to trigger `@cursor` or invoke a model-unverified API, and not evidence that Cursor has actually been launched.

**Execution restrictions:** One review executor; explicitly select Grok 4.6; no code or repository write, no child/helper/model switching unless verifiably Grok-only, no credential/Environment/branch/workflow modification, no merge or any UAT/Production work. Require exact-head independent BMAD adversarial/edge/security/implementation readiness evidence. If any worker/helper model cannot be attested, record `MODEL_USAGE_UNVERIFIED` and NO-GO for strict model-policy signoff.

**Still open:** operational verification of **task-level model routing** (D7/D17 policy now selected), D8 final ADR adoption; D4/D10/D12 actual security settings and permissions; D5 credentials; P4 live dispatcher and a **new** review-only launch approval; Production remains NO-GO. The Product Owner must perform the one-time Cursor UI action; the connected GitHub tool cannot launch Cursor.

**Audit identity:** the GitHub commit documenting this selection may appear under the connected owner's account, but the underlying human authorization was the user's selection in this conversation, not an independent GitHub review action.

## CAT-SEC owner review methodology decision — 2026-10-25 (Asia/Singapore)

**Owner's explicit choice in this ChatGPT conversation:** "yes we can use bmad-code-review skills when it catches some bug and issue, inspect the code an rerun code review again until it pasess all required test."

**Recorded scope:** Adopt the *methodology* described in `14-code-review-security-loop.md`: Grok 4.6 executor uses cataloged `bmad-code-review` for code and security/threat-model findings. After each review identifies a BLOCKER or MAJOR, inspect the actual implementation, safely fix only within an already-authorized story boundary, run local/unit/integration/contract/security tests, submit the new HEAD to an independent Grok 4.6 code review, and recheck GitHub exact-HEAD CI/GitGuardian. Each modification invalidates the previous review. Final pass requires BLOCKER=0, MAJOR=0, no unwaived security findings, required tests green and exact-head verifiable evidence.

**Retry guard:** The workflow may attempt **up to three** authorized fix/review iterations per run, then `OWNER_GATE / INCOMPLETE` with full report. It must not loop indefinitely. The Product Owner can separately approve additional bounded cycles after reviewing the remaining issues. A critical/material architecture, privilege, data, billing, or Production change stops for the relevant owner gate immediately, even within the first iteration. No automatic scope expansion.

**No retroactive approval:** The previous D18-A run stopped at `MODEL_USAGE_UNVERIFIED` *before* BMAD; under the new model-routing policy, that earlier all-inference provenance requirement is **superseded**, but the attempt is still INCOMPLETE, not a review PASS. CAT-SEC approval and revised D17 do not authorize rerunning agents, creating credentials, assigning substantive work off-policy, final D8 adoption, merging or Production. `bmad-security-review` is **not** an installed skill; a security-specific checklist within the real `bmad-code-review` is the approved method, not an invented separate BMAD workflow.

## D17 engineering alternatives identified — 2026-10-25

Verified public Cursor documentation describes (1) `subagentStart` hook that receives a reported `subagent_model` and may return `permission: deny`, but **Cloud hooks are unavailable during early read-only exploration**; (2) the Cursor TypeScript SDK `tools` allowlist/`disallowedTools: ["task"]`, **local agents only**, which can deny subagent-launching tool use; and (3) team Admin API model-attributed usage events with `cloudAgentId` (plan/account access, timeliness and completeness unverified for owner's personal setup). None of these by itself attests every actual parent inference; no setup, credentials or execution is approved here.

**Recommended next phase:** proposal and source-level feasibility evaluation only, then a separately owner-approved isolated non-Production test design. Do not infer D17 resolved from API request-level model selection, a hook config file alone or the absence of reported helper invocations. Exact tests, limits and decisions: `15-d17-verification-options-and-tests.md`.

## D18-A review attempt evidence and CAT-SEC gap (2026-10-25)

- **Actual execution:** one owner-initiated Cursor Cloud review-only run `bc-c5e02c5f-bc63-4516-9ce8-b11b4bf74c6d` against exact PR #507 HEAD `5bb5a77915c0f40186c6efa98971ce6097822dc9` exited `MODEL_USAGE_UNVERIFIED` before BMAD review. Selected parent `cursor-grok-4.6-high-fast`; per-inference parent/worker/helper model provenance unverified, dashboard events 0. The **absence of launched helpers** does not itself attest the actual parent inference model. No model-policy PASS.
- **Evidence:** [original Cursor report](https://github.com/fad16papa/Cohestra/pull/507#issuecomment-6397452132); [verbatim GitHub Issue #509 mirror](https://github.com/fad16papa/Cohestra/issues/509#issuecomment-6397471609). Cursor lacked integration permission to post Issue #509, but ChatGPT copied the report into the issue; this is not new review evidence.
- **CI separately PASS on that older HEAD:** five GitHub Actions jobs and GitGuardian SUCCESS via [run 40191412312](https://github.com/fad16papa/Cohestra/actions/runs/40191412312). Green CI does not replace a required Grok/BMAD review. This register update creates a **new planning HEAD**, so a subsequent exact-HEAD assessment must use that new SHA.
- **CAT-SEC skill availability:** catalog includes BMAD AR, ECH, IR, CR; no installed skill literally named `bmad-security-review`. The audit identified a **capability mismatch**, not an execution finding. **Owner CAT-SEC methodology decision now recorded:** use cataloged Grok `bmad-code-review` with explicit threat-model/security criteria and iterative fix/test/re-review. This is not evidence that such a review ran, and D17 model provenance still blocks execution.
- **Next step without weakening D17:** request Cursor provider-verifiable single-model enforcement or complete inference model provenance, assess a narrowly scoped alternative that can guarantee the owner's Grok-only policy, and present explicit owner options. Do **not** simply repeat the same Cursor UI run or treat request-level model selection as an attestation.
- **Unchanged:** D8 ADR adoption, D4/D10/D12 operational changes, D5 secrets, new Cursor agents, merges, UAT and Production remain NO-GO without their own gates.

## Model-integrity and review-bootstrap technical finding (2026-10-25)

**Cursor's own release notes / staff support** report Cloud Agent Project coordinators can switch worker model, and helper/subagent tasks may use models other than the selected Grok 4.6. These are source-derived observations, **not proof that the issue has been resolved**:
- https://cursor.com/docs/release-notes/cloud-agents
- https://forum.cursor.com/t/cloud-agents-dont-adhere-to-my-selected-model/171688
- https://forum.cursor.com/t/cloud-agent-logs-claude-4-5-sonnet-when-picker-is-grok-4-6-and-claude-is-not-enabled/169638/39

**Owner's existing Grok 4.6 exclusivity policy is NOT weakened.** A model-pinned parent agent is only a request-level check. A current-HEAD Grok/BMAD planning review may not be marked conformant unless all participating execution models are verified or unsupported helper paths are demonstrably disabled. Account model-picking settings and natural-language instructions alone do not prove this. Refuse to declare full autonomy or security readiness if this cannot be proven.

**Bootstrap deadlock:** The architecture currently demands an independent Grok review before adopting ADCP, but a secure automated model-verified reviewer depends on that not-yet-adopted ADCP and credentials. The next owner decision should explicitly choose an exceptional **review-only, no-merge** starting mechanism or defer, with exact steps and observable worker-model evidence. See `13-review-bootstrap-model-integrity.md`.

## Owner's revised model routing decision (BINDING, 2026-10-25)

**Exact new instruction:** "We will use grok 4.6 for all planning, code changes, technical reviews, security assessments and release decisions then we use composer 2.5 for simple bug fix."

**Grok 4.6** is the explicitly selected main executor and reviewer for architecture, features, substantive code changes, security, BMAD reviews and release decisions. **Composer 2.5** implements *only* narrow low-risk simple bug fixes with passing targeted/regression tests and **fresh independent Grok 4.6 `bmad-code-review`**. Escalate ambiguous/security/tenant/auth/billing/schema/infrastructure/Production changes back to Grok and the owner where material.

D17 is now **task-level routing**, not provider-internal every-inference proof. An unknown hidden helper model should be disclosed as `INTERNAL_HELPER_MODELS_NOT_ATTESTED` and **does not alone block** a properly selected Grok main-agent/BMAD review. Never claim exhaustive all-Grok internal model usage; never deliberately route core engineering decisions to non-approved models. **This supersedes, but does not erase, historical D18-A model-preflight failure**. That run never executed BMAD and gives no current-HEAD review PASS. Existing one-attempt authorization was consumed; **new run needs a new explicit owner authorization**.

Detailed eligibility/security criteria and evidence: `16-owner-model-routing-policy.md`. This is an approved **model policy decision**, not final AD-1..AD-10 adoption, new GitHub settings, keys, live workflow, PR merge or Production authorization.
