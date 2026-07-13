---
baseline_commit: 4daa64a
---

# Story 1.11: Empty Dashboard and Settings Appearance

Status: done

## Story

As an operator signing in for the first time,
I want an empty dashboard with a clear next step and theme settings,
So that I know how to start capturing registrations.

## Acceptance Criteria

1. **AC-1.11.1 — Dashboard empty state (UX-DR27, FR-8 partial)**
   - **Given** no Activities exist
   - **When** I view `/dashboard`
   - **Then** I see empty state: "Create your first activity to start capturing registrations." with CTA to `/activities/new`

2. **AC-1.11.2 — Settings appearance (UX-DR4)**
   - **Given** I open Settings → Appearance
   - **When** I select Light, Dark, or System
   - **Then** my choice persists to operator profile and syncs with top-bar ThemeToggle instantly
   - **And** localStorage mirrors preference for instant load before auth hydrates

## Tasks / Subtasks

- [x] **Task 1: Dashboard empty state** (AC: 1.11.1)
  - [x] `DashboardEmptyState` with copy + CTA to `/activities/new`
  - [x] Placeholder `/activities/new` route until Epic 2 wizard

- [x] **Task 2: Operator theme preference API** (AC: 1.11.2)
  - [x] `ApplicationUser.ThemePreference` + EF migration
  - [x] `GET /api/v1/admin/me` includes `themePreference`
  - [x] `PATCH /api/v1/admin/me/appearance`

- [x] **Task 3: Settings appearance UI** (AC: 1.11.2)
  - [x] Segmented control (Light · Dark · System) with helper text
  - [x] Saves via authenticated PATCH; instant `setTheme` sync with ThemeToggle

- [x] **Task 4: Profile theme hydration** (AC: 1.11.2)
  - [x] `ThemePreferenceSync` applies profile preference after login
  - [x] localStorage via next-themes + blocking head script unchanged

- [x] **Task 5: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run build`, and `npm run lint` pass

## Dev Notes

- Dashboard empty state shows when activity count is zero (wired in Story 2.2)
- Admin ThemeToggle and Settings both persist theme via `usePersistedThemePreference`
- Public ThemeToggle remains localStorage-only (no auth on public forms)

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Dashboard empty state with primary CTA to `/activities/new`; gated by activity count (Story 2.2)
- Settings → Appearance segmented control with UX helper copy
- Operator theme stored on Identity user; PATCH endpoint for persistence
- Profile theme applied on login via `ThemePreferenceSync`

### File List

- `src/Infrastructure/Identity/ApplicationUser.cs`
- `src/Infrastructure/Persistence/Migrations/*AddOperatorThemePreference*`
- `src/Contracts/Admin/AdminProfileResponse.cs`
- `src/Contracts/Admin/UpdateAppearanceRequest.cs`
- `src/Api/Controllers/V1/AdminController.cs`
- `src/Api/Api.http`
- `web/lib/auth-api.ts`
- `web/components/auth/auth-provider.tsx`
- `web/components/theme/theme-preference-sync.tsx`
- `web/components/theme/use-persisted-theme-preference.ts`
- `web/components/dashboard/dashboard-empty-state.tsx`
- `web/components/settings/appearance-section.tsx`
- `web/app/(admin)/dashboard/page.tsx`
- `web/app/(admin)/settings/page.tsx`
- `web/app/(admin)/activities/new/page.tsx`
- `web/app/layout.tsx`
- `web/README.md`

### Change Log

- 2026-06-18: Story 1.11 implemented — dashboard empty state and settings appearance persistence

### Review Findings

- [x] [Review][Decision] ThemeToggle persistence — resolved **A**: admin toggle PATCHes profile via shared `usePersistedThemePreference` hook; public toggle stays local-only
- [x] [Review][Patch] AppearanceSection optimistic theme without rollback — shared hook reverts `setTheme` on PATCH failure [web/components/theme/use-persisted-theme-preference.ts]

- [x] [Review][Defer] Dashboard shows API error when activities fetch fails — no empty-state fallback; honest error for transient failures [web/components/dashboard/dashboard-page-client.tsx:48-53]
- [x] [Review][Defer] Migration `ThemePreference` default `""` for existing rows — API/client normalize to `system` [src/Infrastructure/Persistence/Migrations/20260620115727_AddOperatorThemePreference.cs:19]
- [x] [Review][Defer] Dev notes say dashboard always empty until Epic 2 — Story 2.2 now gates empty state on activity count; update notes when closing story
