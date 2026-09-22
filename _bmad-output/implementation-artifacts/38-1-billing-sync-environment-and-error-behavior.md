---
id: 38.1
key: 38-1-billing-sync-environment-and-error-behavior
title: Billing-sync environment and error behavior
status: review
epic: 38
created: 2026-09-22
baseline_commit: 9515ac3a
readiness: ready
---

# Story 38.1: Billing-sync environment and error behavior

Status: review

## Story

As a TenantAdmin,
I want billing synchronization only when there is a real reconciliation reason,
so that ordinary admin pages do not emit expected Paddle-missing 503s and the Billing screen can still tell me when billing is unavailable.

## Acceptance Criteria

1. **Unconfigured + fresh TenantAdmin context:** Dashboard (and other unrelated admin routes) load. No `POST /api/v1/admin/billing/sync`. No billing-related 503.
2. **Unconfigured + Billing page:** Page shows an intentional not-configured state. No generic failure from background sync. No retry loop.
3. **Configured + ordinary navigation:** No unconditional synchronization (including no sessionStorage “sync once per tab”).
4. **Legitimate checkout/reconciliation trigger:** Sync runs once; shell plan/entitlements refresh.
5. **Sync failure after a legitimate trigger:** Failure is visible in that context; retry is operator-initiated (Refresh / Try again), not a background loop; unrelated routes stay quiet.
6. **TenantMember / unauthorized:** Cannot invoke `POST /admin/billing/sync` (403). GET billing remains admin-only.
7. **Tenant isolation:** Sync and summary stay on the JWT tenant. No cross-tenant state.

## Readiness

Phase 1 ACCEPTED (`docs/DESIGN.md`, backlog 38.1). Architecture already exposes `BillingConfigured` on `GET /api/v1/admin/billing` via `PaddleSettings.IsConfigured`. Webhooks and `PaddleCheckoutReturnController` already reconcile on the server. **Ready to implement.** No open PO decision for this story.

## Investigation (required)

### Why sync was in the tenant shell

`TenantShellProvider` POSTed `/billing/sync` once per tab (`cohestra_billing_sync_attempted`) for every TenantAdmin so plan badges/banners would catch up after checkout if webhooks lagged. That made **every** admin mount a billing-provider call. When Paddle is optional (local, CI, many UAT boxes), the controller correctly returns 503 and the shell swallowed it. PX2-LIVE-004.

### Legitimate triggers (keep)

| Trigger | Where today | Keep? |
|---------|-------------|-------|
| Checkout return (`billing=success`, `session_id` / `_ptxn` / `transaction_id`) | `dashboard-layout.tsx` | Yes |
| Settings billing checkout session | `settings-billing-page-content.tsx` | Yes, only when a session id is present |
| Explicit “Refresh billing status” | `in-app-billing-panel.tsx` | Yes |
| Paddle overlay return | `PaddleCheckoutReturnController` server-side sync | Yes — do not change |
| Webhooks | `PaddleWebhookProcessor` | Yes — normal subscription path |
| Hosted billing jobs | `BillingJobsHostedService` | Yes — server-side |

### Not legitimate

| Trigger | Why rejected |
|---------|--------------|
| Every TenantAdmin session / focus | AC3: ordinary navigation must not sync |
| `sessionStorage` once-per-tab | Client flag is not an authoritative capability; still 503s on every new context |
| Auto-sync because `plan === Basic` | Fires on every Billing visit in unconfigured/dev; not a reconciliation event |
| Public `NEXT_PUBLIC_*` Paddle flag | Must not infer provider config from a public env var |

### Authoritative capability

`GET /api/v1/admin/billing` → `billingConfigured` (`PaddleSettings.IsConfigured`). Does **not** 503 when unconfigured. TenantAdminOnly. Do not expose API keys or webhook secrets.

Webhooks are the normal update path once Paddle is configured. Client sync is a **fallback** after checkout return or explicit refresh.

### Chosen model

1. Remove shell auto-sync entirely (no replacement storage flag).
2. Client `POST /billing/sync` only when `billingConfigured === true` **and** reason is `checkout-return` or `explicit-refresh`.
3. Discover `billingConfigured` via GET summary (existing contract).
4. Billing page: named not-configured state; no background POST.
5. Leave API 503 on explicit Sync when Paddle is missing (honest). Service already no-ops if it were reached.

