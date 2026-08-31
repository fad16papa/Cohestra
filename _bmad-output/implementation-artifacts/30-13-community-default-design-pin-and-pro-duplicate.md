---
story_id: 30.13
story_key: 30-13-community-default-design-pin-and-pro-duplicate
epic: 30
status: ready-for-dev
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

Status: ready-for-dev

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

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

- [ ] **Task 1 — Community default persistence** (AC: 1, 3, 4)
  - [ ] Add nullable `DefaultFormTemplateId` (`Guid?`) on `Community` with FK to `tenant_form_templates` (Restrict delete; null on template delete)
  - [ ] EF migration; include in `CommunityConfiguration`
  - [ ] Extend `CommunityResponse` with `defaultFormTemplateId`, `defaultFormTemplateName` (denormalized name for UI)
  - [ ] Validate on set: template must belong to same tenant; return 404 if template missing/cross-tenant

- [ ] **Task 2 — Community default API + plan gate** (AC: 1, 3, 4)
  - [ ] `PUT /api/v1/admin/communities/{id}/default-form-template` body `{ formTemplateId: guid | null }`
  - [ ] Core+ only; Basic → `403 plan_locked` via `CommunityPlanLockedException` pattern
  - [ ] Clearing default: send `null` id
  - [ ] Wire in `CommunityService` / `CommunitiesController`

- [ ] **Task 3 — Activity create pre-fill** (AC: 1)
  - [ ] In `ActivityService.CreateAsync`: after catalog validation, resolve community by `CommunityLabel` name
  - [ ] If `community.DefaultFormTemplateId` is set, load template and deep-clone `FormSchema` onto new `Activity.FormSchema`
  - [ ] Apply `FormFieldStepAssigner.ApplyMissingBuckets` on cloned schema (same as template save)
  - [ ] Do **not** set `RegistrationTheme` from template — theme stays on Design tab / community kit
  - [ ] If template row deleted but FK nulled, new activities get empty form (null schema) — acceptable

- [ ] **Task 4 — Pinned preset on template** (AC: 2, 3, 4)
  - [ ] Add nullable `PinnedRegistrationThemePreset` (`string?`, max 32) on `TenantFormTemplate` — **separate column, never in `form_schema` JSONB**
  - [ ] EF migration; validate against `RegistrationThemePresets.All`
  - [ ] Extend `FormTemplateResponse` / summary with `pinnedRegistrationThemePreset`
  - [ ] `PATCH /api/v1/admin/form-templates/{id}/pinned-preset` body `{ preset: "classic" | "card" | "immersive" | "compact" | null }`
  - [ ] Pro+ only; Basic and Core → `403 plan_locked`
  - [ ] `FormTemplateService.SetPinnedPresetAsync`

- [ ] **Task 5 — Duplicate template** (AC: 2, 3, 4)
  - [ ] `POST /api/v1/admin/form-templates/{id}/duplicate` optional body `{ name?: string }`
  - [ ] Pro+ only; Basic/Core → `403 plan_locked`
  - [ ] Deep-clone `FormSchema`; copy `PinnedRegistrationThemePreset`
  - [ ] Default name `"{original} (copy)"` with numeric suffix if name collision (`EnsureNameAvailableAsync`)
  - [ ] Call existing `EnsureCanAddTemplateAsync` — duplicate counts as create toward slot cap (25 on Pro)

- [ ] **Task 6 — Web: community default UI** (AC: 1, 3)
  - [ ] New `CommunityDefaultFormTemplatePanel` on community detail page (below or inside brand kit section)
  - [ ] Core+ gate via `isCoreOrAbove(shell.plan)`; Basic shows `UpgradePanel` requiredPlan Core
  - [ ] Dropdown of saved templates from `fetchFormTemplates`; show current default name
  - [ ] Save via new `setCommunityDefaultFormTemplate` in `communities-api.ts`
  - [ ] Helper copy: *"New activities in this community start with this form recipe."*

