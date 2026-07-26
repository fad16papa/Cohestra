# Story 16.1: Activity share kit

**Epic:** 16 — One-stop Lite (v1.1)  
**Status:** done  
**Created:** 2026-07-25

## User story

As a community operator,  
I want a share kit on each published activity,  
So that I can copy a WhatsApp message, preview my registration link, and download QR assets without leaving the dashboard.

## Acceptance criteria

**Given** a published activity  
**When** I open the **Share kit** tab on the activity detail page  
**Then** I see the public registration URL with **Copy link**  
**And** **Copy WhatsApp message** copies a ready-to-paste message with name, schedule, location, and link  
**And** a **Link preview** mock shows title, description, and hero image (when set)  
**And** **Download QR PNG** saves the registration QR  
**And** **Download share pack** saves QR PNG + a `.txt` file with link and WhatsApp copy  

**Given** a draft or archived activity  
**When** I open Share kit  
**Then** actions are unavailable with clear publish-gate or archived messaging (text-only unlock state; no disabled ghost buttons)

## Implementation notes

- Replaces the former **QR & Link** tab (`ActivityQrPanel` → `ActivityShareKitPanel`)
- Reuses `ShareLinkPreview` (shared with website builder publish dialog)
- Live site / homepage share kit remains in website builder (`WebsiteSharePreview`)
- Follow-up (16.2): server-side OG metadata on `/register/[slug]` for real social crawlers

## Files

- `web/lib/share-kit-utils.ts`
- `web/components/shared/share-link-preview.tsx`
- `web/components/activities/activity-share-kit-panel.tsx`
- `web/components/activities/activity-detail-page-client.tsx`

### Review Findings

- [x] [Review][Decision] Draft/archived share kit uses text-only unlock messaging — AC updated to match UX polish [`activity-share-kit-panel.tsx`]
- [x] [Review][Patch] Share pack may only download one of two files in Safari/Chrome — staggered second download via `downloadSharePackFiles` [`share-kit-utils.ts`, `activity-share-kit-panel.tsx`]
- [x] [Review][Patch] Dashboard link preview hero may fail when hero URL is absolute API URL — `resolveHeroImageUrl` in `buildActivitySharePreview` [`share-kit-utils.ts`]
- [x] [Review][Patch] Published share-kit actions hidden when initial load fails — independent link/QR fetch with partial UI and retry [`activity-share-kit-panel.tsx`]
- [x] [Review][Defer] External pasted hero URLs may break `next/image` in preview mock — pre-existing branding constraint [`share-link-preview.tsx:37-45`] — deferred, pre-existing remotePatterns gap
