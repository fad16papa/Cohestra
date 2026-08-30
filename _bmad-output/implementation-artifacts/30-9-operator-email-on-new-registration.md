---
story_id: 30.9
story_key: 30-9-operator-email-on-new-registration
epic: 30
status: done
baseline_commit: cursor/close-at-d861
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/implementation-artifacts/30-8-close-at.md
---

# Story 30.9: Operator email on new Registration

Status: done

## Story

As an Operator,
I want an email when someone registers,
So that I get the lead without waiting on a webhook or opening Tally.

**FRs:** FR-RC-9. **UX:** UX-DR-RC-7.

## Acceptance Criteria

1. **Given** a successful public submit
   **When** the Registration is committed
   **Then** Outbox enqueues `RegistrationOperatorNotify` to tenant `AdminContactEmail`
   **And** subject includes Activity title and Participant name or phone
   **And** body includes name, phone, email, and a link to Activity → Registrations
   **And** Hidden Answers may appear in this Operator mail (not in Participant confirmation — 30.6)
   **And** the message does **not** enqueue on Form field edits or draft saves
   **And** registration notification remains available on all plans (NFR-RC-6)

2. **Given** Settings → Notifications
   **When** I view “Email me on new registrations”
   **Then** the toggle defaults **on**
   **And** when off, public submit still creates Registration + Client but does not enqueue Operator notify
   **And** there is no per-Activity mute and no Slack in this story

## Tasks / Subtasks

- [x] **Task 1 — Tenant flag + migration** (AC: 2)
  - [x] `Tenant.EmailOnNewRegistration` default true
  - [x] EF migration `AddTenantEmailOnNewRegistration`

- [x] **Task 2 — Outbox + email** (AC: 1)
  - [x] `RegistrationOperatorNotify` outbox type + payload
  - [x] `RegistrationOperatorNotifyEmailBuilder` (subject, body, hidden fields, registrations URL)
  - [x] `RegistrationOperatorNotifyService` + outbox handler
  - [x] Enqueue in `RegistrationService` after successful commit path

- [x] **Task 3 — Admin API** (AC: 2)
  - [x] `GET/PATCH /api/v1/admin/tenant/notifications`

- [x] **Task 4 — Web Settings** (AC: 2)
  - [x] Settings → Notifications section + toggle (default on)

- [x] **Task 5 — Tests** (AC: 1–2)
  - [x] Email builder unit tests (subject, body, hidden answers)
  - [x] Integration test: operator notify outbox enqueue on submit

## Dev Agent Record

### Implementation Plan

- Mirror confirmation outbox pattern: enqueue in `RegistrationService`, handler delegates to notify service.
- Gate enqueue on `EmailOnNewRegistration` + non-empty `AdminContactEmail`.
- Registrations link via `TenantPublicWebUrlBuilder` → `/activities/{id}?tab=registrations`.

### Debug Log

- (none)

### Completion Notes

- Operator notify fires on every successful public submit when toggle on and admin email set — independent of participant email (confirmation is separate).
- Settings toggle persists `EmailOnNewRegistration`; disabling skips enqueue only, not registration creation.

## File List

- `src/Domain/Tenants/Tenant.cs`
- `src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddTenantEmailOnNewRegistration*`
- `src/Domain/Outbox/OutboxMessageTypes.cs`
- `src/Infrastructure/Outbox/OutboxPayloads.cs`
- `src/Infrastructure/Outbox/RegistrationOperatorNotifyOutboxHandler.cs`
- `src/Application/Registrations/IRegistrationOperatorNotifyService.cs`
- `src/Infrastructure/Registrations/RegistrationOperatorNotifyEmailBuilder.cs`
- `src/Infrastructure/Registrations/RegistrationOperatorNotifyService.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Application/Tenants/ITenantOrganizationService.cs`
- `src/Infrastructure/Tenants/TenantOrganizationService.cs`
- `src/Contracts/Admin/TenantNotificationSettingsContracts.cs`
- `src/Api/Controllers/V1/AdminTenantController.cs`
- `web/lib/tenant-settings-api.ts`
- `web/components/settings/notifications-section.tsx`
- `web/components/settings/settings-sections.ts`
- `web/components/settings/settings-page-content.tsx`
- `web/components/settings/settings-right-rail.tsx`
- `src/Infrastructure.Tests/Registrations/RegistrationOperatorNotifyEmailBuilderTests.cs`
- `src/Api.IntegrationTests/OutboxIntegrationTests.cs`

## Change Log

- 2026-08-30: Story 30.9 — operator email on new registration (outbox, settings toggle, tests).
