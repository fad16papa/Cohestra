---
title: Cinema visual validation audit (PR #283)
created: 2026-09-05
status: done
evidence: /opt/cursor/artifacts/cinema-audit-2026-09-05/
---

# Cinema visual validation audit — PR #283

**Method:** Adversarial visual review at 1440px + Playwright DOM/measurement at 1440×900.  
**Architecture:** Do **not** redesign house-tour order or Harbourline DemoClub world.

## Locked (preserve)

- Pills: Website → Clients → Activities → Follow-up → Analytics → Cohestra AI
- Harbourline Social Club · `harbourline-social.cohestra.app` · `Asia/Singapore` · `2026-09-07T09:00:00+08:00`
- Derived Golden Hour **34/42 · 8** and triage **6+7+4=17**
- Caption-strip cinema (no large editorial column)
- Outer Cohestra marketing chrome on landing (cinema is apex `#crm` — not a defect)
- No forbidden prior club identity

## Chapter verdicts

| Chapter | Verdict | Monday morning? | Why |
|---------|---------|-----------------|-----|
| Website | **FAIL** | No | First paint hero-only; public hierarchy in DOM but clipped (`overflow:hidden` + `inert`) |
| Clients | **PASS** | Yes | Dense CRM, anchors, source, next action |
| Activities | **PASS** | Yes | 34/42 ops board; actions still passive |
| Follow-up | **PASS** | Yes | 6/7/4/17 triage control room |
| Analytics | **PASS** | Yes | Question-led; continuity numbers |
| Cohestra AI | **PASS** | Yes | Briefs only; strip meta pedagogy |

**Rejected finding:** “AI content bleeds under every chapter.” Playwright sticky DOM on Website has **zero** `Context person` / `strong-intent` strings. ComputerUse false positive.

**Measured composition (1440×900 sticky):** product stage **81–83%** of sticky height — within target band.

## MUST

### M1 — Website first viewport = real public site
**AC:** At 1440×900 Website chapter sticky view, visible stage includes Harbourline header, hero with **34 going · 8 spots**, CTA, ≥1 non-hero section (highlights or upcoming), and footer identity — without requiring scroll.

### M2 — Fold composition (preferred) or stage scroll
**AC:** Either cinema-specific fold layout shows M1 hierarchy without scroll, **or** Website stage allows `overflow-y: auto` while remaining click-inert. Prefer fold composition for the 2-second test.

## SHOULD

### S1 — Edge-to-edge product stage
**AC:** At 1440px, product stage ≥ ~92% of sticky content width (reduce gutters).

### S2 — Activities seed-grounded action labels
**AC:** Golden Hour detail shows ≥2 action labels with counts from seed helpers (check-in ready / message registrants), not fake filter theater.

### S3 — AI copy hygiene
**AC:** No `/same seed|demoNow/i` in Intelligence mount; evidence lines use unique activity names.

### S4 — Analytics timezone honesty
**AC:** No conflicting “UTC” parenthetical against Asia/Singapore frozen world.

## COULD

- C1 Club-facing status vocabulary overlays (do not rename product enums)
- C2 Deduplicate Harbourline header branding on Website

## Story breakdown

| Story | Scope | Priority |
|-------|-------|----------|
| **33.8** Website cinema fold / reachable public hierarchy | M1, M2 | MUST |
| **33.9** Stage density + Activities action fidelity | S1, S2 | SHOULD |
| **33.10** AI + Analytics copy hygiene | S3, S4 | SHOULD |

Each story requires **1440px visual evidence**; unit tests alone are not acceptance.

## Evidence paths

- Playwright chapter captures: `artifacts/cinema-audit-2026-09-05/pw-{website,clients,activities,outreach,analytics,intelligence}.png`
- Interactive audit canvas: `/cursor/stores/user/canvases/c205487d-c604-449d-89c5-25fe719c2e5e/source.canvas.tsx`
