---
baseline_commit: a9169a5
epic: 15
story: 8
depends_on:
  - 15-3-core-fixed-sitepage-and-pro-builder-unlock
  - cursor/core-pro-builder-split-4da3
---

# Story 15.8: Pro Studio video embed section (YouTube / Vimeo)

Status: ready-for-dev

## Story

As a Tenant Admin on **Pro**,
I want to add a video section to my public homepage using a YouTube or Vimeo link,
So that visitors can watch our community promo without me hosting video files.

## Background

Party-mode decision (2026-08-03): **Phase 1 = embed only**. Do not extend `CampaignAssetService` (2MB image cap, local disk). Self-hosted MP4 upload is **deferred** to a future story.

Essentials/Studio split (PR #54): Core gets Essentials builder; Pro adds Studio palette. **`video` is a new Studio section type.**

## Acceptance Criteria

### Builder (Pro only)

- [ ] **Given** a Pro (or Enterprise) tenant on `/dashboard/website`
  **When** the operator opens Add section
  **Then** **Video** appears in the Studio palette alongside carousel, testimonials, etc.

- [ ] **Given** a Core tenant
  **When** Add section is shown
  **Then** Video is **not** offered (same as other Studio sections)

- [ ] **Given** a Pro admin editing a Video section
  **When** they paste a supported URL and save draft
  **Then** draft persists with parsed `source`, `videoId`, and canonical embed URL

- [ ] **Given** invalid or unsupported URL (TikTok, random iframe, non-HTTPS)
  **When** save draft or publish
  **Then** API returns 400 with clear validation message

### Server validation

- [ ] **Given** Core tenant draft containing a `video` section
  **When** PUT `/api/v1/admin/site` or POST publish
  **Then** rejected with Studio plan message (via `SiteSectionPlanGate`)

- [ ] **Given** Pro tenant with allowlisted YouTube/Vimeo URL
  **When** publish
  **Then** succeeds; public `/` serves published doc with video section

- [ ] **Given** URL host not on allowlist
  **When** save
  **Then** rejected — no SSRF / arbitrary iframe src

**Allowlisted hosts (v1):**

- `youtube.com`, `www.youtube.com`, `youtu.be`, `youtube-nocookie.com`
- `vimeo.com`, `player.vimeo.com`

### Public render

- [ ] **Given** published SitePage with enabled `video` section
  **When** visitor loads tenant public `/`
  **Then** responsive 16:9 player renders (iframe embed)
  **And** uses `youtube-nocookie.com` for YouTube
  **And** `loading="lazy"` on iframe
  **And** section hidden when `enabled: false`

- [ ] **Given** preview mode
  **When** draft includes video section
  **Then** preview shows same player with preview banner (existing behavior)

### Accessibility & UX

- [ ] iframe has `title` from section props (fallback: "Community video")
- [ ] Optional `caption` / description text field below title (plain text)
- [ ] Autoplay **off** by default; if added later, must be `muted` + `playsinline`

## Section schema (v1)

Add to Studio palette in `web/lib/site-sections/registry.ts`:

```typescript
// type: "video"
props: {
  title: string;           // optional heading above player
  description: string;     // optional short caption
  source: "youtube" | "vimeo";
  videoUrl: string;        // original pasted URL
  videoId: string;         // parsed id
  aspectRatio: "16:9";     // fixed v1
}
```

Default section via `getDefaultSectionProps("video")`.

## Implementation notes

### Backend

| File | Change |
|------|--------|
| `SiteSectionPlanGate.cs` | Add `"video"` to `StudioSectionTypes` |
| New `SiteVideoEmbedValidator.cs` | Parse + validate YouTube/Vimeo URLs; extract id |
| `SitePageService.UpdateDraftAsync` | After plan gate, validate video section props |
| `SitePublishGateValidator.cs` | Optional: require non-empty `videoId` when section enabled |

**Do not** store video bytes. Only JSON in `SitePage` sections.

### Frontend

| File | Change |
|------|--------|
| `registry.ts` | Add `video` to `STUDIO_SECTION_TYPES`, labels, defaults |
| `plan-gate.ts` | Automatically included via STUDIO list |
| `marketing-section-fields.tsx` or new `video-section-fields.tsx` | URL input, live validation hint, preview thumbnail optional |
| `site-page-renderer.tsx` | `VideoPublicSection` component |
| `website-section-fields.tsx` | Wire editor for video type |

### URL parsing (reference)

**YouTube:**

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

**Vimeo:**

- `https://vimeo.com/VIDEO_ID`
- `https://player.vimeo.com/video/VIDEO_ID`

Embed URLs:

- YouTube: `https://www.youtube-nocookie.com/embed/{videoId}`
- Vimeo: `https://player.vimeo.com/video/{videoId}`

### CSP consideration

Ensure existing CSP `frame-src` allows `youtube-nocookie.com` and `player.vimeo.com`. Check `18-2-content-security-policy-baseline` — extend if needed.

### Tests

| Test | Scope |
|------|--------|
| `SiteVideoEmbedValidatorTests` | URL parse matrix, reject bad hosts |
| `SiteSectionPlanGateTests` | `video` allowed Pro, blocked Core |
| `AdminSiteIntegrationTests` | Pro publish with video section round-trip (when CI stack available) |

## Out of scope (future stories)

- Self-hosted MP4/WebM upload (object storage + CDN)
- Hero background video
- Carousel video slides
- TikTok / Instagram embeds
- Autoplay unmuted

## PRD / docs touch-ups (same story or follow-up PR)

- FR-12 addendum: Pro Studio includes `video` embed section
- `pricing-plans.ts`: mention video embed under Pro Studio features (optional copy tweak)

## Dev Agent Record

_(empty — fill on implementation)_

## Change Log

- 2026-08-03: Story created after party-mode video embed decision + PR #54 Essentials/Studio split.
