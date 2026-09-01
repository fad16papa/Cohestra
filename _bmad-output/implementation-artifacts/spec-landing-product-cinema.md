---
title: 'Landing Product Cinema — Inside the workspace'
type: 'feature'
created: '2026-09-01'
status: 'done'
baseline_commit: '0087ac8c3f5cc0ef1a9f3581e1edcfb56253fbce'
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-08-31/EXPERIENCE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-08-31/DESIGN.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The marketing `#crm` section is a click-tab carousel. Prospects do not get an Apple-grade scroll cinema feel while browsing real Cohestra product surfaces, so the suite story under-converts.

**Approach:** Ship Designed Chapter cinema on desktop (`lg+`, motion-safe): sticky stage + sticky chapter pills, native scroll seeking six chapters with real React mocks. Mobile and `prefers-reduced-motion` keep today’s click-tabs carousel (also the rollback). No GSAP/frame scrub.

## Boundaries & Constraints

**Always:**
- Scope is **Cohestra marketing landing only** (apex `SiteLandingPage` / `#crm` section). Showcase mocks are decorative marketing UI, not live admin.
- Follow finalized UX Post Reviewer Gate locks in `ux-cohestra-2026-08-31` (C1–C3, NRV, LiveRegion, contrast tokens, pin math 70vh×6, climax scrub-only, APG tablist, native scroll only).
- Backup current carousel before changing behavior; mobile/PRM render that backup UX.
- Keep all six chapters’ copy and four bullets verbatim; real product mocks only.
- Cinema contrast: `stone-cinema` / `gold-cinema` on paper-warm; dots hit ≥24×24 on CarouselChrome.
- Hash `/#crm` always lands Clients at progress 0 / index 0.
- Transform/opacity only for motion; mocks `aria-hidden` + `inert`.

**Ask First:**
- Adding GSAP, Lenis, Framer Motion, or any new animation dependency.
- Changing chapter order, copy, or cutting bullets.
- Enabling long pin / scrub on mobile.
- Changing pin track length away from 70vh×6.

**Never:**
- Modify tenant admin, dashboard, website-builder app, or any product workspace surface — **marketing apex `#crm` / `MarketingProductCarousel` only**.
- True Apple frame/video scrub or product orbit.
- Full Beat×6 bullet-stagger timelines.
- Scroll-jack (`preventDefault` on wheel/touch/PageDown while pinned).
- Rebrand / new palette beyond cinema contrast tokens.
- Autoplay through chapters.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop scrub | `lg+`, motion-safe, scroll through pin | Chapters advance 1→6; sticky pills update; copy+mock crossfade; live region debounced | N/A |
| Pill seek | Activate Website pill mid-pin | Smooth-seek to chapter 6; **no** climax beat; live region announces immediately | Cancel smooth-seek on wheel/touch |
| Climax | Scrub Reports→Website | One-shot scale 1.02→1 on frame | Skip under PRM |
| Mobile | viewport `< lg` | Current click-tabs carousel; no pin spacer | N/A |
| Reduced motion | `prefers-reduced-motion: reduce` | CarouselChrome; tear pin if toggling mid-session; restore chapter id | Remount chrome |
| Hash | Navigate `/#crm` (even if already in section) | Clients @ 0 | N/A |
| Resize across `lg` | Cross breakpoint while on Dashboard | Remount model; keep `dashboard` id; sync scroll/focus | Focus → active pill if chrome unmounted |
| Cinema failure | JS error in cinema path | Fall back to legacy carousel | Log-free graceful render |

</frozen-after-approval>

## Code Map

- `web/components/marketing/marketing-product-carousel.tsx` — current section; refactor entry or thin wrapper
- `web/components/marketing/marketing-product-carousel.legacy.tsx` — **create**: frozen backup of today’s carousel (mobile/PRM/rollback)
- `web/lib/marketing/product-slides.ts` — **create**: extract `PRODUCT_SLIDES` + types shared by cinema + legacy
- `web/components/marketing/marketing-product-cinema.tsx` — **create**: desktop pin stage + sticky pills + scrub
- `web/components/marketing/use-marketing-product-cinema.ts` — **create**: scroll→chapter, hysteresis, seek, live-region debounce
- `web/components/marketing/marketing-home-page.tsx` — compose `<MarketingProductCarousel />` (keep export name)
- `web/components/marketing/marketing-shell.tsx` — sticky header `z-30` / `#crm` link (read-only constraint)
- `web/components/marketing/marketing-product-showcase-mocks.tsx` — chapter visuals (reuse)
- `web/components/marketing/marketing-crm-showcase.tsx` — Clients visual (reuse)
- `web/app/globals.css` — crossfade/climax/cinema tokens; PRM kills
- `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-08-31/` — UX contract + mockups

