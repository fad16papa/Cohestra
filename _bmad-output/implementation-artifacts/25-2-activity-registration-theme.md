---
epic: 25
story: 2
status: done
baseline_commit: 444f125
---

# Story 25.2: Activity registration theme JSON

Status: done

## Story

As a **Tenant Admin or Member**,
I want **each activity to store a registration theme with preset and inherit flag**,
So that **public pages resolve community kit + activity overrides predictably**.

## Acceptance Criteria

1. **Given** an activity with a community label matching a brand kit  
   **When** `inheritCommunityBrand` is true (default)  
   **Then** resolved theme uses community logo/accent/hero where theme overrides and legacy activity fields are null

2. **Given** activity update with `registrationTheme` JSON  
   **When** saved  
   **Then** column persists separately from `form_schema`

3. **Given** `inheritCommunityBrand` is false  
   **When** theme is resolved  
   **Then** community brand kit is not applied

4. **Given** public GET by slug  
   **When** activity is published  
   **Then** response exposes resolved accent, hero, logo, and preset

## Tasks / Subtasks

- [x] **Task 1 — Domain & migration** (AC: 2)
  - [x] `RegistrationTheme` domain type + `registration_theme` jsonb column
  - [x] Migration `20260812173000_AddActivityRegistrationTheme`

- [x] **Task 2 — Contracts & resolver** (AC: 1, 3, 4)
  - [x] `RegistrationThemeDto`, `ResolvedRegistrationThemeDto`
  - [x] `RegistrationThemeValidator`, `RegistrationThemeResolver`, `RegistrationThemeMapper`

- [x] **Task 3 — ActivityService integration** (AC: 1–4)
  - [x] Persist theme on activity update (separate from form schema)
  - [x] Admin `ActivityResponse` includes stored + resolved theme
  - [x] Public `PublicActivityResponse` includes resolved preset/logo/accent/hero

- [x] **Task 4 — Web types** (AC: 4)
  - [x] `activities-api.ts` + `public-registration-api.ts` parse new fields

- [x] **Task 5 — Tests** (AC: 1–4)
  - [x] `RegistrationThemeResolverTests` (3)
  - [x] `ActivityRegistrationThemeIntegrationTests`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Added `registration_theme` JSON column on activities; stored separately from `form_schema`.
- Resolver cascade: theme override → community kit (when inherit) → legacy activity hero/accent.
- Public activity API returns resolved `preset`, `logoAssetId`, `accentColor`, `heroImageUrl`.

### File List

- `_bmad-output/implementation-artifacts/25-2-activity-registration-theme.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/Domain/Activities/RegistrationTheme.cs`
- `src/Domain/Activities/Activity.cs`
- `src/Contracts/Activities/RegistrationThemeContracts.cs`
- `src/Contracts/Activities/ActivityResponse.cs`
- `src/Contracts/Activities/PublicActivityResponse.cs`
- `src/Contracts/Activities/UpdateActivityRequest.cs`
- `src/Infrastructure/Activities/RegistrationTheme*.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/ActivityMapper.cs`
- `src/Infrastructure/Persistence/Configurations/ActivityConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/20260812173000_AddActivityRegistrationTheme.*`
- `src/Infrastructure.Tests/Activities/RegistrationThemeResolverTests.cs`
- `src/Api.IntegrationTests/ActivityRegistrationThemeIntegrationTests.cs`
- `web/lib/activities-api.ts`
- `web/lib/public-registration-api.ts`

### Change Log

- 2026-08-12: Story 25.2 — registration theme JSON + community inherit resolution.
- 2026-09-05: Acceptance PASS — inherit/override resolver and public GET remain on main.
