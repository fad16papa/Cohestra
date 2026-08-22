---
baseline_commit: 1751808
status: review
story_id: 29.1
story_key: 29-1-paddle-provider-spine
---

# Story 29.1: Paddle provider spine (config, domain, DI)

Status: review

## Story

As a **developer**,
I want **Paddle configuration, tenant merchant IDs, and webhook ledger wired with Stripe removed from DI**,
so that **later stories can implement checkout against one merchant without leftover Stripe settings**.

## Acceptance Criteria

1. **Given** application configuration  
   **When** billing is configured  
   **Then** `Paddle` section exists: `ApiKey`, `ClientToken`, `WebhookSecret`, `Environment` (`sandbox` \| `production`), four Core/Pro price IDs, `TrialPeriodDays` (default 30)  
   **And** `IsConfigured` is true only when `ApiKey` is non-empty  
   **And** no `Stripe` section, `StripeSettings`, or `Stripe__*` env bindings remain in the running app

2. **Given** `Tenant`  
   **When** the migration runs  
   **Then** `StripeCustomerId`, `StripeSubscriptionId`, `StripeSubscriptionScheduleId` are replaced by `PaddleCustomerId`, `PaddleSubscriptionId`, `PaddleSubscriptionScheduleId`  
   **And** unique filtered indexes exist on the Paddle customer and subscription IDs  
   **And** `stripe_webhook_events` is replaced by `paddle_webhook_events` (event id unique)

3. **Given** DI  
   **When** the API starts  
   **Then** `IBillingService` is `PaddleBillingService` (money methods may throw until 29.2–29.5)  
   **And** `IPaddleWebhookProcessor` is registered  
   **And** `Stripe.net` is not referenced

4. **Given** tenant resolution  
   **When** `POST /api/v1/system/paddle/webhook` is called  
   **Then** it is allowed without a tenant Host  
   **And** `/api/v1/system/stripe/webhook` is gone

5. **Given** complimentary / platform copy  
   **When** platform sets Sponsored  
   **Then** comments and audit notes say Paddle IDs are left unchanged

## Tasks / Subtasks

- [x] Task 1: Config + domain + persistence (AC: 1, 2)
  - [x] 1.1 `PaddleSettings` + appsettings / env / compose
  - [x] 1.2 Tenant Paddle ID fields + webhook ledger entity
  - [x] 1.3 EF migration renaming Stripe columns/table
- [x] Task 2: DI + webhook path + service stub (AC: 3, 4)
  - [x] 2.1 `PaddleBillingService` : `IBillingService` (summary + access; money throws)
  - [x] 2.2 `PaddleWebhookController` + processor stub
  - [x] 2.3 Remove `Stripe.net` and Stripe billing types from the running app
- [x] Task 3: Platform copy + tests (AC: 5)
  - [x] 3.1 Complimentary notes use Paddle IDs
  - [x] 3.2 Tests for settings, path allowlist, plan-sync helpers, complimentary IDs
  - [x] 3.3 `dotnet test` for Infrastructure.Tests billing/tenancy/platform

## Dev Notes

- Epic: `_bmad-output/planning-artifacts/epic-29-paddle-billing.md` Story 29.1
- Process invariant: do not change billing journeys. This story is adapter spine only.
- Extract merchant-agnostic helpers (`ApplyScheduledPlan`, downgrade checks, trial disclaimer) so `BillingJobsHostedService` and notification composer keep working without Stripe types.
- `GetSummaryAsync` / `ValidateBillingAccessAsync` / local `GetDetailsAsync` must still work so Settings → Billing loads.
- Money methods throw `InvalidOperationException` until 29.2–29.5.
- Rename contract leaks: `StripeConfigured` → `BillingConfigured`, `PublishableKey` → `ClientToken`, `SyncFromStripeAsync` → `SyncFromProviderAsync`.
- Frontend mapping should accept the new JSON names so the shell does not break (full UI rewrite is 29.4).
- No live Stripe customers — destructive column rename is OK.
- Do not add `@paddle/*` or implement checkout in this story.

### Files to update / replace

- `src/Infrastructure/Billing/Stripe*.cs` → Paddle / `TenantBillingPlanSync`
- `src/Domain/Tenants/Tenant.cs`, `TenantConfiguration.cs`, `CohestraDbContext.cs`
- `src/Application/Billing/IBillingService.cs`, `src/Contracts/Billing/BillingContracts.cs`
- `src/Api/Controllers/V1/BillingController.cs`, webhook controller
- `src/Infrastructure/Tenancy/TenantResolutionMiddleware.cs`
- `src/Infrastructure/Platform/PlatformTenantService.cs`
- Env / compose / `appsettings.json`
- Tests under `src/Infrastructure.Tests/Billing` and platform/tenant tests

### References

- [Source: `_bmad-output/planning-artifacts/epic-29-paddle-billing.md`#Story 29.1]
- [Source: `src/Infrastructure/Billing/StripeBillingService.cs` GetSummary / ValidateBillingAccess]
- [Source: `src/Api/Controllers/V1/StripeWebhookController.cs`]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

### Completion Notes List

- Stripe.net and Stripe billing types removed from the running app. Jobs keep working via `TenantBillingPlanSync`.
- Settings → Billing still loads (`GetSummary` / local `GetDetails`). Checkout/portal/card APIs throw until 29.2–29.5.
- Webhook route is `/api/v1/system/paddle/webhook` (signature HMAC in 29.3).
- Frontend mapping accepts `billingConfigured` / `clientToken` so the shell does not break.
- Infrastructure.Tests billing/tenant/platform filter: 96 passed.

### File List

- `src/Infrastructure/Billing/PaddleSettings.cs`
- `src/Infrastructure/Billing/PaddleBillingService.cs`
- `src/Infrastructure/Billing/PaddleWebhookProcessor.cs`
- `src/Infrastructure/Billing/IPaddleWebhookProcessor.cs`
- `src/Infrastructure/Billing/TenantBillingPlanSync.cs`
- `src/Domain/Billing/PaddleWebhookEvent.cs`
- `src/Api/Controllers/V1/PaddleWebhookController.cs`
- `src/Infrastructure/Persistence/Migrations/20260822120000_ReplaceStripeWithPaddleBilling.cs`
- Deleted `Stripe*.cs` billing/webhook types
- Tests under `src/Infrastructure.Tests/Billing`

## Change Log

- 2026-08-22: Implemented Story 29.1 Paddle provider spine.
