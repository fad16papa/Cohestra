---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.5: Website Builder Admin UI

Status: done

## Story

As an operator,
I want a Website area in the dashboard to edit my homepage,
So that I can update marketing copy in the same app I use for events.

## Acceptance Criteria

1. **AC-9.5.1 — Builder route and controls (FR-4, FR-5, FR-6, FR-7)**
   - **Given** I am authenticated
   - **When** I open `/dashboard/website`
   - **Then** I see section list, editable fields, phone/desktop preview, **Save draft**, **Preview**, and **Publish homepage**
   - **And** admin nav includes **Website** (Globe) after Dashboard

2. **AC-9.5.2 — Unsaved changes guard**
   - **Given** I have edited fields without saving
   - **When** I navigate away or close the tab
   - **Then** I am warned about unsaved changes

3. **AC-9.5.3 — Publish disabled when live**
   - **Given** draft equals published
   - **When** I view the builder
   - **Then** Publish homepage is disabled

4. **AC-9.5.4 — Publish gate UX (FR-8)**
   - **Given** I click Publish homepage
   - **When** hero headline is empty
   - **Then** publish is blocked with inline message
   - **And** missing hero image shows warn-only in dialog with option to publish anyway
   - **And** hero CTA to unpublished activity slug is blocked

## Tasks / Subtasks

- [x] **Task 1: Admin nav + route** (AC: 9.5.1)
  - [x] Add Website nav item and breadcrumbs for `/dashboard/website`
  - [x] Create page shell at `web/app/(admin)/dashboard/website/page.tsx`

- [x] **Task 2: Site admin API client** (AC: 9.5.1)
  - [x] `web/lib/site-admin-api.ts` — GET/PUT/publish/preview-token
  - [x] `web/lib/site-draft-utils.ts` — draft helpers, publish gate, dirty compare

- [x] **Task 3: Builder UI** (AC: 9.5.1–9.5.4)
  - [x] Section list with enable toggle, reorder, expand-one editor
  - [x] Hero/highlights/upcoming/howItWorks/footer field editors
  - [x] Phone/desktop preview using `SitePageRenderer` with `isPreview`
  - [x] Save draft, Preview (new tab), Publish with confirmation dialog
  - [x] Unsaved guard (beforeunload + in-app link confirm)
  - [x] Status pill: Live / Draft saved / Unsaved changes

- [x] **Task 4: Verify** (AC: all)
  - [x] `npm run build` in web

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `/dashboard/website` builder with 60/40 editor + preview layout at `lg+`
- Admin nav **Website** (Globe) after Dashboard; breadcrumbs Dashboard → Website
- Wires existing admin site APIs: GET/PUT/publish + preview-token
- Client-side publish gate mirrors server rules; hero image missing is warn-only with “Publish anyway”
- Publish disabled when `hasUnpublishedChanges` is false or draft is dirty
- Preview opens new tab at `/?preview={token}` (requires saved draft)
- Site logo/accent upload deferred to Story 9.6 per epic scope
- Code review (2026-07-07): publish-while-dirty guard, beforeunload returnValue, functional draft updates, CTA orphan options, upcoming limit clamp, popup-blocker toast, disable editors during save/publish
- Re-review (2026-07-07): hero upload sequence + block save/publish during upload, copyTextToClipboard for success dialog, open-site popup-blocker toast

### File List

- `_bmad-output/implementation-artifacts/9-5-website-builder-admin-ui.md` (new)
- `web/lib/site-admin-api.ts` (new)
- `web/lib/site-draft-utils.ts` (new)
- `web/lib/public-site-api.ts` (modified — export `parseSiteSectionsDocument`)
- `web/lib/admin-nav.ts` (modified)
- `web/app/(admin)/dashboard/website/page.tsx` (new)
- `web/components/website/website-builder-page.tsx` (new)
- `web/components/website/website-section-fields.tsx` (new)

### Change Log

