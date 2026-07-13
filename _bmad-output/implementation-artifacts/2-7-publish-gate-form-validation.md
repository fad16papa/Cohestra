---
baseline_commit: 4daa64a
---

# Story 2.7: Publish-Gate Form Validation

Status: done

## Story

As an operator,
I want QR and public link disabled until the form meets minimum requirements,
So that participants never scan a QR to a broken capture page.

## Acceptance Criteria

1. **AC-2.7.1 — Block incomplete form (Party Mode publish-gate)**
   - **Given** an Activity with incomplete form (no required contact field)
   - **When** I attempt to publish
   - **Then** publish is blocked with clear validation message
   - **And** QrPanel remains disabled until publish succeeds

2. **AC-2.7.2 — Allow valid form (Sally publish-gate)**
   - **Given** a form with at least one required contact field and valid template/consent rules
   - **When** I publish
   - **Then** QR and copy-link activate

## Tasks / Subtasks

- [x] **Task 1: Server publish gate** (AC: 2.7.1, 2.7.2)
  - [x] `PublishGateValidator` — required phone/email, schema validity, consent required
  - [x] `PublishAsync` rejects with clear message when gate fails

- [x] **Task 2: Client publish gate** (AC: 2.7.1)
  - [x] `getPublishGateIssues` mirrors server rules
  - [x] Publish button disabled + inline issues on activity detail

- [x] **Task 3: QrPanel gate stub** (AC: 2.7.1, 2.7.2)
  - [x] `ActivityQrPanel` disabled on draft; lists gate issues
  - [x] Copy public link enabled after successful publish
  - [x] QR image placeholder deferred to Story 2.8

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Publish gate uses **saved** `formSchema` on the activity (matches API)
- Full QR preview/download ships in Story 2.8

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Server and client validate required phone/email + consent rules before publish
- QrPanel stub shows gate blockers on draft; copy link active when published

### File List

- `src/Infrastructure/Activities/PublishGateValidator.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `web/lib/form-schema-utils.ts`
- `web/components/activities/activity-publish-controls.tsx`
- `web/components/activities/activity-qr-panel.tsx`
- `web/components/activities/activity-detail-page-client.tsx`

### Change Log

- 2026-06-16: Story 2.7 implemented — publish-gate validation and QrPanel stub

### Review Findings

- [x] [Review][Patch] Publish gate reads saved form only — unsaved Form tab edits can mislead gate UI [`web/components/activities/activity-publish-controls.tsx:30`, `web/components/activities/activity-form-tab.tsx`]
- [x] [Review][Patch] Form tab lacks publish-gate status — operators must switch to Overview to see blockers [`web/components/activities/activity-form-tab.tsx`]
- [x] [Review][Defer] Published activities can save a schema that fails publish gate (no re-validation on form save) [`src/Infrastructure/Activities/ActivityService.cs:224`] — post-publish edit policy deferred
- [x] [Review][Defer] No automated tests for `PublishGateValidator` — add with API test matrix story

### Re-review (2026-06-16, post-patch)

✅ **Clean review — all layers passed.**

- Patch 1 verified: `publishGateSavedFormNote` on Publishing, QR & link, and Form tab
- Patch 2 verified: Form tab shows draft gate + saved gate when dirty
- Server/client gate rules remain aligned
- Stories 2.6 + 2.7 acceptance criteria met; no new patches