## Tasks & Acceptance

**Execution:**
- [x] `web/components/marketing/marketing-product-carousel.legacy.tsx` -- Copy current carousel implementation as named legacy export -- backup + mobile/PRM/rollback surface
- [x] `web/lib/marketing/product-slides.ts` -- Extract slide types + `PRODUCT_SLIDES` (verbatim copy, same visuals) -- single source of truth
- [x] `web/components/marketing/use-marketing-product-cinema.ts` -- Pin progress math (70vh×6, 3% hysteresis), Activate seek, scrub live-region debounce, climax scrub-entry flag -- UX locks C3/LiveRegion/Climax
- [x] `web/components/marketing/marketing-product-cinema.tsx` -- Sticky pills under header + sticky stage; APG tablist; stable panel; crossfade; climax; cinema contrast classes -- desktop cinema UI
- [x] `web/components/marketing/marketing-product-carousel.tsx` -- Gate: `lg+` && !PRM → cinema; else legacy; preserve `id="crm"` export name -- single entry for home page
- [x] `web/app/globals.css` -- Cinema enter/crossfade/climax + `stone-cinema`/`gold-cinema` utilities; PRM disables motion -- tokens + a11y motion
- [x] Browser verify -- Desktop scrub/seek/climax + mobile tabs + PRM + `/#crm` -- user rule: real browser verification

**Acceptance Criteria:**
- Given desktop `lg+` motion-safe, when visitor scrolls the `#crm` pin, then six chapters seek in order with sticky pills always visible and all four bullets per chapter shown.
- Given desktop cinema, when visitor Activates the Website pill, then track seeks to Website without climax; live region announces immediately.
- Given desktop cinema, when visitor scrubs from Reports into Website, then climax micro-beat fires once then settles to scale 1.
- Given viewport `< lg` or `prefers-reduced-motion`, when section renders, then legacy click-tabs carousel appears with no pin spacer.
- Given any mode, when navigating `/#crm`, then Clients is current at rest.
- Given cinema JS failure, when section mounts, then legacy carousel still renders.

## Design Notes

Native CSS `position: sticky` + rAF-batched scroll math — no GSAP. Pin `top` and sticky pills use `6rem` (`scroll-mt-24` / header offset). Header stays `z-30`; pills/stage `z-20`. Public export remains `MarketingProductCarousel` so `marketing-home-page.tsx` need not change imports.

Golden seek formula: chapter track starts after intro; `progress = clamp((scrollY - trackStart) / trackHeight, 0, 1)`; chapter index from equal sixths with ±3% hysteresis.

## Verification

**Commands:**
- `cd web && npx tsc --noEmit` -- no new type errors in touched files
- `cd web && npm run lint` -- no new errors in cinema files (pre-existing lint debt elsewhere OK)

**Manual checks:**
- Desktop: scrub all 6 chapters; sticky pills; skip to Website; scrub climax Reports→Website; `/#crm` → Clients
- Mobile (~390px): tabs/dots/chevrons; no long pin; Website reachable
- Toggle reduced-motion: cinema tears down to carousel; chapter id preserved when possible

## Suggested Review Order

**Entry / gate (marketing only)**

- Desktop cinema vs legacy carousel; error boundary fallback
  [`marketing-product-carousel.tsx:40`](../../web/components/marketing/marketing-product-carousel.tsx#L40)

**Scroll cinema engine**

- Seek lock, hysteresis 3%, scrub climax flag, native scroll only
  [`use-marketing-product-cinema.ts:1`](../../web/components/marketing/use-marketing-product-cinema.ts#L1)

- Sticky stage + APG focus≠seek pills + climax class
  [`marketing-product-cinema.tsx:1`](../../web/components/marketing/marketing-product-cinema.tsx#L1)

**Backup / mobile / PRM**

- Frozen click-tabs carousel (rollback surface)
  [`marketing-product-carousel.legacy.tsx:1`](../../web/components/marketing/marketing-product-carousel.legacy.tsx#L1)

**Shared copy + mocks**

- Verbatim PRODUCT_SLIDES (landing showcase mocks, not admin)
  [`product-slides.tsx:1`](../../web/lib/marketing/product-slides.tsx#L1)

**Tokens**

- stone-cinema / gold-cinema + climax keyframes
  [`brand-tokens.css:12`](../../web/styles/brand-tokens.css#L12)
  [`globals.css:142`](../../web/app/globals.css#L142)
