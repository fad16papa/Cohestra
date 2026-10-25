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
| Follow-up / steer | `POST /v1/agents/{id}/follow-up` (`delivery: steer` optional) |
| Runs | `GET /v1/agents/{id}/runs`, `GET` run, stream, `POST` cancel |
| Artifacts | list / download |
| Lifecycle | archive / unarchive / delete |
| Auth | user API key or service-account key; Basic or Bearer |
| Webhooks | v1 docs state **webhooks are coming soon**; legacy v0 still has them |

**[ASSUMPTION]** Do not design the pilot around v1 webhooks. Use GitHub events + polling `GET` run until v1 webhooks are generally available and owner-approved.

**GitHub (already in this repo):** `pull_request` / `push` CI, `workflow_run` UAT deploy, `workflow_dispatch` Production, issue/PR comments, Environments, check runs, GitGuardian app.

**ChatGPT:** no standing process in this repository today. Invocation would be an owner-gated API key used by the orchestrator, or a human pasting into ChatGPT. Neither is continuous.

## Option A — GitHub-native orchestrator (recommended for pilot)

A new **draft-only** workflow, for example `.github/workflows/adcp-dispatch.yml`, later, after owner approval:

- Triggers: `workflow_dispatch` from an allowlisted human only. Optional later: `issues` labeled `adcp/task` or `issue_comment` `/adcp run` **after** an actor-allowlist contract exists. No `schedule` self-start of new work (watchdog poll of an in-flight run is allowed).
- Job environment: a **new** Environment (proposed name `adcp`) holding a **service-account** `CURSOR_API_KEY` and optional ChatGPT API key. Not `uat`. Not `production`. Must not inherit org/repo Production secrets. Required reviewers on that Environment are an owner gate.
- Steps: validate label/path/owner gate → optional ChatGPT routing call → `POST /v1/agents` with repo URL + `startingRef` → poll run until terminal or timeout → post milestone comment with agent id, SHA, CI URL.
- Retries: bounded (proposed 2 automatic on `ERROR`/`EXPIRED`, then escalate).
- Timeouts: proposed 120 minutes wall clock; `POST` cancel on expiry.
- Architecture detection: `paths` filters + a script that diffs the `04-governance.md` path set at dispatch **and** on the PR HEAD before milestone-complete.
- Skill names from ChatGPT are checked against `_bmad/_config/bmad-help.csv` before `POST /v1/agents`.
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

**Adopt Option A for the pilot (PROPOSED).** Keep Option B as a deferred owner decision if the pilot hits Actions time limits or ChatGPT-state pain. Do not implement either until the decision register is signed.

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
