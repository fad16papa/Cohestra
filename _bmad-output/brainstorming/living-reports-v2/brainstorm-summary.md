---
title: Living Reports — Brainstorm
status: complete
created: 2026-08-11
---

# Brainstorm: Make Cohestra Reports a Source of Truth

## Problem frame

Operators do not trust dull CSV dumps. They trust reports that **explain**, **compare**, **visualize**, and **reconcile** with what they already know from daily work.

## Idea clusters (diverge)

### Narrative & emotion
- "Your week at a glance" hero with plain-language insights
- Highlight wins (repeat participants, top activity) before raw numbers
- Call out risks (low follow-up coverage, inactive cohort) with suggested next actions
- Weekly email digest with the same narrative voice as in-app

### Trust & credibility
- Show `computedAt`, cohort size, active filters
- "Export matches on-screen totals" badge
- Period-over-period comparison with honest n/a when no baseline
- Methodology tooltip: what cohort means, UTC windows, current vs at-registration status

### Visualization (market standard)
- Daily trend area chart for filtered period
- Follow-up pipeline bar chart
- Horizontal bar chart for top activities
- Sparkline deltas on KPI tiles (reuse dashboard pattern)

### Product depth (Phase 2)
- Saved report views (Pro promise)
- Scheduled PDF/email reports
- In-app registration table before export
- Campaign delivery/open metrics
- Timezone-aware periods per tenant
- Drill-down links that preserve filter context

## Converged MVP (ship now)

1. Narrative hero + insight cards
2. Trust bar (freshness, cohort, filters, export parity)
3. Prior-period comparison on KPI tiles
4. Daily trend + follow-up + activity ranking charts
5. Backend: prior period + daily trend in report API

## Killed / deferred

- AI-generated commentary (risk of hallucination; rule-based insights first)
- Full PDF designer (CSV + narrative in-app is enough for v1)
- Custom metric builder (enterprise later)
