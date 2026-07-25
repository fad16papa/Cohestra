---
baseline_commit: 571beef30a83e4dc56f14176aca9f01f904f0a1b
---

# Story 14.1: Midnight Atelier tokens, marketing home, and pricing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **prospect (Priya)**,
I want **a premium Cohestra marketing experience with clear Start free and pricing**,
So that **I trust the product enough to begin without a card**.

## Acceptance Criteria

1. **Given** the Next.js web app  
   **When** Midnight Atelier tokens are implemented  
   **Then** colors (ink, paper, lagoon, gold, stone, semantic), typography (Fraunces + Plus Jakarta Sans), radii/spacing, and next-themes light/dark/system match `DESIGN.md`  
   **And** Platform 0 forest-green is not the Cohestra brand on marketing surfaces

2. **Given** apex marketing home `/`  
   **When** Priya lands (no published tenant SitePage — env landing fallback)  
   **Then** Cohestra is the hero-level brand signal; one promise; one lede; primary Start free + secondary trial CTA  
   **And** photographic field + product object craft follow the ratified mock (no dashboard-first / AI-mist / Inter default stack)

3. **Given** `/pricing`  
   **When** plans are shown  
   **Then** Basic free, Core $29/$290, Pro $79/$790, Enterprise custom match `docs/marketing/pricing-tiers.md`  
   **And** annual is marketed as monthly equivalent ($24/mo and $66/mo billed annually)  
   **And** Start free is the primary CTA

4. **Given** motion guidelines (UX-DR2)  
   **When** the hero loads  
   **Then** at least staggered rise + soft product lift + 1px button hover are present

## Tasks / Subtasks

- [x] Task 1: Midnight Atelier design tokens (AC: 1)
  - [x] 1.1 Replace Platform 0 forest palette in `web/styles/brand-tokens.css` with DESIGN.md ink/paper/lagoon/gold/stone/semantic + radii (sm 4, md 10, lg 16, xl 24)
  - [x] 1.2 Wire Fraunces + Plus Jakarta Sans in root layout; update typography `@utility` classes to match DESIGN.md scale
  - [x] 1.3 Expose Atelier semantic colors in `globals.css` `@theme inline` (lagoon, gold, ink, paper, stone, line)
  - [x] 1.4 Preserve lead-status + WhatsApp semantics; map `--status-active` to Atelier success

- [x] Task 2: Shared marketing shell + motion (AC: 2, 4)
  - [x] 2.1 Add `MarketingShell` (sticky nav: Pricing, Sign in, Start free; wordmark Fraunces)
  - [x] 2.2 Add Atelier CTA helpers (lagoon primary 48px, ghost secondary, 1px hover lift)
  - [x] 2.3 Hero motion: `MarketingReveal` stagger + product-frame lift keyframe; respect `prefers-reduced-motion`

- [x] Task 3: Marketing home `/` fallback (AC: 2)
  - [x] 3.1 Replace `SiteLandingPage` dashboard-first layout with asymmetric hero per `mockups/marketing-start-free.html`
  - [x] 3.2 Copy: brand word Cohestra, promise, lede, CTAs Start free (`/signup`) + Start trial (`/signup?plan=core`)
  - [x] 3.3 Photo column + floating product card (browser-frame object); optional atelier triptych band
  - [x] 3.4 Keep auth redirect + onboarding status logic; hide global AppFooter on marketing routes

- [x] Task 4: Pricing page `/pricing` (AC: 3)
  - [x] 4.1 Add `web/app/pricing/page.tsx` with plan cards from `docs/marketing/pricing-tiers.md`
  - [x] 4.2 Show annual monthly-equivalent ($24/mo, $66/mo) with monthly list prices
  - [x] 4.3 Compare table + FAQ excerpt; Start free primary CTA throughout

- [x] Task 5: Verify (AC: 1–4)
  - [x] 5.1 `npm run build` + lint on new 14.1 files (repo-wide lint has pre-existing failures)
  - [x] 5.2 No forest-green `#2d6a4f` / `#40916c` left in brand-tokens.css
  - [x] 5.3 Do not implement signup/Stripe (14.2–14.4); leave `deploy/uat-bootstrap.sh` alone

### Review Findings

