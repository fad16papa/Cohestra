---
baseline_commit: pending
---

# Story 9.9: Public Landing Visitor Polish (Phase A)

Status: done

## Story

As a public visitor,
I want a marketing-focused homepage with hero imagery and no operator sign-in funnels,
So that the landing page promotes community events professionally.

## Acceptance Criteria

1. **AC-9.9.1 — No operator CTAs on public landing**
   - **Given** the published homepage at `/`
   - **When** I view the page as a visitor
   - **Then** I do not see operator sign-in, operator registration, or header CTAs to `/login`

2. **AC-9.9.2 — Hero banner image**
   - **Given** the hero section has `heroImageAssetId` set
   - **When** I view the homepage
   - **Then** the hero banner image is displayed

3. **AC-9.9.3 — Upcoming activities filter**
   - **Given** activities in draft, archived, and published states
   - **When** upcoming activities load for the homepage
   - **Then** only published activities with `ShowOnHomepage=true` appear (verified by test)

4. **AC-9.9.4 — Seed presets visitor-first**
   - **Given** fresh seed or preset reset
   - **When** hero section is created
   - **Then** default hero has no secondary CTA to `/login`

## Tasks

- [x] Remove operator CTAs from public renderer (header, hero, register promo)
- [x] Render hero banner from `heroImageAssetId`
- [x] Remove `/login` from builder CTA target options
- [x] Remove default secondary CTA from seed presets
- [x] Update seed builder tests
- [x] Verify resolver test + builds

## Dev Agent Record

### Completion Notes List

- Public renderer strips `/login` and `/register` CTAs via `readPublicCta`; removed header CTA and “Create operator account” block
- Hero section renders banner image from `heroImageAssetId` in a two-column layout on large screens
- Seed presets no longer include hero `secondaryCta` to `/login`
- Builder CTA picker no longer offers operator sign-in target
- Upcoming activities filter already covered by `SiteUpcomingActivitiesResolverTests`

### File List

- `_bmad-output/planning-artifacts/prds/prd-landing-components-2026-07-07/prd.md` (new)
- `_bmad-output/planning-artifacts/prds/prd-landing-components-2026-07-07/addendum.md` (new)
- `_bmad-output/planning-artifacts/epics.md` (modified — Epic 10)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/9-9-public-landing-visitor-polish.md` (new)
- `web/lib/site-cta-utils.ts` (new)
- `web/components/marketing/site-page-renderer.tsx` (modified)
- `web/components/website/website-section-fields.tsx` (modified)
- `src/Infrastructure/Seed/SitePageSeedDocumentBuilder.cs` (modified)
- `src/Infrastructure.Tests/Seed/SitePageSeedDocumentBuilderTests.cs` (modified)

### Change Log

- 2026-07-07: Phase A — visitor-first landing, hero banner, seed/builder CTA cleanup
