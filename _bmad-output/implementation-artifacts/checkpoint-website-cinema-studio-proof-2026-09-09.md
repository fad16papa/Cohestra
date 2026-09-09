# Checkpoint Preview — Website Cinema Studio Proof

**Story:** 33.8 Website Cinema Studio Proof  
**Branch:** `cursor/website-cinema-studio-proof-a139`  
**HEAD:** `3d0b256`  
**Date:** 2026-09-09

## Intent

Transform Website cinema from finished Harbourline public site into **Website Studio + live canvas**, preserving Harbourline visual fidelity while proving Cohestra contains a real Website Studio.

## Changed surface

| Area | Change |
|------|--------|
| Website cinema mount | Wrapped `SitePageRenderer` in `MarketingDemoWebsiteStudioShell` |
| Studio shell | Toolbar (identity, hostname, published, Preview/Publish), sections rail, inspector |
| Helpers | `website-cinema-studio.ts` — section list, labels, inspector fields from seed |
| Caption copy | `product-slides.tsx` — Studio authorship narrative |

## Product acceptance question

> Without being told what this screen is, would a first-time visitor understand that Cohestra contains a Website Studio?

**Answer: YES**

Evidence:
- "Website Studio" label with Published badge and hostname
- Three-panel builder layout (Sections | Live site canvas | Section inspector)
- Inspector shows Upcoming activities with "3 published activities from Cohestra"
- Preview/Publish affordances match real builder semantics (presentational only)
- Harbourline canvas unchanged (Golden Hour 34 going · 8 spots left)

## Visual evidence

- Desktop: `/opt/cursor/artifacts/screenshots/website-cinema-studio-desktop.png`
- Mobile: `/opt/cursor/artifacts/screenshots/website-cinema-studio-mobile.png`

## Verification checklist

- [x] Harbourline site still feels inhabited
- [x] Builder chrome does not overwhelm the site
- [x] Controls look like real product controls (non-interactive replica)
- [x] No unsupported capability appears (no live edit/publish)
- [x] Clients room unaffected (spot-checked)
- [x] Unit tests 196/196 pass
- [x] Build pass

## Code review

- bmad-code-review (Bugbot): **PASS** — no BLOCKER/MAJOR findings

## Non-goals confirmed

- No production `WebsiteBuilderPage` mount
- No Epic 19 / UAT changes
- No other Cinema room changes
