---
story_id: 30.12
story_key: 30-12-template-slots-by-plan
epic: 30
status: ready-for-dev
baseline_commit: cursor/story-30-11-form-templates-d861
created: 2026-08-30
depends_on:
  - 30-11-save-and-apply-tenant-form-templates
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
  - _bmad-output/implementation-artifacts/30-11-save-and-apply-tenant-form-templates.md
forward_deps:
  - 30-13-community-default-design-pin-and-pro-duplicate
---

# Story 30.12: Template slots by plan

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As the platform,
I want saved-template slots Basic 1 / Core 5 / Pro 25,
So that authoring freedom is the SKU and registration caps do not move.

**FRs:** FR-RC-16. **UX:** UX-DR-RC-6.

## Acceptance Criteria

1. **Given** a Basic tenant with one saved template
   **When** I try to create a second
   **Then** API returns `403 plan_locked` with upgrade copy (“Core saves up to 5 form recipes…”)
   **And** the picker shows a slot meter (UX-DR-RC-6)

2. **Given** a Core tenant with five templates
   **When** I save a sixth
   **Then** `403 plan_locked`

3. **Given** a Pro tenant with 25 templates
   **When** I save a 26th
   **Then** `403 plan_locked`

4. **Given** a downgrade that puts the tenant over the new slot cap
   **When** I list templates
   **Then** existing templates remain readable
   **And** I cannot save new ones until under the new cap (same pattern as activity limits)

## Tasks / Subtasks

- [ ] **Task 1 — Plan limit constants** (AC: 1–3)
  - [ ] Extend `PlanLimits` (or add parallel accessor) with `FormTemplateSlots`: Basic **1**, Core **5**, Pro **25**, Enterprise **999** (or high cap)
  - [ ] Add `TenantPlanLimits.FormTemplateSlotsFor(TenantPlan)` or extend `For()` record — keep registration/seat/community/activity caps **unchanged** (Story 30.10 lock)
  - [ ] Extend `TenantPlanLimitsTests` with slot assertions per plan

- [ ] **Task 2 — Validator + exception** (AC: 1–4)
  - [ ] `TenantPlanLimitValidator.ValidateCanAddFormTemplate(int used, int limit)` — block when `used >= limit` (same `IsAtOrOverCapacity` as communities/published activities)
  - [ ] `FormTemplatePlanLockedException` with registrant-safe upgrade message per plan tier
  - [ ] Basic at cap: `"Core saves up to 5 form recipes for every new session."` (from `form-authoring-tiers.md`)
  - [ ] Core at cap: hint Pro / 25 slots; Pro at cap: capacity message without fake upgrade tier

- [ ] **Task 3 — Service enforcement** (AC: 1–4)
  - [ ] In `FormTemplateService.CreateAsync` (from 30.11): count existing `TenantFormTemplates` for tenant → validate before insert
  - [ ] **List/Get/Update/Delete unchanged** — downgrade over-cap tenants can still read, rename, replace, delete existing templates
  - [ ] **Duplicate blocked at create** — only `POST` create path checks cap (30.13 duplicate will call same validator)
  - [ ] Do **not** auto-delete templates on downgrade

- [ ] **Task 4 — API error shape** (AC: 1–3)
  - [ ] `FormTemplatesController`: catch `FormTemplatePlanLockedException` → `403` ProblemDetails with `errorCode: "plan_locked"` (mirror `ActivitiesController.PlanLockedProblem`)
  - [ ] Include actionable `detail` string for web to surface in toast

- [ ] **Task 5 — Web slot meter + upgrade UX** (AC: 1, 4)
  - [ ] In `FormTemplatePicker` saved-templates section: show **slot meter** `used/limit` (compact bar like `LimitMeter` or inline `savedCount/limit` text + progress bar)
  - [ ] Derive limit from tenant shell `plan` (map Basic/Core/Pro → 1/5/25) or expose `formTemplateSlots` on list API response `{ templates, used, limit }` — prefer API counts so UI stays accurate after save/delete
  - [ ] When at cap: disable **Save current draft** button; show `UpgradePanel` with `requiredPlan="Core"` for Basic, `"Pro"` for Core at cap
  - [ ] On `403 plan_locked` from POST: parse ProblemDetails, toast detail, optionally open upgrade panel