- [ ] **Task 7 — Web: preset pin + duplicate in picker** (AC: 2, 3, 4)
  - [ ] Extend `form-template-picker.tsx` saved-template row actions:
    - **Duplicate** (Pro only): dialog optional rename → POST duplicate → refresh list + usage
    - **Pin preset** (Pro only): small select using `registrationPresetOptions` / `registrationPresetLabels` → PATCH pinned-preset
  - [ ] Show pinned preset badge on template card when set
  - [ ] Core/Basic: hide or disable with upgrade hint

- [ ] **Task 8 — Web: apply offers Design preset** (AC: 2)
  - [ ] When applying saved template with `pinnedRegistrationThemePreset`, after form replace confirm, show second `AlertDialog`:
    - *"This template pins the {Compact} layout. Apply it to this activity's Design tab?"*
    - Confirm → PATCH activity `registrationTheme: { preset, inheritCommunityBrand: true }` via existing update API
    - Decline → form-only apply (current behavior)
  - [ ] Only on unpublished activities (same lock as form apply)
  - [ ] Fetch full template (`fetchFormTemplate`) before apply if summary lacks preset field

- [ ] **Task 9 — Tests** (AC: 1–4)
  - [ ] `CommunityServiceTests` / integration: set default Core OK, Basic 403, cross-tenant template 404
  - [ ] `ActivityServiceTests` or integration: create activity in community with default → `formSchema.fields` matches template
  - [ ] `FormTemplateServiceTests`: pin preset Pro OK, Core 403; duplicate Pro OK counts slot, Core 403; duplicate at cap → `FormTemplatePlanLockedException`
  - [ ] `CaptureInvariantsTests`: scan template DTOs — no theme inside `formSchema`
  - [ ] Extend `TenantIsolationApiTests` for community-default and duplicate cross-tenant

## Dev Notes

### Scope boundaries (critical)

