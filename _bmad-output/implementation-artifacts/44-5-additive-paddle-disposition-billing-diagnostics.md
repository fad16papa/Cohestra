---
id: 44.5
key: 44-5-additive-paddle-disposition-billing-diagnostics
title: Additive Paddle disposition logging and billing diagnostics
status: review
epic: 44
created: 2026-10-09
baseline_commit: 556f7192890dcc7589252f1e1bdf790710402a6f
---

# Story 44.5: Additive Paddle disposition logging and billing diagnostics

Status: review

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not optional, not one-shot.

## Story

As a **PlatformAdmin**,
I want **a minimized, read-only Paddle diagnostic view of webhook dispositions**,
so that **I can see whether deliveries were processed, duplicate, ignored, retryable, or rejected without changing billing**.

## Acceptance Criteria

1. **Given** `POST /api/v1/system/paddle/webhook`
   **When** signature verification, duplicate `event_id`, tracked-type handling, 503 retry, complimentary skip, and entitlement transitions run
   **Then** behavior matches pre-story processor tests (`PaddleWebhookProcessorTests`, webhook integration tests)
   **And** `paddle_webhook_events` remains insert-after-success unique on `EventId`
   **And** HTTP statuses stay: missing secret 503; missing/invalid signature 400; malformed/invalid payload existing 400; duplicate 200 `duplicate=true`; ignored existing 200; retryable 503; processed existing 200

2. **Given** a processed, duplicate, ignored, retryable, or rejected outcome
   **When** the request finishes
   **Then** an additive `paddle_webhook_deliveries` row stores event id (if known), event type (if known), disposition, optional tenantId, HTTP status, `detailSanitized` ≤ 200 after redaction, observedAt
   **And** raw JSON body, signature header, WebhookSecret, ApiKey, ClientToken, customer email/body, stack traces are never persisted
   **And** diagnostic write failure must not change webhook HTTP semantics (P0-14)

3. **Given** missing webhook secret, missing/invalid `Paddle-Signature`, or malformed/invalid request
   **When** the controller/processor rejects the request
   **Then** HTTP status is unchanged
   **And** a `rejected` diagnostic row is stored without body/signature/secret
   **And** invalid-signature rows use eventId=null, eventType=null, HTTP 400

4. **Given** `GET /api/v1/platform/ops/paddle/config`
   **When** PlatformAdmin calls it
   **Then** response may include `isConfigured` (existing `PaddleSettings.IsConfigured`), `environment`, `allowLive`, `apiHost`
   **And** never ApiKey, WebhookSecret, ClientToken, price IDs, or secret values
   **And** TenantAdmin/TenantMember 403; anonymous 401

5. **Given** `GET /api/v1/platform/ops/paddle/deliveries`
   **When** PlatformAdmin filters by disposition, eventType, tenantId, from, to
   **Then** pagination default 25 max 50; order ObservedAt DESC, Id DESC
   **And** tenantId=A returns A only (P1-06)
   **And** TenantAdmin/TenantMember 403
   **And** `POST /api/v1/platform/ops/paddle/{id}/replay` is 404 (P0-15)

6. **Given** Operations → Billing on `/platform/ops`
   **When** rendered
   **Then** diagnostics are read-only with zero Replay/Retry/Mark Paid/Edit BillingStatus/Reveal secret controls
   **And** empty table is `missing instrumentation` — not “Paddle is down”, “no webhook activity ever”, or “billing healthy”
   **And** filtered-empty and query-error are distinct
   **And** 44.3 health still lists paddle as `not_in_probe`

7. **Given** retention
   **When** prune runs
   **Then** rejected/high-noise rows retain ≤ 14 days and a hard FIFO cap
   **And** other dispositions retain ≤ 90 days
   **And** global FIFO cap 50,000
   **And** `paddle_webhook_events` is never pruned

## Tasks / Subtasks

- [x] Isolated diagnostic writer + `paddle_webhook_deliveries` (AC: 1–3, 7)
- [x] Controller/processor record after HTTP decision; map Invalid → rejected (AC: 1–3)
- [x] PlatformAdminOnly config + deliveries endpoints (AC: 4–5)
- [x] Operations Billing section; no mutation (AC: 6)
- [x] Unit, integration, TenantIsolation, frontend, Playwright (AC: all)
- [x] BMAD code-review loop on final HEAD; trace; NFR; checkpoint (AC: all)

## Dev Notes

### Transaction boundary (Winston / Grok)

`PaddleWebhookProcessor` mutates `Tenant` / ledger on the request `CohestraDbContext` and commits both in one `SaveChangesAsync`. Diagnostic inserts MUST use a **new DI scope / new DbContext** via `IServiceScopeFactory`. Failure of that isolated write is logged and swallowed. It cannot roll back billing, cannot roll back `paddle_webhook_events`, and cannot change the already-computed HTTP status.

### Disposition vocabulary

Processor enum `PaddleWebhookDisposition` stays unchanged (includes `Invalid`). Diagnostic/API/UI vocabulary is only: `processed`, `duplicate`, `ignored`, `retryable`, `rejected`. Map processor `Invalid` and controller rejections to `rejected`.

### TenantId

Optional. Persist only when the processor already resolved a tenant via existing `ResolveTenantAsync` / ChangeTracker after a real handle. Do not trust `custom_data.tenant_id` in the diagnostic writer.

### Exclusions

Do not start 44.6–44.9. No replay, billing mutation, outbox requeue, PaddleCredentialGuard changes, production deploy.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

