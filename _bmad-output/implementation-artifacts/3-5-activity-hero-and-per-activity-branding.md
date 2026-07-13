---
baseline_commit: 84b22b6
---

# Story 3.5: ActivityHero and Per-Activity Branding

Status: done

## Story

As a participant,
I want to see activity details and optional branding on the registration page,
So that I know what I am joining.

## Acceptance Criteria

1. **AC-3.5.1 — ActivityHero with optional cover (UX-DR10)**
   - **Given** an Activity with optional hero image URL
   - **When** I view the public registration page
   - **Then** ActivityHero shows name, schedule, location, community, and optional 16:9 hero image
   - **And** hero image is hidden on confirmation state

2. **AC-3.5.2 — Per-activity accent on public page (UX-DR26)**
   - **Given** an Activity with optional accent color override
   - **When** I view the public registration page
   - **Then** accent color applies to public buttons/links via `--primary` scope
   - **And** admin shell and platform typography remain unchanged

## Tasks / Subtasks

- [x] **Task 1: Persistence + public API** (AC: 3.5.1, 3.5.2)
  - [x] `HeroImageUrl`, `AccentColor` on `Activity` + migration
  - [x] `PublicActivityResponse` and admin `ActivityResponse` expose branding fields
  - [x] `ActivityBrandingValidator` for http(s) hero URL and hex accent

- [x] **Task 2: ActivityHero + public accent scope** (AC: 3.5.1, 3.5.2)
  - [x] 16:9 hero image with dark-mode dim overlay
  - [x] Hide hero image on confirmation; keep hero metadata visible
  - [x] Scoped `--primary` override on public registration content only

- [x] **Task 3: Admin branding panel** (AC: 3.5.2)
  - [x] Overview tab `ActivityBrandingPanel` — hero URL + accent color
  - [x] `updateActivity` client wired to `PUT /api/v1/admin/activities/{id}`

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Hero images are URL references only (no upload pipeline in MVP)
- Redis public activity cache picks up new fields via `PublicActivityResponse` JSON
- Story 3.4 owns RegistrationForm UX; this story owns hero/branding presentation

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Optional `HeroImageUrl` and `AccentColor` on activities with validation
- ActivityHero renders 16:9 cover; hidden after successful registration
- Public page scopes accent to `--primary` for buttons/links; admin branding panel on Overview tab

### File List

- `src/Domain/Activities/Activity.cs`
- `src/Infrastructure/Activities/ActivityBrandingValidator.cs`
- `src/Infrastructure/Activities/ActivityMapper.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Persistence/Configurations/ActivityConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddActivityPublicBranding*`
- `src/Contracts/Activities/ActivityResponse.cs`
- `src/Contracts/Activities/PublicActivityResponse.cs`
- `src/Contracts/Activities/UpdateActivityRequest.cs`
- `web/components/registration/activity-hero.tsx`
- `web/components/registration/public-registration-open.tsx`
- `web/components/activities/activity-branding-panel.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/app/(public)/register/[slug]/page.tsx`
- `web/lib/activities-api.ts`
- `web/lib/public-registration-api.ts`

### Change Log

- 2026-06-16: Story 3.5 implemented — hero image, per-activity accent, admin branding panel
- 2026-06-16: Review patch applied — stable branding panel key preserves unsaved draft across form/publish updates

### Review Findings

- [x] [Review][Patch] Branding panel remount key includes `updatedAt` — form save/publish drops unsaved branding draft [`activity-detail-page-client.tsx:125-128`]
- [x] [Review][Defer] Custom accent sets `--primary` only; `--primary-foreground` unchanged — contrast risk on CTA with extreme colors [`public-registration-open.tsx:32-34`]
- [x] [Review][Defer] No automated tests for `ActivityBrandingValidator` — add with activity/branding test matrix
- [x] [Review][Defer] Broken hero image URL shows browser broken image with no fallback UI [`activity-hero.tsx:23-27`]
- [x] [Review][Defer] Pre-deploy Redis cache entries deserialize with null branding until activity update/republish
- [x] [Review][Dismiss] `NormalizeAccentColor` fallback returns unvalidated trim — unreachable after `ValidateAccentColor` in update path

### Re-review (2026-06-16, pass 2)

✅ **Clean review — all layers passed.**

- Pass 1 patch verified: `ActivityBrandingPanel` uses stable `key={activity.id}`; branding draft survives form save/publish updates
- ActivityHero 16:9 cover hidden on confirmation; accent scoped via `--primary` on public registration content only
- Published-activity cache write-through on branding update confirmed in `ActivityService.UpdateAsync`
- All AC-3.5.1–3.5.2 satisfied; no new patch or decision-needed findings
- Deferred items unchanged (foreground contrast, validator tests, hero fallback UI, stale cache entries)
