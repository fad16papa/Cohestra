---
title: Cohestra Owner-Approved Engineering Model Routing Policy
decision_id: D7-D17-2026-10-25
date: 2026-10-25
status: OWNER_APPROVED_POLICY
implementation: NOT_STARTED
architecture_adoption: NOT_APPROVED
cloud_credentials: NOT_CONFIGURED
production: NO_GO
---

# Cohestra engineering model routing policy

## Owner decision (binding within the ADCP planning workstream)

On 2026-10-25 the sole Product Owner instructed: **"We will use grok 4.6 for all planning, code changes, technical reviews, security assessments and release decisions then we use composer 2.5 for simple bug fix."**

This document governs model **selection and ownership of engineering work**. It **supersedes the former D17 requirement** to prove that *every hidden or provider-managed internal inference* ran on Grok 4.6. That old requirement caused the D18-A Cursor review to halt at `MODEL_USAGE_UNVERIFIED`. The historical report and its findings remain accurate **under the previous rule**, but that missing helper telemetry is **not, by itself, a blocker under this new policy**. The owner has approved the revised model policy, **not** any implementation, new agent run, additional credentials, GitHub settings changes, final architecture adoption or merge.

## Mandatory assignment matrix

| Task / decision | Required primary assigned model | Mandatory evidence / gate |
| --- | --- | --- |
| Requirements, planning, product and technical architecture, BMAD story design | **Grok 4.6** | Selected-model evidence, approved story/owner architecture gate |
| New features, substantive code changes, refactors and performance work | **Grok 4.6** | Tests + independent Grok BMAD code review |
| API/contracts, tenant isolation, authentication/authorization, database/migrations, infrastructure, CI/CD, billing and security-related changes | **Grok 4.6** | Required test matrix, security rubric, owner gates on material changes |
| Threat modeling, security assessments, code/architecture reviews, BMAD adversarial/edge/readiness reviews | **Grok 4.6** | Cataloged skills only, review on exact latest HEAD, source findings |
| Release readiness, deployment decision recommendations and risk evaluation | **Grok 4.6** | Owner remains sole Production decision authority |
| **Simple, isolated, low-risk bug fixes** | **Composer 2.5 allowed** | Must meet *all* narrow-scope criteria below; targeted + regression tests; **fresh Grok 4.6 `bmad-code-review`** before acceptance |
| Ambiguous, cascading or material fixes | **Escalate to Grok 4.6** | Product Owner if architecture or privilege scope changes |

**Auto/default model routing is not an approved task-level choice.** A dispatcher or human should explicitly select the intended model and record the selected model from available provider/UI evidence. Verify the exact available model ID before any authenticated API dispatch; do not invent an ID. Never silently substitute an unavailable chosen model with another.

## What counts as a Composer 2.5 *simple bug fix*

**All** must hold:
1. Already understood, reproducible defect in **existing, owner-approved functionality** with a narrow, clear fix.
2. Changes limited to a few related lines/files; **no** new feature, dependency, public API or cross-service contract, schema change, migration or infrastructure/CI workflow change.
3. **No** authentication, authorization, role/tenant isolation, PII/privacy, security controls, billing/Paddle/money movement, credential, irreversible customer data, Production or deployment implication.
4. No material design choice or owner gate, and no ambiguity about expected behavior.
5. Tests exist or are added for regression, plus affected unit/integration/UI tests. If any test reveals wider effects, **stop and escalate to Grok 4.6**.
6. The change is explicitly recorded as `task_class=simple_bug_fix` and `primary_model=Composer 2.5`, with what was fixed and why it qualified.

**Examples:** an isolated typo or presentation defect, a narrowly reproducible conditional/UI regression, a small nonsecurity null-handling fix with known behavior. **Not examples:** login/session failures, webhook payment retries, tenant permissions, schema adjustments, deployment failures, a "simple" bug whose fix changes public behavior or architectural decisions.

Composer may implement its eligible fix, but **cannot independently approve it**: a separate **Grok 4.6 `bmad-code-review`** examines the actual diff and security rubric and requires 0 BLOCKER / 0 MAJOR before the story can be considered accepted. A Grok reviewer may redirect the whole change for Grok implementation if its risk or complexity is higher than classified.

