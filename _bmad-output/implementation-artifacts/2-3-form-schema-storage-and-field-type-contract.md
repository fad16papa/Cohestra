---
baseline_commit: 4daa64a
---

# Story 2.3: Form Schema Storage and Field-Type Contract

Status: done

## Story

As a developer,
I want a frozen JSON form schema format stored in PostgreSQL JSONB,
So that Epic 3 registration rendering and dedup have a stable contract.

## Acceptance Criteria

1. **AC-2.3.1 — Persist form schema (Epic 2→3 gate)**
   - **Given** an Activity exists
   - **When** I save a form schema via admin API
   - **Then** it is stored in `activities.form_schema` JSONB with documented field-type enum (text, phone, email, select, checkbox, consent, referral_source)
   - **And** the contract document is referenced in API OpenAPI and dev notes

## Tasks / Subtasks

- [x] **Task 1: Domain + JSONB column** (AC: 2.3.1)
  - [x] `ActivityFormSchema` value object + v1 field-type constants
  - [x] EF migration `AddActivityFormSchema` on `activities.form_schema`

- [x] **Task 2: Validation + service** (AC: 2.3.1)
  - [x] `FormSchemaValidator` for version, field types, conditional options/consentText
  - [x] `UpdateFormSchemaAsync` blocked when activity archived

- [x] **Task 3: Admin API** (AC: 2.3.1)
  - [x] `PUT /api/v1/admin/activities/{id}/form-schema`
  - [x] `ActivityResponse.formSchema` on GET/list/create/update responses

- [x] **Task 4: Contract artifact** (AC: 2.3.1)
  - [x] `docs/contracts/activity-form-schema-v1.md`
  - [x] OpenAPI v1 description + README link

- [x] **Task 5: Web client types** (AC: 2.3.1 partial)
  - [x] `activities-api.ts` form schema types + `saveActivityFormSchema` helper

- [x] **Task 6: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint` pass

## Dev Notes

- Contract doc: [docs/contracts/activity-form-schema-v1.md](../../../docs/contracts/activity-form-schema-v1.md)
- FormFieldEditor UI ships in Story 2.4
- Template seeds (TGH Tennis, etc.) ship in Story 2.5

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `activities.form_schema` JSONB column with camelCase JSON serialization
- v1 field types: text, phone, email, select, checkbox, consent, referral_source
- Admin PUT validates schema; returns updated activity with `formSchema`
- Epic 2→3 contract published and linked from OpenAPI + README

### File List

- `docs/contracts/activity-form-schema-v1.md`
- `src/Domain/Activities/ActivityFormSchema.cs`
- `src/Domain/Activities/FormFieldTypes.cs`
- `src/Domain/Activities/Activity.cs`
- `src/Contracts/Activities/ActivityFormSchemaDto.cs`
- `src/Contracts/Activities/SaveActivityFormSchemaRequest.cs`
- `src/Contracts/Activities/ActivityResponse.cs`
- `src/Application/Activities/IActivityService.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Activities/FormSchemaMapper.cs`
- `src/Infrastructure/Activities/ActivityFormSchemaJson.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/ActivityMapper.cs`
- `src/Infrastructure/Persistence/Configurations/ActivityConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddActivityFormSchema*`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Api/Program.cs`
- `src/Api/Api.http`
- `web/lib/activities-api.ts`
- `README.md`

### Change Log

- 2026-06-16: Story 2.3 implemented — form schema JSONB storage and v1 field-type contract

### Review Findings

- [x] [Review][Patch] Null `fields` in request causes 500 — `MapToDomain` calls `.Select` on null `schema.Fields` instead of 400 [src/Infrastructure/Activities/FormSchemaValidator.cs:57]
- [x] [Review][Patch] `ValidateModel` does not reject null `Fields` collection before iteration [src/Infrastructure/Activities/FormSchemaValidator.cs:39]

- [x] [Review][Defer] Activity list responses include full `formSchema` per item — acceptable for MVP; trim or lazy-load if payloads grow [src/Infrastructure/Activities/ActivityMapper.cs]
- [x] [Review][Defer] No automated API tests for form-schema validation matrix — Story 2.3 scope is contract + persistence; tests can ship with 2.4 editor
- [x] [Review][Defer] Corrupt JSONB in `form_schema` would throw on EF deserialize — operational/data-migration concern, not introduced by this story
- [x] [Review][Defer] Redis cache invalidation on schema save — Story 2.11
