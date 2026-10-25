---
title: Autonomous Development Control Program — PRD
status: draft
created: 2026-10-25
updated: 2026-10-25
stakes: internal-control-plane
---

# PRD — Autonomous Development Control Program

Capabilities for the **control plane**. Not tenant-facing. Implementation choices live in the architecture spine and addendum.

## Vision

Give Cohestra a governed, **no-manual-prompt-transfer** engineering loop with ChatGPT as on-demand advisor and orchestrator, Cursor Cloud Agents as Grok 4.6-pinned executors, GitHub as the durable control/evidence plane, and the Product Owner as final strategy, system/code/infrastructure/security/data architecture and Production authority.

## Users

| Actor | Job |
| --- | --- |
| Product Owner | Approves architecture, secrets, Production, and program go-live |
| ChatGPT (advisor/orchestrator, when invoked) | Author approved GitHub story contracts, route only real BMAD skills, inspect PR/CI evidence, coordinate routine review/follow-ups, prepare material design options for owner |
| Cursor Cloud Agent | Implements/reviews/tests inside a git worktree and opens PRs |
| GitHub Actions | Event runner, CI, UAT deploy (existing), provenance |
| BMAD skills | Methodology contracts already installed in this repo |

## Features

### F1 — Authority lock

- **FR-1** Product Owner retains final authority for product strategy, system/code/infra/security/data architecture, significant technical decisions, and Production authorization.
- **FR-2** ChatGPT may, when actively invoked, draft and post approved GitHub engineering contracts, **select validated installed BMAD workflows**, inspect and comment on PR/CI/security evidence, coordinate routine next steps, and propose architecture impact assessments. It cannot adopt an ADR, represent a mandatory Grok 4.6 BMAD reviewer, dispatch Production, or claim continuous background operation. This role clarification is **PROPOSED**, requiring owner reconciliation with Epic 45 AD-12.
- **FR-3** Cursor/BMAD may execute routine work only inside an approved story contract and the existing autonomous-merge policy (UAT/non-prod).
- **FR-4** Every material architecture decision requires a written impact assessment, Product Owner participation, explicit approval, and an ADR before implementation continues.

### F2 — Orchestrated BMAD loop

- **FR-5** The program routes work through installed skills only. The allowlist is `_bmad/_config/bmad-help.csv` union `_bmad/custom/*.toml`. Typical implementation loop names include `bmad-create-story`, `bmad-dev-story`, `bmad-code-review`, `bmad-sprint-status`. It must not invent skill names.
- **FR-6** A task is not “implement” until a story file exists or `bmad-quick-dev` is explicitly selected for a scoped exception.
- **FR-7** The mandatory code-review loop remains the close gate. Unresolved BLOCKER/MAJOR blocks done.
- **FR-8** Epic 46 work stays on its own branches/PRs. This program must not rewrite 46 story files or `sprint-status.yaml` as a side effect of planning.

### F3 — GitHub control plane

- **FR-9** GitHub remains the source of truth for code, PRs, CI, Environments, and audit.
- **FR-10** Agent work lands on `cursor/<slug>-<id>` branches and draft PRs unless the owner authorizes a different convention.
- **FR-11** Required milestone fields include exact PR number, HEAD SHA, and CI run URL. Agent-reported PASS without a check-run URL is a claim, not evidence.

### F4 — Dispatch and supervision

- **FR-12** Cursor Cloud Agents are launched and steered through the documented Cloud Agents API (create agent, follow-up/steer, get run, cancel, list artifacts).
- **FR-13** In the controlled pilot, ChatGPT is invoked by the Product Owner and directly operates through GitHub; GitHub Actions maintains durable execution state, **not a live ChatGPT process**. A later automatic ChatGPT-equivalent advisor through the OpenAI API requires separate owner authorization for credentials, data egress, retention, spend and permissions.
- **FR-14** Loops have a retry budget, a wall-clock timeout, and a hard stop that escalates to the Product Owner. Infinite self-dispatch is forbidden.
- **FR-15** Architecture changes halt by **both protected-path inspection and semantic comparison** of story vs PR diff. This includes material changes to APIs, DB/schema, tenant isolation, authentication, billing, security, service boundaries, infrastructure and software design even when filenames do not match a protected path. If classification is unavailable/uncertain, HOLD for owner assessment.

