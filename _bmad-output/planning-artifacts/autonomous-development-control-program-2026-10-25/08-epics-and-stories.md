---
title: ADCP proposed stories (placeholder IDs)
status: draft
created: 2026-10-25
updated: 2026-10-25
epic_assignment: OWNER_GATE
---

# Proposed stories

`sprint-status.yaml` highest epic is **46** (in-progress). **Do not assign a number in the tracker until the owner signs D2.** The next unused number is **47**; that is a recommendation, not an assignment.

This file is a proposal. It was not written into `sprint-status.yaml`. Story IDs are **ADCP-P1..ADCP-P4** until D2 is signed. Do not create `47.n` (or any `N.n`) files until D2.

**No implementation story is authorized before the amended architecture has explicit owner adoption (D8) and privilege scope (D12).** Owner has selected the direction of Option A and reserved Epic 47, but the live tracker remains unchanged. Credential-free P1/P2/P3 may proceed **only after** D8 adoption; live P4 additionally requires D4/D5/D10/D11/D12, effective `main` protection, verified Grok 4.6 availability and reviewer identity. D3 chooses topology; ADCP-P2 exists only if D3=A.

## Requirements coverage

| FR / NFR | Proposed placeholder | Notes |
| --- | --- | --- |
| FR-1..4, FR-15, FR-22, NFR-5 | ADCP-P1 | Governance contracts + semantic and path-based halt + model policy |
| FR-5..9 | ADCP-P1 | Closed-set skill router; isolation from Epic 46 |
| FR-10..14, FR-16..19, FR-22..23, NFR-1 | ADCP-P2 | Mock-only first; if D3 = A. No credentials until owner approves protected live runner |
| FR-20..21, NFR-3 | ADCP-P3 | Milestone reporter + audit schema |
| FR-24 Pilot | ADCP-P4 | Live harmless-task validation after D4/D5/D10/D11/D12 and verified Grok 4.6 model ID |
| FR-25 Full autonomy | ADCP-P5 (future) | Separate owner-approved event-driven advisor / state-machine design; not part of controlled pilot |
| NFR-2, NFR-4 | ADCP-P2 / ADCP-P4 | Cancel-on-timeout; no always-on host in pilot |

## Epic (number OWNER_GATE): Autonomous Development Control Program

Make BMAD work dispatchable through GitHub and Cursor Cloud Agents, with ChatGPT advisory and Product Owner architecture/Production authority. Production remains NO-GO.

### ADCP-P1 — Governance contracts and architecture halt

As a **Product Owner**,
I want **semantic and path-based architecture halt and a closed-set BMAD skill list in repo contracts**,
So that **agents cannot invent workflows or silently edit Production, UAT isolation, methodology, or this program**.

**Depends:** D1 + D8. Does not require D3, D4, or D5.

**AC**

- Given a fixture diff that touches **any** of: this program spine, `_bmad-output/planning-artifacts/architecture/**`, `autonomous-merge-policy.md`, `_bmad/custom/**`, `docker-compose.production.yml`, `docker-compose.uat.yml`, `.github/workflows/deploy.yml`, `.github/workflows/deploy-production.yml`, `.github/workflows/ci.yml`, or a future ADCP dispatcher YAML — the halt script exits non-zero with `OWNER_GATE=architecture`
- Given a fixture diff that only touches `web/lib/plan-limit-utils.test.ts` and makes no material contract/design changes, the halt script exits 0
- Given a fixture affecting auth, API contracts, tenancy, DB schema, billing or service boundaries **outside** the protected paths, the semantic impact review halts or requests owner approval unless a matching adopted ADR and story contract already authorize it
- Given missing semantic review evidence, it fails closed instead of assuming a clean path diff is safe
- Halt is evaluated at dispatch preview **and** on the PR HEAD diff
- Skill router refuses names absent from `_bmad/_config/bmad-help.csv` **and** absent from `_bmad/custom/`
- No workflow YAML contains secret **values**. Secret **names** may appear only after D8 in a later story
- Epic 46 story files, Epic 46 spine, and `sprint-status.yaml` are unchanged

### ADCP-P2 — Dispatcher (conditional on D3)

As a **Product Owner**,
I want **an owner-gated runner that can create, poll, and cancel a Cursor Cloud Agent**,
So that **ChatGPT does not need to run continuously**.

**Depends:** owner adoption D8 and verified Option A direction; **credential-free mock phase may be implemented before D4/D5**, but the live workflow must not reference or consume keys until D4/D5/D10/D11/D12 are approved. **Exists only if D3 = A.** If D3 = B, replace this story after an infrastructure ADR. If D3 = C, this story is not created.

**AC (D3 = A only)**

