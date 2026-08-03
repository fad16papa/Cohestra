---
baseline_commit: 60afb93
status: superseded
superseded_by: Essentials/Studio builder split (2026-08-02)
---

# Story 15.3: Core Essentials builder and Pro Studio unlock

Status: done (revised 2026-08-02)

## Story

As a Tenant Admin on Core/Pro,
I want a plan-appropriate website builder,
so that Core can compose and publish Essentials layouts and Pro adds Studio sections and premium presets.

## Acceptance Criteria

- [x] Basic → Core seeds SitePage; public `/` uses published SitePage
- [x] Core has full builder workflow (draft/preview/publish) with **Essentials** palette only
- [x] Core website builder shows **no** Pro UpgradePanel
- [x] Pro unlocks **Studio** sections (carousel, testimonials, FAQ, stats, CTA band) and Showcase/Event hub presets
- [x] API rejects Studio sections for Core on save/publish
- [x] Basic blocked from SitePage APIs (upgrade / no row)

## Dev Agent Record

- `SiteSectionPlanGate` — Essentials vs Studio section and preset allowlists
- `SitePageService` — plan validation on draft/publish/preset/template; `BuilderLocked` always false for Core+
- `web/lib/site-sections/plan-gate.ts` — palette filtering by plan
- `website-builder-page.tsx` — Core full composer; no locked preview-only mode

## Change Log

- 2026-07-22: DS 15.3 — Core fixed SitePage + Pro builder unlock complete.
- 2026-08-02: Revised — Core Essentials builder unlocked; Pro Studio palette differentiation.