### F5 — Security isolation

- **FR-16** ADCP secrets (Cursor API key, optional ChatGPT API key) live in a dedicated GitHub Environment (proposed name `adcp`), not Environment `production` or `uat`, and not a name that collides with Epic 46's "control plane" (Actions + Environment `production`). Creating that Environment and adding required reviewers is an owner gate (D4).
- **FR-17** Agents must receive **no** Production or UAT secrets, Cursor dispatcher/API keys, GitHub PATs or advisor API keys. The dispatcher must not forward credentials through prompts, `envVars`, MCP env/headers, Cloud Agent environment secrets, repository contents, artifacts or logs.
- **FR-18** Evidence artifacts follow Epic 45 AD-4: names, booleans, SHAs, HTTP codes; no secret values.
- **FR-19** Privilege expansion (new write permissions, new secret classes, weakening gates) is an owner gate, matching `autonomous-merge-policy.md`.

### F6 — Milestone reporting

- **FR-20** Standard milestone reports use the ten-section template in `06-milestone-reports.md`.
- **FR-21** A milestone is complete only when required evidence and approvals are present. Missing evidence is FAIL.

## Non-functional

- **NFR-1 Security:** Least privilege. No droplet SSH in Cursor. Fail closed on missing secret **names**.
- **NFR-2 Reliability:** Orchestrator failures must not mutate Production or UAT. The pilot never merges or deploys. Timeout includes **agent run plus CI/review wait**; bounded retries, idempotency, cancellation and durable recovery are mandatory.
- **NFR-3 Audit:** Every dispatch, follow-up, cancel, and owner decision is attributable in GitHub (workflow log, issue comment, or PR comment).
- **NFR-4 Cost:** Pilot must not require a new always-on VM. A dedicated orchestrator service is a later owner decision.
- **NFR-5 Compatibility:** Must not weaken Epic 45 UAT isolation or Epic 46 Production provenance.

## Out of scope

Production GO, live DNS, live Paddle, tenant product features, replacing BMAD with a custom methodology.

## Open questions (owner)

See `09-owner-decision-register.md` and `10-architecture-amendment-proposal.md`. **Direction selected**: GitHub-native pilot, proposed `adcp`, Grok 4.6 only, Epic 47 reserved. **Still open**: adopting reconciled ADRs; branch/ruleset hardening; reviewer identity; privilege expansion; API credentials; authenticated model ID; later unattended advisory API. Do not implement or update the sprint tracker before required owner gates.

## Model and autonomy acceptance (PROPOSED)

- **FR-22 Model enforcement:** Authenticate to Cursor `GET /v1/models`; require exact approved Grok 4.6 `model.id` in every `POST /v1/agents`. Defaults/Auto prohibited; unavailable/uncertain ID means NO DISPATCH. The request is evidence of model selection, not an unsupported claim of actual subagent runtime attestation.
- **FR-23 Secure runner:** Block secret-backed dispatch until `main` and workflow-sensitive paths are protected, required `adcp` reviewers are configured without self-approval deadlock, and secret scopes have been inventoried. No privileged `pull_request` job may consume untrusted code.
- **FR-24 Pilot completion:** Owner-started, credential-protected docs/test-only Cursor run yields agent/run IDs, draft PR, exact SHA, CI/GitGuardian, independent Grok BMAD review and report. No UAT or Production mutations.
- **FR-25 Full autonomy (separate stage):** Owner-approved event-driven queue launches successive pre-approved tasks, maintains durable states and idempotent retries, auto-triages bounded review fixes, escalates material architecture/privilege gates, and invokes an approved advisory API or defers ChatGPT advice to a human session. Do not label this complete after a manual pilot.
