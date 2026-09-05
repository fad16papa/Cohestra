---
title: Cohestra Intelligence Brief
status: final
created: 2026-09-05
updated: 2026-09-05
sources:
  - operator north star (2026-09-05)
  - live product recon (dashboard, clients, activities, reports)
---

# PRD — Cohestra Intelligence Brief (MVP)

## Problem

Cinema promises: “When I open Cohestra, tell me what deserves my attention, why it matters, and what I should do next.”

Today that promise exists only as a marketing mount. The admin product has the operational facts (due follow-ups, new uncontacted people, merge suspects, capacity, registration trend) but no permanent, evidence-backed brief. Operators still assemble the morning from Dashboard + Clients + Reports.

## Job

An **operator intelligence surface** — grounded, prioritized, explainable, actionable.

Not a chatbot.

## Architecture principle

```
REAL COHESTRA DATA
→ DETERMINISTIC FACT COMPUTATION
→ STRUCTURED EVIDENCE
→ (later) AI SYNTHESIS + VALIDATION
→ OPERATOR BRIEF
→ ACTION / DEEP LINK
```

SQL/application logic calculates truth. A model may only synthesize, explain, prioritize, and frame actions from those facts. It must never invent counts, names, or percentages.

## MVP must

- Permanent operator surface (API in 34.1; UI in 34.2)
- Prioritized insights from **real tenant data**
- Evidence behind every claim
- Recommended next action with a real Cohestra deep link
- Tenant isolation + TenantOperator authorization
- Insufficient-data state
- Deterministic fallback (no LLM required to produce a truthful brief)
- Structured response contract + validation
- Safe logging (no PII in logs)
- Regression + TenantIsolation coverage

## Grounded insight set (v1)

Ship only what the product can truthfully know today:

1. **Follow-ups due** — same `NextFollowUpAt < startOfTomorrow(tenant TZ)` rule as Clients
2. **New people with no outreach** — `LeadStatus=New` and no coverage timeline events
3. **Merge suspects** — `IsMergeSuspect`
4. **Capacity pressure** — published activities with `MaxRegistrants` set and few spots left
5. **Registration week-over-week** — only when the previous 7-day window has enough volume to be defensible (≥3)

Do **not** ship in v1: check-in/no-show, first-timer aggregates, at-risk/opportunity cinema scoring, campaign open rates, weakly grounded prediction.

## Non-goals

Generic chat, Ask Anything, autonomous messaging/campaigns/CRM/activity mutation, multi-agent systems, natural-language BI, voice.

## Success

An operator on a seeded tenant opens the brief and sees the same people/activities they would find by filtering Clients and Activities — with evidence they can click through. Cinema AI claims correspond to this real surface, not a mock.

## Stories

See `_bmad-output/planning-artifacts/epics-cohestra-intelligence.md`.
