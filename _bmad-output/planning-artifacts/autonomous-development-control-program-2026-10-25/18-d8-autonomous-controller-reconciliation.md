---
title: D8 Architecture Reconciliation | ADCP v1 Durable Controller
date: 2026-10-26
status: PROPOSED_OWNER_REVIEW
owner_approval: NOT_RECORDED
grok_architecture_review: NOT_EXECUTED_FOR_THIS_REVISION
implementation_authority: NONE
merge: NO_GO
uat: NO_GO
production: NO_GO
issues: ["#506", "#514", "#516", "#517"]
prs: ["#507", "#513"]
---

# D8 architecture reconciliation: durable ADCP, not a one-off review automation

**DECISION REQUEST, NOT AN ADOPTED ADR.** This packet reconciles the existing proposed AD-1..AD-10/A1..A6, owner-approved D7/D17 model policy, R1 M-2/M-4/M-5/M-6, the P5 unattended-story requirement, and the observed PR #513 Grok 4.6 review. It has **no** authority to create credentials, launch Cursor agents, edit workflows, merge a PR, modify UAT or Production, or adopt an ADR. The issue/PR text is NOT proof of a human owner approval.

## 1. Nonnegotiable user-experience contract

The Product Owner approves an **objective, scope, impact boundary and budget once** and receives only meaningful progress, accepted evidence and genuine escalations. Routine approved implementation, tests, security reviews, correction iterations and report ingestion require **zero recurrent Cursor Active/Inactive toggles**, **zero manual transfer of dynamic prompts**, **zero creation of a new automation per defect**, and **zero result copy/paste**. A trusted, event-driven controller with durable state must perform those tasks. Human review is still needed for *new* material architecture/design decisions, unapproved privilege/credential/cost changes, out-of-scope findings and release/deployment authority.

A one-off native Cursor `Label Added` review automation, even if it returns a GitHub comment, fails this product contract. **Do not relabel the existing PR #513 bootstrap as ADCP v1.**

