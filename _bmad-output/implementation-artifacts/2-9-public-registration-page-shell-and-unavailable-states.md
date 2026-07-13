---
baseline_commit: 84b22b6
---

# Story 2.9: Public Registration Page Shell and Unavailable States

Status: done

## Story

As a participant,
I want to land on a credible page when scanning a QR, even before capture is live,
So that I trust the registration process.

## Acceptance Criteria

1. **AC-2.9.1 — Published registration shell (UX-DR10, FR-3, NFR-11 SSR)**
   - **Given** a published Activity slug
   - **When** I visit `/register/{slug}` unauthenticated on mobile
   - **Then** ActivityHero shows activity name, schedule, location, community tag
   - **And** RegistrationForm shell renders from schema but submit calls stub endpoint

2. **AC-2.9.2 — Unavailable states (UX-DR20, FR-3)**
   - **Given** an unpublished or archived Activity slug
   - **When** I visit `/register/{slug}`
   - **Then** I see "This activity is no longer accepting registrations." with no form

## Tasks / Subtasks

- [x] **Task 1: Public activity payload** (AC: 2.9.1)
  - [x] Extend `PublicActivityResponse` with schedule, location, community, form schema
  - [x] SSR fetch via `fetchPublicActivityBySlug` on register page

- [x] **Task 2: ActivityHero + form shell** (AC: 2.9.1)
  - [x] `ActivityHero` with name, schedule, location, community tag
  - [x] `PublicRegistrationOpen` — hero + `RegistrationForm` public variant
  - [x] Submit POST to stub `POST /api/v1/public/registrations` (202 Accepted)

- [x] **Task 3: Unavailable states** (AC: 2.9.2)
  - [x] Draft/archived slugs show AC message with no form
  - [x] Not-found keeps separate copy

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Public page is server-rendered; form submit is client-side to stub endpoint
- Stub endpoint satisfies 2.9 AC; Story 2.10 can expand OpenAPI contract documentation
- Removed placeholder component replaced by real shell

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Public activity API returns hero metadata and form schema for published slugs
- Register page SSR with ActivityHero and RegistrationForm shell
- Stub registration POST returns 202 without persistence
- Unpublished/archived slugs show unified unavailable message

### File List

- `src/Contracts/Activities/PublicActivityResponse.cs`
- `src/Contracts/Registrations/SubmitPublicRegistrationRequest.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Api/Controllers/V1/PublicRegistrationsController.cs`
- `src/Api/Api.http`
- `web/lib/public-registration-api.ts`
- `web/lib/activities-api.ts`
- `web/components/registration/activity-hero.tsx`
- `web/components/registration/public-registration-open.tsx`
- `web/components/registration/public-registration-unavailable.tsx`
- `web/components/registration/registration-form.tsx`
- `web/app/(public)/register/[slug]/page.tsx`

### Change Log

- 2026-06-16: Story 2.9 implemented — public registration shell and unavailable states

### Review Findings

- [x] [Review][Patch] Public form shows admin preview empty copy [`web/components/registration/registration-form.tsx:284`]
- [x] [Review][Patch] Public activity fetch treats all non-404 failures as not-found [`web/lib/public-registration-api.ts:74`]
- [x] [Review][Patch] Invalid public activity JSON throws uncaught and can 500 SSR [`web/lib/public-registration-api.ts:78`, `web/app/(public)/register/[slug]/page.tsx:13`]
- [x] [Review][Defer] Stub POST accepts any answers without schema validation [`src/Api/Controllers/V1/PublicRegistrationsController.cs:34`] — deferred, Epic 3 / Story 2.10 contract hardening
- [x] [Review][Defer] Client registration submit has no fetch timeout [`web/lib/public-registration-api.ts:85`] — deferred, consistent with scaffold API client pattern

### Re-review (2026-06-16)

- ✅ Clean review — prior patches verified; acceptance criteria pass; no new patch or decision-needed findings
