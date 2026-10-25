---
title: ADCP orchestration options
status: draft
created: 2026-10-25
research_date: 2026-10-25
---

# Orchestration architecture

ChatGPT cannot autonomously run continuously. Something else must wake it, call Cursor, watch CI, and stop loops. That something is the orchestrator.

## Verified integration surfaces

**Cursor Cloud Agents API v1** (public beta, [cursor.com/docs/cloud-agent/api/endpoints](https://cursor.com/docs/cloud-agent/api/endpoints), fetched 2026-10-25):

| Action | Endpoint |
| --- | --- |
| Launch | `POST /v1/agents` (durable agent + first run) |
| Inspect | `GET /v1/agents`, `GET /v1/agents/{id}` |
| Follow-up / steer | `POST /v1/agents/{id}/runs` (`delivery: steer` may be unavailable; steering rejects `model` field) |
| Runs | `GET /v1/agents/{id}/runs`, `GET /v1/agents/{id}/runs/{runId}`, `POST /v1/agents/{id}/runs/{runId}/cancel` |
| Artifacts | list / download |
| Lifecycle | archive / unarchive / delete |
| Auth | user API key or service-account key; Basic or Bearer |
| Webhooks | v1 docs state **webhooks are coming soon**; legacy v0 still has them |

**[ASSUMPTION]** Do not design the pilot around v1 webhooks. Use GitHub events + polling `GET` run until v1 webhooks are generally available and owner-approved.

**GitHub (already in this repo):** `pull_request` / `push` CI, `workflow_run` UAT deploy, `workflow_dispatch` Production, issue/PR comments, Environments, check runs, GitGuardian app.

**ChatGPT:** no standing process in this repository today. In the pilot, the human invokes ChatGPT, which can **directly write tasks and review evidence into GitHub without pasting**. A later OpenAI API integration may invoke an on-demand advisory worker from a durable Actions orchestrator, but requires owner approval of vendor credentials, data egress, privacy/retention, cost and permissions. The conversational ChatGPT instance itself does not persist or self-wake.

## Option A — GitHub-native orchestrator (recommended for pilot)

A new **draft-only** workflow, for example `.github/workflows/adcp-dispatch.yml`, later, after owner approval:

- Triggers: `workflow_dispatch` from an allowlisted human only. Optional later: `issues` labeled `adcp/task` or `issue_comment` `/adcp run` **after** an actor-allowlist contract exists. No `schedule` self-start of new work (watchdog poll of an in-flight run is allowed).
- Job environment: a **new** Environment (proposed name `adcp`) holding a **service-account** `CURSOR_API_KEY` and optional ChatGPT API key. Not `uat`. Not `production`. Must not inherit org/repo Production secrets. Required reviewers on that Environment are an owner gate.
- Steps: verify actor + architecture/privilege gates + semantic story contract → resolve approved Grok 4.6 model ID through authenticated `GET /v1/models` → `POST /v1/agents` with **explicit** `model.id`, pinned repo and non-main write target → poll run through terminal state and CI/review → report agent/run, SHA and check URLs; optional future advisor API call requires owner approval.
- Retries: bounded (proposed 2 automatic on `ERROR`/`EXPIRED`, then escalate).
- Timeouts: proposed 120 minutes wall clock; `POST` cancel on expiry.
- Architecture detection: protected-path checks **plus mandatory semantic story/PR impact review** at dispatch and final HEAD. Unavailable/ambiguous classification is HOLD, never PASS.
- ChatGPT may select an installed BMAD skill when invoked; dispatcher verifies the skill against `_bmad/_config/bmad-help.csv` **union** `_bmad/custom/*.toml` before any POST.
- Recovery: cancel run, leave draft PR, do not merge, do not dispatch deploy.
- Self-dispatch: the workflow ignores its own comments, labels, and PRs. Retry budget does not increment on ignored events.

**Pros:** Reuses GitHub as the already-adopted control plane (Epic 45/46). Secrets stay in Environments. Audit is Actions logs + issue comments. No new always-on host. Lowest operating cost. Matches “no unapproved external automation infrastructure”.

**Cons:** Actions max job time and concurrency limits. Polling burns minutes. ChatGPT conversation state is ephemeral unless persisted to the issue. Workflow YAML itself is privilege-sensitive (new secret class = owner gate).

## Option B — Dedicated orchestrator service

A small always-on or serverless service (owner-chosen host, not the Production droplet) that:

- Subscribes to GitHub webhooks
- Holds long ChatGPT threads
- Calls Cursor API and implements its own retry/backoff
- Writes ADRs and milestone reports

**Pros:** Better long-loop supervision, richer ChatGPT memory, easier multi-agent fan-out.

**Cons:** New attack surface and secret store. Privilege expansion (new host, new credentials, possibly inbound webhooks). Higher cost and ops. Conflicts with “no unapproved external automation infrastructure” until the owner explicitly approves a host. Would need its own ADRs for data residency and key storage.

## Option C — Human ChatGPT + manual Cursor launch

Owner (or ChatGPT in a desktop session) pastes prompts; Cloud Agents are started from the Cursor UI.

**Pros:** Zero new secrets. Available today.

**Cons:** Not a program. No reliable timeout/retry, weak audit, no architecture halt automation.

## Comparison

| Criterion | A GitHub-native | B Dedicated service | C Manual |
| --- | --- | --- | --- |
| Security | Environment-scoped keys; no droplet SSH | New host + webhook auth to design | Fewest new secrets; human error |
| Reliability | Good for story-sized runs; job-time limits | Better for long loops | Poor |
| Complexity | Low–medium | High | Lowest |
| Scalability | Enough for one-owner Cohestra | Needed only if many parallel agents | None |
| Operating cost | Actions minutes + API usage | Host + Actions + API | Labor |
| Fits current ADs | Yes, after Environment owner gate | Requires new infra ADR | Yes, already happening |

## Recommendation

**OWNER-SELECTED DIRECTION, NOT AN ADOPTED ADR:** Proceed with detailed design for Option A's controlled pilot. Keep Option B deferred. Do not implement a privileged runner until the amended design and permission gates are expressly approved. **Success of one owner-started pilot is NOT full autonomous development**; see proposed full-loop milestones below.

Do not put the Cursor or ChatGPT keys in Environment `uat` or `production`.

## Loop termination (both A and B)

Stop and escalate when any of these fire:

- retry budget exhausted
- wall-clock timeout
- architecture-path hit without an adopted ADR
- missing secret **name**
- Production path detected
- BMAD review BLOCKER/MAJOR unresolved after the budgeted review-fix cycles (proposed: 3)
- GitGuardian conclusion not `success` when the task claimed a merge-ready Production-provenance PR. For UAT/non-prod merge, NEUTRAL is recorded as a risk, not treated as SUCCESS evidence.
- agent requests privilege expansion

## Multi-agent coordination

Pilot: **one executor agent per task**. ChatGPT is sequential advisor, not a second writer on the same branch.

If the owner later wants parallel agents: one branch per agent, no shared worktree, integration PR owned by a human or a dedicated integration story (the Epic 46 integration pattern).

## Safe recovery

- Cancel the Cursor run
- Leave the branch and draft PR
- Do not `git push --force` to `main`
- Do not close unrelated PRs
- Record `RECOVERY=agent_timeout` (or similar) on the issue
- Owner decides whether to resume with a follow-up or discard the branch

## Separate activation phases and mandatory prerequisites (PROPOSED)

| Phase | Admission gate | Observable completion |
| --- | --- | --- |
| Architecture reconciliation | Current planning draft; owner-selected Option A direction | Consistent PRD/spine/story docs, current-HEAD Grok 4.6 reviews, final owner ADR decisions |
| Offline mock / dry-run | Adopted ADCP ADRs, no keys or live API | Contract-tested dispatcher state transitions, deny-list, model-required refusal, mock agent/CI callbacks |
| Credential-backed controlled pilot | Protected `main`, safe `adcp` required-reviewer mechanics, audited secret classes, verified Grok 4.6 ID, approved D5/D12 | One owner-started docs/test-only dispatch, branch/draft PR, successful exact-HEAD CI + BMAD reviews + report, no UAT/Production touch or merge |
| Full autonomous delivery | Separate owner-approved ChatGPT advisory API or clear no-API alternative, queue trigger ACL, data-egress and cost bounds, semantic impact gates | No-copy task initiation, event-driven planning/routing, bounded implementation/fix/review loops, independent CI verification, owner notifications, durable recovery |

**Runner invariants:** default/Auto model routing is disallowed; secret-backed jobs never run untrusted workflow changes; use an idempotent task key and per-task cost/retry budget; never infer a successful execution from a GitHub issue/comment alone. A credential must not reach Cursor agent prompts, `envVars`, MCP server secrets, log lines or artifacts.

**Reviewer deadlock:** GitHub Environment prevent-self-review can block the workflow initiator from approving their own run. If only one owner can dispatch, determine a secure separate reviewer or formally assess an alternate protected control. Do not accidentally make this safeguard impossible to satisfy.

## Verified follow-up model limitation (API v1)

The current Cloud Agents API allows explicit `model.id` at **agent creation**, but `delivery: "steer"` rejects a `model` field and may return `403 feature_unavailable`. Before enabling follow-up/steer for a **substantive assigned engineering task**, verify the intended **main assigned model** remains the approved Grok 4.6, or create a fresh explicitly selected agent; no default/Auto routing. `delivery:steer` cannot take a `model` field, so unsupported task-level selection must REFUSE. Hidden provider-managed supporting helper models need disclosure where known, **not full per-inference attestation**. For a classified simple bug fix only, Composer 2.5 may be the assigned implementing model under the owner-approved policy; the final independent reviewer is Grok 4.6. This is a **live dispatch owner/security gate**, not permission to use Auto fallback. Reference: https://prod.cursor.com/docs/cloud-agent/api/endpoints.
