---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.4: Public Homepage Runtime Render

Status: done

## Story

As a visitor,
I want `/` to render from the published Site Page,
So that operators can change copy without a developer.

## Acceptance Criteria

1. **AC-9.4.1 — Runtime render from published API (FR-2, FR-9–13)**
   - **Given** a published Site Page exists
   - **When** I open `/`
   - **Then** hero, highlights, upcomingActivities, howItWorks, and footer sections render from `GET /api/v1/public/site`
   - **And** disabled sections are skipped; unknown section types skipped (AD-5)
   - **And** platform typography/spacing use existing landing layout tokens (UX-DR26)

2. **AC-9.4.2 — Env fallback when no published site**
   - **Given** `GET /api/v1/public/site` returns 404
   - **When** I open `/`
   - **Then** existing `SiteLandingPage` + `getSiteLandingConfig()` renders without error

3. **AC-9.4.3 — Preview draft with banner (FR-6)**
   - **Given** a valid preview token from `POST /api/v1/admin/site/preview-token`
   - **When** I open `/?preview={token}`
   - **Then** draft Site Page renders with visible “Preview — not public” banner
   - **And** invalid/missing token falls back to published or env landing (no draft leak)

4. **AC-9.4.4 — Upcoming activities section gating**
   - **Given** published payload includes `upcomingActivities` section with `enabled: false`
   - **When** `/` renders from API
   - **Then** upcoming activities block is not shown (API may still return activities array)

## Tasks / Subtasks

- [x] **Task 1: Preview token + API** (AC: 9.4.3)
  - [x] `SitePreviewSettings` + `SitePreviewTokenService` (HMAC, short TTL)
  - [x] `POST /api/v1/admin/site/preview-token` (JWT admin)
  - [x] `GET /api/v1/public/site/preview?token=` → draft + upcoming activities
  - [x] Unit tests for token validate/expiry

- [x] **Task 2: Web fetch layer** (AC: 9.4.1, 9.4.2, 9.4.3)
  - [x] `web/lib/public-site-api.ts` — server fetch published/preview, typed parsers

- [x] **Task 3: Section renderers** (AC: 9.4.1, 9.4.4, UX-DR26)
  - [x] `SitePageRenderer` + `SitePreviewBanner` — hero, highlights, upcoming, howItWorks, footer
  - [x] CTA targets: `scroll-upcoming`, `/login`, `activity:{slug}`
  - [x] Optional site `accentColor` via `buildBrandAccentStyle`

- [x] **Task 4: Wire `/`** (AC: all)
  - [x] `web/app/page.tsx` — server fetch, preview query param, fallback to `SiteLandingPage`
  - [x] Dynamic metadata from API when published site exists

- [x] **Task 5: Verify** (AC: all)
  - [x] `dotnet build`; preview token unit tests
  - [x] `npm run build` in web

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `/` server-fetches published site; falls back to env `SiteLandingPage` on 404
- `SitePageRenderer` renders all v1 section types; skips disabled/unknown; gates upcoming block when section disabled
- Preview flow: admin mints token → `/?preview=` shows draft with blue banner; invalid token falls through to published/fallback
- Site accent color applied via existing `buildBrandAccentStyle`
- Code review (2026-07-06): hero/highlights top grid uses single column when only one block enabled

### File List

- `src/Infrastructure/Site/SitePreviewSettings.cs` (new)
- `src/Infrastructure/Site/SitePreviewTokenService.cs` (new)
- `src/Contracts/Site/SitePreviewTokenResponse.cs` (new)
- `src/Application/Site/ISitePageService.cs` (modified)
- `src/Infrastructure/Site/SitePageService.cs` (modified)
- `src/Infrastructure/DependencyInjection.cs` (modified)
- `src/Api/appsettings.json` (modified)
- `src/Api/Controllers/V1/PublicSiteController.cs` (modified)
- `src/Api/Controllers/V1/AdminSiteController.cs` (modified)
- `src/Infrastructure.Tests/Site/SitePreviewTokenServiceTests.cs` (new)
- `web/lib/public-site-api.ts` (new)
- `web/components/marketing/site-page-renderer.tsx` (new)
- `web/components/marketing/site-preview-banner.tsx` (new)
- `web/app/page.tsx` (modified)

### Change Log

- 2026-07-06: Story 9.4 — runtime homepage render, preview token API, env fallback
- 2026-07-06: Code review patch — conditional single/two-column hero+highlights grid

### Review Findings

- [x] [Review][Patch] Hero/highlights grid leaves empty column when only one block enabled [web/components/marketing/site-page-renderer.tsx:433-447] — Two-column `lg:grid-cols-[1.1fr_0.9fr]` renders with an empty column when hero or highlights section is disabled/missing.
- [x] [Review][Defer] Preview token in query string logged in proxies — matches UX `/?preview=` spec and addendum; POST/header token is a future hardening item.
- [x] [Review][Defer] Preview HMAC shares JWT signing key — architecture spine deferred dedicated preview secret; acceptable for MVP single-tenant.
- [x] [Review][Defer] Invalid/expired preview token silently shows published/fallback — matches AC-9.4.3 (“no draft leak”); operator UX hint deferred to Story 9.5 builder.
- [x] [Review][Defer] API 5xx/timeout falls back to env landing like 404 — resilient default; no AC requirement to distinguish outage vs unseeded.
- [x] [Review][Defer] Authenticated `/` redirect flash (client-side) — same pattern as legacy `SiteLandingPage`; server-side cookie check is a polish item.
- [x] [Review][Defer] `logoAssetId` not rendered in header — Story 9.6 site branding scope.
- [x] [Review][Defer] No integration test for preview endpoint — follows 9.1/9.2 optional Postgres/Redis CI pattern.
