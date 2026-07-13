---
baseline_commit: 84b22b6
---

# Story 3.4: RegistrationForm Public Component

Status: done

## Story

As a participant (Elena),
I want to complete a mobile-friendly registration form with inline validation,
So that I can join an activity quickly from a QR scan.

## Acceptance Criteria

1. **AC-3.4.1 — Schema-driven form UX (UX-DR9, UX-DR30)**
   - **Given** I am on `/register/{slug}` for a published Activity
   - **When** I interact with RegistrationForm
   - **Then** fields render from JSON schema with 20px gap, labels, blur validation, +63 phone default
   - **And** submit is disabled until required fields and consent (if present) are valid
   - **And** tap targets are ≥ 48px; sticky footer keeps ThemeToggle reachable

2. **AC-3.4.2 — Success confirmation (UX-DR29, UX-DR28, FR-4)**
   - **Given** I tap "Join activity"
   - **When** submission succeeds
   - **Then** confirmation replaces form with "You're registered for {activity}. See you there." and `role="status"` live region

3. **AC-3.4.3 — Network failure path (UJ-1, NFR-9)**
   - **Given** network error on submit
   - **When** submit fails
   - **Then** inline error with retry appears; field values preserved

## Tasks / Subtasks

- [x] **Task 1: Public RegistrationForm UX** (AC: 3.4.1)
  - [x] 20px field gap, blur validation, disabled submit until valid
  - [x] +63 phone prefix on public variant; PH mobile blur validation
  - [x] 48px tap targets on public inputs, selects, consent, CTA
  - [x] `aria-describedby` wiring for field errors (UX-DR28)

- [x] **Task 2: Success + failure states** (AC: 3.4.2, 3.4.3)
  - [x] Confirmation live region with UX-DR29 microcopy
  - [x] Inline submit error banner with "Try again"; preserve form values
  - [x] CTA label "Join activity"

- [x] **Task 3: Sticky public footer** (AC: 3.4.1, UX-DR30)
  - [x] Sticky layout footer with ThemeToggle ≥ 48px; main padding for scroll clearance

- [x] **Task 4: Verify build** (AC: all)
  - [x] `npm run lint`, `npm run build`

## Dev Notes

- Builds on Story 2.9 shell and Story 3.1 real ingestion; admin preview variant unchanged sizing
- Story 3.5 owns ActivityHero branding enhancements; hero already present from 2.9

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Hardened public `RegistrationForm` for UX-DR9/30/28: +63 phone group, 20px gaps, 48px targets, blur validation
- Success confirmation uses `role="status"` with UX-DR29 copy; submit failures show inline retry without clearing values
- Sticky public layout footer keeps ThemeToggle reachable on tall forms

### File List

- `web/components/registration/registration-form.tsx`
- `web/components/registration/public-registration-open.tsx`
- `web/components/layouts/public-form-layout.tsx`

### Change Log

- 2026-06-16: Story 3.4 implemented — public RegistrationForm UX hardening
- 2026-06-16: Review patches applied — keep ActivityHero on success; full-row consent label for 48px tap target

### Review Findings

- [x] [Review][Patch] Success state unmounts ActivityHero — AC says confirmation replaces **form**, not the whole page [`public-registration-open.tsx:28-39`]
- [x] [Review][Patch] Consent row tap target below 48px — checkbox is 20px and label does not cover full bordered row [`registration-form.tsx:204-242`]
- [x] [Review][Defer] API validation errors (400) surface as submit banner only, not field-level — server returns single `detail` string; map when API exposes field errors
- [x] [Review][Defer] No automated frontend tests for RegistrationForm UX matrix — add with component/E2E test story
- [x] [Review][Dismiss] Unused `formRef` on `<form>` — harmless; remove in cleanup pass if desired

### Re-review (2026-06-16, pass 2)

✅ **Clean review — all layers passed.**

- Pass 1 patches verified: ActivityHero remains after submit; confirmation replaces form only; consent uses full-row label with ≥ 48px tap area
- Idempotency key preserved on retry; field values retained on submit failure
- All AC-3.4.1–3.4.3 satisfied; no new patch or decision-needed findings
- Deferred items unchanged (API field-level errors, frontend test matrix)