| In 30.13 | Out of scope |
|---|---|
| Community `DefaultFormTemplateId` + create pre-fill | Changing slot limits (30.12) |
| Pro preset pin column + apply confirm UX | Auto-applying theme without confirm |
| Pro duplicate (create path + slot cap) | Community default for **existing** activities (create only) |
| Plan gates per tier matrix below | Warn on past `registrationClosesAt` in meta (retro action item #7 — defer) |
| Picker + community detail UI | Shell sidebar limit dial for templates |

### Plan gate matrix (authoritative)

| Capability | Basic | Core | Pro |
|---|---|---|---|
| Set community default template | `403` | ✓ | ✓ |
| Pin Design preset on template | `403` | `403` | ✓ |
| Duplicate saved template | `403` | `403` | ✓ |

Use existing `CommunityPlanLockedException` / `FormTemplatePlanLockedException` + controller `PlanLockedProblem` (`errorCode: plan_locked`).

### Theme invariant (NFR-RC-2) — do not regress

- `PinnedRegistrationThemePreset` is a **template metadata column**, like template name — not part of `ActivityFormSchema` JSONB.
- Community default copies **only** `form_schema` to new Activity — never writes preset into schema.
- Apply preset confirm updates `Activity.RegistrationTheme` via existing Design tab contract — same as `activity-design-tab.tsx`.
- `CaptureInvariantsTests` from 30.10 must still pass.

### Current state (what exists today)

**Community entity** — no default template field yet:

```5:22:src/Domain/Activities/Community.cs
public class Community : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LogoAssetId { get; set; }
    public string? AccentColor { get; set; }
    public string? DefaultHeroImageUrl { get; set; }
    // ... no DefaultFormTemplateId
}
```

**Activity create** — does not pre-fill form schema:

```83:100:src/Infrastructure/Activities/ActivityService.cs
            var activity = new Activity
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                // ...
                CommunityLabel = request.CommunityLabel.Trim(),
                Status = ActivityStatus.Draft,
                // FormSchema left null
            };
```

**TenantFormTemplate** — fields + meta only; no preset pin:

```5:18:src/Domain/Activities/TenantFormTemplate.cs
public sealed class TenantFormTemplate : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ActivityFormSchema FormSchema { get; set; } = new();
    // ... no PinnedRegistrationThemePreset
}
```

**Form templates API** — CRUD only; no duplicate or pin endpoints (`FormTemplatesController`).

**Saved template apply** — client-only form replace; no theme offer:

```240:248:web/components/activities/activity-form-tab.tsx
  function applySavedTemplate(template: SavedFormTemplate) {
    setDraftSchema(
      applyMissingStepBuckets(
        normalizeFormSchema(cloneFormSchema(template.formSchema))
      )
    );
    setSuccess(`"${template.name}" applied. Save when ready.`);
  }
```

### Proposed schema changes

**Community:**

```csharp
public Guid? DefaultFormTemplateId { get; set; }
// FK: tenant_form_templates.Id ON DELETE SET NULL
```

**TenantFormTemplate:**

```csharp
public string? PinnedRegistrationThemePreset { get; set; }
// Validate: null or RegistrationThemePresets.All
```

### Proposed API routes

| Method | Route | Plan | Body |
|---|---|---|---|
| `PUT` | `/api/v1/admin/communities/{id}/default-form-template` | Core+ | `{ formTemplateId: guid \| null }` |
| `PATCH` | `/api/v1/admin/form-templates/{id}/pinned-preset` | Pro+ | `{ preset: string \| null }` |
| `POST` | `/api/v1/admin/form-templates/{id}/duplicate` | Pro+ | `{ name?: string }` |

### Activity create pre-fill (pseudo)

```csharp
var community = await dbContext.Communities
    .AsNoTracking()
    .FirstOrDefaultAsync(c => c.Name == request.CommunityLabel.Trim(), ct);

if (community?.DefaultFormTemplateId is Guid templateId)
{
    var template = await dbContext.TenantFormTemplates
        .AsNoTracking()
        .FirstOrDefaultAsync(t => t.Id == templateId, ct);

    if (template is not null)
    {
        var cloned = CloneSchema(template.FormSchema); // reuse FormTemplateService.CloneSchema pattern
        FormFieldStepAssigner.ApplyMissingBuckets(cloned);
        activity.FormSchema = cloned;
    }
}
```

Match community by **name** (`CommunityLabel` on Activity) — same pattern as `RegistrationThemeQueries` community lookup.

### Apply + preset confirm UX flow

```mermaid
sequenceDiagram
  participant Op as Operator
  participant Picker as FormTemplatePicker
  participant FormTab as ActivityFormTab
  participant API as Activities API

  Op->>Picker: Apply saved template (has pinned preset)
  Picker->>FormTab: confirm replace fields
  Op->>FormTab: Confirm
  FormTab->>FormTab: cloneFormSchema into draftSchema
  FormTab->>Op: Second dialog: apply Compact preset?
  Op->>FormTab: Confirm preset
  FormTab->>API: PATCH activity registrationTheme
  FormTab->>Op: Toast: form + design applied; save when ready
```

Preset apply is a **separate confirm** — never silent. Declining leaves form applied, theme unchanged.

### Reference implementations (copy patterns)

| Pattern | Reference |
|---|---|
| Community plan gate | `CommunityService.ValidateCommunityLogoPlanGateAsync`, `CommunityPlanLockedException` |
| Form template plan gate | `FormTemplatePlanLockedException`, `FormTemplatesController.PlanLockedProblem` |
| Slot cap on create | `FormTemplateService.EnsureCanAddTemplateAsync` (30.12) |
| Deep clone schema | `FormTemplateService.CloneSchema` |
| Preset validation | `RegistrationThemeValidator.NormalizePreset` |
| Theme PATCH | `activity-design-tab.tsx` → `updateActivity` with `registrationTheme` |
| Community detail panel | `community-brand-kit-panel.tsx`, `community-detail-page.tsx` |
| Picker actions | `form-template-picker.tsx` (Apply/Rename/Replace/Delete from 30.11) |
| Upgrade CTA | `UpgradePanel`, `isCoreOrAbove` |

### File structure (expected touch list)

**New:**
- `src/Infrastructure/Persistence/Migrations/*CommunityDefaultFormTemplate*.cs`
- `src/Infrastructure/Persistence/Migrations/*TenantFormTemplatePinnedPreset*.cs`
- `web/components/activities/community-default-form-template-panel.tsx`

**Extend:**
- `src/Domain/Activities/Community.cs`
- `src/Domain/Activities/TenantFormTemplate.cs`
- `src/Infrastructure/Persistence/Configurations/CommunityConfiguration.cs`
- `src/Infrastructure/Persistence/Configurations/TenantFormTemplateConfiguration.cs`
- `src/Infrastructure/Activities/CommunityService.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/FormTemplateService.cs`
- `src/Application/Activities/IFormTemplateService.cs`
- `src/Contracts/Activities/CommunityContracts.cs`
- `src/Contracts/Activities/FormTemplateContracts.cs`
- `src/Api/Controllers/V1/CommunitiesController.cs`
- `src/Api/Controllers/V1/FormTemplatesController.cs`
- `web/lib/communities-api.ts`
- `web/lib/form-templates-api.ts`
- `web/components/activities/form-template-picker.tsx`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/activities/community-detail-page.tsx`
- `src/Infrastructure.Tests/Activities/FormTemplateServiceTests.cs`
- `src/Api.IntegrationTests/TenantIsolationApiTests.cs`

**Do not modify:**
- `TenantPlanLimits` registration/seat/community/activity caps
- Launch template seeds in `web/lib/form-templates.ts`
- `PublishGateValidator` behavior

### Testing requirements

- Unit: `dotnet test Cohestra.sln --filter "Category!=Integration"` — add service tests for all three features + plan gates
- Integration (recommended): community default create pre-fill; duplicate at Pro cap; isolation cases
- Web: `cd web && npm run lint` (pre-existing ESLint errors acceptable)
- Manual smoke:
  1. Core: set community default → create activity in that community → Form tab has template fields
  2. Pro: pin Compact on template → apply → confirm preset → Design tab shows Compact
  3. Pro: duplicate at 25/25 → `403 plan_locked`
  4. Basic: all three endpoints → `403`

### Previous story intelligence

**30.11** — Template CRUD + client-side apply. Duplicate reuses `CreateAsync` validation path. Do not add server "apply template to activity" endpoint.

**30.12** — Slot cap on **create** only. Duplicate must call `EnsureCanAddTemplateAsync`. List/read/update/delete unchanged when over cap.

**30.10** — Theme never in `form_schema`. Pinned preset is template row metadata, not schema field.

**Epic 30 retro (2026-08-31)** — 30.13 should not alter slot limits or registration caps. Coordinate with Epic 25 design system (`RegistrationThemePresets`). Optional defer: warn on template apply when meta includes past `registrationClosesAt`.

### Anti-patterns to avoid

- ❌ Storing preset id inside `form_schema` meta or fields
- ❌ Auto-applying Design preset without operator confirm
- ❌ Backfilling existing activities when community default changes
- ❌ Duplicate bypassing slot cap validator
- ❌ Allowing Basic to set community default (Core+ only per tiers doc)
- ❌ Allowing Core to pin preset or duplicate (Pro only)
- ❌ Deleting community default template without SET NULL FK — use ON DELETE SET NULL
- ❌ Duplicating `EnsureFormSchemaPlanAllowedAsync` — consider shared helper (retro #5) only if trivial; not blocking

### Project context reference

- Plan gates server-side with `403 plan_locked` [project-context.md]
- DTOs in Contracts; EF entities never on wire
- Cross-tenant → 404, not 403
- Extend `TenantIsolationApiTests` for new admin surfaces

## Dev Agent Record

### Agent Model Used

_(filled by dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log