- [x] [Review][Patch] Basic plan missing “Registration email notifications” in features + compare table vs `pricing-tiers.md` [`web/lib/marketing/pricing-plans.ts`]
- [x] [Review][Defer] `/` shows legacy SitePageRenderer when published tenant site exists — marketing mock only on env fallback; Epic 15 refresh
- [x] [Review][Defer] Admin/login forest accents and global token side-effects on non-marketing UI — Story 14.5 admin shell
- [x] [Review][Defer] Hero Unsplash CDN dependency — optional self-host polish
- [x] [Review][Defer] Tenant SitePageRenderer still uses sparkles/gradient `marketing-primitives` — Atelier composition deferred
- [x] [Review][Defer] Marketing shell hardcodes light paper — dark/system theme polish deferred with admin shell (14.5)
- [x] [Review][Defer] Onboarding `registerAvailable` CTA removed from landing — operator signup via `/register` remains; marketing home focuses on `/signup`

### Senior Developer Review (AI) (2026-07-21)

**Outcome:** Approve (clean with deferrals)

**Layers:** Blind Hunter — no blocking issues; Edge Case Hunter — version drift and route-list notes deferred; Acceptance Auditor — ACs 1–4 met; pricing feature gap patched.

## Dev Notes

### Epic / UX anchors

| Source | Requirement |
|--------|-------------|
| Epic 14 Story 14.1 | UX-DR1 tokens, UX-DR2 motion, UX-DR3 pricing surface |
| `DESIGN.md` | Midnight Atelier palette + typography + motion |
| `mockups/marketing-start-free.html` | Hero composition, copy tone, photo + float card |
| `docs/marketing/pricing-tiers.md` | Plan names, limits, prices, FAQ |
| `project-context.md` | Hex in `brand-tokens.css` only; marketing apex ≠ tenant SitePage |

### Project Structure Notes

| Path | Role |
|------|------|
| `web/styles/brand-tokens.css` | Midnight Atelier token spine |
| `web/components/marketing/marketing-shell.tsx` | Apex nav/footer + CTA helpers |
| `web/components/marketing/marketing-home-page.tsx` | Atelier hero + triptych |
| `web/components/marketing/pricing-page.tsx` | Pricing UI |
| `web/lib/marketing/pricing-plans.ts` | Plan constants |
| `web/app/pricing/page.tsx` | `/pricing` route |

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 14 Story 14.1]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md`]
- [Source: `docs/marketing/pricing-tiers.md`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Debug Log References

- `npm run build` in `web/`: success (22 routes including `/pricing`)
- New 14.1 files: eslint clean
- Repo-wide `npm run lint`: pre-existing failures outside 14.1 scope

### Completion Notes List

- Migrated `brand-tokens.css` from Platform 0 forest green to Midnight Atelier (ink/paper/lagoon/gold/stone/semantic); updated radii and typography utilities (Fraunces + Plus Jakarta Sans).
- Root layout loads Fraunces + Jakarta; `globals.css` exposes Atelier color utilities + product-lift / button hover motion.
- `MarketingShell` + `MarketingHomePage`: asymmetric hero, photo + float card, triptych band, Start free + Start trial CTAs, staggered reveal motion.
- `/pricing`: plan cards, compare table, FAQ from `pricing-plans.ts`; annual monthly-equivalent copy for Core/Pro.
- `SiteLandingPage` delegates to `MarketingHomePage`; AppFooter hidden on `/pricing`.
- `/signup` links forward-compat to Story 14.3 (404 until implemented).

### File List

- `web/styles/brand-tokens.css`
- `web/app/globals.css`
- `web/app/layout.tsx`
- `web/next.config.ts`
- `web/app/pricing/page.tsx`
- `web/components/marketing/marketing-shell.tsx`
- `web/components/marketing/marketing-home-page.tsx`
- `web/components/marketing/pricing-page.tsx`
- `web/components/marketing/site-landing-page.tsx`
- `web/components/layouts/app-footer.tsx`
- `web/lib/marketing/pricing-plans.ts`
- `_bmad-output/implementation-artifacts/14-1-midnight-atelier-tokens-marketing-home-and-pricing.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-21: CS 14.1 — story created from Epic 14; status → ready-for-dev.
- 2026-07-21: DS 14.1 — Midnight Atelier tokens, marketing home, pricing page; status → review.
- 2026-07-21: CR 14.1 — clean approve; pricing notifications row patched; status → done.

## Ultimate context engineering tip

Story 14.1 = **replace Platform 0 forest chrome with Midnight Atelier on apex marketing** — token spine first (`brand-tokens.css`), then hero/pricing surfaces that match the ratified mock and pricing-tiers.md. Signup/Stripe are later stories.

### Story completion status

done — CR approved; Midnight Atelier marketing surfaces shipped.
