---
title: ADCP owner decision register
status: pending-owner-architecture-approval
created: 2026-10-25
updated: 2026-10-26
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
| D4 | New Environment and reviewers | **APPROVED CONFIGURATION:** `adcp` Environment; `fad16papa` sole required reviewer; prevent-self-review **OFF for `adcp` only**; trusted main branch only; initially **no secrets** | **OWNER APPROVED FOR APPLICATION (2026-10-25); NOT APPLIED / NOT VERIFIED**. No Environment or secret changes made by ChatGPT. Existing `uat` and `production` unchanged. Preflight and explicit admin UI action outstanding |
| D5 | Create credentials | dedicated service-account Cursor API key only after safeguards | **OWNER_GATE OPEN** — NO KEYS until D4/D8/D10/D11/D12 and model eligibility are verified; separate consent and cost/rotation |
| D6 | ChatGPT invocation | interactive ChatGPT for controlled pilot; OpenAI API only in separately approved later phase | **DIRECTION SELECTED FOR PILOT**; full autonomy API/data flow is **OWNER_GATE OPEN** |
| D7 | Engineering task model routing | **Grok 4.6** for planning, architecture, substantive code changes, technical/code/security review, release evaluation; **Composer 2.5** only for qualified low-risk simple bug fixes, always with Grok 4.6 code review; no Auto | **OWNER APPROVED MODEL POLICY (2026-10-25)** — see `16-owner-model-routing-policy.md`. Runner/API model inventory and enforcement still NOT IMPLEMENTED; no agent/credential authorization |
| D8 | Adopt AD-1..AD-10 architecture | **amend before adoption** per A1–A6 | **PRELIMINARY DIRECTION AGREED (2026-10-25)** — owner agrees in principle with proposed responsibilities and architecture direction. **OWNER_GATE OPEN** for current-HEAD Grok 4.6 reviews and separate **final ADR adoption**; all ADs remain `[PROPOSED]` |
| D9 | Dedicated orchestrator host later | may be proposed only after pilot retrospective | **NOT APPROVED** — no server/new vendor/data flow authorized |
| D10 | Protect `main`, privileged workflow boundaries | **APPROVED CONFIGURATION:** required PR, 0 required human PR approvals, exact six sourced CI/security checks, strict up-to-date/conversations, no force push/deletion, merge commits preserved, linear history and merge queue OFF; trusted exact-success check required for future autonomous merges | **OWNER APPROVED FOR APPLICATION (2026-10-25); NOT APPLIED**. GitHub recheck still `main.protected=false`, `rulesets=[]`. Settings change via owner admin UI, verify recovery and no UAT workflow regression; no merge authority |
| D11 | Owner-authenticated runner launch | **APPROVED DESIGN:** allowlisted owner `workflow_dispatch` from trusted main plus actual `adcp` GitHub Environment reviewer confirmation; do not treat issue text or ChatGPT-authored GitHub comments as trusted owner approval | **OWNER APPROVED DESIGN (2026-10-25); NOT IMPLEMENTED**. No trusted workflow, Cursor key or runtime dispatch authorized |
| D12 | Least-privilege GitHub and secret classes | **APPROVED CONFIGURATION:** default-deny GitHub token, separated preflight/dispatcher/reporting, read-only code-facing job, no main write, admin, OIDC, UAT/Production secrets or unnecessary write scopes; later key confined to `adcp` after D5 | **OWNER APPROVED FOR APPLICATION (2026-10-25); NOT IMPLEMENTED**. No workflow, token permissions, Environment, secret or repo settings changed |
| D13 | Owner authority over material architecture/privilege | **APPROVED MECHANISM DESIGN:** fail-closed semantic+path classifier with owner queue; architecture approvals require explicit human action, not GitHub comment phrases; owner remains sole architecture authority | **OWNER APPROVED DESIGN (2026-10-25); D8 FINAL ADR/SEMANTIC ALGORITHM STILL OPEN**. Concrete runtime verifier and owner attestation still to be implemented and independently reviewed |
| D14 | Definition of "fully autonomous" | durable scheduled/event-driven loop, model-pinned Cursor, monitored PR/CI, advisor invocation, owner notifications | **OWNER_GATE OPEN FOR FULL AUTONOMY** — pilot alone does not satisfy this criterion |
| D15 | Permanent sole-owner operating structure | One human Product Owner, no second human collaborator or reviewer required; human approvals via owner-controlled gates; independent Grok/CI checks do not impersonate humans | **OWNER FACT CONFIRMED** — architecture change to comply is PROPOSED, not adopted |
| D16 | Unattended runtime without owner approval every task | Separate tightly restricted non-interactive P5 execution boundary for pre-approved low-risk tasks; preserve manual owner gates for privileged/material changes | **OWNER_GATE OPEN FOR P5** — do not weaken the pilot `adcp` reviewer protection to claim full autonomy |
| D17 | Accountable executor/reviewer model vs internal helper model visibility | Require explicit task-level primary/reviewer model selection and evidence. Do **not** require full provider-internal helper inference provenance. Disclose unavailable helper model IDs without falsely claiming Grok-only internal execution | **OWNER APPROVED REVISED STANDARD (2026-10-25)** — old every-inference hard-stop superseded, prior D18-A result remains historically incomplete. Main-model routing controls and independent Grok review still to be implemented/tested; no runner/go-live approval |
| D18 | Grok 4.6 architecture/security bootstrap reviews | **D18-A #509** historical attempt stopped before BMAD under previous full-helper policy; **D18-B2 #511** later owner-authorized review with selected Grok 4.6, cataloged AR/ECH/IR and CAT-SEC, CR not claimed complete for planning-only diff | **REVIEW FINDINGS / OWNER_GATE**: D18-B2 review [original cursor[bot] comment](https://github.com/fad16papa/Cohestra/pull/507#issuecomment-6398733078), [verbatim #511 mirror](https://github.com/fad16papa/Cohestra/issues/511#issuecomment-6398901145), B-1 / M-1..M-6 / N-1..N-7. No ADR/merge PASS. R1 corrections were owner-authorized in [#512](https://github.com/fad16papa/Cohestra/issues/512). Latest-HEAD Grok re-review still required |
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

