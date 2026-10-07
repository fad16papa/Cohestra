# ARCHITECTURE — Story 43.3 Billing presentation

## Paradigm

**Presentation on existing billing domain.** `BillingSummary` / tenant shell remain the source of truth. UI maps copy; it does not invent status.

## AD-1 Consume 38.1

**Binds:** `shouldRequestBillingProviderSync` + `reconcileBillingFromProviderWithAuth`.
**Prevents:** sync-on-nav, sessionStorage once-per-tab, 503 loops.

## AD-2 Sandbox copy gate

**Binds:** Production-facing Billing and paddle-return never mention sandbox cards, Notifications event names, or localhost URLs unless `paddleEnvironment(clientToken) === "sandbox"`.
**Prevents:** developer instructions in live Billing.

## AD-3 Portal owner boundary

**Binds:** `POST /api/v1/admin/billing/portal` calls `EnsureBillingAccessAsync` like checkout/sync.
**Prevents:** invited Admin opening the owner Paddle portal.

## Deferred

Public Suspended H1 “on hold” (43.4/43.5). Live Paddle checkout acceptance.
