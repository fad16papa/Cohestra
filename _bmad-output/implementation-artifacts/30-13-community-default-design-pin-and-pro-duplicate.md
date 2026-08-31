---
story_id: 30.13
story_key: 30-13-community-default-design-pin-and-pro-duplicate
epic: 30
status: review
baseline_commit: cursor/save-tenant-form-templates-d861
created: 2026-08-31
depends_on:
  - 30-11-save-and-apply-tenant-form-templates
  - 30-12-template-slots-by-plan
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
  - _bmad-output/implementation-artifacts/30-11-save-and-apply-tenant-form-templates.md
  - _bmad-output/implementation-artifacts/30-12-template-slots-by-plan.md
  - _bmad-output/implementation-artifacts/epic-30-retro-2026-08-31.md
  - _bmad-output/implementation-artifacts/25-2-activity-registration-theme.md
---

# Story 30.13: Community default, Design pin, and Pro duplicate

Status: review

## Story

As a Core or Pro Operator,
I want a Community default template, and as Pro I want to pin a Design preset and duplicate a template,
So that new Activities start from our Saturday recipe and optionally pick up the page look — without writing theme into `form_schema`.

**FRs:** FR-RC-17. **UX:** UX-DR-RC-6 (picker actions). **NFRs:** NFR-RC-2 (theme never in `form_schema`), NFR-RC-4 (tenant isolation).

## Acceptance Criteria

1. **Given** a Core or Pro tenant
   **When** I set one saved template as the default for a Community
   **Then** new Activities in that Community pre-fill that `form_schema`
   **And** theme is still not in `form_schema`

2. **Given** a Pro tenant
   **When** I pin a Design preset id on a template and apply it
   **Then** apply offers to set that preset on the Activity; I must confirm
   **And** I can duplicate a saved template (counts toward the 25-slot cap)

3. **Given** a Basic tenant
   **When** I call community-default, preset-pin, or duplicate endpoints
   **Then** API returns `403 plan_locked`

4. **Given** a Core tenant
   **When** I call preset-pin or duplicate
   **Then** `403 plan_locked`
   **And** community default still works

## Tasks / Subtasks

- [x] **Task 1 — Community default persistence** (AC: 1, 3, 4)
  - [x] Add nullable `DefaultFormTemplateId` (`Guid?`) on `Community` with FK to `tenant_form_templates` (SetNull on template delete)
  - [x] EF migration; include in `CommunityConfiguration`
  - [x] Extend `CommunityResponse` with `defaultFormTemplateId`, `defaultFormTemplateName` (denormalized name for UI)
  - [x] Validate on set: template must belong to same tenant; return 404 if template missing/cross-tenant

- [x] **Task 2 — Community default API + plan gate** (AC: 1, 3, 4)
  - [x] `PUT /api/v1/admin/communities/{id}/default-form-template` body `{ formTemplateId: guid | null }`
  - [x] Core+ only; Basic → `403 plan_locked` via `CommunityPlanLockedException` pattern
  - [x] Clearing default: send `null` id
  - [x] Wire in `CommunityService` / `CommunitiesController`

- [x] **Task 3 — Activity create pre-fill** (AC: 1)
  - [x] In `ActivityService.CreateAsync`: after catalog validation, resolve community by `CommunityLabel` name
  - [x] If `community.DefaultFormTemplateId` is set, load template and deep-clone `FormSchema` onto new `Activity.FormSchema`
  - [x] Apply `FormFieldStepAssigner.ApplyMissingBuckets` on cloned schema (same as template save)
  - [x] Do **not** set `RegistrationTheme` from template — theme stays on Design tab / community kit
  - [x] If template row deleted but FK nulled, new activities get empty form (null schema) — acceptable

- [x] **Task 4 — Pinned preset on template** (AC: 2, 3, 4)
  - [x] Add nullable `PinnedRegistrationThemePreset` (`string?`, max 32) on `TenantFormTemplate` — **separate column, never in `form_schema` JSONB**
  - [x] EF migration; validate against `RegistrationThemePresets.All`
  - [x] Extend `FormTemplateResponse` / summary with `pinnedRegistrationThemePreset`
  - [x] `PATCH /api/v1/admin/form-templates/{id}/pinned-preset` body `{ preset: "classic" | "card" | "immersive" | "compact" | null }`
  - [x] Pro+ only; Basic and Core → `403 plan_locked`
  - [x] `FormTemplateService.SetPinnedPresetAsync`

