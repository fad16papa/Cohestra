---
title: ADCP Model Integrity and Independent Review Bootstrap
created: 2026-10-25
status: PROPOSED_OWNER_REVIEW
decision_ids: D17 D18
owner_approval: OPEN
credentials: NONE
model_verified: NO
production: NO_GO
---

# Independent Grok 4.6 review bootstrap and strict model integrity

> **HISTORICAL ANALYSIS, SUPERSEDED IN PART BY OWNER MODEL DECISION OF 2026-10-25:** This document records the former requirement to prove every parent/helper inference used Grok 4.6. The owner subsequently established a simpler **task-level model-routing policy** in [16-owner-model-routing-policy.md](./16-owner-model-routing-policy.md): Grok 4.6 for main planning/coding/security/review/release responsibilities, Composer 2.5 only for eligible simple bugs with Grok review. Hidden provider-helper model telemetry may be missing; disclose it rather than block solely on that absence. **Do not use older recommendations here to demand a local SDK fallback or prevent a new owner-authorized review attempt solely over hidden helper telemetry.** The historical D18-A run never executed BMAD, so no review PASS is inherited. No new run, key or settings action is authorized.



## Verified source findings

1. [Cursor Cloud Agents API](https://prod.cursor.com/docs/cloud-agent/api/endpoints) supports `GET /v1/models` for available IDs and explicit parent `model.id` on `POST /v1/agents`. This ensures an API *requested model*, **not** every helper model used during execution.
2. [Cursor Cloud Agent release notes (week of September 21, 2026)](https://cursor.com/docs/release-notes/cloud-agents) explicitly say coordinators can switch a worker's model on message.
3. [Cursor support, September 15](https://forum.cursor.com/t/cloud-agents-dont-adhere-to-my-selected-model/171688) says some project workers ran on other models despite parent Grok 4.6, and natural-language prompt instructions are guidance **not enforcement**.
4. [Cursor staff, September 30](https://forum.cursor.com/t/cloud-agent-logs-claude-4-5-sonnet-when-picker-is-grok-4-6-and-claude-is-not-enabled/169638/39) says computer-use/browser/video/exploration helpers currently can use other models, and disabling models in desktop picker does not restrict these cloud helpers. We found **no vendor guarantee** of Grok-only helper enforcement as of this planning review.
5. [Cursor staff, October 5](https://forum.cursor.com/t/cursor-project-orchestrator-ignores-model-in-model-picker-defaults-to-4-7-high/173675) reported a Project coordinator changing an active model independently of the displayed selection.

**Consequence:** The owner's Grok 4.6-only rule must cover every executed AI subtask, not just API parent requests. A PR report must say `MODEL_POLICY_VERIFIED` only with model IDs for all model-inference events, or a provider-supported enforced single-model mode that disallows all alternative-model assistants. A request-level Grok pin alone is `MODEL_REQUESTED`, **not verified execution**.

## Current bootstrap deadlock

- Final adoption D8 requires current-HEAD independent Grok BMAD review on draft PR #507.
- Secure model-attested automated review depends on a dispatcher, GitHub protections, Cursor API credentials and a trustworthy model-provenance check.
- Those privileged operations are blocked pending final D8/D4/D10/D12 and provider model verification.
- `@cursor` GitHub comments can start an agent but offer no independently verified exact Grok 4.6/child-worker restriction; no direct Cursor tool/connector is currently available to ChatGPT.

**Do not solve by relabeling ChatGPT document review as Grok 4.6, or by silently granting broad bootstrap privileges.**

## D18: exact choice for the permanent sole owner (all alternatives are currently UNAPPROVED)

### A. One-time owner-initiated review-only Cursor UI run (recommended as fastest operational attempt)

**Owner action requested if explicitly approved:** Open Cursor Cloud Agents, choose the Cohestra repository, **select Grok 4.6 explicitly**, and initiate **one planning-only review** that reads the prewritten GitHub PR #507 and issue #508 review instructions; do not use Auto. This is a one-time user action, **not** repeated long prompt copying or a standing implementation process.

**Review execution contract:** Inspect current exact PR HEAD and proposed architecture, run installed BMAD adversarial/edge/security/implementation-readiness reviews, write an evidence-only review artifact/draft PR comment. No code changes, merges, environment/secret/workflow changes, deploys, helper agent fanout or follow-up steering. Declare requested model and whether any helper inference occurred.

**HISTORICAL LIMITATION UNDER THE FORMER RULE:** UI-selected model did not prove every helper inference was Grok; D18-A therefore reported MODEL_USAGE_UNVERIFIED without doing BMAD. This strict all-helper proof STOP has been superseded by binding D7/D17 task-level model routing. Do not use this archived condition for new reviews. Full end-to-end ADCP remains blocked. The current ChatGPT connection cannot start this Cursor run directly. Owner may need to initiate a single short action; do not pretend the GitHub issue automatically wakes an agent.

### B. Owner-gated review-only API/bootstrap runner (defer pending detailed review)

Request new narrow owner approval for a read-only or documentation-only transient reviewer, first protecting main/workflow boundaries and creating a dedicated isolated review-only secret scope, with testable single-run limits, explicit model ID, no PR code execution in secret-bearing jobs and audited revoke/recovery. Requires extra security design and a secret-creation owner gate **before** final full architecture adoption; the bootstrap exception must be precisely bounded and cannot be backdated from preliminary D8/D10/D4/D12 preferences.

**Limitations:** More work and credentials than A. Still cannot guarantee model purity where Cursor helpers use other models. No bootstrap runner may be created solely on this proposal.

### C. Defer Grok-only review until vendor provides provider-enforced model policy

Avoids a known model-mixing risk entirely, but pauses ADCP implementation. Document evidence required to resume: explicit vendor guarantee or per-run verified model inventory for every inference, including helper/subagent work.

## Owner review request

- **D17 model purity:** RECOMMEND **STRICT**: no non-Grok helper exception, no automatic fallback, no claim of provider enforcement absent evidence. Alternative relaxation would amend the owner's existing model policy and needs specific owner authorization; never infer it from "proceed".
- **D18 bootstrap:** RECOMMEND A as a bounded one-time read-only **attempt**, with an explicit fail-closed model audit. If the owner prefers zero manual Cursor actions at all costs, defer to B, after an independent security-design owner gate. If owner prioritizes guaranteed Grok-only execution over speed, select C.

**Approval scope if owner selects A:** one review-only user-initiated Cursor execution on current PR #507. It does **not** adopt AD-1..AD-10, approve GitHub settings, authorize key creation, launch an unverified-model workflow, merge any PR or enable Production.

## Required review evidence checklist

- Current PR HEAD 40-hex SHA and source GitHub URL.
- Catalog-verified BMAD review skills used, command/run identifiers and genuine technical findings.
- Independent Grok 4.6 review verdict and exact model/s for parent, worker and helper inference. Where a model is not identifiable, **NO-GO**.
- GitGuardian/current-HEAD CI checked separately.
- BLOCKER/MAJOR/MINOR, architecture/security tradeoffs, outstanding owner decisions.
- Absolutely no new keys, changed workflows, merged main, UAT/Production side effects, or relaxed merge policy.
