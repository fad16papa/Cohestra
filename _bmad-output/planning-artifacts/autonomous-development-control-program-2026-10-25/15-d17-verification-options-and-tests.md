---
title: ADCP D17 Model Enforcement Alternatives and Proof-of-Compliance Tests
status: PROPOSED_FEASIBILITY_NOT_ADOPTED
date: 2026-10-25
verified_sources: official_cursor_docs_and_cursor_staff
owner_policy: STRICT_GROK_4_6_ONLY_UNCHANGED
cloud_review_result: MODEL_USAGE_UNVERIFIED
implementation_permission: NONE
credential_permission: NONE
production: NO_GO
---

# D17: How Cohestra can verify Grok 4.6 without falsely claiming model purity

> **HISTORICAL ANALYSIS, SUPERSEDED IN PART BY OWNER MODEL DECISION OF 2026-10-25:** This document records the former requirement to prove every parent/helper inference used Grok 4.6. The owner subsequently established a simpler **task-level model-routing policy** in [16-owner-model-routing-policy.md](./16-owner-model-routing-policy.md): Grok 4.6 for main planning/coding/security/review/release responsibilities, Composer 2.5 only for eligible simple bugs with Grok review. Hidden provider-helper model telemetry may be missing; disclose it rather than block solely on that absence. **Do not use older recommendations here to demand a local SDK fallback or prevent a new owner-authorized review attempt solely over hidden helper telemetry.** The historical D18-A run never executed BMAD, so no review PASS is inherited. No new run, key or settings action is authorized.



## 1. Executive finding

The single owner requires **Grok 4.6 for engineering planning, implementation, tests, security and review**, with no Auto fallback (except separately scoped Composer 2.5 for simple fixes). D18-A attempted one Cursor Cloud review on PR #507 but **stopped before BMAD** because the selected parent `cursor-grok-4.6-high-fast` was not proof of **actual** parent/helper inference. That attempt is exhausted; neither `@cursor` nor another Cloud run is currently approved.

Official Cursor documentation offers **three feasibility directions**, but no evidence that ANY is already enforcing Grok-only across Cohestra's Cloud and parent inference. Strict D17 remains NO-GO. Do not dilute it without separate owner approval.

## 2. Source-backed technical controls, with limitations

### Strategy A: Cursor Cloud `subagentStart` denial hook (investigate, do not apply)

