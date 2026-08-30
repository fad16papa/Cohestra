---
story_id: 30.11
story_key: 30-11-save-and-apply-tenant-form-templates
epic: 30
status: ready-for-dev
baseline_commit: cursor/capture-invariants-stay-shipped-d861
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/implementation-artifacts/2-5-launch-form-template-seeds.md
  - _bmad-output/implementation-artifacts/30-10-capture-invariants-stay-shipped.md
forward_deps:
  - 30-12-template-slots-by-plan
  - 30-13-community-default-design-pin-and-pro-duplicate
---

# Story 30.11: Save and apply tenant Form templates

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As an Operator,
I want to save this draft Form as a named tenant template and apply it to the next unpublished Activity,
So that next month's Saturday is two taps, not a blank Form tab.

**FRs:** FR-RC-15. **UX:** UX-DR-RC-6. **NFRs:** NFR-RC-2, NFR-RC-4.

## Acceptance Criteria

1. **Given** an unpublished Activity whose Form I authored (types from 30.1–30.5; meta from 30.6–30.8)
   **When** I save it as a named tenant Form template
   **Then** name + `form_schema` snapshot (fields + meta) is stored scoped by `TenantId`
   **And** `registration_theme` is not in the snapshot
   **And** platform launch templates (Tennis, Pickleball, Board Game) remain available

2. **Given** another unpublished Activity
   **When** I apply that template after confirm
   **Then** draft Fields are replaced the same way launch templates work today
   **And** Publish Gate still runs on the Activity after apply

3. **Given** a published Activity
   **When** I try to apply a template
   **Then** apply stays locked (same as launch templates)

4. **Given** the existing template picker (UX-DR-RC-6)
   **When** I save, rename, replace, or delete my template
   **Then** no new IA is introduced
   **And** another tenant cannot read this row (NFR-RC-4)

## Tasks / Subtasks

- [ ] **Task 1 — Domain + persistence** (AC: 1, 4)
  - [ ] Add `TenantFormTemplate : ITenantScoped` with `Id`, `TenantId`, `Name`, `FormSchema` (`ActivityFormSchema`), `CreatedAt`, `UpdatedAt`
  - [ ] EF configuration: table `tenant_form_templates`, JSONB `form_schema` via `ActivityFormSchemaJson.SerializerOptions` (mirror `ActivityConfiguration`)
  - [ ] `DbSet<TenantFormTemplate>` on `CohestraDbContext`; global tenant filter applies automatically
  - [ ] EF migration

- [ ] **Task 2 — Application service + contracts** (AC: 1, 4)
  - [ ] `IFormTemplateService` / `FormTemplateService`: list, get, create, update (rename and/or replace schema), delete
  - [ ] Contracts: `FormTemplateSummaryResponse`, `FormTemplateResponse`, `CreateFormTemplateRequest`, `UpdateFormTemplateRequest` — reuse `ActivityFormSchemaDto` for schema payload
  - [ ] Validate on create/update: `FormSchemaValidator.ValidateDto` + `EnsureFormSchemaPlanAllowedAsync` (same plan gates as activity save — Core+/Pro field types)
  - [ ] Name validation: non-empty, max ~120 chars (match `EmailTemplate`)
  - [ ] Register in `DependencyInjection.cs`

- [ ] **Task 3 — Admin API** (AC: 1, 4)
  - [ ] `FormTemplatesController` at `api/v1/admin/form-templates`
  - [ ] `GET` list, `GET {id}`, `POST`, `PATCH {id}`, `DELETE {id}`
  - [ ] Auth: `[Authorize(Policy = TenantAuthPolicies.TenantOperator)]` — **all plans** (not Pro-gated like email templates)
  - [ ] Errors: `400` validation, `404` missing/cross-tenant, ProblemDetails with `detail`
  - [ ] **Do not** add plan slot cap enforcement here — that is Story 30.12

- [ ] **Task 4 — Web API client** (AC: 1, 4)
  - [ ] New `web/lib/form-templates-api.ts` (or extend `activities-api.ts` if team prefers one form module)
  - [ ] Types: `SavedFormTemplate`, CRUD helpers mirroring `campaigns-api.ts` / `site-admin-api.ts`
  - [ ] Parse camelCase/PascalCase from API consistently with existing clients