- 2026-07-06: Story 9.5 — Website Builder admin UI at `/dashboard/website`
- 2026-07-07: Code review patches — publish guard, draft updates, CTA/limit/preview hardening
- 2026-07-07: Re-review patches — hero upload guards, clipboard helper, open-site popup toast

### Review Findings

- [x] [Review][Patch] Publish dialog allows stale publish while draft is dirty [`web/components/website/website-builder-page.tsx:252-258,469-471`]
- [x] [Review][Patch] Tab-close warning may not show — missing `event.returnValue` in beforeunload [`web/components/website/website-builder-page.tsx:59-65`]
- [x] [Review][Patch] Hero CTA select misrepresents stored `activity:{slug}` when slug not in options [`web/components/website/website-section-fields.tsx:486-498`]
- [x] [Review][Patch] Section field updates can drop edits via stale `draft` closure in `patchProps` [`web/components/website/website-section-fields.tsx:95-97`]
- [x] [Review][Patch] Upcoming activities limit not clamped to 1–12 on save [`web/components/website/website-section-fields.tsx:317-320`]
- [x] [Review][Patch] Preview `window.open` return value not checked (popup blocker) [`web/components/website/website-builder-page.tsx:239-242`]
- [x] [Review][Patch] Editors stay enabled during save — in-flight save can overwrite concurrent edits [`web/components/website/website-builder-page.tsx:210-228`]

- [x] [Review][Defer] Programmatic navigation (command palette `router.push`) bypasses unsaved guard — matches ActivityBrandingPanel pattern; project-wide router guard deferred [`web/components/website/website-builder-page.tsx:71-102`]
- [x] [Review][Defer] Browser Back/Forward not guarded — no `popstate`/Next router blocker in web app [`web/components/website/website-builder-page.tsx:57-102`]
- [x] [Review][Defer] Sign out bypasses unsaved guard — button not anchor [`web/components/layouts/admin-user-menu.tsx:69-76`]
- [x] [Review][Defer] Session-expiry redirect bypasses unsaved guard — auth layer behavior [`web/components/auth/auth-provider.tsx:46-52`]
- [x] [Review][Defer] Client publish gate only validates first enabled hero section — invalid multi-hero data edge case; server rejects [`web/lib/site-draft-utils.ts:151-187`]
- [x] [Review][Defer] Stale `publishedActivities` after external unpublish — server publish gate catches on POST [`web/components/website/website-builder-page.tsx:138-149`]
- [x] [Review][Defer] `fetchPublicUpcomingActivities` swallows errors — preview may omit upcoming cards silently [`web/lib/site-admin-api.ts:161-218`]
- [x] [Review][Defer] Loading shows full-page skeleton instead of disabled editor + preview-only skeleton — UX polish, not AC fail [`web/components/website/website-builder-page.tsx:280-292`]
- [x] [Review][Defer] Unsaved guard uses native `window.confirm` — consistent with Epic 5 defer pattern [`web/components/website/website-builder-page.tsx:91-93`]
- [x] [Review][Defer] `GripVertical` icon implies drag reorder — keyboard/drag polish for Story 9.8 [`web/components/website/website-section-fields.tsx:533`]

### Re-review (2026-07-07)

**AC status:** Clean — all AC-9.5.1–9.5.4 satisfied after first-round patches.

- [x] [Review][Patch] Hero upload can race save/publish and drop `heroImageAssetId` [`web/components/website/website-section-fields.tsx:206-221`, `website-builder-page.tsx:236-254`]
- [x] [Review][Patch] Concurrent hero uploads can apply out-of-order [`web/components/website/website-section-fields.tsx:206-221`]
- [x] [Review][Patch] Copy link shows success toast when clipboard write fails [`web/components/website/website-builder-page.tsx:537-540`]
- [x] [Review][Patch] Success dialog Open site has no popup-blocker handling [`web/components/website/website-builder-page.tsx:545-551`]

- [x] [Review][Defer] Multi-tab edit last-write-wins with no conflict detection [`web/components/website/website-builder-page.tsx:112-114,236-254`]
