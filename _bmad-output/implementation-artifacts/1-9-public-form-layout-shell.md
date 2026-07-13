---
baseline_commit: b63b2900fc189ce1385f9a7f5b8a71c6307f8c06
---

# Story 1.9: PublicFormLayout Shell

Status: done

## Story

As a participant,
I want a clean, centered registration layout without admin chrome,
So that registering feels like joining an activity, not using a CRM.

## Acceptance Criteria

1. **AC-1.9.1 — PublicFormLayout (UX-DR18)**
   - **Given** I visit a public route
   - **When** the page renders
   - **Then** PublicFormLayout shows centered column max 480px, 20px mobile margins, footer ThemeToggle + "Powered by Creativorare"
   - **And** no admin sidebar or auth chrome appears on public routes

## Tasks / Subtasks

- [x] **Task 1: PublicFormLayout component** (AC: 1.9.1)
  - [x] Centered column `max-w-[480px]` with `px-5` (20px) side margins
  - [x] Footer with public ThemeToggle + "Powered by Creativorare"
  - [x] No nav or admin chrome

- [x] **Task 2: Public route group** (AC: 1.9.1)
  - [x] `(public)` layout wraps pages with PublicFormLayout
  - [x] Placeholder `/register/[slug]` demo route

- [x] **Task 3: Verify separation from admin** (AC: 1.9.1)
  - [x] Admin routes remain under `(admin)` with DashboardLayout only
  - [x] Home dev page links to public preview without duplicating public footer

- [x] **Task 4: Verify build** (AC: 1.9.1)
  - [x] `npm run build` and `npm run lint` pass

## Dev Notes

- Real registration form UI ships in Epic 2 (`RegistrationForm`, `ActivityHero`)
- Public slug routes will map to published activities in later stories

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `PublicFormLayout` — warm surface background, 480px column, sticky footer pattern
- Demo route `/register/[slug]` shows placeholder without admin sidebar
- Home page links to `/register/demo`; public footer moved into layout shell

### File List

- `web/components/layouts/public-form-layout.tsx`
- `web/components/layouts/public-registration-placeholder.tsx`
- `web/app/(public)/layout.tsx`
- `web/app/(public)/register/[slug]/page.tsx`
- `web/app/page.tsx`
- `web/README.md`

### Change Log

- 2026-06-18: Story 1.9 implemented — PublicFormLayout shell and demo registration route