- [x] **Task 5 — Duplicate template** (AC: 2, 3, 4)
  - [x] `POST /api/v1/admin/form-templates/{id}/duplicate` optional body `{ name?: string }`
  - [x] Pro+ only; Basic/Core → `403 plan_locked`
  - [x] Deep-clone `FormSchema`; copy `PinnedRegistrationThemePreset`
  - [x] Default name `"{original} (copy)"` with numeric suffix if name collision
  - [x] Call existing `EnsureCanAddTemplateAsync` — duplicate counts as create toward slot cap (25 on Pro)

- [x] **Task 6 — Web: community default UI** (AC: 1, 3)
  - [x] New `CommunityDefaultFormTemplatePanel` on community detail page
  - [x] Core+ gate via `isCoreOrAbove(shell.plan)`; Basic shows `UpgradePanel` requiredPlan Core
  - [x] Dropdown of saved templates from `fetchFormTemplates`; show current default name
  - [x] Save via new `setCommunityDefaultFormTemplate` in `communities-api.ts`

- [x] **Task 7 — Web: preset pin + duplicate in picker** (AC: 2, 3, 4)
  - [x] Extend `form-template-picker.tsx`: Duplicate (Pro), Pin preset select (Pro), badge when pinned
  - [x] Core/Basic: upgrade hint via `UpgradePanel`

- [x] **Task 8 — Web: apply offers Design preset** (AC: 2)
  - [x] Second `AlertDialog` after form apply when template has pinned preset
  - [x] Confirm → `updateActivity` with `registrationTheme`; Decline → form-only
  - [x] Unpublished activities only (existing apply lock)

- [x] **Task 9 — Tests** (AC: 1–4)
  - [x] `CommunityDefaultTemplateServiceTests`: Core OK, Basic 403, unknown template 404
  - [x] `ActivityServiceCommunityDefaultTests`: create pre-fills form schema
  - [x] `FormTemplateServiceTests`: pin/duplicate plan gates + slot cap on duplicate
  - [x] `CaptureInvariantsTests`: preset column separate from form_schema
  - [x] `TenantIsolationApiTests`: community-default + duplicate cross-tenant 404

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Backend: `Community.DefaultFormTemplateId` FK (SetNull), `TenantFormTemplate.PinnedRegistrationThemePreset`, migration `AddCommunityDefaultAndTemplatePresetPin`
- APIs: `PUT communities/{id}/default-form-template`, `PATCH form-templates/{id}/pinned-preset`, `POST form-templates/{id}/duplicate`
- Activity create clones community default template schema server-side
- Web: community default panel, picker duplicate/pin, apply preset confirm dialog
- Unit tests: 783 passed (`Category!=Integration`); +10 new tests

### File List

- `src/Domain/Activities/Community.cs`
- `src/Domain/Activities/TenantFormTemplate.cs`
- `src/Contracts/Activities/CommunityContracts.cs`
- `src/Contracts/Activities/FormTemplateContracts.cs`
- `src/Application/Activities/ICommunityService.cs`
- `src/Application/Activities/IFormTemplateService.cs`
- `src/Infrastructure/Activities/CommunityService.cs`
- `src/Infrastructure/Activities/FormTemplateService.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/FormSchemaCloner.cs`
- `src/Infrastructure/Persistence/Configurations/CommunityConfiguration.cs`
- `src/Infrastructure/Persistence/Configurations/TenantFormTemplateConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddCommunityDefaultAndTemplatePresetPin*`
- `src/Api/Controllers/V1/CommunitiesController.cs`
- `src/Api/Controllers/V1/FormTemplatesController.cs`
- `src/Infrastructure.Tests/Activities/CommunityDefaultTemplateServiceTests.cs`
- `src/Infrastructure.Tests/Activities/ActivityServiceCommunityDefaultTests.cs`
- `src/Infrastructure.Tests/Activities/FormTemplateServiceTests.cs`
- `src/Infrastructure.Tests/Registrations/CaptureInvariantsTests.cs`
- `src/Api.IntegrationTests/TenantIsolationApiTests.cs`
- `web/lib/communities-api.ts`
- `web/lib/form-templates-api.ts`
- `web/components/activities/community-default-form-template-panel.tsx`
- `web/components/activities/community-detail-page.tsx`
- `web/components/activities/form-template-picker.tsx`
- `web/components/activities/activity-form-tab.tsx`

### Change Log

- 2026-08-31: Story 30.13 implemented — community default, Pro preset pin, Pro duplicate (FR-RC-17)