- [ ] **Task 6 — Tests** (AC: 1–4)
  - [ ] `TenantPlanLimitValidatorTests`: form template at/below capacity
  - [ ] `FormTemplateServiceTests`: Basic 2nd create throws; Core 6th; Pro 26th; list still returns all when over cap after plan downgrade (mock tenant plan change)
  - [ ] Controller or integration test: POST at cap → `403`, body contains `plan_locked`
  - [ ] Extend `TenantPlanLimitsTests` — do not change registration cap assertions

## Dev Notes

### Prerequisite

**Story 30.11 must ship first.** This story adds enforcement and UI on top of `TenantFormTemplate` + `FormTemplateService` + picker save flow. If 30.11 is not merged, implement on stacked branch.

### Scope boundaries

| In 30.12 | Out of scope |
|---|---|
| Slot caps on **create** (POST) | CRUD entity/API (30.11) |
| Slot meter in picker | Community default (30.13) |
| `403 plan_locked` + UpgradePanel | Design preset pin, duplicate (30.13) |
| Downgrade: read yes, create no | Global shell `LimitMeter` dial (optional — UX-DR-RC-6 says picker meter, not admin nav) |
| Plan limit constants + tests | Billing downgrade warning email for template over-cap (defer unless trivial) |

### Slot matrix (authoritative)

| Plan | Saved form template slots |
|---|---|
| Basic | 1 |
| Core | 5 |
| Pro | 25 |
| Enterprise | 999 (or match other enterprise caps) |

Platform launch templates (Tennis, Pickleball, Board Game) do **not** count toward slots.

### Architecture compliance

- **Registration caps unchanged** — only template slots are new monetization; `TenantPlanLimits` reg/month values stay 250/500/5000 (Story 30.10).
- **Downgrade pattern** — mirror published-activity limits: existing rows remain; block **new** saves when `count >= newPlanLimit`. Operator deletes templates to get under cap.
- **Server-side enforcement required** — UI disable alone is insufficient (project-context plan-gate rule).
- **Error contract** — `403` + `extensions.errorCode = "plan_locked"` matches existing admin surfaces (`ActivitiesController`, `CommunityService`).

### Reference implementations

| Pattern | Reference |
|---|---|
| Capacity validator | `TenantPlanLimitValidator.ValidateCanAddCommunity`, `ValidateCanPublishActivity` |
| Plan locked exception + controller | `CommunityPlanLockedException`, `ActivitiesController.PlanLockedProblem` |
| Form schema plan lock | `FormSchemaPlanLockedException` (403 on form save for Core+ field types) |
| Inline capacity UI | `website-templates-panel.tsx` (`savedCount` display — extend with limit bar) |
| Upgrade CTA | `UpgradePanel` in `web/components/shell/upgrade-panel.tsx` |
| Plan limits record | `TenantPlanLimits.cs`, `TenantPlanLimitsTests.cs` |
| Site template max (fixed cap, not plan-gated) | `SitePageService.MaxSavedTemplates` — **different product**; do not reuse fixed cap for form templates |

### Proposed limit extension

Option A (preferred — keeps one source of truth):

```csharp
public sealed record PlanLimits(
    int Seats,
    int Communities,
    int PublishedActivities,
    int RegistrationsPerMonth,
    int FormTemplateSlots);

public static class TenantPlanLimits
{
    public static PlanLimits For(TenantPlan plan) =>
        plan switch
        {
            TenantPlan.Basic => new(1, 1, 4, 250, 1),
            TenantPlan.Core => new(3, 3, 12, 500, 5),
            TenantPlan.Pro => new(10, 10, 50, 5000, 25),
            TenantPlan.Enterprise => new(999, 999, 999, 999_999, 999),
            _ => new(1, 1, 4, 250, 1),
        };
}
```

**Impact:** Adding a field to `PlanLimits` record requires updating all construction sites (`PaddleBillingService`, `TenantAccessService`, billing contracts, tests). Grep `new PlanLimits` and `PlanLimits(` before merging.

Option B (smaller diff): separate `FormTemplateSlotLimits.For(plan)` static — fewer touchpoints but two limit sources.

### Service create guard (pseudo)

```csharp
var used = await dbContext.TenantFormTemplates.CountAsync(ct);
var limit = TenantPlanLimits.For(tenantPlan).FormTemplateSlots;
var error = TenantPlanLimitValidator.ValidateCanAddFormTemplate(used, limit);
if (error is not null)
    throw new FormTemplatePlanLockedException(error);
```

### API list response extension (recommended)

Extend `GET /api/v1/admin/form-templates` to include usage metadata:

