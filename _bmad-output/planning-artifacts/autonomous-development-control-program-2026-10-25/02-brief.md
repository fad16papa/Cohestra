---
title: Autonomous Development Control Program — product brief
status: draft
created: 2026-10-25
updated: 2026-10-25
---

# Product brief

## Problem

Cohestra already runs a BMAD loop and an approved UAT autonomous-delivery plane (Epic 45). Work still starts as ad-hoc Cloud Agent chats. There is no durable orchestrator that:

- routes work through installed BMAD skills
- dispatches Cursor Cloud Agents against GitHub
- keeps ChatGPT in an advisory/orchestration role without pretending it is always-on
- forces Product Owner approval on material architecture
- reports milestones with independently verified evidence

Without that, agents can skip methodology, invent architecture, or treat ChatGPT conversation as the control plane.

## Customer

The Product Owner (final technical and business authority) and the control-plane agents that execute routine stories inside approved contracts.

## Outcome

A **control program**, not a product feature for tenants. After a pilot:

1. Routine stories still follow `create-story → dev-story → code-review → CI → (UAT merge policy)`.
2. ChatGPT, when invoked, can author approved GitHub engineering contracts, select **catalog-verified** BMAD workflows, review and coordinate PR/CI evidence, and recommend architecture decisions. Grok 4.6 remains the mandatory Cursor engineering/review model and BMAD technical signoff; ChatGPT cannot adopt architecture or authorize Production.
3. Cursor Cloud Agents execute only against GitHub on named branches/PRs.
4. Material architecture changes halt at OWNER_GATE with an impact assessment and ADR.
5. Every milestone report cites exact SHA/PR/CI and labels evidence vs claims.

## Non-goals

- Replacing Epic 45 UAT deploy or Epic 46 Production launch
- Autonomous Production merge or deploy
- A new Cohestra runtime service for tenants
- ChatGPT holding droplet SSH, Production `.env`, or Environment `production` secrets
- Changing GitHub org settings in this planning PR

## Success (pilot)

- One routine non-prod story completes through the program with a milestone report that a human can audit
- An architecture-touching change is correctly halted
- No Production secret is present in the control-plane environment
- Epic 46 files and `sprint-status.yaml` are unchanged by this planning work

## [ASSUMPTION] notes

- **Pilot:** ChatGPT means an active human-initiated ChatGPT session using the GitHub connection; it cannot wake itself or run in the background. **Later autonomous advisor:** an explicitly owner-approved OpenAI API worker could be invoked by GitHub Actions, with separate data, credentials, spend, retention and permissions approvals. Neither means a continuously running ChatGPT chat.
- Cursor execution means Cloud Agents API v1 (`POST /v1/agents` and follow-ups), public beta as of this writing.
- The Product Owner remains a single human authority (current Cohestra operating model).

## Separate definitions of success (proposed)

- **Controlled pilot:** ChatGPT places an execution contract directly in GitHub, authorized GitHub Actions dispatches exactly one model-pinned Cursor agent, a draft PR and exact-HEAD checks result, and a verifiable milestone report is posted. No manual copying; first run may need manual GitHub Environment approval.
- **Full autonomy:** Subsequent approved stories are event-driven with durable state, bounded automatic correction and independent reviews, alerts for owner architecture decisions, and an owner-approved API-driven advisory step. This is **not** achieved by a manual pilot or GitHub comment alone.
- Hard owner boundaries include system design, software/code architecture, infrastructure, security, data architecture, any material product change, Production deploy and credential/privilege expansion. See 10-architecture-amendment-proposal.md.

## Owner-approved model routing override (2026-10-25)

**16-owner-model-routing-policy.md is authoritative:** Grok 4.6 owns planning, architecture, substantive development, code/security reviews and release evaluation. Composer 2.5 may implement *simple, isolated low-risk bug fixes* only, with targeted tests and independent Grok 4.6 `bmad-code-review`. No Auto model routing. Provider-internal helper inference need not be completely model-attested; its lack of telemetry must be disclosed, not treated as a standalone block. All owner/security/Production gates remain. This policy decision does not authorize implementation.
