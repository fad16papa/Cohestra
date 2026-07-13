---
baseline_commit: 4daa64a
---

# Story 2.6: Activity Publish Status Machine

Status: done

## Story

As an operator,
I want to publish and unpublish Activities through a clear status workflow,
So that I control when registration links go live.

## Acceptance Criteria

1. **AC-2.6.1 — Publish draft (FR-1, FR-3, UX-DR25)**
   - **Given** a draft Activity with valid metadata
   - **When** I publish the Activity
   - **Then** status transitions Draft → Published
   - **And** unpublished Activities show banner: "Not live — publish to generate QR and link."

2. **AC-2.6.2 — Archive published (FR-1, FR-3)**
   - **Given** a published Activity
   - **When** I archive it
   - **Then** status becomes Archived
   - **And** the public URL shows an unavailable state

## Tasks / Subtasks

- [x] **Task 1: Publish API** (AC: 2.6.1)
  - [x] `POST /api/v1/admin/activities/{id}/publish` — Draft → Published
  - [x] Reject create with `published`/`archived` status (use publish endpoint)
  - [x] Archive endpoint retained from Story 2.1

- [x] **Task 2: Public activity lookup** (AC: 2.6.2)
  - [x] `GET /api/v1/public/activities/{slug}` — `isRegistrationOpen` when published
  - [x] `/register/{slug}` shows unavailable for draft/archived

- [x] **Task 3: Admin UI** (AC: 2.6.1, 2.6.2)
  - [x] Draft banner on activity detail (all tabs)
  - [x] `ActivityPublishControls` on Overview — publish / archive actions

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Publish-gate form validation ships in Story 2.7 (publish allowed without form check for now)
- QR panel ships in Story 2.8
- Published → draft unpublish not in AC; archive removes activity from public registration

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Publish transitions draft → published; idempotent when already published
- Create always persists as draft; published/archived on create rejected
- Public register page unavailable for draft/archived slugs
- Activity detail shows UX-DR25 banner and publish/archive controls

### File List

- `src/Contracts/Activities/PublicActivityResponse.cs`
- `src/Application/Activities/IActivityService.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Api/Controllers/V1/PublicActivitiesController.cs`
- `src/Api/Api.http`
- `web/lib/activities-api.ts`
- `web/components/activities/activity-publish-controls.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/components/registration/public-registration-unavailable.tsx`
- `web/components/layouts/public-registration-placeholder.tsx`
- `web/app/(public)/register/[slug]/page.tsx`

### Change Log

- 2026-06-16: Story 2.6 implemented — publish status machine, admin controls, public unavailable state

### Review Findings

- [x] [Review][Defer] No unpublish (published → draft) workflow — archive is the unpublish path per AC [`src/Infrastructure/Activities/ActivityService.cs:170`]
- [x] [Review][Defer] Tab a11y (`tabpanel` / `aria-controls`) — carried from Story 2.4 review

### Re-review (2026-06-16, with 2.7)

✅ **Clean review — all layers passed.** Publish/archive API, draft banner, public unavailable states verified. Shared UI patches from 2.7 review landed; no new findings.