- [ ] **Task 5 — Form tab UI** (AC: 1–4)
  - [ ] Extend `FormTemplatePicker`: keep **Launch templates** section; add **Your saved templates** below (layout reference: `website-templates-panel.tsx`)
  - [ ] **Save current draft**: dialog for name → `POST` with `{ name, formSchema: draftSchema }` (draft may be unsaved — send client state, do not read activity from server)
  - [ ] **Apply saved template**: same `AlertDialog` confirm-replace as launch templates → `setDraftSchema(cloneFormSchema(template.formSchema))` — client-only, no server apply endpoint
  - [ ] **Rename / replace / delete**: inline or dialog actions on saved template cards
  - [ ] Published/archived lock: reuse `publishedTemplateLockReason` / `locked` props — no apply on published activities
  - [ ] After apply: toast + existing publish-gate preview recalculates on in-memory `draftSchema`; operator still clicks **Save form** separately

- [ ] **Task 6 — Tests** (AC: 1–4)
  - [ ] `FormTemplateServiceTests`: create/list/update/delete, validation failures, schema round-trip
  - [ ] `TenantIsolationApiTests`: foreign tenant `GET/PATCH/DELETE` → 404, no foreign payload in list
  - [ ] Optional integration: POST template, GET list, verify fields + meta preserved
  - [ ] Do **not** duplicate publish-gate or capture-invariant tests — Story 30.10 already locks those behaviors

## Dev Notes

### Scope boundaries (critical)

| In 30.11 | Deferred |
|---|---|
| CRUD + tenant isolation | Plan slot caps Basic 1 / Core 5 / Pro 25 → **30.12** |
| Save/apply/rename/delete in existing picker | Slot meter, `403 plan_locked`, `UpgradePanel` → **30.12** |
| Client-side apply (clone into draft) | Community default template → **30.13** |
| Launch templates unchanged | Design preset pin, Pro duplicate → **30.13** |

**Do not** enforce save-count limits in this story. Basic tenants may save unlimited templates until 30.12 ships — acceptable short window.

### Architecture compliance

- **Brownfield extend-only** — no second form product; templates are named snapshots of existing `ActivityFormSchema` JSONB shape (`docs/contracts/activity-form-schema-v1.md`).
- **Theme invariant (NFR-RC-2):** `registration_theme` lives on `Activity.RegistrationTheme` — never store in template row or `form_schema`. Story 30.10 `CaptureInvariantsTests` locks this; do not regress.
- **Tenant isolation (NFR-RC-4):** `ITenantScoped` + EF global filter; cross-tenant access returns 404. Extend `TenantIsolationApiTests`.
- **Apply is client-only** — matches Story 2.5 launch templates. No server "apply template to activity" endpoint.
- **Publish gate after apply** — already wired in `activity-form-tab.tsx` via `getPublishGateIssues(draftSchema)`. Server re-validates on publish via `PublishGateValidator`. No new backend work for apply flow.

### Reference implementations (copy patterns, do not reinvent)

| Pattern | Reference files |
|---|---|
| Tenant-scoped CRUD entity | `SiteHomepageTemplate`, `EmailTemplate` |
| JSONB snapshot column | `ActivityConfiguration` (`form_schema` serializer) |
| Service + thin controller | `EmailTemplateService`, `EmailTemplatesController` |
| Web saved-templates UX | `website-templates-panel.tsx`, `site-admin-api.ts` |
| Launch template apply flow | `activity-form-tab.tsx` (`confirmApplyTemplate`, `cloneFormTemplate`) |
| Deep clone helper | `web/lib/form-templates.ts` → `cloneFormSchema` |

### Current launch-template flow (preserve exactly)

```135:157:web/components/activities/activity-form-tab.tsx
  function applyTemplate(templateId: FormTemplateId) {
    setError(null);
    setSuccess(null);
    setDraftSchema(cloneFormTemplate(templateId));
    setSuccess(`${getFormTemplate(templateId).name} template applied. Save when ready.`);
  }
```

Saved template apply: `setDraftSchema(cloneFormSchema(savedTemplate.formSchema))` with the same confirm dialog text ("This replaces all current form fields…").

### Proposed entity shape

```csharp
// src/Domain/Activities/TenantFormTemplate.cs
public sealed class TenantFormTemplate : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ActivityFormSchema FormSchema { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
```

### Proposed API routes

| Method | Route | Body |
|---|---|---|
| `GET` | `/api/v1/admin/form-templates` | — |
| `GET` | `/api/v1/admin/form-templates/{id}` | — |
| `POST` | `/api/v1/admin/form-templates` | `{ name, formSchema }` |
| `PATCH` | `/api/v1/admin/form-templates/{id}` | `{ name?, formSchema? }` |
| `DELETE` | `/api/v1/admin/form-templates/{id}` | — |

### File structure (expected touch list)