- Workflow is a new file (proposed name `.github/workflows/adcp-dispatch.yml`) behind Environment `adcp` or the owner-chosen D4 name. It must not use Environment `production` or `uat`
- Default trigger is `workflow_dispatch` from an allowlisted human (D11). Label/comment triggers are off until D11 is signed
- Workflow-level `permissions:` default-deny. Job may grant only `contents:read`, `issues:write`, `pull-requests:write`, `actions:read`. Forbidden: `id-token:write`, `actions:write`, `contents:write` on `main`, `environment: production`, `environment: uat`
- `persist-credentials: false` on checkout. No SSH private keys
- Secret **name** allowlist the job may reference: `CURSOR_API_KEY` and optional ChatGPT key only. A contract test fails if the workflow YAML references `PROD_DROPLET_*`, `DROPLET_*`, `UAT_AUTO_*`, `UAT_OTP_*`, `PROD_PUBLIC_BASE_URL`, or Production host `.env` class names (JWT, Redis password, live Paddle, SendGrid, reCAPTCHA secret, backup encryption key)
- Dry-run mode calls a mock **without keys or live Cursor calls**; live mode is separately owner-gated (D4/D5/D10/D11/D12). Missing or unavailable Grok 4.6 `model.id` in authenticated `GET /v1/models` must refuse dispatch; never fall back to Auto/default models
- Timeout covers agent runtime **and** waiting for CI. On expiry: `POST` cancel, do not treat timed-out CI as SUCCESS, escalate
- Occupancy and idempotency: refuse duplicate task IDs and simultaneous launches to an occupied output branch; validate Cursor `agentId` conflict/retry semantics before using them as the only dedupe guard
- `workOnCurrentBranch` is forbidden on `main`. `repos[]` is pinned to `fad16papa/Cohestra`. No host secrets via `envVars`. No Cloud Agent environment-secret creation
- Self-dispatch: ignore events the dispatcher created. Retry budget does not increment on ignored events
- Follow-up/steer is disabled until model pin inheritance can be authenticated; v1 steer rejects `model` in its payload. Otherwise create a fresh explicitly pinned agent, maintaining idempotency and budgets
- Missing key prints `MISSING_SECRET=CURSOR_API_KEY` and no value
- Cursor artifact list/download: do not post presigned URLs into public issue comments
- Privilege-expansion diffs (merge-policy list, D12) halt with `OWNER_GATE=privilege`
- `main` and privileged workflow/protection paths are safeguarded **before** enabling key-backed live dispatch; **no second-human PR review requirement**. Pilot `adcp` uses sole Product Owner required reviewer with `prevent_self_review=false` only after explicit owner approval. Do not modify Production protections or confuse self-confirmation with independent human review.
- Audit actor, verified requested model, run IDs, limits/cost/usage, CI review evidence and PR HEAD. No `@cursor` GitHub comment launch without proof of model enforcement

### ADCP-P3 — Milestone reporter

As a **Product Owner**,
I want **a posted report that cannot be marked complete without PR number, SHA, and CI URL**,
So that **agent-reported PASS is not treated as evidence**.

**Depends:** D1 + D8. Can trail ADCP-P1.

**AC**

- Template matches `06-milestone-reports.md` including actor, follow-up, cancel, and Environment name
- Completeness checker fails unless section 10 has **all** of: PR number, 40-hex HEAD that still matches the PR, and CI run URL (`and`, not `or`)
- Completeness refuses `MILESTONE=complete` without **current-HEAD Grok 4.6 `bmad-code-review` plus explicit security criteria** evidence (0 BLOCKER / 0 MAJOR), required exact-HEAD CI/GitGuardian conclusions and model provenance; new code after review invalidates it
- GitGuardian `neutral` cannot satisfy a Production-provenance complete flag. For UAT/non-prod, NEUTRAL is recorded as a risk, not SUCCESS evidence
- `AUTHOR_ROLE` is not a substitute for recorded `github.actor`
- Audit record is the union of NFR-3, `04-governance.md` audit trail, and template section 10

### ADCP-P4 — Pilot validation

As a **Product Owner**,
I want **one harmless live dispatch**,
So that **the program is proven without touching Production**.

**Depends:** D1 + D3=A + D4 + D5 + D8 + D10 + D11 + D12 + ADCP-P1..P3 and authenticated Grok 4.6 catalog verification.

**AC**

- Target is a docs-only or test-only task on a throwaway branch. ChatGPT must have authored the approved execution contract **directly in GitHub**, not through owner manual copy/paste. In a single-owner setup the owner may separately initiate and approve the `adcp` job; the record must disclose that this is not a second-person review.
- Milestone report posted and completeness-checked, referencing requested model, agent/run, exact HEAD, all applicable CI and independent Grok 4.6 BMAD review. **No merge in first live pilot**
- Architecture halt does not fire on the pilot target
- Rollback documented (disable workflow, revoke keys)
- Production compose, `deploy-production.yml`, Epic 46 files, and `sprint-status.yaml` remain untouched

## Explicitly not in this proposal

- Dedicated orchestrator service (Option B) until D3 = B and D9
- Autonomous Production merge
- ChatGPT desktop daemon
- Changing `main` branch protection **within this planning PR** (D10 is a separate required owner-controlled action before key-backed pilot)
- Any Epic 46 story implementation
- Writing `47.n` story files before D2
- Creating GitHub Environments or secrets in this planning PR

### ADCP-P5 — Full unattended engineering loop (future separate owner gate)

