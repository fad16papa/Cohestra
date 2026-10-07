# Code review — Story 43.3 Billing presentation

HEAD reviewed: branch `cursor/story-43-3-billing-presentation-8d20`  
Date: 2026-10-07  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

## Verdict

**PASS** for merge from this HEAD, pending exact-HEAD CI green. No unresolved BLOCKER/MAJOR.

Iteration 1 found a MAJOR: leftover `trialEndsAt` leaked “Trial — n days left” onto OnHold/PastDue. Fixed by gating trial remaining to `billingStatus === "Trialing"`. Review of the new HEAD: clear.

## Blind Hunter

- Paddle checkout/webhook/pricing/credentials untouched.
- 38.1 `shouldRequestBillingProviderSync` unchanged. Ordinary Billing visit does not POST sync (Playwright 38.1 + 43.3).
- 43.1 `/settings/billing` nested route, one main, one h1 preserved.
- Portal now calls `EnsureBillingAccessAsync` before the unconfigured 503, so invited Admin gets owner-managed 403 instead of an environment crash.
- Member stay-and-deny uses ProductErrorState; no checkout/portal.
- Sandbox 4242 / Notifications copy is gated off production Billing and unmatched paddle-return errors.

## Edge Case Hunter

- Trial remaining no longer renders on OnHold/PastDue when `trialEndsAt` is still stored.
- Complimentary Basic hides UpgradePanel/checkout.
- Provider-unavailable copy remains 38.1 named state, not a retry loop.
- Incomplete checkout on unpaid plans is production-safe; paid plans still suppress the incomplete notice (pre-existing).
- Public Suspended H1 still says “on hold” — deferred to 43.4/43.5, not rewritten here.

## Acceptance Auditor vs SPEC CAP-1–CAP-12

| CAP | Evidence |
| --- | -------- |
| CAP-1 plan/state/action | PlanStatusCard + owner Playwright |
| CAP-2 Member deny | ProductErrorState Playwright + settings-billing-page-content tests |
| CAP-3 non-owner Admin | owner-managed copy Playwright intercept + unit |
| CAP-4 Trialing | “Trial — n days left”, role=status, not alert |
| CAP-5 Past due | “Payment is past due.” role=alert |
| CAP-6 OnHold | “Billing is on hold.” never “Workspace paused.” |
| CAP-7 unconfigured | BILLING_UNAVAILABLE_COPY + no POST sync |
| CAP-8 incomplete | production-safe; sandbox extras only paddle-return collecting |
| CAP-9 refresh | explicit Refresh; 38.1 helper |
| CAP-10 portal owner | BillingIntegrationTests invited Admin 403 |
| CAP-11 390 | owner 390 no overflow; Refresh ≥44px |
| CAP-12 38.1/43.1 | billing-sync-38-1 green; nested route URL |

## Findings

### MAJOR (fixed this iteration)

1. Trial remaining leaked onto OnHold when `trialEndsAt` remained. Gated to Trialing.

### MINOR

1. Live `px2-basic` is complimentary, so UpgradePanel is correctly hidden. Core fixture covers paid-plan presentation.
2. 43.1 Appearance chip height asserted `>= 44` can fail at 43.999px (subpixel). Out of 43.3 scope; not weakened.

### NIT

1. Next.js dev-tools injects an empty `role=alert`; 43.3 assertions are scoped to the Billing region.

## Tests on this HEAD

- Vitest billing-status-copy, in-app-billing-panel, settings-billing-page-content, billing-api: pass
- TenantBillingAccess + PaddleBillingService unit: pass
- Integration Billing + TenantMember portal 403: 5 passed
- Playwright 43.3: 3 passed
- Playwright 38.1 billing-sync: pass
