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
2. ChatGPT can draft impact-assessment prose and *suggest* the next installed BMAD skill. Grok 4.6 remains architecture/security/review signoff. ChatGPT cannot authorize Production or architecture.
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

- ChatGPT means the OpenAI API (or ChatGPT connector) invoked by an external runner, not a standing desktop session.
- Cursor execution means Cloud Agents API v1 (`POST /v1/agents` and follow-ups), public beta as of this writing.
- The Product Owner remains a single human authority (current Cohestra operating model).