As a **Product Owner**,
I want **approved work to progress across Cursor/BMAD, CI, review, corrections and milestone notifications without repeated manual dispatch or prompt transfer**,
So that **ChatGPT-directed engineering is operationally autonomous while architecture and privileged decisions still stop for me**.

**Depends:** audited success of ADCP-P4; new owner-approved architecture and data/credential/privilege scope. **Do not implement under pilot D1–D12 alone.**

**Proposed AC:**

- Durable GitHub-backed state machine with explicit retry budgets and idempotent task transitions, no recursive self-dispatch or unbounded fan-out
- Authorized event starts only a previously approved task; assigned main execution model is Grok 4.6 for substantive work or Composer 2.5 only for qualified simple fixes, followed in all cases by independent Grok 4.6 BMAD review and a cataloged workflow allowlist. No Auto/default; internal provider helper telemetry is disclosed, not an every-inference pass requirement.
- Event-triggered PR/CI review and bounded fix loops produce milestone reports and separate BLOCKER/MAJOR/OWNER_GATE notifications
- ChatGPT input comes from a future explicitly approved API-based advisory worker or on-demand human ChatGPT session, never a fictional always-on chat
- Material architecture, new data egress, sensitive security changes, privilege expansion, Production and deployment remain Product Owner approval-only
- Document and validate queue restart/recovery, token costs and limits, privacy/retention, authorization, rollback and actual achieved independence from manual copy/paste

## Solo-owner-specific P5 acceptance (PROPOSED)

- Automatic dispatch cannot be gated by an `adcp` required human Environment approval **for every pre-approved routine task**; solve with a separate, tightly constrained owner-approved execution identity/Environment or equivalent, never by silently disabling all protection.
- Approval identity must distinguish the human's actual confirmation from comments generated via ChatGPT under the same GitHub account.
- No second human GitHub PR approver, CODEOWNER or Environment reviewer may be required. Independent Grok 4.6 reviews and CI are mandatory engineering evidence but are not represented as a second human approval.
- Production or privilege-changing workflows still stop for actual Product Owner action; no unattended Production cutover, even after successful routine-task automation.

## Additional pre-implementation acceptance: model provenance and bootstrap

- Given a task deliberately assigned to Grok 4.6, the main executor/reviewer must have explicit Grok selection evidence. **Do not require proof of the model used for each invisible provider helper inference.** If a known off-policy helper is deliberately given substantive engineering/decision authority, halt and route that work to Grok. An assigned Composer 2.5 implementer is permitted only for qualified simple bug fixes with independent Grok review.
- Given unknown provider-internal helper inference models, record `INTERNAL_HELPER_MODELS_NOT_ATTESTED`, **not a standalone block**. Given missing/ambiguous **main task/reviewer model selection**, an inappropriate Composer task, or unverified assigned-model steering, result is `MODEL_ROUTING_VIOLATION` / HOLD until corrected.
- Current-HEAD Grok review must be obtained by a separately owner-approved review-only bootstrap path or future authenticated trusted runner, **without** a permissive `@cursor` comment-only trigger. It must not write to main, merge, create credentials, change GitHub settings, or deploy.
- D17 **task routing policy is owner-approved**; its dispatcher enforcement is NOT IMPLEMENTED. D18's previous one-time review attempt is consumed; another launch requires owner authorization. A switch of the **assigned main executor or reviewer** to an ineligible model reopens the gate, even if CI is green.

## CAT-SEC acceptance criteria (methodology approval only)

- Given an authorized story with a review finding, Grok 4.6 `bmad-code-review` must identify severity, affected code, threat/failure mode, exact tests to rerun and the permitted scope of remediation.
- Given BLOCKER/MAJOR findings, agent must inspect code and apply only authorized fixes, then rerun affected tests and **fresh `bmad-code-review` against the new HEAD**. Previous reviews become STALE. Do not merge based on a prior passing SHA.
- Review must explicitly test security criteria: authentication/authorization, tenant and data isolation, credentials/exfiltration, GitHub workflow injection and secret exposure, external API trust, validation/CORS/reCAPTCHA/JWT, Paddle/billing/webhooks where applicable, migrations/data loss, infra/network ports, logging/PII, dependency/tool provenance and UAT/Production separation. Record N/A with rationale when not applicable.
- Completion only after current HEAD has **0 BLOCKER and 0 MAJOR**, all required automated tests pass, GitGuardian exact conclusion meets applicable success policy, resolved regression and no model/architecture/owner gate is outstanding. No separate `bmad-security-review` skill exists in installed catalog; do not invent one.
- Proposed review-fix retry budget: **3 cycles** per authorized run, with bounded time/cost. Exhaustion => INCOMPLETE + owner escalation, not a forced PASS or indefinite spin. New owner authorization is needed for additional cycles.
- Historical D18-A `MODEL_USAGE_UNVERIFIED` is an incomplete review under an **older, now superseded** every-inference proof rule; it is NOT retroactively a PASS. These ACs **do not authorize launching a further Cursor agent, modifying non-planning code, changing permissions, merging or deploying**.
