---
title: ADCP Architecture Amendment Proposal — A1 through A6
status: PROPOSED_OWNER_REVIEW
date: 2026-10-25
baseline_reviewed_head: 781bd04c13376c8da511e2416421ddbd66c5d067
supersedes: nothing; proposes amendments to 03, 04, 05, 06, 07, 08, 09 and architecture spine
owner_approval: NOT_RECORDED
implementation: NO_GO
production: NO_GO
---

# Architecture amendment packet for Product Owner

**This document is a proposal, not an adopted ADR or implementation authorization.**
PR #507 remains a draft. Epic 46 and PR #505 are excluded.

**Source:** PR #507 ChatGPT independent architecture review:
https://github.com/fad16papa/Cohestra/pull/507#issuecomment-6395301030
**Tracking:** #506 and architecture reconciliation task #508.

## What the owner has already directed

- Proceed with the Autonomous Development Control Program as a separate workstream.
- Prefer **Option A**, GitHub Actions + model-pinned Cursor Cloud Agents API, for the pilot.
- Retain the Product Owner's authority over system, code/software, infrastructure, security, and data architecture, including decisions within established standards.
- Make executive summaries and full technical milestone evidence mandatory.
- Stop requiring manual transfer of ChatGPT work into GitHub/Cursor wherever an authenticated integration can perform that transfer.
- Keep Production NO-GO, Epic 46 untouched, and standing autonomous main merges unapproved.

## A1 — ChatGPT's actual job is orchestrator and technical advisor

**Problem:** Current FR-2/AD-2 reduce ChatGPT to skill suggestions; this cannot deliver the requested workflow.

**Proposed amendment:**
- ChatGPT, *when actively invoked*, can perform product analysis, compare architectural choices and impacts, select **catalog-verified** BMAD workflows, write approved story execution contracts in GitHub, inspect PR/CI/security evidence, and coordinate routine next actions within approved policy.
- Cursor/Grok 4.6 retains mandatory **engineering execution and independent BMAD review** authority under inherited Epic 45 AD-12. ChatGPT's feedback is not the Grok 4.6 signoff and never authorizes architecture changes by itself.
- GitHub Action runner maintains durable task state between ChatGPT turns; it cannot imply ChatGPT is continuously running.
- For *future full autonomy*, an on-demand OpenAI API advisory worker may be integrated, but the Product Owner must approve credential, data egress, expense and retention design before activation. The service may not impersonate an interactive chat session.

**Tradeoff:** Greater orchestration usefulness, but future model-driven advisor integration adds vendor processing and permission scope. **Owner decision:** Explicitly approve reconciled role split and any amendment to AD-12 before adoption.

## A2 — Explicit task-model routing (updated by owner decision, 2026-10-25): Grok 4.6 + limited Composer 2.5

**Problem:** Existing D7 says executor model may follow defaults or be set by owner, contrary to Cohestra's selected exclusive model policy.

**Proposed amendment:**
1. Authenticated dispatcher calls `GET /v1/models` at startup or cached within a bounded validity period.
2. Validate a **specific returned model ID** corresponds to Grok 4.6; require operator-approved mapping of ID to display name; never hardcode an unverified guessed ID.
3. Dispatch via `POST /v1/agents` with explicit `model: {id: approved_model_id}`.
4. Confirm requested model ID and Cloud Agent run identity in audit output. If API does not expose actual model usage, mark that separately as **NOT VERIFIED**; request-level pin is not runtime attestation.
5. No Auto/default fallback; unsupported model, changed catalog, or missing credentials => `RESULT=REFUSE MODEL_NOT_VERIFIED`.
6. For any child/steer/review run, apply the same policy. Composer 2.5 only when separately authorized for a strictly scoped simple fix.

**Owner decision:** Approve hard-pin + fail-closed, and accept that availability remains UNVERIFIED until authenticated model inventory is obtained. Do not dispatch before it is verified.

## A3 — Secure the GitHub trust boundary before any API key

**Problem:** `main` is unprotected and untrusted workflow/PR code can attempt credential exfiltration.

**Proposed sequence (settings owner gate):**
1. Inventory **names and scopes**, never values, of repository and organization secrets; identify any Production/UAT-class secrets reachable from generic jobs.
2. Propose GitHub rulesets / branch protection / CODEOWNERS (or an equivalently verified mechanism) for `main`, controlling privileged `.github/workflows/**`, policy, secret, and protection paths.
3. Define mandatory reviewer identity *independently* from dispatch identity. GitHub Environment self-review setting must be tested: if the sole owner starts a job and prevent-self-review is enabled, owner alone cannot release the environment.
4. Create dedicated Environment `adcp` only after owner-approved security architecture and review mechanics; ensure both branch restrictions and required reviewer configuration are effective.
5. Store only a **dedicated service-account** `CURSOR_API_KEY` in approved `adcp` secret scope; never reuse owner personal credentials, Production keys, GitHub PATs, droplet SSH or UAT credentials.
6. Deny all other secret classes from the dispatcher by contract tests and code review, including environment inheritance and indirect transfer in `envVars`, MCP headers/environment, prompt bodies, files and artifacts.

**Owner choices to resolve:** Protected-main behavior; required human reviewer plan; how to avoid self-review deadlocks while preserving scrutiny. No settings modification is approved by this draft.

## A4 — Pilot versus full autonomy have DIFFERENT acceptance criteria

