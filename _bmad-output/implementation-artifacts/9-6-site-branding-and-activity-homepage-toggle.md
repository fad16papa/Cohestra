---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.6: Site Branding and Activity Homepage Toggle

Status: done

## Story

As an operator,
I want to set my site logo and accent and control which events appear on the homepage,
So that my public site feels like my community.

## Acceptance Criteria

1. **AC-9.6.1 — Site logo and accent in builder (FR-15)**
   - **Given** Website builder
   - **When** I upload site logo and set accent color
   - **Then** values save in Site Page draft and apply on publish via campaign asset pipeline

2. **AC-9.6.2 — Feature on homepage toggle (FR-16)**
   - **Given** Activity Overview for a published activity
   - **When** I view the toggle
   - **Then** “Feature on your public site” is shown checked by default

3. **AC-9.6.3 — Toggle excludes without republish**
   - **Given** a published activity featured on the homepage
   - **When** I uncheck and save
   - **Then** it is excluded from the upcoming block without republishing Site Page

## Tasks / Subtasks

- [x] **Task 1: API — ShowOnHomepage on Activity** (AC: 9.6.2, 9.6.3)
  - [x] Expose `showOnHomepage` on `ActivityResponse`
  - [x] PATCH admin endpoint to update toggle

- [x] **Task 2: Activity Overview toggle UI** (AC: 9.6.2, 9.6.3)
  - [x] Panel on activity overview for published activities

- [x] **Task 3: Website builder branding** (AC: 9.6.1)
  - [x] Logo upload → `logoAssetId`
  - [x] Accent color field on draft

- [x] **Task 4: Public render logo** (AC: 9.6.1)
  - [x] `SitePageRenderer` uses published `logoAssetId`

- [x] **Task 5: Verify** (AC: all)
  - [x] `dotnet build`; `npm run build`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `PATCH /api/v1/admin/activities/{id}/show-on-homepage` updates `ShowOnHomepage` for published activities
- Activity overview **Public site** card with “Feature on your public site” toggle (defaults true from DB)
- Website builder **Site branding** section: logo upload via campaign assets + accent hex (validated on save draft server-side)
- `SitePageRenderer` header uses `logoAssetId` when set, else platform default mark
- Upcoming activities query already filters `ShowOnHomepage` — no Site Page republish needed

### File List

- `_bmad-output/implementation-artifacts/9-6-site-branding-and-activity-homepage-toggle.md` (new)
- `src/Contracts/Activities/ActivityResponse.cs` (modified)
- `src/Contracts/Activities/UpdateActivityShowOnHomepageRequest.cs` (new)
- `src/Application/Activities/IActivityService.cs` (modified)
- `src/Infrastructure/Activities/ActivityMapper.cs` (modified)
- `src/Infrastructure/Activities/ActivityService.cs` (modified)
- `src/Infrastructure/Site/SitePageService.cs` (modified)
- `src/Api/Controllers/V1/ActivitiesController.cs` (modified)
- `web/lib/activities-api.ts` (modified)
- `web/components/activities/activity-homepage-feature-panel.tsx` (new)
- `web/components/activities/activity-detail-page-client.tsx` (modified)
- `web/components/website/website-branding-section.tsx` (new)
- `web/components/website/website-builder-page.tsx` (modified)
- `web/components/marketing/site-page-renderer.tsx` (modified)

### Change Log

- 2026-07-07: Story 9.6 — site branding in builder + activity homepage toggle
- 2026-07-07: Code review — accent flush before save/preview; invalid hex toast + revert on blur
- 2026-07-07: Code review (round 2) — clean re-review after patches; no new findings

### Review Findings

- [x] [Review][Patch] Accent color only commits on blur — Save draft, isDirty, and builder preview miss in-progress accent edits [`web/components/website/website-branding-section.tsx:72-88`]
- [x] [Review][Patch] Invalid accent hex fails silently on blur — no toast or revert to last saved value [`web/components/website/website-branding-section.tsx:79-80`]
- [x] [Review][Defer] No integration test for PATCH show-on-homepage endpoint [`src/Api/Controllers/V1/ActivitiesController.cs:111`] — deferred, optional CI stack
- [x] [Review][Defer] No remove-logo control in builder — replace-only upload [`web/components/website/website-branding-section.tsx:99-169`] — deferred, not in AC

### Review Findings (Round 2 — 2026-07-07)

✅ **Clean re-review** — Blind Hunter, Edge Case Hunter, and Acceptance Auditor found no new actionable issues after round 1 patches.

**Verified fixes**

- Valid accent commits to draft on `onChange`; `flushPendingAccent` guards Save draft and Preview
- Invalid accent on blur shows toast and reverts to saved value
- Save draft blocks with toast when invalid hex is pending

**Acceptance criteria (re-checked)**

| AC | Status |
|----|--------|
| 9.6.1 Logo + accent in builder → draft → publish | Pass |
| 9.6.2 Homepage toggle checked by default (published) | Pass |
| 9.6.3 Uncheck excludes without Site Page republish | Pass |

**Dismissed (noise / already deferred)**

- Publish flow does not re-flush accent — saved draft is source of truth; invalid in-field text is cosmetic until blur
- Invalid partial hex while typing does not mark `isDirty` — blur revert handles it; no data loss
- Round 1 defer items unchanged (integration test, remove-logo)
