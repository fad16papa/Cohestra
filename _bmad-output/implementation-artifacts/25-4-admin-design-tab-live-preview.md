---
epic: 25
story: 4
status: done
baseline_commit: f5c6005
---

# Story 25.4: Admin Design tab + live preview

Status: done

## Story

As a **Tenant Admin or Member**,
I want **a Design tab with mobile/desktop preview**,
So that **I see the registration page before publishing**.

## Acceptance Criteria

1. **Given** activity detail Design tab  
   **When** I change preset or overrides  
   **Then** preview updates using `PublicRegistrationOpen variant="preview"`

2. **Given** accent fails WCAG AA  
   **Then** contrast warning displays before save

## Tasks / Subtasks

- [x] **Task 1 — Design tab UI** (AC: 1)
  - [x] `ActivityDesignTab` with preset picker, inherit toggle, accent/hero overrides
  - [x] Mobile/desktop preview viewport toggle
  - [x] Wire Design tab into activity detail page

- [x] **Task 2 — Live preview** (AC: 1)
  - [x] Preview uses `PublicRegistrationOpen variant="preview"` with draft-resolved theme

- [x] **Task 3 — Contrast validation** (AC: 2)
  - [x] Client-side WCAG AA warning in design tab
  - [x] Server-side `ActivityBrandingContrastValidator` on theme accent save

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Design tab replaces branding panel on Overview; theme saves via activity update API.
- Preview resolves inherit + overrides locally before save for instant feedback.
- Low-contrast accent shows inline warning in admin and rejects save server-side.

### File List

- `web/components/activities/activity-design-tab.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/lib/registration-theme-utils.ts`
- `src/Infrastructure/Activities/ActivityBrandingContrastValidator.cs`
- `src/Infrastructure/Activities/RegistrationThemeValidator.cs`
- `src/Infrastructure.Tests/Activities/ActivityBrandingContrastValidatorTests.cs`

## Change Log

- 2026-08-12: Added Design tab with live preview and WCAG contrast validation.