**Milestone P (controlled no-copy pilot):**
- ChatGPT creates contract in GitHub without owner copying text.
- Owner-started `workflow_dispatch` with authenticated actor and required GitHub Environment review; `@cursor` comments alone are not an acceptable Grok 4.6-pinned launch.
- Dispatcher pins model from authenticated `GET /v1/models` and creates one Cursor agent on a non-main branch.
- Cursor follows approved BMAD story workflow; opens draft PR with exact HEAD.
- CI, GitGuardian, independent BMAD review and milestone report are recorded with URLs/SHAs.
- Orchestrator stops on timeout, workflow/architecture-change discovery, review failure after bounded cycles, or owner gate.
- No Production/UAT side effects, runtime changes or merge.

**Milestone F (full unattended loop, separately owner-approved):**
- Authorized event/queued task can start without a person copying prompts or manually pressing dispatch for every story.
- Durable state machine `QUEUED -> APPROVED -> DISPATCHING -> AGENT_RUNNING -> PR_READY -> CI_REVIEW -> FIX_OR_GATE -> DONE` with idempotent transitions.
- Automated issue scheduling, bounded fix-review loops, cross-story dependency checks, verified exact HEAD, owner notifications.
- ChatGPT-equivalent advisor role is invoked **via an approved API integration or explicit user session**; do not claim this chat itself wakes up.
- Measurable budget, rollback and incident controls. Explicit owner decision required for external model/API integration, data export, credentials, cost, retention, and permission scope.
- Production remains owner-only, independent of success of full engineering automation.

**Owner decision:** Choose the acceptable completion definition for each milestone. Do not claim pilot == full autonomy.

## A5 — Architecture impact detection must be semantic + path based

**Problem:** A path allowlist alone misses important architecture decisions in ordinary source files.

**Proposed 2-stage enforcement:**
- **Before dispatch:** Story contract describes API/data changes, service boundaries, auth and tenancy implications, security, billing, infrastructure, cost and runtime effects. Any material design question -> OWNER_GATE.
- **At PR HEAD:** Compare actual diff to approved contract. Protected paths always halt, plus semantic review of schemas/migrations, API shapes, tenancy, auth, secrets, billing and cloud/network behavior regardless of file paths.
- Include an owner-approved design decision ID and link for every material change. Reviewers must not treat “inside approved standards” as permission to adopt a new architecture on behalf of owner.
- Automated classifier failure, uncertainty or absence of required reviewer -> HOLD, not assumption of safe change.

**Tradeoff:** More gated decisions and some false positives; safer than automatic changes to strategic architecture.

## A6 — Identity, idempotency, budgets and review evidence

**Proposed dispatch contract:**
- Default `workflow_dispatch` only, verified `github.actor` from an owner-maintained allowlist; disable label/comment automation until reviewed.
- Immutable GitHub issue task ID and one active run per dispatch key; Cursor `agentId` idempotency semantics must be validated against public beta schema before relying on it.
- One agent/branch for pilot; refuse `workOnCurrentBranch` against `main`.
- Require explicit budget for run, polling, retries and monetary cost; include CI completion in timeout.
- Runner may use `CURSOR_API_KEY` only within the authorized job; API key never sent into agent prompts, `envVars`, MCP configuration, artifacts, GitHub comments, or logs.
- Record event initiator, authorized reviewer, model requested, Cursor agent/run identifiers, branch and HEAD, workflow run, GitGuardian, BMAD review, retry/steer/cancel events and owner approvals.
- Fail closed on missing/neutral checks where applicable, forbidden paths, unapproved privilege or model mismatches.
- Document cancellation, incident response, key revocation and rollback tests before any key-backed execution.

## Owner decision packet (nothing in this table is implicitly adopted)

| Decision | Proposed direction | Status |
| --- | --- | --- |
| Role split / AD-12 compatibility | ChatGPT orchestrates when invoked; Grok 4.6 reviews/executes | PROPOSED amendment |
| Model policy | Verified Grok 4.6 hard pin for all engineering runs | PROPOSED |
| GitHub trusted control plane | Protect `main` and workflow-sensitive paths before credentials | PROPOSED |
| Pilot execution | GitHub Actions + Cursor API, owner-started first | SELECTED DIRECTION; implementation not authorized |
| Environment | `adcp`, least privilege, protected, reviewer-deadlock assessed | SELECTED DIRECTION; not provisioned |
| Full autonomy | Separate event-driven/advisor API architecture and owner gate | PROPOSED |
| Epic number | 47 reserved, tracker unchanged until adopted | SELECTED DIRECTION |
| Merge | Existing owner gates and previously approved narrow UAT policy remain | UNCHANGED |
| Production | NO-GO | UNCHANGED |

## Mandatory next review

1. Reconcile this packet into the proposed spine/PRD/governance/stories only after evaluating tradeoffs; preserve the prior first-pass FAIL evidence.
2. Invoke installed BMAD adversarial, edge-case and security reviews on the **new exact HEAD** using Grok 4.6; report findings and patches accurately.
3. Produce a decision-ready milestone report containing explicit Product Owner approvals **before** adopting any ADR.
4. Only then implement a **credential-free, no-live-Cursor-API dry run** in a separate PR. Live dispatch remains a separate gate.

## A2 owner policy reconciliation (approved task routing only, 2026-10-25)

The owner's explicit new model policy `16-owner-model-routing-policy.md` supersedes earlier statements suggesting every hidden helper inference must be Grok. Choose Grok 4.6 for all planning, substantive coding, security and reviews; Composer 2.5 is permitted to implement only narrowly qualified low-risk simple defects, followed by direct Grok code/security review. API `model.id` evidence applies to **deliberately assigned main agents/reviewers**. Record unknown internal helper models without an all-inference hard-stop, and do not assign them engineering decision authority. The amendment as a whole is still PROPOSED and requires final D8 adoption.
