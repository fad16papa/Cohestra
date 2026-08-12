---
epic: 25
story: 1
status: review
baseline_commit: 870d3e24d4b03265b91ce0c0948219edd21be9e2
---

# Story 25.1: Community brand kit

Status: review

## Story

As a **Tenant Admin or Member**,
I want **to set logo, accent, and default hero on a community**,
So that **activities in that program inherit consistent branding without repeating setup**.

## Context

- Epic 25 Registration Experience Studio — foundation story; Stories 25.2+ consume resolved community kit.
- Communities today: name only (`Community.cs`); activities link via `CommunityLabel` string.
- Reuse `ActivityBrandingValidator` for accent/hero; campaign-assets upload for logo (same as website builder `logoAssetId`).
- Plan gate: logo upload Core+ only (FR-RES-1.3); Basic may set accent + default hero.

## Acceptance Criteria

1. **Given** a community on Core+ plan  
   **When** I PATCH brand fields (logoAssetId, accentColor, defaultHeroImageUrl)  
   **Then** values persist and GET returns them on `CommunityResponse`  
   **And** name rename behavior is unchanged

2. **Given** Basic plan  
   **When** PATCH includes non-null `logoAssetId`  
   **Then** API returns 403 `plan_locked`  
   **And** accent/default hero without logo still succeed

3. **Given** invalid hex accent or bad hero URL  
   **When** I save  
   **Then** API returns 400 with validation message

4. **Given** community detail page `/activities/communities/{id}`  
   **When** I edit brand kit and save  
   **Then** UI shows logo/hero upload, accent picker, and persisted preview

5. **Given** integration test stack  
   **When** community brand kit CRUD runs  
   **Then** tests cover save/get, validation 400, Basic logo 403

## Tasks / Subtasks

- [x] **Task 1 — Domain & migration** (AC: 1)
  - [x] Add `LogoAssetId`, `AccentColor`, `DefaultHeroImageUrl` to `Community`
  - [x] EF migration + Designer.cs + snapshot update

- [x] **Task 2 — Contracts & validation** (AC: 1, 2, 3)
  - [x] Extend `CommunityResponse`, `UpdateCommunityRequest`
  - [x] `CommunityBrandingValidator` (accent, hero, logo GUID)
  - [x] Plan gate logo on Basic in `CommunityService`

- [x] **Task 3 — API** (AC: 1, 2, 3)
  - [x] Map brand fields in `CommunityService` create/get/list/update
  - [x] Controller: allow brand fields on PATCH; 403 for plan_locked

- [x] **Task 4 — Web admin UI** (AC: 4)
  - [x] Extend `communities-api.ts` types + `updateCommunity` payload
  - [x] `community-brand-kit-panel.tsx` on community detail page
  - [x] Core+ logo upload; Basic disabled with helper text

- [x] **Task 5 — Tests** (AC: 5)
  - [x] `CommunityBrandKitIntegrationTests` + `CommunityBrandingValidatorTests`

## Dev Notes

### Field mapping

| Community property | Max | Validation |
|--------------------|-----|------------|
| LogoAssetId | 36 | GUID string; campaign asset exists not required in v1 |
| AccentColor | 7 | `#RRGGBB` via ActivityBrandingValidator |
| DefaultHeroImageUrl | 2048 | Same as Activity.HeroImageUrl |

### Mirror activity branding

Reuse `ActivityBrandingValidator.ValidateAccentColor`, `ValidateHeroImageUrl`, `Normalize*`.

Logo path convention: store raw asset GUID (like SitePage `logoAssetId`); preview via `/api/v1/public/campaign-assets/{id}`.

### Do NOT implement in 25.1

- Activity inherit/resolve (Story 25.2)
- Public registration rendering changes (Story 25.3)
- Design tab / presets (Stories 25.4, 25.3)

### References

- [PRD](../planning-artifacts/prds/prd-registration-experience-studio-2026-08-12/prd.md)
- [UX EXPERIENCE](../planning-artifacts/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md)
- [ActivityBrandingPanel](../../web/components/activities/activity-branding-panel.tsx)
- [CommunityService](../../src/Infrastructure/Activities/CommunityService.cs)

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Extended Community entity + migration `20260812170000_AddCommunityBrandKit`.
- API PATCH accepts brand kit; Basic plan returns 403 `plan_locked` when setting logo.
- Community detail page includes Brand kit panel with upload/accent/hero; Core+ logo gate in UI.
- Unit tests (6) pass; integration tests added (run on CI Postgres stack).

### File List

- `_bmad-output/planning-artifacts/prds/prd-registration-experience-studio-2026-08-12/prd.md`
- `_bmad-output/planning-artifacts/prds/prd-registration-experience-studio-2026-08-12/addendum.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-registration-experience-studio-2026-08-12/DESIGN.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md`
- `_bmad-output/implementation-artifacts/25-1-community-brand-kit.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/Domain/Activities/Community.cs`
- `src/Contracts/Activities/CommunityContracts.cs`
- `src/Infrastructure/Activities/CommunityService.cs`
- `src/Infrastructure/Activities/CommunityBrandingValidator.cs`
- `src/Infrastructure/Activities/CommunityPlanLockedException.cs`
- `src/Infrastructure/Persistence/Configurations/CommunityConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/20260812170000_AddCommunityBrandKit.cs`
- `src/Infrastructure/Persistence/Migrations/20260812170000_AddCommunityBrandKit.Designer.cs`
- `src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs`
- `src/Api/Controllers/V1/CommunitiesController.cs`
- `src/Infrastructure.Tests/Activities/CommunityBrandingValidatorTests.cs`
- `src/Api.IntegrationTests/CommunityBrandKitIntegrationTests.cs`
- `web/lib/communities-api.ts`
- `web/components/activities/community-brand-kit-panel.tsx`
- `web/components/activities/community-detail-page.tsx`
- `web/components/activities/communities-list-page.tsx`

### Change Log

- 2026-08-12: Story 25.1 implemented — community brand kit model, API, admin UI, tests.
