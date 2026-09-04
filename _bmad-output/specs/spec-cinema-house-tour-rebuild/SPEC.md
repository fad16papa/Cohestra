---
title: 'Cinema house-tour rebuild'
type: 'feature'
created: '2026-09-04'
status: 'in-progress'
route: 'one-shot'
context:
  - '{project-root}/_bmad-output/specs/spec-democlub-cinema-seed/SPEC.md'
  - '{project-root}/web/lib/marketing/marketing-demo-club.ts'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Apex `/#crm` still reads as a polished SaaS feature carousel (Clients → Follow-up → Dashboard → Campaigns → Reports → Website) instead of a house tour that makes a visitor mentally move their club into Cohestra.

**Approach:** Rebuild cinema navigation and mounts as Website → Clients → Activities → Follow-up → Analytics → Cohestra AI, projecting one Harbourline DemoClub seed at ~85–90% product / 10–15% caption, with Campaigns/Reports folded into Follow-up/Analytics and AI limited to seed-grounded operator briefs (no chatbot theater).

## Boundaries & Constraints

**Always:**
- Harbourline Social Club · `harbourline-social.cohestra.app` · `Asia/Singapore` · frozen `demoNow` `2026-09-07T09:00:00+08:00`
- Important numbers derived from seed: Golden Hour `34/42` (8 spots), triage `6+7+4=17`
- Anchor continuity: Maya, Daniel, Priya, Marcus, Sarah across rooms
- Caption-only narrative; product/world dominates viewport
- Reverse-chain honesty: AI cites only seed facts

**Ask First:**
- Shipping a real in-product Cohestra AI surface (cinema may project grounded briefs only until then)
- Renaming internal admin routes to match cinema labels

**Never:**
- Giant gradients, glass cards, decorative KPI quartets, canned % improvements
- Standalone Campaigns or Reports cinema chapters
- Cinema-only chatbot / fantasy AI claims
- Forbidden club identity (Ikigai / prior removed brands)
- Deriving cinema state from the system clock

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| House-tour nav | Desktop `#crm` | Pills in Website → Clients → Activities → Follow-up → Analytics → Cohestra AI order | N/A |
| Golden Hour continuity | Seed registrations | Website/Activities/Analytics show 34/42 · 8 left | Seed assert fails load |
| Follow-up triage | Seed predicates | Due now 6 · At risk 7 · Opportunity 4 · Needs attention 17 | Seed assert fails load |
| Marcus phone gap | Marcus missing phone | Actionability blocked; does not inflate 17 | Assert Marcus healthy |
| Cohestra AI | Seed intelligence facts | Briefs only with citeable seed evidence; no chat | Omit invented metrics |
| Composition | 1440px | Product ≥ ~85% of stage; caption strip only | N/A |

</frozen-after-approval>

## Code Map

- `web/lib/marketing/product-slides.tsx` — chapter order, caption copy, mounts
- `web/components/marketing/marketing-product-cinema.tsx` — 85/15 composition
- `web/components/marketing/marketing-product-carousel.legacy.tsx` — same nav/copy
- `web/components/marketing/use-marketing-product-cinema.ts` — climax / reset to Website
- `web/lib/marketing/marketing-demo-club.ts` — room ids, triage helpers, intelligence facts
- `web/lib/marketing/marketing-demo-club.json` + `web/scripts/generate-democlub-seed.mjs` — availableRooms
- `web/components/marketing/demo-mounts/*` — Activities, Follow-up triage, Analytics, AI mounts

## Tasks & Acceptance

**Execution:**
- [ ] Reorder PRODUCT_SLIDES + room ids; drop standalone Campaigns/Reports chapters
- [ ] Caption-only cinema layout (no large editorial column)
- [ ] Activities mount with operational 34/42 fidelity
- [ ] Follow-up triage control room (6/7/4/17)
- [ ] Analytics compose dashboard+reports into question-led panels
- [ ] Cohestra AI mount from derived seed facts only
- [ ] Unit tests for nav order, composition kill-list, triage display helpers
- [ ] Visual review evidence at 1440px per chapter

**Acceptance Criteria:**
- Given `#crm`, when pills render, then order is Website → Clients → Activities → Follow-up → Analytics → Cohestra AI
- Given DemoClub seed, when Activities opens, then Golden Hour shows 34/42
- Given DemoClub seed, when Follow-up opens, then triage shows 6 / 7 / 4 / 17
- Given Analytics/AI, when numbers appear, then they reverse-chain to the same seed
- Given 1440px viewport, when any chapter shows, then product/world dominates and caption is thin

## Design Notes

Narrative progression (caption only): This is us → our people → what we run → who needs us → what is working → what to do next.

AI briefs are computed helpers over the seed (due-now count, capacity pressure, at-risk anchors) — never free-form chat.

## Verification

- `cd web && npx vitest run lib/marketing/product-slides.test.ts lib/marketing/marketing-demo-club.test.ts`
- Visual review screenshots under `/opt/cursor/artifacts/` for each chapter at 1440px