- Local unit: 1028 pass (`Category!=Integration`)
- Local integration: 181 pass on fresh `cohestra_test` (`CI=true`)
- Playwright `platform-ops-44-3`, `44-4`, `44-5` with `E2E_LIVE_STACK=1` (API :8080, web :3000)

### Completion Notes List

- Additive `paddle_webhook_deliveries` diagnostics. `paddle_webhook_events` remains insert-after-success unique on EventId. Processor handlers, billing state machine, refund/chargeback, complimentary, and HTTP statuses are unchanged.
- Diagnostic writes use a new DI scope (`IServiceScopeFactory`). Writer failures are swallowed; webhook HTTP is preserved (P0-14).
- Canonical delivery vocabulary: processed / duplicate / ignored / retryable / rejected. Processor `Invalid` maps to `rejected`.
- Config DTO: isConfigured (existing `PaddleSettings.IsConfigured`), environment, allowLive, apiHost. No secrets, no price IDs.
- Delivery DTO allow-list only. Empty table copy is missing instrumentation, not Paddle down / billing healthy. Paddle remains `not_in_probe` on 44.3 health.
- Retention: rejected ≤14d + 10k FIFO; others ≤90d; global 50k FIFO. Ledger never pruned.
- 44.6–44.9 not started. STOP before merge.

### File List

- src/Domain/Billing/PaddleWebhookDelivery.cs
- src/Domain/Billing/PaddleWebhookDeliveryDisposition.cs
- src/Application/Billing/IPaddleWebhookDeliveryRecorder.cs
- src/Application/Platform/IPlatformOpsPaddleService.cs
- src/Contracts/Platform/PlatformPaddleContracts.cs
- src/Infrastructure/Billing/PaddleWebhookDeliveryRecorder.cs
- src/Infrastructure/Billing/PaddleWebhookDeliveryRetention.cs
- src/Infrastructure/Billing/PaddleWebhookDispositionMapper.cs
- src/Infrastructure/Billing/IPaddleWebhookProcessor.cs
- src/Infrastructure/Billing/PaddleWebhookProcessor.cs
- src/Infrastructure/Persistence/Configurations/PaddleWebhookDeliveryConfiguration.cs
- src/Infrastructure/Persistence/Migrations/20261009150042_AddPaddleWebhookDeliveries.cs
- src/Infrastructure/Persistence/Migrations/20261009150042_AddPaddleWebhookDeliveries.Designer.cs
- src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs
- src/Infrastructure/Persistence/CohestraDbContext.cs
- src/Infrastructure/Platform/PlatformOpsPaddleService.cs
- src/Infrastructure/Platform/PlatformHealthDescriptionSanitizer.cs
- src/Infrastructure/DependencyInjection.cs
- src/Api/Controllers/V1/PaddleWebhookController.cs
- src/Api/Controllers/V1/PlatformOpsController.cs
- src/Infrastructure.Tests/Billing/PaddleWebhookDeliveryRecorderTests.cs
- src/Infrastructure.Tests/Billing/PaddleWebhookDeliveryRetentionTests.cs
- src/Infrastructure.Tests/Billing/PaddleWebhookDispositionMapperTests.cs
- src/Infrastructure.Tests/Platform/PlatformOpsPaddleServiceTests.cs
- src/Infrastructure.Tests/Platform/PlatformHealthDescriptionSanitizerTests.cs
- src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs
- src/Api.IntegrationTests/Infrastructure/PaddleWebhookWebApplicationFactory.cs
- src/Api.IntegrationTests/Infrastructure/PaddleWebhookDiagnosticFactories.cs
- src/Api.IntegrationTests/PaddleWebhookIntegrationTests.cs
- src/Api.IntegrationTests/PaddleWebhookDiagnosticBoundaryIntegrationTests.cs
- src/Api.IntegrationTests/PlatformOpsPaddleIntegrationTests.cs
- src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs
- src/Api.IntegrationTests/TenantIsolationApiTests.cs
- web/lib/platform-paddle.ts
- web/lib/platform-paddle.test.ts
- web/lib/platform-44-5-source.test.ts
- web/lib/platform-api.ts
- web/lib/platform-44-3-source.test.ts
- web/lib/platform-44-4-source.test.ts
- web/components/platform/platform-ops-paddle.tsx
- web/app/(platform)/platform/ops/page.tsx
- web/e2e/platform-ops-44-5.spec.ts
- web/e2e/platform-ops-44-3.spec.ts
- _bmad-output/implementation-artifacts/44-5-code-review-2026-10-09.md
- _bmad-output/test-artifacts/checkpoint-44-5-platform-ops-paddle.md
- _bmad-output/test-artifacts/nfr-assessment-44-5-2026-10-09.md
- _bmad-output/test-artifacts/traceability/44-5-additive-paddle-disposition-billing-diagnostics.md
- _bmad-output/planning-artifacts/evidence/px2-44-5/viewports/

## Change Log

- 2026-10-09: Story context from Epic 44, AD-16/15/18, TEA P0-12–15, P1-06/13.
- 2026-10-09: Implemented additive disposition table, isolated recorder, PlatformAdmin config/deliveries APIs, Operations Billing UI.
- 2026-10-09: BMAD code review — no unresolved BLOCKER/MAJOR. Trace/NFR/checkpoint recorded. Draft PR only; STOP before merge.

### Review Findings

See `44-5-code-review-2026-10-09.md`. No unresolved BLOCKER or MAJOR.
