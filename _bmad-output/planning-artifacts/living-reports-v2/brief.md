---
title: Living Reports Product Brief
status: draft
created: 2026-08-11
updated: 2026-08-11
---

# Living Reports — Product Brief

## One-liner

Turn Cohestra Reports from a CSV export screen into the operator's **trusted weekly briefing** — narrative, visual, and reconcilable.

## Customer

Tenant admins and operators at clubs, workshops, and community groups who run weekly activities and need to answer: *Did we grow? Did we follow up? What worked?*

## Problem

Today's reports aggregate correctly but feel like backend output. Operators download CSV because they do not **feel** the story in-app. That erodes trust and underuses Core/Pro plan value.

## Solution (v1 — shipping)

- **Narrative hero** — plain-language summary of the period
- **Trust bar** — computed time, cohort size, filters, export parity message
- **Comparison KPIs** — vs prior equal-length period with honest n/a
- **Charts** — daily trend, follow-up pipeline, top activities
- **Same data contract** — API extended with `priorPeriod` + `dailyTrend`

## Success signals

- Operators stay on `/reports` without immediate CSV export
- Support questions about "where did this number come from?" decrease
- Core upgrade path clearer vs Basic list-only reports

## Phase 2 (not in v1)

- Saved report views (Pro marketing promise)
- Scheduled email/PDF
- In-app registration table
- Rich campaign analytics (delivery rate, segments)
- Tenant timezone for period boundaries

## Open questions

- Should Basic tier get narrative + charts or remain list/CSV only?
- Email digest: same narrative engine or separate template?

## Non-goals

- Custom SQL / metric builder
- AI-written insights without grounding