```json
{
  "templates": [ ... ],
  "usage": { "used": 1, "limit": 5 }
}
```

Avoids duplicating plan→limit mapping in web and stays correct after downgrade.

### Web slot meter (UX-DR-RC-6)

In saved-templates section header:

- Text: `Saved templates (1/5)` or separate `LimitMeter`-style bar
- At cap: disable save; show upgrade copy for Basic → Core
- Launch templates section unaffected

### Upgrade copy (exact strings from PRD/tiers)

- Basic blocked: **“Core saves up to 5 form recipes for every new session.”**
- Core blocked: reference Pro / 25 slots (derive from marketing plans or inline consistent copy)
- Pro blocked: at capacity — delete a template or contact support (no higher tier)

### Downgrade test scenario

1. Pro tenant with 10 saved templates
2. Change plan to Basic (test helper or billing webhook simulation)
3. `GET form-templates` → returns 10 items, `usage: { used: 10, limit: 1 }`
4. `POST form-templates` → `403 plan_locked`
5. `DELETE` one template → `used: 9`, still over Basic cap → POST still blocked
6. Delete until `used < 1`… actually Basic limit is 1, so need `used < 1` means 0 templates to create 1. When used=1 and limit=1, at capacity. When used=10 and limit=1, must delete 9 to get to used=1, then still at cap. Must delete to used=0 to save one new. **Clarification:** block when `used >= limit`; Basic limit 1 means max 1 stored. Over-cap from downgrade: used=10, limit=1 → cannot create until used < 1 (i.e. delete down to 0).

### File structure (expected touch list)

**Extend (from 30.11 baseline):**
- `src/Domain/Tenants/TenantPlanLimits.cs`
- `src/Infrastructure/Tenants/TenantPlanLimitValidator.cs`
- `src/Infrastructure/Activities/FormTemplateService.cs` (or path from 30.11)
- `src/Api/Controllers/V1/FormTemplatesController.cs`
- `src/Contracts/Activities/FormTemplateContracts.cs` — add usage to list response
- `web/components/activities/form-template-picker.tsx`
- `web/components/activities/activity-form-tab.tsx` — wire upgrade panel / cap state
- `web/lib/form-templates-api.ts` — parse usage
- `src/Infrastructure.Tests/Tenants/TenantPlanLimitsTests.cs`
- `src/Infrastructure.Tests/Tenants/TenantPlanLimitValidatorTests.cs`
- `src/Infrastructure.Tests/Activities/FormTemplateServiceTests.cs`

**New:**
- `src/Infrastructure/Activities/FormTemplatePlanLockedException.cs`

**Do not modify:**
- `PublishGateValidator`, registration caps, launch template seeds
- Global `TenantShellService.BuildLimitDials` unless product explicitly wants form slots in admin sidebar (UX-DR-RC-6 says picker meter only)

### Previous story intelligence

**30.11** establishes CRUD without caps — this story adds the monetization gate. Do not duplicate 30.11 tasks.

**30.10** locks registration/month caps — verify `TenantPlanLimitsTests` still passes after record extension; only add new slot assertions, do not change 250/500/5000.

### Anti-patterns to avoid

- ❌ Counting launch templates toward slot usage
- ❌ Deleting excess templates automatically on downgrade
- ❌ Blocking list/read/update/delete when over cap — only block **create**
- ❌ Client-only cap check without server validation
- ❌ Changing registration/seat/community/activity limits
- ❌ Adding form template dial to shell without product ask (picker meter is sufficient per UX-DR-RC-6)

## Dev Agent Record

### Agent Model Used

_(filled by dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log

### Review Findings (Pass 1)

- [x] [Review][Patch] Pro 26th-save slot cap untested — AC3 requires `403 plan_locked` at 25/25+1 [`FormTemplateServiceTests.cs`]

- [x] [Review][Patch] Pro at capacity shows disabled Save with no guidance — `formTemplateUpgradePlan('Pro')` returns null so no UpgradePanel [`form-template-picker.tsx:169`]

- [x] [Review][Defer] Enterprise 999 slot limit untested — only Basic/Core/Pro asserted in `TenantPlanLimitsTests` [`FormTemplateSlotLimits.cs`]

- [x] [Review][Defer] 403 on save surfaces via toast only, not UpgradePanel — spec says "optionally open upgrade panel"; ProblemDetails detail is shown [`activity-form-tab.tsx:274`]