## Cursor-managed internal supporting helpers

- **The policy governs the model deliberately assigned to engineering tasks and their accountable reviews/decisions**, not hidden provider-level internal inference. Cursor may operate internal helpers whose models it does not fully disclose.
- Such hidden helper model IDs **do not need exhaustive per-inference attestation** to pass the routing policy. If model telemetry is unavailable, say `INTERNAL_HELPER_MODELS_NOT_ATTESTED`; **do not falsely claim that all execution was Grok**.
- Do **not deliberately** assign code changes, product architecture, security reviews, release decisions or other substantive engineering authority to a known off-policy helper. If a known helper performs one of those roles, reroute its work to the approved Grok 4.6 primary/reviewer and obtain a fresh direct review; if not possible, mark OWNER_GATE.
- Model selection evidence for the **named main executor/reviewer** is mandatory (e.g., recorded Cursor model selector, provider `originalModelName`, API `model.id`, run/agent identity). This proves **selection**, not inference-level enforcement. Do not overstate the assurance.
- A provider model switch that changes the **assigned main engineering executor or reviewer** to a model not permitted for that task is a real **MODEL_ROUTING_VIOLATION** and must be corrected, not ignored.
- Do not turn missing invisible-helper telemetry, by itself, into `MODEL_USAGE_UNVERIFIED` hard-stop under this policy.

## Required BMAD and acceptance loop

Under already-authorized stories, follow **IMPLEMENT → BUILD/TEST → Grok 4.6 `bmad-code-review` with security/threat checklist → inspect findings → FIX → RETEST → NEW-HEAD Grok re-review**. For Composer 2.5 fixes, the implementation stage can use Composer only if every simple-fix condition holds. Any code modification invalidates the previous code review/CI evidence; latest HEAD requires 0 BLOCKER, 0 MAJOR, required tests, GitGuardian and security evidence. Keep the existing **three bounded fix/review cycles**, escalation and all material owner gates.

Use real installed BMAD `AR`, `ECH`, `IR`, `CR` as required by each review contract. No cataloged `bmad-security-review` skill is present; use the explicitly approved security checklist within `bmad-code-review`. ChatGPT is a GitHub-connected, human-invoked coordinator, **not** the mandatory Grok reviewer and **not** a continuously running daemon.

## Stop conditions unchanged

Owner approval is **still required** for material architecture, changes to system/code/data/security/infrastructure decisions, privileges, new credentials/vendors, monetary operations, Production/live deployment, and any expanded merge policy. The GitHub `main` branch remains unprotected and cannot safely host a credentialed dispatcher until protected, independently reviewed and owner-authorized.

Previous D18-A review **did not run BMAD**; the revised policy does not retroactively confer Grok review PASS. A **new** review-only attempt requires specific owner authorization and recorded selected Grok 4.6 evidence. The previous D18-A attempt is **historical, consumed**. No merge/deployment or credential-backed orchestration is authorized by this document.

## Review report model fields

For every worker and reviewer explicitly assigned by Cohestra:
- `task_class`, `primary_model_selected`, `reviewer_model_selected`, `model_selection_evidence`, `Cursor run ID`, `BMAD skills actually run`.
- `internal_helpers_model_visibility`: known models if surfaced; else `NOT_ATTESTED` (disclosed, **not** a standalone block).
- `routing_policy_verdict`: PASS only with correct **assigned model selection**, authorized scope, actual code/review evidence; FAIL on wrong assigned model, unauthorized Composer scope, hidden routing substitution or falsified claims.
- Exact PR HEAD, CI/GitGuardian, BLOCKER/MAJOR, affected tests, review cycle ledger and owner gates separately. Clean CI alone is not Grok review evidence.

**This policy is binding; the ADCP runtime and architecture remain unimplemented / not adopted.** See D7/D17 in `09-owner-decision-register.md`, `14-code-review-security-loop.md` and the historical D18-A audit in Issue #509.
