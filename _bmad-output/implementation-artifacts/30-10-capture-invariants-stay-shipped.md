---
story_id: 30.10
story_key: 30-10-capture-invariants-stay-shipped
epic: 30
status: done
baseline_commit: cursor/operator-email-on-new-registration-d861
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/implementation-artifacts/30-9-operator-email-on-new-registration.md
---

# Story 30.10: Capture invariants stay shipped

Status: done

## Story

As the platform,
I want Publish Gate, Client dedup, immutable Answers, one Form per Activity, and shipped plan caps unchanged,
So that Capture cannot uncap Tally-style or fork theme into `form_schema`.

**FRs:** FR-RC-14. **NFRs:** NFR-RC-2, NFR-RC-8.

## Acceptance Criteria

1. **Given** an Activity Form
   **When** I try to publish without a required Phone **or** Email Field
   **Then** publish is rejected (`PublishGateValidator` / `FormSchemaValidator`)
   **And** Hidden, textarea, date, Wave 1, scale, emergency, and info never satisfy that gate

2. **Given** `TenantPlanLimits` Basic 250 / Core 500 / Pro 5,000 registrations per month (plus existing seat / community / activity caps)
   **When** this epic ships
   **Then** those numbers are unchanged
   **And** at regs cap, public register rejects with a registrant-safe message; LimitMeter still owns cap copy

3. **Given** a published Activity
   **When** a Participant submits
   **Then** Answers are immutable; historical JSONB is not rewritten
   **And** Client dedup by phone/email still upserts one Client

4. **Given** Studio / Touchpoints
   **When** I save Form meta
   **Then** `registration_theme` is never written into `form_schema`
   **And** confirmation hero still uses `RegistrationThemeResolver`
   **And** Paddle remains tenant billing; this epic does not add registrant checkout or Stripe-in-form

5. **Given** existing Activities that only use pre-Capture v1 types
   **When** I load and publish them
   **Then** they remain valid without a data migration

## Tasks / Subtasks

- [x] **Task 1 — Publish Gate regression** (AC: 1)
  - [x] Extend `PublishGateValidatorTests` for info-only, optional email, required email-only
  - [x] Existing hidden/textarea/date/Wave1/scale/emergency coverage retained

- [x] **Task 2 — Plan caps locked** (AC: 2)
  - [x] `TenantPlanLimitsTests` asserts Basic/Core/Pro caps (250/500/5000 + seat/community/activity)
  - [x] Existing `TenantPlanLimitValidatorTests` covers registrant-safe limit message

- [x] **Task 3 — Immutability + theme separation** (AC: 3–4)
  - [x] `CaptureInvariantsTests`: submit-only `IRegistrationService`, separate `RegistrationTheme` column, no theme on form schema types
  - [x] Answer normalization does not mutate input dictionary

- [x] **Task 4 — Pre-Capture v1 compat** (AC: 5)
  - [x] `CaptureInvariantsTests.PreCaptureV1Schema_passes_publish_gate_and_validation`

## Dev Agent Record

### Implementation Plan

Regression-only story: lock Epic 30 Capture invariants with focused unit tests. No production code changes — behavior already shipped across Stories 30.1–30.9.

### Completion Notes

- Client dedup and plan-limit submit rejection covered by existing integration tests (`ClientDedupIntegrationTests`, `TenantPlanLimitValidatorTests`, `ActivityCapacityPlanLimitIntegrationTests`).
- Confirmation hero via `RegistrationThemeResolver` covered by `RegistrationNotificationServiceTests`.

## File List

- `src/Infrastructure.Tests/Tenants/TenantPlanLimitsTests.cs`
- `src/Infrastructure.Tests/Registrations/CaptureInvariantsTests.cs`
- `src/Infrastructure.Tests/Activities/PublishGateValidatorTests.cs`

## Change Log

- 2026-08-30: Story 30.10 — Capture invariant regression tests.