### Rejected alternatives

- Keep shell sync if GET says configured — violates AC3.
- Change Sync to 200 when unconfigured — hides a mistaken client call; GET already answers capability.
- Add `billingConfigured` to `/admin/shell` this story — unnecessary; GET billing exists for admins. Members must not see provider tokens.
- Configure Paddle in Development to silence 503 — not a product fix.

## Tasks / Subtasks

- [x] Extract reconcile policy + helper; unit-test reasons and GET-before-POST
- [x] Remove `TenantShellProvider` auto-sync and sessionStorage key
- [x] Dashboard checkout return uses reconcile helper
- [x] Settings billing auto-sync only on checkout session id
- [x] Billing panel: named unconfigured state; Refresh uses helper; no loop
- [x] Backend: GET unconfigured configured=false; Sync 503; Member 403
- [x] Playwright: fresh context, dashboard/clients emit no billing/sync
- [x] Run affected unit/integration/frontend suites, lint/typecheck/build

## Non-goals

Do not fix Basic Website 500 (38.2). Do not fix e2e isolation (38.3). Do not redesign Billing. Do not start tokens/shell (38.4+). Do not change Epics 35–37. Do not change webhooks, checkout creation, or plan gates. Do not add production seeders.

## Dev Notes

- Frontend: `web/lib/billing/billing-api.ts`, `tenant-shell-provider.tsx`, `dashboard-layout.tsx`, `settings-billing-page-content.tsx`, `in-app-billing-panel.tsx`
- Backend already: `BillingController.Get` 200 + `BillingConfigured`; `Sync` 503 if `!IsConfigured`; `[Authorize(TenantAdminOnly)]`
- Tests: vitest helper; `PaddleBillingServiceTests`; `BillingIntegrationTests`; `TenantAuthzIntegrationTests`; Playwright `e2e/billing-sync-38-1.spec.ts`

## Dev Agent Record

### Agent Model Used

Grok 4.6

### Debug Log References

### Completion Notes List

- Removed TenantShellProvider once-per-tab POST `/admin/billing/sync`.
- Client POST only after GET `billingConfigured` and reason `checkout-return` or `explicit-refresh`.
- Checkout return is owned by `dashboard-layout` with an in-flight promise keyed by session so Strict Mode / Billing nested routes do not double-POST.
- Billing page shows named unavailable copy; Refresh is operator-initiated.
- Suites: web vitest 379; Infrastructure.Tests 915; Integration 112; Playwright live 38.1 passed; tsc/build passed. Lint still has pre-existing repo errors.

### Review Findings

- [x] [Review][Patch] Checkout-return double POST from layout + Billing page — fixed: Billing page no longer auto-reconciles; layout owns the trigger.
- [x] [Review][Patch] Strict Mode latch skipped refreshShell / failure toast — fixed: in-flight promise keyed by session id.
- [x] [Review][Patch] Basic→paid load race — fixed: generation guard on capability/details loads.
- [x] [Review][Patch] Success toast after skipped unconfigured sync — fixed: toast only when `synced`.
- [x] [Review][Defer] Configured Paddle live checkout cannot be exercised in this environment — deferred, covered by helper + service tests with FakePaddle.
- [x] [Review][Defer] Invited non-owner admin on a leftover checkout query sees layout toast only — deferred, settings already hides owner-only billing.

### File List

- `_bmad-output/implementation-artifacts/38-1-billing-sync-environment-and-error-behavior.md`
- `web/lib/billing/billing-api.ts`
- `web/lib/billing/billing-api.test.ts`
- `web/components/shell/tenant-shell-provider.tsx`
- `web/lib/shell/tenant-shell-provider.test.ts`
- `web/components/layouts/dashboard-layout.tsx`
- `web/components/settings/settings-billing-page-content.tsx`
- `web/components/billing/in-app-billing-panel.tsx`
- `web/e2e/billing-sync-38-1.spec.ts`
- `src/Infrastructure.Tests/Billing/PaddleBillingServiceTests.cs`
- `src/Api.IntegrationTests/BillingIntegrationTests.cs`
- `src/Api.IntegrationTests/TenantAuthzIntegrationTests.cs`