**HISTORICAL D18-A EXECUTION CONTRACT, NO LONGER OPERATIVE:** At that time the review executor was required to verify every helper model and stopped at MODEL_USAGE_UNVERIFIED before BMAD. **The owner superseded that all-inference attestation requirement** with binding D7/D17 task-level model routing in `16-owner-model-routing-policy.md`. D18-B2 later ran a real planning review with Grok selected. Neither attempt conferred ADR or merge approval.

**Historical status at D18-A:** operational verification of task-level model routing and D8 adoption were open. **Current 2026-10-25 update:** owner subsequently applied `main` protection (API-verified) and saved `adcp` protections (owner-confirmed, admin details not readable via connector); D11/D13 and D12 runtime remain unimplemented; D8, D5, authenticated model inventory, live bridge, merge and Production remain NO-GO. D18-B2 #511 has already run and reported findings. No routine copy/paste Cursor launch is planned for further bridge development.

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

**HISTORICAL OBSERVATION, superseded as a compliance STOP RULE:** A model-pinned parent request is evidence of selected model, not provider-wide inference attestation. Under the **current owner-approved D7/D17**, a selected Grok 4.6 primary/reviewer is required for substantive engineering and review, Composer 2.5 only for qualified simple fixes, and missing internal helper telemetry is disclosed rather than automatically blocking. Deliberate substantive off-policy delegation remains forbidden. See `16-owner-model-routing-policy.md`.

**Bootstrap deadlock:** The architecture currently demands an independent Grok review before adopting ADCP, but a secure automated model-verified reviewer depends on that not-yet-adopted ADCP and credentials. The next owner decision should explicitly choose an exceptional **review-only, no-merge** starting mechanism or defer, with exact steps and observable worker-model evidence. See `13-review-bootstrap-model-integrity.md`.

## Owner's revised model routing decision (BINDING, 2026-10-25)

**Exact new instruction:** "We will use grok 4.6 for all planning, code changes, technical reviews, security assessments and release decisions then we use composer 2.5 for simple bug fix."

**Grok 4.6** is the explicitly selected main executor and reviewer for architecture, features, substantive code changes, security, BMAD reviews and release decisions. **Composer 2.5** implements *only* narrow low-risk simple bug fixes with passing targeted/regression tests and **fresh independent Grok 4.6 `bmad-code-review`**. Escalate ambiguous/security/tenant/auth/billing/schema/infrastructure/Production changes back to Grok and the owner where material.

