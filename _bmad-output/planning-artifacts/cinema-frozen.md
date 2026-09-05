---
title: Cohestra Cinema — frozen
status: frozen
closed: 2026-09-05
merged_pr: https://github.com/fad16papa/Cohestra/pull/283
merge_commit: 4b12cb2182890cd3bcbde03f9e329c6fb09dd8ac
release_gate: PASS
---

# Cohestra Cinema — frozen

Workstream closed. Do not create cinema stories, reopen visual ideation, or add speculative polish.

**Canonical doctrine:** [`../brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/cohestra-cinema-doctrine.md`](../brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/cohestra-cinema-doctrine.md)

**Canonical seed contract:** [`../specs/spec-democlub-cinema-seed/SPEC.md`](../specs/spec-democlub-cinema-seed/SPEC.md)

**Accepted house-tour spec:** [`../specs/spec-cinema-house-tour-rebuild/SPEC.md`](../specs/spec-cinema-house-tour-rebuild/SPEC.md)

**Visual evidence:** `artifacts/cinema-refine-2026-09-05/pw-*.png` (1440×900)

## Accepted architecture

Apex `/#crm` is a house tour, not a feature carousel.

| Pill | Room | Product source |
|------|------|----------------|
| Website | Harbourline public face | `/dashboard/website` replica |
| Clients | CRM context | `/clients` replica |
| Activities | Club operations | `/activities` replica |
| Follow-up | Triage control room | Client follow-up + campaigns |
| Analytics | Operator questions | `/reports` + dashboard |
| Cohestra AI | Grounded operator briefs | Committed intelligence projection only — no chatbot |

Caption-only narrative. Product/world dominates the viewport. Path B presentational replicas — cinema may compose, never invent.

## Locked demo world

- Org: Harbourline Social Club · `harbourline-social.cohestra.app`
- Clock: `Asia/Singapore` · `2026-09-07T09:00:00+08:00`
- Golden Hour Run: **34 / 42 · 8 spots remaining** (derived)
- Follow-up: **Due now 6 · At risk 7 · Opportunity 4 · Needs attention 17** (derived)
- Anchors: Maya Santos, Daniel Koh, Priya Nair, Marcus Ong, Sarah Tan
- Forbidden: previously removed club identity (Ikigai and prior brands)

## Accepted release criteria

All must remain true. Fail any = cinema is lying; do not “fix” by inventing facts.

1. Website is a believable Harbourline front of house.
2. Clients is a real CRM context (list, search, filters, selected record, history, next action).
3. Activities is operational (capacity, registrations, check-in/no-show/first-timer, seed-grounded actions).
4. Follow-up is a triage control room (Due now / At risk / Opportunity / Healthy).
5. Analytics answers operator questions from the same seed.
6. Cohestra AI is grounded briefs with citeable evidence — no chatbot theater.
7. One continuous world across all six rooms.
8. Important numbers are derived from the seed, not hard-coded marketing.
9. Product/world dominates composition; caption is thin.
10. No generic AI-SaaS visual regression.
11. No previously removed club identity.
12. CI green on the frozen HEAD (`4b12cb2`).
13. 1440px evidence exists for all six chapters.

## Tracker close-out

| Story | Status | Note |
|-------|--------|------|
| 33.1–33.2, 33.6 | done | Seed + feeling copy + Harbourline world |
| 33.7–33.10 | done | House-tour rebuild + fold + ops actions + copy hygiene (PR #283) |
| 33.3–33.5 | done | Absorbed by shipped pin / a11y / mobile-PRM cinema; remaining polish frozen out |
| Epic 33 | done | Frozen |
| Epic 33 retrospective | done | This freeze record is the close-out |

## What not to do

- Do not remount Dashboard, Campaigns, or Reports as standalone cinema chapters.
- Do not change pill order.
- Do not invent cinema-only product functionality.
- Do not start Cohestra AI as a chatbot.
- Do not open new cinema stories.
