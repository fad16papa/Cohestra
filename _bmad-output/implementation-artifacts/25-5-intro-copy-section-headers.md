---
epic: 25
story: 5
status: review
baseline_commit: f5c6005
---

# Story 25.5: Intro copy + section headers

Status: review

## Story

As a **Tenant Admin or Member**,
I want **intro markdown and section dividers in long forms**,
So that **registrants understand what to expect**.

## Acceptance Criteria

1. **Given** `form_schema.meta.introMarkdown`  
   **When** public registration renders  
   **Then** intro appears above fields (sanitized markdown subset)

2. **Given** section header field type  
   **Then** form renders non-input section headings between field groups

## Tasks / Subtasks

- [x] **Task 1 — Backend schema** (AC: 1, 2)
  - [x] `FormSchemaMeta.IntroMarkdown` domain + DTO
  - [x] `section_header` field type + `NonInput` set
  - [x] `FormSchemaValidator` rules for meta + section headers
  - [x] `RegistrationAnswerValidator` skips non-input fields

- [x] **Task 2 — Public rendering** (AC: 1, 2)
  - [x] `RegistrationIntroCopy` sanitized paragraph renderer
  - [x] `RegistrationForm` renders section header dividers
  - [x] Intro wired in `PublicRegistrationOpen`

- [x] **Task 3 — Admin Form tab** (AC: 1, 2)
  - [x] Intro markdown textarea in Form tab
  - [x] `FormFieldEditor` supports section_header type
  - [x] Client validation for section header constraints

- [x] **Task 4 — Tests** (AC: 1, 2)
  - [x] `FormSchemaValidatorTests`
  - [x] `RegistrationAnswerValidatorTests`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Intro copy stored in `form_schema.meta.introMarkdown` (max 4000 chars); HTML stripped on public page.
- Section headers are display-only; excluded from validation and registration answers.
- Form tab preview shows intro copy above field preview.

### File List

- `src/Domain/Activities/ActivityFormSchema.cs`
- `src/Domain/Activities/FormFieldTypes.cs`
- `src/Contracts/Activities/ActivityFormSchemaDto.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Activities/FormSchemaMapper.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `web/components/registration/registration-intro-copy.tsx`
- `web/components/registration/registration-form.tsx`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/activities/form-field-editor.tsx`
- `web/lib/activities-api.ts`
- `web/lib/form-schema-utils.ts`
- `src/Infrastructure.Tests/Activities/FormSchemaValidatorTests.cs`
- `src/Infrastructure.Tests/Registrations/RegistrationAnswerValidatorTests.cs`

## Change Log

- 2026-08-12: Added intro markdown meta and section_header field type end-to-end.