D17 is now **task-level routing**, not provider-internal every-inference proof. An unknown hidden helper model should be disclosed as `INTERNAL_HELPER_MODELS_NOT_ATTESTED` and **does not alone block** a properly selected Grok main-agent/BMAD review. Never claim exhaustive all-Grok internal model usage; never deliberately route core engineering decisions to non-approved models. **This supersedes, but does not erase, historical D18-A model-preflight failure**. That run never executed BMAD and gives no current-HEAD review PASS. Existing one-attempt authorization was consumed; **new run needs a new explicit owner authorization**.

Detailed eligibility/security criteria and evidence: `16-owner-model-routing-policy.md`. This is an approved **model policy decision**, not final AD-1..AD-10 adoption, new GitHub settings, keys, live workflow, PR merge or Production authorization.

## D10/D4/D11/D13/D12 owner security setup approval (2026-10-25, Singapore)

**Exact owner message:** "yes approved" in direct reply to the explicit question, "**Do you approve D10, D4, D11/D13 and D12 as specified in the security packet, with no credentials, merges or deployments authorized yet?**"

**This is a real, explicit owner approval of the exact S1–S4 security settings/design**, not a ChatGPT-authored GitHub comment impersonating independent human authorization. It authorizes the specified protective settings being applied by the owner through GitHub's administrative UI and their subsequent verification. It does **not** provide API permission to the ChatGPT-connected GitHub integration, endorse a merged code change, or authorize creation of a Cursor key.

**Approved scope:** (1) D10 `main` PR/checks protection and preservation of two-parent merge ancestry, no second human PR approval; (2) D4 isolated `adcp` sole owner reviewer, self-review prevention OFF only there, branch limited to trusted `main`, no initial secrets; (3) D11/D13 owner-triggered `workflow_dispatch` and actual Environment reviewer click rather than unauthenticated `OWNER_APPROVE` comment, conservative HOLD on material/unknown semantic impact; (4) D12 default-deny, least-privilege split-job design with no Production/UAT secret or main admin permission.

**Explicitly not approved:** D8 final AD-1..AD-10 architecture adoption, D5 credential issuance, automatic/real Cursor dispatch, workflow activation, PR #507/#513 merges, UAT redeployment, Production cutover or waiver of Grok 4.6 BMAD review gates. No changes to GitHub admin settings were executed by ChatGPT. The repository remains public and `main` was directly observed unprotected with no rulesets at last preflight.