- Official hook [`subagentStart`](https://prod.cursor.com/docs/hooks) is invoked before the Task tool creates a helper. Inputs include `subagent_type`, `subagent_model`, `is_parallel_worker`, and `git_branch`. A command hook may return `{"permission":"deny"}` and a human-readable reason. A proposed deterministic policy is **deny all helpers** initially; a later allowlist could require the model to match an **authenticated approved ID** (not guessed text).
- Cursor [Cloud Agents support](https://cursor.com/docs/cloud-agent) includes command hooks, but documentation warns hooks **do not run during early exploratory read-only turns** and begin after a writable environment is ready. Thus this is **NOT a proof of no off-model inference** in a read-only review bootstrap. Hook invocation coverage and fail-closed behavior must be independently demonstrated first.
- Source configuration would require owner-approved `.cursor/hooks.json` and a reviewed deterministic executable in the repository. These are privileged code-policy files and affect other Cursor workflows. **Do not commit or activate** under the current planning permissions.
- Test cases required before any approval: rejected off-model helper, rejected missing model field, rejected generic and parallel helper, no unobserved read-only delegation, audited hook logs with no secrets, version-specific Cloud behavior, no bypass on hook failure or prompt injection, no regression to normal Grok code reviews.

### Strategy B: Cursor TypeScript SDK **local** trusted runner with `task` prohibited (preferred feasibility candidate)

- [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript) accepts an explicit `model: {id: ...}` and local-agent `tools` allowlist or `disallowedTools: ["task"]`. Documentation explicitly says disallowing `task` prevents subagents. These restrictions apply to **local agents only**, not Cloud; they must be supplied again on resume.
- This may be a viable separate **trusted, isolated local/non-Production control plane** for a Grok-only single-agent BMAD review. The local agent can be restricted to the minimal read/test tools needed; code-writing work would need a separately approved profile.
- It **does not prove actual parent inference model** by itself, may have operational requirements (Node >= 22.13, host sandbox), and would change the previously selected GitHub Actions + **Cloud Agent API** pilot design. It must be proposed as an amended ADR with explicit owner approval before implementation, funding/compute/maintenance acceptance, and no Production/UAT host or credentials.
- Test cases: exact approved Grok `model.id` availability; attempts to call `task` fail; tool allowlist covers necessary BMAD review operations; no hidden helper execution; reviewed local host/isolation; correct model selection per resumed turn; model-attributed billing/usage evidence; fail-closed error when model identity/usage is missing. Tests must not require a Production droplet or secrets.

### Strategy C: Model-attributed usage evidence via Cursor billing / Team Admin API (independent evidence candidate)

- Cursor [Admin API docs](https://prod.cursor.com/docs/account/teams/admin-api) describe `POST /teams/filtered-usage-events`. Records expose a `model` field and may include `cloudAgentId`, `conversationId`, and charge data. Records are **aggregated hourly**. Cursor suggests polling this endpoint at most hourly.
- Cursor Cloud [`GET /v1/agents/{id}/usage`](https://prod.cursor.com/docs/cloud-agent/api/endpoints) reports token usage, not a demonstrated **per-inference model inventory**. Run metadata `originalModelName` likewise reports requested/selected, not independently verified actual execution.
- **Unknown:** whether the sole owner's Cursor plan/account has team-Admin API access, whether every parent/helper inference is represented with correlatable `cloudAgentId` and unambiguous timestamps, any missing/late records, and whether real-time **preventive** controls exist. NEVER request or post keys to public GitHub or ChatGPT. No Admin API access assumed or used.
- Test cases: can owner obtain model-tagged events without exposing credentials; does every Cloud parent/helper event appear; can counts/costs be reconciled; does ingestion lag cause a forced HOLD before signoff; do off-model events block milestone closure; can event identities be joined to Cursor run ID. If anything cannot be proven, status stays `MODEL_USAGE_UNVERIFIED`.

## 3. Recommendation

**Do not repeat D18-A unchanged.** First perform **documentation-only feasibility analysis** of strategy B (SDK local tool-denial) plus strategy C (independent model-event attribution), while keeping strategy A as a narrowly bounded cloud possibility. This is a **proposal**, not a new architecture selection. The single-owner model still applies, and GitHub remains the durable source of truth regardless of executor location.

A safe short path may involve owner-approved non-Production local SDK runner for read-only review with `task` denied, then verified model-attribution evidence, and only later the broader Cloud dispatcher if vendor controls improve. However this is NOT yet validated and cannot close D17 today.

## 4. Proof standard (no silent downgrade)

D17 may move from BLOCKED to VERIFIED only if:

1. Authenticated account-supported exact Grok 4.6 ID is resolved and used on every permitted run.
2. Non-Grok helpers are **prevented by effective technical controls**, not natural-language instructions. Missing model fields and hook failures deny launch. Scope includes early read-only phases.
3. Actual parent and any helper inference are attributable to the verified model through a complete trusted provider model-use record **or a provider-attested equivalent**, and model usage is reconciled against run time and usage. Missing/ambiguous records are HOLD.
4. A small read-only test (separately owner-authorized) proves correct deny behavior and no unintended writes, secrets, UAT/Production operations or unauthorized model calls.
5. Independent Grok 4.6 BMAD code/security/adversarial/edge/readiness results are on the same immutable current PR HEAD with 0 BLOCKER and 0 MAJOR, plus required exact-head CI and GitGuardian.
6. Any platform inability to meet these requirements is reported as `MODEL_USAGE_UNVERIFIED`, without granting architecture adoption, merge or Production GO.

## 5. Tradeoff / owner-review preview

| Decision | Option | Benefit | Limitation / owner scope |
| --- | --- | --- | --- |
| D17-S1 | **Continue only with Cloud Agent APIs + provider guarantee** | Preserves Option A deployment structure | Vendor cannot currently promise built-in subagent purity; adoption may remain blocked |
| D17-S2 | **Evaluate local Cursor SDK with `task` prohibited**, then model-attributed usage audit (**recommended feasibility direction**) | Documented subagent tool-denial; preserves Grok-only intention | Separate executor architecture, local runtime and credentials need future owner approval; parent-model provenance still must be solved |
| D17-S3 | Investigate Cloud `subagentStart` hook + independent usage events | Can block helpers after hook activation | Hooks absent in early read-only phase and attribution API access uncertain; cannot guarantee alone |
| D17-S4 | Relax strict model policy | Immediate speed | **NOT RECOMMENDED**; material owner policy amendment required and would knowingly accept possible off-Grok inference |

**No option is selected by a general "next"/"proceed" instruction.** The owner already chose strict Grok policy and CAT-SEC review loop. Do not treat routine GitHub doc writes as adoption of a new executor topology.

## 6. Current permitted actions and next gate

- Allowed now: research official provider docs, write audit-grade feasibility notes, track technical risks and source links in GitHub, produce bounded test contracts as a proposal without new workflow, credential or deployment code.
- Requires new owner architecture/security approval: altering Option A Cloud-first topology, any Cursor SDK runner implementation, modifying `.cursor/hooks.json` or GitHub Actions workflow, changing `adcp`/branch rules, new API keys/service accounts, running live verification, waiving D17 strict assurance.
- PR #507 stays draft. D8 adoption, D4/D10/D12 actual settings, D5 key creation, autonomous merges and Production remain NO-GO.

## 7. Vendor evidence questions (for later support request, not sent)

1. Can Cursor **enforce** Grok 4.6 on every parent, helper, built-in subagent and coordinator step in Cloud Agents API or local SDK? If not, which subtasks are exempt?
2. Is `subagentStart` guaranteed for **all** built-in helpers and early Cloud read-only turns? If not, can those helpers be disabled at agent creation with a hard API flag?
3. Is there a supportable API to retrieve **all actual model IDs per inference** for a specific Cloud Agent run, including helpers, with audit-complete correlation, even for personal accounts?
4. Can Team Admin API `filtered-usage-events` model events be reconciled to exact `cloudAgentId` with no missing inference, including hourly latency and helper overhead?
5. Does local SDK `disallowedTools:["task"]` prevent every built-in model-routed helper, or only Task subagents? What additional enforcement exists for coordinator model switching?
6. Which provenance guarantees are contractual vs best effort, and where is their supported documentation?

No support contact was sent. This is an owner-review packet and vendor question list.