Evidence already established:
- Existing [PR #507](https://github.com/fad16papa/Cohestra/pull/507) planning is draft and unmerged. The current ADCP architecture spine AD-1..AD-10 remains `[PROPOSED]`; D8 not finally owner adopted.
- Existing [PR #513](https://github.com/fad16papa/Cohestra/pull/513) is a credential-free, **offline** mock. No Cursor API dispatch and no live credential are implemented.
- Selected-Grok 4.6 [independent review of PR #513 at exact SHA `cc0962b33e6a472c02145f8fa8a388bcde1beadd`](https://github.com/fad16papa/Cohestra/pull/513#pullrequestreview-5646572151): **FAIL, BLOCKER=2, MAJOR=2, MINOR=2, NIT=2**. The automated GitHub return path is empirically proven, but implementation quality is not.
- P0 mock has Composer eligibility false negatives for `AuthController.cs`, `TenantResolver.cs`, `PaddleWebhookHandler.ts`, `UserAuthorizationService.cs`, `SecretManager.cs` and more; untrusted all-false impact can bypass gating; 24 passing built-in tests omit those fixtures; M-2/M-6 registry is missing.
- Protected `main` was verified `protected=true` on October 26; `adcp` Environment is owner-confirmed with sole owner reviewer and main-only branch. These are **not** automatically safe P5 unattended execution credentials.
- `.github/workflows/deploy.yml` runs UAT deploy on successful main CI (workflow_run) and supports manual dispatch. Merging **even planning/control-plane-only** code to main can cause a UAT deploy. No merge without explicit, specific UAT side-effect authorization or separately reviewed and owner-approved deploy exclusion.

## 2. Proposed ADCP architecture: roles and boundaries

| Plane | Responsibility and runtime boundary | Must never do |
| --- | --- | --- |
| Product Owner | Only human authority for adopting material architecture/design, trust-boundary/secret changes, privileged execution and release; preauthorizes exact low-risk task scopes | Operate a toggle for each routine task; act as a second required PR reviewer |
| GitHub protected control plane | Immutable reviewed story manifests, queue/state/locks, trusted workflow definitions, model/permission policy, CI facts and append-only audit. **A new GitHub event wakes the controller but is NOT owner approval** | Execute untrusted PR code in a credential-bearing job, accept bot-authored approval claims or silently merge/deploy |
| Trusted ADCP dispatcher | Checks manifest and owner authority, resolves current SHA/model, produces versioned dynamic instructions and bounded invocation | Reuse a broad existing Cursor desktop API key, send secrets in prompt/`envVars`, or delegate unrestricted repo access |
| Cursor Grok 4.6 implementer | Substantive feature/refactor/security/controller implementation only within approved branch + scope; commits to isolated draft branch where permitted | Decide new material architecture, approve its own work, merge to main or deploy |
| Separate Cursor Grok 4.6 reviewer | Independent run on **newest exact HEAD**, true installed `bmad-code-review` with CAT-SEC security/threat rubric and appropriate AR/ECH/IR evidence | Treat 24/24 generic tests as security PASS; review stale HEAD; self-certify implementation |
| CI and evidence reporter | Exact-HEAD build/test, supply-chain/GitGuardian, deterministic classifier checks, sanitized GitHub PR reports and milestone/owner notifications | Declare PASS with skipped/neutral/mismatched security checks or unexecuted BMAD workflows |
| Optional ChatGPT adviser | Human-invoked ChatGPT or separately approved OpenAI API job to analyze GitHub evidence and draft owner decision packets | Claim to be an always-on chat listener, independently approve ADRs, substitute for Grok security signoff |

**Source of truth:** GitHub issue/story contract + exact commit SHA and verified check outcomes. Cursor chat transcripts are helpful artifacts, not sole authority. A second *model-pinned execution* can supply engineering independence, but is not a second human GitHub approval.

## 3. Option selection for D8 (reconciled)

**Recommended provisional topology A:** **GitHub-native orchestration + Cursor Cloud Agents API** (not adopted yet). GitHub Actions, a tightly scoped trusted service or another verified durable runner owns polling/state, owner gates and event matching. Cursor remains executor/reviewer; it does not become the controller. GitHub is source of truth. No always-on DigitalOcean Production service is needed for this design by default.

The previously proven native Cursor Automation can remain a **disabled proof-of-concept** and potentially a low-privilege output channel. **It cannot be used as the final authority boundary** because PR labels may be bot-generated, the agent can push isolated branches, prompts were static, and per-run activation was manual. An event on a label cannot prove human owner approval, nor enforce idempotent repair loops.

**Unresolved critical account fact:** Owner's dashboard shows **Cursor Pro+ ($60/mo)**, not Enterprise; only *personal User API Keys* were visible with three existing **Admin / never-expiring** keys. Cursor Enterprise-only service-account capabilities and team GitHub integration are **not available in the observed personal UI**. Thus the originally proposed *dedicated Enterprise service-account key* is **not presently a feasible assumption**. **DO NOT** reuse an existing Admin key, create a key, change plan or enable on-demand spend under this packet. Feasibility testing must determine provider-enforced token scopes/expiry/repository access. A new personal API key is a **material residual-risk decision** for the owner, not a default fallback. If acceptable scope cannot be enforced, remain HOLD or present a verified alternative.

**Alternative B:** Native Cursor Automations coupled with GitHub event triggers only if a controller can supply runtime-verified immutable manifests, dynamic instructions, distinct execution/reviewer identity, reliable callbacks and protected trigger provenance **without** trusting labels or manually changing static prompts. These guarantees are NOT evidenced by the successful one-off review; do not claim B meets unattended ADCP without a negative-test proof.

**Alternative C:** Isolated Cursor local SDK runner with explicitly allowlisted tools and separately secured repo/host credentials. More operating burden and new attack surface; reserve for documented failure of A/B and new owner decision. Do not use the UAT or Production droplet as an ADCP host absent separate approval.

## 4. Trust contract: immutable approval, not a GitHub label

Approved-task envelope (proposed schema, not code):

```json
{
  "schemaVersion": "adcp.task.v1",
  "taskId": "owner-approved-stable-id",
  "repository": "fad16papa/Cohestra",
  "baselineSha": "exact-40-char-sha",
  "approvedStoryRef": "immutable-reviewed-story-reference",
  "approvedScopeDigest": "sha256-of-canonical-contract",
  "allowedChangedPaths": ["safe-scope-contract"],
  "forbiddenRiskClasses": ["auth", "tenant", "billing", "schema", "secrets", "production"],
  "taskClass": "approved-feature-or-reproducible-low-risk-fix",
  "modelPolicy": "D7-D17-2026-10-25",
  "maxFixReviewCycles": 3,
  "expiresAt": "explicit-expiry",
  "ownerAttestationRef": "independently-verified-human-approval-event"
}
```

**Note:** `ownerAttestationRef` is *proof of a real authenticated human action*, not simply an issue comment, label, `github.actor`, `ownerApproved:true`, or a value the task author supplies. Immutable reviewed story authority requires an independently trusted attestation/ledger; proposal M-5 must be accepted and tested before implementation.

**Path + semantic enforcement M-2/M-4/M-6:** first normalize paths/renames/case/symlinks and evaluate the **complete** protected registry; then independently compare the actual HEAD diff, changed files and API/auth/tenant/billing/schema/security/CI/deployment effects with the preapproved scope. Inputs declaring all material impact false **never create authorization**. Unknown, missing or ambiguous impact = `HOLD`. Re-evaluate on **every new implementation HEAD**; a known affected path is not automatically owner-authorized just because a related story exists.

Proposed reasons: `SCOPE_MISMATCH`, `PROTECTED_PATH`, `SEMANTIC_IMPACT_UNKNOWN`, `MODEL_POLICY_DENIED`, `MISSING_TRUSTED_OWNER_PROOF`, `STALE_HEAD`, `BUDGET_EXHAUSTED`, `REVIEW_EVIDENCE_INCOMPLETE`. Each reason must bind to exact event + SHA, manifest version, static check(s) and human decision when one is required.

## 5. Durable controller workflow and acceptance invariant

Proposed state transitions:

```text
UNAPPROVED
  └─(verified owner approval of bounded scope)─→ READY
READY → PREFLIGHT → DISPATCHING → IMPLEMENTING → AWAITING_CI
AWAITING_CI → INDEPENDENT_GROK_REVIEW
INDEPENDENT_GROK_REVIEW
  ├─(0 BLOCKER + 0 MAJOR, all exact-HEAD checks green)─→ READY_FOR_OWNER_DISPOSITION
  ├─(remediable issue, within approved scope + budget)─→ FIXING → AWAITING_CI
  └─(ambiguous/material/drift/timeout/quota/max attempts)─→ OWNER_GATE
OWNER_GATE → APPROVED_NEW_SCOPE or STOPPED
READY_FOR_OWNER_DISPOSITION ─(separate merge/deploy gate)─→ CLOSED
```

- **Durable queue + leases:** one task and one active Cursor run per immutable task/attempt; atomic transaction/lock; persisted agent/run ID + exact branch/SHA; crash/restart and webhook redelivery cannot double-dispatch. Validate Cursor API idempotency and race conditions before credentialed use.
- **Model routing:** Grok 4.6 explicitly selected and live-catalog-verified for planning, substantive implementation, review/security/architecture/release evaluation. Composer 2.5 is allowed only for a *prior* mechanically validated isolated low-risk/simple-fix task under D7/M-6; it never reviews its own work. No Auto fallback. Unknown internal helper model IDs disclose `NOT_ATTESTED` but don't falsely claim all-inference purity.
- **Dynamic instruction builder:** versioned in the protected repo; composes approved story, updated diff, cataloged BMAD skills, task-specific test and threat context, newest findings, current HEAD and immutable scope. Agent cannot modify its own authorizing contract/runner template. Hash prompt version + task contract + review head and record provenance; no manual prompt copying.
- **Mandatory lifecycle:** `IMPLEMENT → BUILD/TEST → FRESH INDEPENDENT GROK BMAD + CAT-SEC → TRIAGE → FIX → RETEST → FRESH GROK REVIEW`. Maximum **3** fix/review cycles **per approved task**, then `OWNER_GATE`; no quiet infinite retry. Compiler failures, stale review or CI fail safely. No simultaneous actor and reviewer writing the same branch.
- **Review evidence:** `0 BLOCKER + 0 MAJOR`, correct exact SHA, required CI/GitGuardian job conclusions exactly `success` with trusted source apps, BMAD skills actually executed, test logs and reason-coded risk review. A Cursor run status `Succeeded` **does not mean review PASS** (see #513).
- **Closure and release hold:** engineering review PASS is never business release approval. After complete UAT acceptance, an immutable accepted version stays `AWAIT_BUSINESS_RELEASE` indefinitely, and the controller cannot automatically create a main PR or Production dispatch. Only an authenticated owner business instruction for a specifically accepted version may initiate the main promotion/security process, which still requires separate Production Environment approval. The old main-CI-triggered UAT behavior persists until a guarded cutover.

## 6. Two explicit security lanes, not repeat owner toggles

| Lane | Approved use | Auth boundary | Result |
| --- | --- | --- | --- |
| **Routine low-risk** (future P5) | Preapproved limited story; isolated branch; bounded model usage and tests; no sensitive architecture/diff risk | Separate least-privilege **non-interactive** execution identity + trusted immutable scope, protected control-plane code, real budget, no main write or UAT/Production credentials; must receive a separately approved authority design | Can operate unattended **only once owner adopts P5** |
| **Privileged/material** | Architecture changes, workflows, secret/permission classes, provider plan/keys, production, UAT side effects, deployment and exceptional budget | Real Product Owner identity confirmation (the existing `adcp` Environment required reviewer is a candidate for privileged gate); replay-resistant and exact-SHA-bound human approval | Stops until actual owner approval |

Never remove the existing `adcp` required reviewer to claim unattended execution. Never treat a ChatGPT-connected GitHub comment (possibly attributed to `fad16papa`) as a human-controlled approval. No second GitHub human is required; engineering independence comes from distinct Grok review and CI evidence, not fabricated peer approval.

**Credential and cost gate:** exact provider key capabilities, repository confinement, GitHub App permission matrix, secret lifecycle, cost estimate/ceiling, plan's disabled on-demand spending and incident revocation must be independently verified and **separately accepted by the owner**. A service account requires an eligibility/provider proof; otherwise decision HOLD.

## 6A. Owner-selected UAT release branch and Production clean/lean gate (2026-10-26)

The Product Owner selected **one Cohestra repository with protected main and protected release/uat**, and refined the UAT-first sequence to **feature/task PR → changes → UAT deployment/tests/acceptance → mandatory HOLD indefinitely in UAT**. **UAT PASS is NOT authority to create a main promotion PR or deploy Production.** A **separate authenticated business release instruction**, naming the specific immutable accepted UAT version, is the only trigger to begin promotion through a protected PR into main. Main is the Production provenance/source branch, not an automatic UAT trigger. Production still needs exact-final-main-SHA CI, security, Grok where applicable, UAT source/runtime equivalence, clean/lean artifact checks and the actual owner Production Environment approval. This supersedes both prior main→UAT promotion and automatic UAT-pass→main proposals. **Owner-selected direction, not live implementation authorization.**

See [19-uat-release-branch-and-production-quality-gates.md](19-uat-release-branch-and-production-quality-gates.md) and [release safety contract #519](https://github.com/fad16papa/Cohestra/issues/519) for branch protection, provenance, UAT CI/manual dispatch safeguards, existing workflow/test changes, and Production SBOM, dependency/container scanning, host checks, runtime-only images, least privilege and artifact budget controls.

Until the migration's workflow and host contracts are safely installed, a successful main CI **still triggers the old UAT deployment workflow**. Its first cutover merge needs an explicit owner UAT-impact gate. This owner direction **does not** authorize creating release/uat, changing permissions or deploying.

## 7. Owner decisions requested to turn this proposal into an adoptable D8 ADR

| Decision subgate (all PENDING) | Recommended candidate | Owner must explicitly decide |
| --- | --- | --- |
| **D8-A topology** | GitHub-native durable state machine + Cursor model-pinned Cloud Agent executor/reviewer; keep native Automations only as P0 prototype | Adopt A vs request comparison with B/C |
| **D8-B autonomy target** | Full P5 accepted outcome = no routine toggles/prompts; bounded repair loops inside owner-approved story | Approve P5 as a required design property, NOT grant unattended run authority now |
| **D8-C risk enforcement** | M-2 path registry + M-4 actual-diff semantic validation + M-6 Composer deny-list; unknown → HOLD | Accept fail-closed false-positive/owner escalation tradeoff |
| **D8-D owner proof** | Owner-authenticated, SHA/scope-bound, replay-resistant approval; issue labels/comments insufficient; separate P5 routine and privileged lane | Choose/approve implementable proof mechanism after a threat-model demonstration |
| **D8-E engineering model/review** | Already approved D7/D17 policy plus independent Grok per new HEAD and max three fix loops | Reaffirm integration; no model-policy waiver |
| **D8-F credential and deploy treatment** | Defer real key choice to D5; require separate specific approval of any main merge and its automatic UAT impact | Accept planning constraints, **not credential/merge approval** |
| **D8-G deliverable** | Revised spine, PRD, governance, story backlog and executable negative-test contract with **fresh Grok architecture review** of exact HEAD | Allow Grok-reviewed planning before final architecture adoption |
| **D8-H UAT HOLD + business-directed Production release** | **Owner-selected direction:** feature PR → protected release/uat → UAT acceptance → **STOP indefinitely**. Only an authenticated owner business instruction for a specified immutable UAT version can initiate a protected PR into main; separate Production deployment remains owner-only. Exact-main-SHA CI/security, Grok review, UAT source/artifact equivalence, extra clean/lean Production gates apply | Grok-review and separately approve protected branch/CI rules, immutable acceptance ledger, replay-safe business instruction, main promotion authority, old UAT trigger cutover, image budgets and actual runtime actions **before implementation** |

**This entire table is an owner decision REQUEST. No answer has yet been supplied by the owner.**

## 8. Safe implementation staging after D8 (not authorized now)

1. **P1:** Grok-owned fix of PR #513's two BLOCKER and two MAJOR findings; complete M-2/M-6 and M-4 diff binding, independent true negative fixtures, offline state machine/idempotency/replay tests and latest-SHA Grok review. Existing mock code is quarantined until then; do not reuse ChatGPT's previous mock as an accepted Grok implementation.
2. **P2:** Trusted runner/dispatcher manifest compiler, exact-model catalog preflight, permission boundaries, durable callback/report, crash/restart recovery. Credential-free tests before live auth. No PR-controlled script in secret-bearing action.
3. **P3:** Observable reporting, queue status, owner decision packet delivery, safe retry and cost controls.
4. **P4:** Harmless non-deploying, owner-started pilot after actual D4/D5/D10/D11/D12 authorizations, verified runtime/source model, UAT-merge isolation, and specific owner consent for any workflow installation.
5. **P5:** Separately approved **unattended low-risk** lane with no recurring human dispatch/cursor toggle, proven failure→fix→retest→independent review until pass or owner gate. Sensitive or material actions and **all Production** remain explicitly owner-gated.

**No GitHub workflow, Docker/UAT/Production runtime file, Epic 46 artifact, secret, credential, infrastructure setting, `sprint-status.yaml` or executable source is changed by this reconciliation.**

## 9. Grok 4.6 architecture-review contract (PENDING, not executed)

Request a **separate**, single selected-Grok 4.6 **planning-only** review of the exact latest #507 HEAD when the planning packet is complete. The reviewer must read `README.md`, `03-prd.md`, `04-governance.md`, `07-implementation-proposal.md`, `08-epics-and-stories.md`, `09-owner-decision-register.md`, `10-architecture-amendment-proposal.md`, `16-owner-model-routing-policy.md`, `17-r1-remediation-contracts-and-owner-gates.md`, `18-d8-autonomous-controller-reconciliation.md`, architecture spine, actual `.github/workflows/deploy.yml`, [#517](https://github.com/fad16papa/Cohestra/issues/517), and [the verified failed code review of #513](https://github.com/fad16papa/Cohestra/pull/513#pullrequestreview-5646572151).

**Review methodology:** Cataloged applicable BMAD AR / ECH / IR planning reviews where genuinely available; CAT-SEC threat-model rubric; no invented `bmad-security-review`, no falsely claiming `bmad-code-review` complete on planning-only content. Explicitly challenge: owner proof spoofing; Pro+ key risk, model provenance, Cursor/repo write scope; P5 safe-lane escalation, path+semantic review outside protected names; dynamic prompt injection from issue/PR content; exactly one active task under duplicate events and crash; UAT main-merge side effects; no auto Production; per-SHA review freshness; budgets and one-owner practicality. Distinguish **BLOCKER / MAJOR / MINOR** and zero-BLOCKER/MAJOR exit criterion. Parent-only sequential analysis is acceptable if the provider cannot launch safe subagents; disclose unexecuted skills.

**Required output:** Review status, exact HEAD, model evidence, actually executed skills, 10 CAT-SEC controls, concrete exploit/negative tests, severity with paths, explicit AD-1..AD-10 and P5 compatibility matrix, candidate decisions D8-A..G, unresolved owner choices, and a final recommendation. Post to GitHub as evidence. **No code changes, API keys, PR merge or deployment.**

Do not initiate a Cursor review just because this contract exists. A live agent must be separately authorized and technically triggered by a verified supported mechanism; a static PR-label-only automation pinned to #513 is NOT capable of reviewing this new #507 HEAD without a new configuration and permission gate.

## 10. D8 disposition checkpoint

**D8 = OWNER_GATE / PROPOSED.** This draft should first be independently reviewed, then returned with a concise Product Owner ballot recording the accepted or modified choices. The final architecturally adopted ADR is a distinct action and must carry actual owner-authenticated evidence. Until then **NO controller implementation, NO credentials, NO workflow merge, NO UAT/Production operations.**