**Source-of-truth packet:** [bridge security activation packet](https://github.com/fad16papa/Cohestra/blob/cursor/adcp-bridge-contract-mock-20261025/tools/adcp-bridge/OWNER-SECURITY-ACTIVATION-REVIEW.md), final decision and tracking [Issue #514](https://github.com/fad16papa/Cohestra/issues/514). Approval in this register is **not** proof of GitHub settings application. Treat new planning HEAD as unreviewed until a fresh Grok 4.6 AR/ECH/IR/CAT-SEC check after remediation.



## 2026-10-26 Full-autonomy D8 reconciliation (PLANNING ONLY)

**Owner intent:** The Product Owner rejected repeated Cursor Active/Inactive toggles, copy-pasting of new static agent prompts, manual review-result transfer and creating a new review automation per issue. The required target is a **durable ADCP controller** that accepts a previously approved story, dynamically dispatches Grok 4.6 engineering, runs tests and independent Grok BMAD/CAT-SEC reviews, fixes findings within the approved scope for at most three cycles, and escalates only real design/privilege/budget decisions. This is a requirement, **NOT acceptance of any specific security or API architecture**.

**Proposal for decision:** [18-d8-autonomous-controller-reconciliation.md](18-d8-autonomous-controller-reconciliation.md) and [GitHub Issue #517](https://github.com/fad16papa/Cohestra/issues/517). Suggested D8 subgates A–G cover: topology (GitHub-native + Cursor Cloud), full-P5 no-manual-intervention target, M-2/M-4/M-6 risk enforcement, replay-safe sole-owner attestation, binding D7/D17 model rules, separately authorized D5 credential/UAT merge effects, and exact-current-HEAD independent Grok review. **All remain PROPOSED / OWNER_GATE.** No D8 adoption inferred from "ok proceed" to *architecture reconciliation*.

**New empirical evidence:** Cursor selected-Grok 4.6 review [PR #513](https://github.com/fad16papa/Cohestra/pull/513#pullrequestreview-5646572151) at `cc0962b33e6a472c02145f8fa8a388bcde1beadd` automatically published to GitHub, proving a one-off report path, **not** a durable controller. The actual review **FAILED** with 2 BLOCKER + 2 MAJOR findings: sensitive PascalCase file classification, untrusted all-false impact, missing adversarial test fixtures, missing M-2/M-6 registry. Current offline mock #513 remains DRAFT, NO-MERGE.

**Credential/account issue:** Owner's Cursor dashboard shows Pro+ and user-scoped Admin/non-expiring keys, with Enterprise service-account entitlement not shown. Do not silently substitute a personal key for the earlier dedicated service-account direction; **D5 remains a separate owner-risk gate**. Owner's main branch protection is verified active, `adcp` sole-owner Environment is owner-attested. Neither removes the `main` CI→UAT deployment side effect or provides a safe unattended P5 lane.

**Execution still denied:** No new Cursor agent run, code implementation, API key creation, GitHub workflow or environment edit, merge, UAT or Production change. Next deliverable is independent selected-Grok 4.6 planning-security/architecture review on the exact current #507 SHA, followed by a concise D8 owner decision ballot. Grok review is not yet run on this proposal; do NOT mark REVIEW_PASS or ADOPTED.


## 2026-10-26 Product Owner release-branch and Production quality direction

**OWNER-SELECTED REQUIREMENTS, refined 2026-10-26:** A single Cohestra GitHub repository with protected `release/uat` and protected `main`. Exact **UAT-FIRST, HOLD-UNTIL-BUSINESS** path: scoped PR → changes → deploy to UAT → all required functional/integration/security tests and acceptance → **STOP in UAT indefinitely, even when clean**. ONLY a separate authenticated Product Owner **business instruction to move a specifically identified UAT-accepted version to Production** can initiate a controlled promotion PR to protected main followed by enhanced security/clean-and-lean Production release checks and separate owner Production Environment authorization. Green UAT checks, agent decisions, timers, labels and comments cannot automatically initiate main promotion or Production deployment. Main is only the Production provenance/source branch, and passing main CI must not redeploy UAT after the separately approved cutover. No separate UAT repository. This **supersedes both previous main→UAT and automatic UAT-pass→main designs**. Design intent only; **D8 still pending final adoption**, no live change authority.

**D8-H open implementation gates:** protected PR path feature→release/uat; explicit UAT acceptance ledger with immutable SHA, artifact digest and signed/reviewed results; **mandatory AWAIT_BUSINESS_RELEASE without auto-promotion**; independently authenticated, replay-resistant Product Owner business release instruction for the **specific accepted snapshot**, only then protected PR→main and final main SHA tests + UAT runtime-equivalence proof (otherwise UAT retest); fresh Production enhanced security/clean-lean review and separate actual Production Environment approval. Also guard release/uat CI/Environment/ref, right-SHA on-host checkout and special first-merge transition from `workflow_run(main)` auto-UAT deploy. Current main CI still triggers UAT, so owner must separately authorize the cutover's UAT impact. No release/uat branch created by this planning decision.

**Production release gate:** preserve existing owner-only `workflow_dispatch`, Environment `production`, exact SHA provenance from main and Epic 46 NO-GO. Proposal adds required application/security scanners, Grok review evidence, SBOM/digest provenance, base-image/container hardening, minimum runtime dependencies and ports, verified secrets isolation, and measured artifact/CPU/RAM budgets. Actual scanner choices, license/privacy concerns, severity waivers, numerical budgets and host/image changes remain owner-gated and Grok-reviewed.

**Source:** [19-uat-release-branch-and-production-quality-gates.md](19-uat-release-branch-and-production-quality-gates.md), [Release issue #519](https://github.com/fad16papa/Cohestra/issues/519) and [18-D8 architecture reconciliation](18-d8-autonomous-controller-reconciliation.md). No branch settings, workflow, credentials, code, UAT or Production changed; planning-only proposal changes do not count as D8 adoption.