**New:**
- `src/Domain/Activities/TenantFormTemplate.cs`
- `src/Infrastructure/Persistence/Configurations/TenantFormTemplateConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddTenantFormTemplates*.cs`
- `src/Application/Activities/IFormTemplateService.cs`
- `src/Infrastructure/Activities/FormTemplateService.cs`
- `src/Contracts/Activities/FormTemplateContracts.cs` (or similar)
- `src/Api/Controllers/V1/FormTemplatesController.cs`
- `src/Infrastructure.Tests/Activities/FormTemplateServiceTests.cs`
- `web/lib/form-templates-api.ts`

**Extend:**
- `src/Infrastructure/Persistence/CohestraDbContext.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `web/components/activities/form-template-picker.tsx`
- `web/components/activities/activity-form-tab.tsx`
- `src/Api.IntegrationTests/TenantIsolationApiTests.cs`

**Do not modify (unless bug found):**
- `web/lib/form-templates.ts` launch seeds — keep three hardcoded templates
- `PublishGateValidator`, `RegistrationThemeResolver` — behavior locked by 30.10

### Testing requirements

- Unit: `dotnet test Cohestra.sln --filter "Category!=Integration"` — add `FormTemplateServiceTests`
- Integration (optional but recommended for isolation): extend `TenantIsolationApiTests` with form-template cross-tenant case; requires Postgres + Redis + fresh `cohestra_test`
- Web: `cd web && npm run lint` (pre-existing ESLint errors acceptable per AGENTS.md)
- Manual smoke: save draft with Capture meta (intro, closed message, close-at) → apply to second unpublished activity → publish gate shows → save → publish succeeds

### Previous story intelligence (30.10)

- Regression-only story confirmed: theme never in `form_schema`, publish gate unchanged, plan caps unchanged.
- `CaptureInvariantsTests` scans DTOs for theme leakage — template entity should not add theme fields.
- Deferred from 30.10 (still out of scope unless trivial): integration test for plan_registration_limit 409; marketing/pricing cross-assert.

### Git intelligence

Recent Epic 30 commits on `cursor/capture-invariants-stay-shipped-d861`:
- 30.10: invariant regression tests only (no production changes)
- 30.9: operator notify outbox + settings toggle

Branch for implementation: create `cursor/save-tenant-form-templates-d861` from latest Epic 30 stack tip.

### Anti-patterns to avoid

- ❌ Server-side "apply template" endpoint — use client clone like launch templates
- ❌ New schema format or separate JSON contract — reuse `ActivityFormSchemaDto`
- ❌ Storing `registration_theme` in template row
- ❌ Pro-only gating on form templates (all plans get save/apply; slots gated in 30.12)
- ❌ Auto-save activity after apply — operator confirms replace, then explicitly saves
- ❌ Replacing launch templates with tenant-only picker — both sections coexist

## Dev Agent Record

### Agent Model Used

_(filled by dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings (Pass 1)

- [x] [Review][Patch] Missing **Replace** saved template action — AC4 requires rename/**replace**/delete; API supports `PATCH { formSchema }` but picker only has Rename/Delete [`form-template-picker.tsx`, `activity-form-tab.tsx`]

- [x] [Review][Patch] Save template skips `applyMissingStepBuckets` — activity save normalizes step buckets; template save sends raw `draftSchema` [`activity-form-tab.tsx:267`]

- [x] [Review][Patch] Save template ignores client validation issues — `hasClientIssues` blocks Save form but not Save template [`activity-form-tab.tsx:258`]

- [x] [Review][Patch] Save succeeds but list refresh failure shows error toast — template persisted server-side [`activity-form-tab.tsx:267-277`]

- [x] [Review][Patch] Template list load failure leaves stale `usage` — catch clears templates only, Save button state wrong [`activity-form-tab.tsx:loadTemplates`]

- [x] [Review][Patch] `cloneFormSchema` shallow-clones `visibleWhen` — nested recipe objects may alias across apply [`form-templates.ts:348`]

- [x] [Review][Defer] Save current draft enabled on published activities while Apply is locked — saving live form as library recipe may be intentional; AC3 only locks apply [`form-template-picker.tsx:162`]

- [x] [Review][Defer] Concurrent POST at slot boundary (TOCTOU) — same pattern as other plan-limit creates; no DB unique constraint [`FormTemplateService.cs:EnsureCanAddTemplateAsync`]

- [x] [Review][Defer] No HTTP integration test for POST `403 plan_locked` — service tests cover slot enforcement [`FormTemplatesController.cs`]

- [x] [Review][Defer] Tenant isolation only asserts cross-tenant GET — PATCH/DELETE follow same EF filter pattern [`TenantIsolationApiTests.cs`]
