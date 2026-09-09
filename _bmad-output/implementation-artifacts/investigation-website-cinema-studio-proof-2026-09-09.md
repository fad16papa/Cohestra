# Investigation — Website Cinema Studio Proof

**Date:** 2026-09-09  
**Scope:** Website cinema room only (Epic 33)

## A. Real Website Builder (Confirmed)

| Area | Evidence |
|------|----------|
| Route | `web/app/(admin)/dashboard/website/page.tsx` → `WebsiteBuilderPage` |
| Editor | Toolbar + Design/Sections/Templates rail + live preview |
| Document | `SiteSectionsDocument` in `web/lib/public-site-api.ts` |
| Public renderer | `SitePageRenderer` shared with builder preview |
| Publish/Preview | `site-admin-api.ts`, preview token, publish gate |
| Activity-backed | `upcomingActivities` section + API resolver |
| Plan gates | Basic stub; Core essentials; Pro studio sections |

## B. Current Website Cinema (Confirmed)

| Area | Evidence |
|------|----------|
| Mount | `marketing-demo-website-mount.tsx` → `SitePageRenderer` + `cinemaFold` |
| Seed | `marketing-demo-club.json` Harbourline website document |
| Room switch | Single active mount; remount on chapter change (not hidden persistent) |
| Gap | Finished public site only — no builder chrome; visitor may miss Website Studio |

## Decision inputs

- **Reuse:** `SitePageRenderer`, `SECTION_TYPE_LABELS`, seed `PublicSitePayload`
- **Do not mount:** `WebsiteBuilderPage` (auth, autosave, providers)
- **Approach:** Thin studio shell replica around existing canvas
